import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/payments/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { findOrCreateBuyer } from '@/lib/payments/buyer';
import { sendPurchaseConfirmation } from '@/lib/email/purchase-confirmation';
import { trackServer } from '@/lib/analytics/server';
import { env, paymentsMode } from '@/lib/config/env';

/**
 * Stripe webhook — the ONLY place in the application that grants an
 * entitlement.
 *
 * Two rules this file exists to enforce:
 *
 *  1. Nothing is trusted without a verified signature. `constructEvent` throws
 *     on a forged or replayed body, and we answer 400 before touching the
 *     database. Without this check, anyone who knows the URL could POST a fake
 *     "payment succeeded" and hand themselves the whole course.
 *
 *  2. The grant is idempotent. Stripe retries a webhook until it gets a 2xx,
 *     and it can deliver the same event more than once even on success, so the
 *     handler must be safe to run twice. Idempotency key is the session id,
 *     stored in `entitlements.source`.
 */

// Signature verification needs the exact bytes Stripe signed. Next must not
// parse, re-encode, or cache this request.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (paymentsMode !== 'stripe' || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('[stripe] signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Acknowledged, not handled. Returning 2xx stops Stripe from retrying
    // events we have no opinion about.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // `complete` alone is not enough: an unpaid session can reach this state for
  // asynchronous payment methods. Access follows the money, not the checkout.
  if (session.payment_status !== 'paid') {
    console.warn('[stripe] session completed but not paid', session.id, session.payment_status);
    return NextResponse.json({ received: true });
  }

  /*
    Залогиненный покупатель приходит с user_id в metadata. Аноним — без него,
    и тогда аккаунт заводится здесь, по адресу, который Stripe собрал на
    странице оплаты.

    Порядок важен: сначала metadata, и только потом почта. Иначе покупатель,
    оплативший из аккаунта с одним адресом, но вписавший в Stripe другой,
    получил бы доступ на второй аккаунт, а не на тот, в котором сидит.
  */
  let userId = session.metadata?.user_id ?? session.client_reference_id ?? null;

  if (!userId) {
    const email = session.customer_details?.email ?? session.customer_email;
    if (!email) {
      console.error('[stripe] paid session carries neither user id nor email', session.id);
      // 200 намеренно: повтор доставки адрес не создаст, а цикл повторов
      // только закопает строку выше. Тут нужен человек, а не редоставка.
      return NextResponse.json({ received: true });
    }

    const buyer = await findOrCreateBuyer(email);
    if (!buyer) {
      // 500 — чтобы Stripe повторил: платёж настоящий, и аккаунт под него
      // обязан появиться. Здесь сбой почти наверняка временный.
      return NextResponse.json({ error: 'buyer setup failed' }, { status: 500 });
    }

    userId = buyer.userId;
    console.info('[stripe] buyer resolved', userId, buyer.created ? 'created' : 'existing');
  }

  const supabase = createSupabaseAdminClient();
  const source = `stripe:${session.id}`;

  const { data: already, error: lookupError } = await supabase
    .from('entitlements')
    .select('id')
    .eq('source', source)
    .maybeSingle();

  if (lookupError) {
    console.error('[stripe] entitlement lookup failed', lookupError);
    // 500 so Stripe retries: the payment is real and the grant must not be
    // lost to a transient database error.
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
  }

  if (already) return NextResponse.json({ received: true, duplicate: true });

  const { error: grantError } = await supabase.from('entitlements').insert({
    user_id: userId,
    product_code: session.metadata?.product_code ?? 'FULL_ACCESS',
    status: 'active',
    source,
  });

  if (grantError) {
    console.error('[stripe] entitlement grant failed', grantError, session.id);
    return NextResponse.json({ error: 'grant failed' }, { status: 500 });
  }

  // Close the lead so the manual follow-up queue does not chase someone who
  // has already paid. A failure here must not fail the webhook — the buyer
  // has their access, and a stale lead is a tidiness problem, not an outage.
  const { error: leadError } = await supabase
    .from('checkout_leads')
    .update({ status: 'converted' })
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (leadError) console.error('[stripe] lead close failed', leadError, userId);

  /*
    Достраиваем запись согласия. В момент клика по чекбоксам покупателя ещё не
    существовало как аккаунта — теперь известны и он, и адрес почты, и факт
    оплаты. Именно эта строка отвечает на вопрос «кто и что принял перед тем,
    как заплатить», если человек потребует возврат.

    Ошибка здесь не валит вебхук: доступ уже выдан, платёж состоялся, и
    возвращать Stripe пятисотку значило бы получить повторную доставку и
    попытку выдать доступ ещё раз. Запись в логе достаточна, чтобы связать
    вручную.
  */
  const consentId = session.metadata?.consent_id;
  if (consentId) {
    const { error: consentError } = await supabase
      .from('checkout_consents')
      .update({
        user_id: userId,
        email: session.customer_details?.email ?? session.customer_email ?? null,
        payment_status: 'paid',
        entitlement_granted_at: new Date().toISOString(),
      })
      .eq('id', consentId);

    if (consentError) console.error('[stripe] не удалось достроить согласие', consentError, consentId);
  } else {
    // Сессия без consent_id — значит она создана в обход формы согласий.
    // На такую покупку сослаться на утрату права отказа будет нечем.
    console.warn('[stripe] оплаченная сессия без consent_id', session.id, userId);
  }

  /*
    Письмо-подтверждение. Это не вежливость, а обязательный документ: право ЕС
    требует подтвердить договор на долговечном носителе и зафиксировать в нём
    согласие на немедленное предоставление контента.

    Отправляется последним и не влияет на ответ Stripe. Если письмо не ушло —
    ключа нет, провайдер лёг, адрес с опечаткой, — доступ у человека уже есть,
    и возвращать пятисотку значило бы получить повторную доставку и повторную
    выдачу. Факт неотправки виден по пустому confirmation_email_sent_at:
    именно по этому полю потом видно, кому документ так и не дошёл.
  */
  const buyerEmail = session.customer_details?.email ?? session.customer_email;
  if (buyerEmail) {
    const sent = await sendPurchaseConfirmation({
      to: buyerEmail,
      locale: session.metadata?.locale === 'uk' ? 'uk' : 'ru',
      sessionId: session.id,
      purchasedAt: new Date(session.created * 1000),
    });

    if (sent && consentId) {
      await supabase
        .from('checkout_consents')
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq('id', consentId);
    }

    if (!sent) console.error('[stripe] подтверждение не отправлено', buyerEmail, session.id);
  }

  /*
    Событие покупки пишется здесь, а не в браузере: подтверждение приходит от
    Stripe, когда вкладка покупателя уже закрыта. До сих пор его не писал
    никто — в таблице был ноль purchase_completed при трёх реальных оплатах, и
    воронка обрывалась на клике по кнопке.
  */
  await trackServer(
    'purchase_completed',
    { session_id: session.id, amount_total: session.amount_total, currency: session.currency },
    userId,
  );

  console.info('[stripe] entitlement granted', userId, session.id);
  return NextResponse.json({ received: true });
}
