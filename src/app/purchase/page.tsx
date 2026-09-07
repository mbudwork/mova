import { CheckoutScreen } from '@/components/landing/CheckoutScreen';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { redirect } from 'next/navigation';
import { hasFullAccess, requireProfile } from '@/lib/auth/guards';

/**
 * Reached when a logged-in user without an entitlement opens protected
 * content. Same honest checkout adapter as the marketing funnel (see audit
 * finding D) — no "coming soon" dead end here either.
 */
export default async function PurchasePage() {
  const profile = await requireProfile();

  // Тот же случай, что и на /ru/checkout: сюда ведёт requireFullAccess() при
  // отказе, но открыть адрес можно и руками — уже купившему тут делать нечего.
  if (await hasFullAccess()) redirect('/app');
  const locale = profile.uiLocale === 'uk' ? 'uk' : 'ru';

  return (
    <main>
      <Screen>
        <ScreenHeader title="Полный доступ" back="/app" />
        <div className="mt-2">
          <CheckoutScreen locale={locale} />
        </div>
      </Screen>
    </main>
  );
}
