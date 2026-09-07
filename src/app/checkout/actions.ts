'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';
import { checkoutMode } from '@/lib/pricing';
import { env, paymentsMode } from '@/lib/config/env';
import { getStripe, checkoutUrls } from '@/lib/payments/stripe';

export type LeadResult = { ok: true } | { ok: false; error: string };
export type CheckoutSessionResult = { ok: true; url: string } | { ok: false; error: string };

const GENERIC_ERROR = 'Не получилось отправить заявку. Попробуй ещё раз через минуту.';

/**
 * Records purchase intent. This does NOT grant an entitlement and does NOT
 * emit purchase_completed — those only happen from a verified Stripe webhook
 * in a later phase. What it does: prove, honestly, that checkout was started
 * by someone real, so a manual follow-up (or a later Stripe migration) has
 * something to act on.
 *
 * Deliberately NOT an upsert.
 *
 * "One open lead per user per product" is enforced by a PARTIAL unique index
 * (`checkout_leads_open_idx ... where status = 'pending'`), and that is the
 * right rule: once a lead is converted or dismissed, the user must be able to
 * open a new one. But ON CONFLICT can only use a partial index if the
 * statement repeats the index predicate in its conflict target, and PostgREST
 * has no way to express `where status = 'pending'` through `on_conflict=`.
 * So the previous upsert failed at plan time with 42P10 — every single
 * submission, for every user. Read-then-insert works with the index as it
 * stands, and the 23505 branch below closes the race the read leaves open.
 */
export async function submitCheckoutLead(locale: string): Promise<LeadResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: open, error: readError } = await supabase
    .from('checkout_leads')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_code', 'FULL_ACCESS')
    .eq('status', 'pending')
    .maybeSingle();

  if (readError) {
    console.error('[checkout] lead lookup failed', readError);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Already queued. Saying "принято" again is the honest answer — the intent
  // is on record, and a second row would only spam the follow-up queue.
  if (open) return { ok: true };

  const { error } = await supabase
    .from('checkout_leads')
    .insert({ user_id: user.id, product_code: 'FULL_ACCESS', locale, status: 'pending' });

  if (error) {
    // 23505: two tabs raced past the lookup above and the partial index caught
    // the second one. The lead exists, which is exactly what the user asked
    // for — that is success, not an error to show them.
    if (error.code === '23505') return { ok: true };

    // The real reason goes to the server log. The user gets one sentence that
    // does not blame their connection: this failure was never about the
    // network, and "Проверь интернет" sent people to reboot their router.
    console.error('[checkout] lead insert failed', error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath('/checkout');
  return { ok: true };
}

/**
 * Starts a real Stripe Checkout session and returns the URL to send the buyer
 * to. Nothing is granted here — the entitlement is written only by the webhook,
 * after Stripe has confirmed the charge with a signature we verify. A user who
 * closes the tab on the payment page must not end up with access.
 */
export async function startStripeCheckout(locale: string): Promise<CheckoutSessionResult> {
  const user = await requireUser();

  if (checkoutMode !== 'stripe' || paymentsMode !== 'stripe') {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!env.STRIPE_PRICE_ID) {
    console.error('[checkout] STRIPE_PRICE_ID is not set');
    return { ok: false, error: GENERIC_ERROR };
  }

  // The lead is recorded before redirecting, not after paying: it is the only
  // trace left of someone who reached the payment page and dropped off.
  await submitCheckoutLead(locale);

  try {
    const stripe = getStripe();
    const urls = checkoutUrls();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: urls.success,
      cancel_url: urls.cancel,
      customer_email: user.email ?? undefined,
      // Both are set on purpose. client_reference_id survives in the dashboard
      // for a human reading the payment; metadata is what the webhook reads.
      client_reference_id: user.id,
      metadata: { user_id: user.id, product_code: 'FULL_ACCESS', locale },
      locale: locale === 'uk' ? 'ru' : 'ru',
    });

    if (!session.url) {
      console.error('[checkout] Stripe returned a session without a URL', session.id);
      return { ok: false, error: GENERIC_ERROR };
    }

    return { ok: true, url: session.url };
  } catch (error) {
    console.error('[checkout] Stripe session creation failed', error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
