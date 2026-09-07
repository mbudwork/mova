import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { requireProfile, hasFullAccess } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * Where Stripe returns the buyer.
 *
 * This page does NOT grant anything and does not read the session id as proof
 * of payment — a success_url is just a redirect the browser follows, and
 * anyone can open it by hand. The entitlement comes from the webhook alone.
 * All this page does is report what the database already says.
 *
 * The webhook usually lands before the browser gets back, but not always, so
 * the "not yet visible" case gets an honest message instead of a wrong one.
 */
export default async function PurchaseSuccessPage() {
  await requireProfile();
  const granted = await hasFullAccess();

  return (
    <main>
      <Screen>
        <div className="pt-8">
          <Brand />
        </div>
        <ScreenHeader title={granted ? 'Доступ открыт' : 'Оплата принята'} />

        {granted ? (
          <>
            <p className="text-lg leading-snug">
              Полный курс открыт. Прогресс сохраняется — можно закрывать и продолжать с телефона.
            </p>
            <div className="mt-8">
              <ButtonLink href="/app" size="lg">
                Начать урок
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg leading-snug">
              Платёж прошёл. Подтверждение от банка иногда идёт до минуты — обнови страницу, и
              доступ появится.
            </p>
            <p className="mt-4 text-slate">
              Если через несколько минут доступа всё ещё нет, напиши нам: деньги списаны, и мы
              откроем курс вручную.
            </p>
            <div className="mt-8 space-y-3">
              <ButtonLink href="/purchase/success" size="lg">
                Обновить
              </ButtonLink>
              <Link href="/legal/contact" className="btn btn-ghost btn-block">
                Написать нам
              </Link>
            </div>
          </>
        )}
      </Screen>
    </main>
  );
}
