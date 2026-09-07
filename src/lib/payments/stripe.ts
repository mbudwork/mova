import 'server-only';

import Stripe from 'stripe';
import { env, paymentsMode } from '@/lib/config/env';

/**
 * Stripe client, built lazily.
 *
 * Deliberately not a module-level `new Stripe(...)`: this module is imported
 * by the webhook route, which Next evaluates during `next build`, and a build
 * runs without production secrets. Constructing at call time keeps the build
 * green and turns a missing key into a clear runtime error at the one place
 * that actually needs it.
 */
export function getStripe(): Stripe {
  if (paymentsMode !== 'stripe' || !env.STRIPE_SECRET_KEY) {
    throw new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.',
    );
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    // Pinned on purpose: an account-level API upgrade must not silently change
    // the shape of the webhook payloads this code reads.
    apiVersion: '2026-08-26.dahlia',
    typescript: true,
  });
}

/** Where Stripe sends the buyer back. Absolute URLs are required by Stripe. */
export function checkoutUrls() {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return {
    success: `${base}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel: `${base}/purchase?canceled=1`,
  };
}
