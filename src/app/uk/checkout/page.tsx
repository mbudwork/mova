import { CheckoutScreen } from '@/components/landing/CheckoutScreen';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { redirect } from 'next/navigation';
import { hasFullAccess } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * Оплата без аккаунта. Почту собирает страница Stripe, аккаунт создаёт
 * вебхук после подтверждённого платежа.
 */
export default async function CheckoutPageUk() {
  /*
    Аккаунт здесь не требуется: оплатить можно анонимно, аккаунт создаётся
    вебхуком после оплаты. Проверка остаётся только для того, чтобы уже
    купивший не увидел предложение купить ещё раз.
  */
  if (await hasFullAccess()) redirect('/app');

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
