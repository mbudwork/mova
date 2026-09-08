import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/payments/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { paymentsMode } from '@/lib/config/env';

/**
 * Куда Stripe возвращает покупателя. Здесь происходит вход после оплаты.
 *
 * Почему именно route handler, а не сама страница успеха: в Next записывать
 * куки могут только route handlers и server actions. Server Component этого
 * не умеет — createSupabaseServerClient глотает ошибку записи в catch и молча
 * продолжает (см. комментарий там же). Из-за этого verifyOtp на странице
 * отрабатывал успешно, но сессия никуда не сохранялась: человек оставался
 * анонимным сколько бы раз ни обновлял страницу, а доступ при этом в базе
 * уже был. Ровно этот баг здесь и чинится.
 *
 * Ограничения на автовход не ослаблены: session_id — предъявительский
 * пропуск, он остаётся в истории браузера и может утечь через referrer.
 * Поэтому три условия сразу:
 *
 *   1. сессия действительно оплачена — спрашиваем у Stripe, а не верим адресу;
 *   2. с момента оплаты прошло меньше часа;
 *   3. аккаунт уже создан вебхуком. Здесь ничего не создаётся и доступ не
 *      выдаётся — только открывается дверь в то, что вебхук подтвердил.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AUTO_LOGIN_WINDOW_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const sessionId = searchParams.get('session_id');

  // Страница успеха получает session_id обратно, чтобы кнопка «Обновить»
  // могла ещё раз пройти через этот обработчик, когда вебхук задержался.
  const back = (suffix = '') =>
    NextResponse.redirect(
      `${origin}/purchase/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}${suffix}`,
    );

  if (!sessionId || paymentsMode !== 'stripe') return back();

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('[return] session retrieve failed', error);
    return back();
  }

  if (session.payment_status !== 'paid') return back();
  if (Date.now() - session.created * 1000 > AUTO_LOGIN_WINDOW_MS) return back();

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) return back();

  const admin = createSupabaseAdminClient();
  const { data: userId } = await admin.rpc('user_id_by_email', { p_email: email });

  // Вебхук ещё не долетел — аккаунта пока нет. Это не ошибка, а гонка:
  // страница покажет «оплата принята» и предложит повторить.
  if (!userId) return back();

  /*
    Одноразовый токен вместо письма. generateLink ничего не отправляет — он
    возвращает hashed_token, который тут же и погашается verifyOtp. Человек
    входит сразу, не открывая почту: ради этого всё и затевалось.
  */
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error('[return] magic link generation failed', linkError);
    return back();
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });

  if (verifyError) {
    console.error('[return] auto sign-in failed', verifyError);
    return back();
  }

  return back();
}
