import { CheckoutScreen } from '@/components/landing/CheckoutScreen';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { requireUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * Requires an account: a purchase is tied to the account the course will be
 * delivered to. An anonymous visitor lands here, is bounced to /register with
 * next=/uk/checkout by proxy.ts, and returns straight back after signing up.
 */
export default async function CheckoutPageUk() {
  await requireUser();

  return (
    <main>
      <Screen>
        <ScreenHeader title="Оформление" back="/uk" />
        <div className="mt-2">
          <CheckoutScreen locale="uk" />
        </div>
      </Screen>
    </main>
  );
}
