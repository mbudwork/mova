import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/payments/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { findOrCreateBuyer } from '@/lib/payments/buyer';
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

  console.info('[stripe] entitlement granted', userId, session.id);
  return NextResponse.json({ received: true });
}
