import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { SetPasswordForm } from './SetPasswordForm';
import { getCurrentUser, hasFullAccess } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * Экран после оплаты. Сам он ничего не выдаёт и никого не впускает: доступ
 * пишет вебхук, вход выполняет /auth/checkout-return. Здесь только показывается
 * то, что уже есть в базе.
 */
export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  const user = await getCurrentUser();
  const granted = user ? await hasFullAccess() : false;

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

            {/*
              Логин человек видит здесь впервые: он вводил адрес на странице
              Stripe как реквизит платежа и не знал, что это ещё и вход. Ниже
              форма пароля — вместе они читаются как «вот твоя пара для входа».
            */}
            {user?.email ? (
              <p className="mt-4 text-slate">
                Твой логин — <b className="text-cream">{user.email}</b>
              </p>
            ) : null}

            {/*
              Кнопки «пропустить» здесь нет намеренно. Пароль — единственный
              способ вернуться в оплаченный курс без письма, и предлагать его
              как необязательный значит оставлять покупателя на одной куке.
              Тем, кто всё же ушёл отсюда, тот же экран покажет requireProfile
              через /set-password.
            */}
            <div className="mt-8">
              <SetPasswordForm />
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
              {/*
                Обычная <a>, а не <Link>, и ведёт в обработчик возврата, а не
                на саму себя. Прежняя кнопка вела на текущий адрес: клик по
                ссылке на тот же маршрут в App Router не делает ничего, и
                кнопка выглядела сломанной. Полная навигация через обработчик
                даёт ещё одну попытку войти — как раз то, что нужно, когда
                вебхук задержался на секунду.
              */}
              <a
                href={
                  sessionId
                    ? `/auth/checkout-return?session_id=${encodeURIComponent(sessionId)}`
                    : '/login'
                }
                className="btn btn-gold btn-lg btn-block"
              >
                Обновить
              </a>
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
