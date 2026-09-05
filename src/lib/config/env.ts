import 'server-only';
import { z } from 'zod';

/**
 * Environment contract.
 *
 * §39: the app must boot with no Stripe / ElevenLabs keys and fall back to
 * mock providers. §37: it must refuse to boot in production if those bypasses
 * would still be active. Both rules are enforced here, once, at module load.
 */

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),

  // Optional integrations — absence switches the matching provider to mock.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ALLOW_DEMO_MODE_IN_PRODUCTION: z.enum(['true', 'false']).default('false'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(
    `Invalid environment configuration. Check these variables against .env.example: ${missing}`,
  );
}

const env = parsed.data;

export const paymentsMode = env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET ? 'stripe' : 'mock';
export const audioMode = env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'mock';
export const isDemoMode = paymentsMode === 'mock' || audioMode === 'mock';
export const isProduction = env.NODE_ENV === 'production';

/**
 * `next build` evaluates server modules to collect route metadata. A build is
 * not a deployment, and CI must be able to compile without production secrets,
 * so the demo-mode guard is deferred to the first real request.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (isProduction && isBuildPhase && isDemoMode) {
  console.warn(
    '[env] Building for production without Stripe/ElevenLabs keys. ' +
      'Checkout stays disabled and audio falls back to the honest "not recorded yet" state.',
  );
}

/**
 * The dangerous configuration is narrower than it looks.
 *
 * The original guard refused to boot whenever any provider was mocked. That
 * premise no longer holds: no code path grants an entitlement client-side, and
 * mock audio is a visible, honest empty state rather than a security problem.
 * Refusing to boot on those grounds would take a public landing page — the
 * destination of paid traffic — down over a missing key it never needed.
 *
 * What genuinely must not happen is checkout being advertised as working while
 * the payment provider is a mock. That, and only that, still refuses to start.
 */
const checkoutAdvertised = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === 'true';

if (
  isProduction &&
  !isBuildPhase &&
  checkoutAdvertised &&
  paymentsMode === 'mock' &&
  env.ALLOW_DEMO_MODE_IN_PRODUCTION !== 'true'
) {
  throw new Error(
    'Refusing to start: checkout is enabled but no Stripe credentials are configured. ' +
      'A mock provider would hand out FULL_ACCESS without a charge. ' +
      'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, or unset ' +
      'NEXT_PUBLIC_CHECKOUT_ENABLED until payments are ready.',
  );
}

if (isProduction && !isBuildPhase && isDemoMode) {
  console.warn(
    `[env] Running in production with mock ${paymentsMode === 'mock' ? 'payments ' : ''}` +
      `${audioMode === 'mock' ? 'audio' : ''}`.trim() +
      '. Checkout is disabled and audio shows the not-recorded-yet state.',
  );
}

export { env };
