import Link from 'next/link';
import type Stripe from 'stripe';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { SetPasswordForm } from './SetPasswordForm';
import { getStripe } from '@/lib/payments/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser, hasFullAccess } from '@/lib/auth/guards';
import { paymentsMode } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

/** Окно, в течение которого session_id ещё пускает в аккаунт. */
const AUTO_LOGIN_WINDOW_MS = 60 * 60 * 1000;

/**
 * Впускает покупателя, оплатившего без регистрации.
 *
 * Ключевое ограничение: session_id в адресе — предъявительский пропуск. Он
 * остаётся в истории браузера и может утечь через referrer, поэтому впускать
 * по нему можно только при трёх условиях сразу:
 *
 *   1. сессия действительно оплачена (payment_status === 'paid') — спрашиваем
 *      у Stripe, а не верим адресной строке;
 *   2. с момента оплаты прошло меньше часа — старая ссылка из истории уже
 *      никого не пускает;
 *   3. аккаунт уже создан вебхуком. Эта страница ничего не создаёт и доступа
 *      не выдаёт — она лишь открывает дверь в то, что вебхук подтвердил.
 *      Иначе success_url сам стал бы способом выдать себе курс.
 */
async function autoSignIn(sessionId: string): Promise<boolean> {
  if (paymentsMode !== 'stripe') return false;

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('[success] session retrieve failed', error);
    return false;
  }

  if (session.payment_status !== 'paid') return false;
  if (Date.now() - session.created * 1000 > AUTO_LOGIN_WINDOW_MS) return false;

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) return false;

  const admin = createSupabaseAdminClient();
  const { data: userId } = await admin.rpc('user_id_by_email', { p_email: email });
  if (!userId) return false;

  /*
    Одноразовый токен вместо письма. generateLink ничего не отправляет — он
    возвращает hashed_token, который тут же и погашается. Человек входит
    сразу, не открывая почту: ровно то, ради чего эта ветка и появилась.
  */
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error('[success] magic link generation failed', linkError);
    return false;
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });

  if (verifyError) {
    console.error('[success] auto sign-in failed', verifyError);
    return false;
  }

  return true;
}

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  let user = await getCurrentUser();
  if (!user && sessionId) {
    if (await autoSignIn(sessionId)) user = await getCurrentUser();
  }

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
              У покупателя, пришедшего без регистрации, пароля нет. Сейчас он
              внутри по одноразовому входу, и это единственный момент, когда
              пароль можно задать без письма. Пропустить можно — но тогда
              вернуться получится только через восстановление по почте.
            */}
            <div className="mt-8">
              <SetPasswordForm />
            </div>

            <div className="mt-6">
              <ButtonLink href="/app" size="lg" variant="ghost">
                Пропустить и начать урок
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
              <ButtonLink
                href={sessionId ? `/purchase/success?session_id=${sessionId}` : '/purchase/success'}
                size="lg"
              >
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
