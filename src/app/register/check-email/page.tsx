import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { ResendForm } from './ResendForm';

export const dynamic = 'force-dynamic';

/**
 * The screen that was missing.
 *
 * Registration with email confirmation enabled has three outcomes the user
 * cannot tell apart on their own — new account, address already registered,
 * letter lost in spam — and all three are answered the same way: open the
 * inbox. So one screen covers all three, and it never says which case it is.
 */
export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ resent?: string }>;
}) {
  const { resent } = await searchParams;

  return (
    <main>
      <Screen>
        <div className="pt-8">
          <Brand />
        </div>
        <ScreenHeader title="Проверь почту" back="/" />

        {resent ? (
          <p className="mb-6 notice notice-gold">
            Письмо отправлено ещё раз.
          </p>
        ) : null}

        <p className="text-lg">
          Мы отправили письмо со ссылкой. Открой его и нажми кнопку внутри — после этого
          можно войти.
        </p>

        <p className="mt-4 text-slate">
          До перехода по ссылке вход не сработает: аккаунт уже создан, но почта ещё не
          подтверждена.
        </p>

        <p className="mt-4 text-slate">
          Письма нет? Загляни в «Спам» и «Промоакции» — оно приходит туда чаще, чем
          хотелось бы. Если и там пусто, отправь ещё раз.
        </p>

        <div className="mt-8">
          <ResendForm />
        </div>

        <p className="pt-8 text-center text-slate">
          Уже подтвердил?{' '}
          <Link href="/login" className="font-bold text-gold-deep underline">
            Войти
          </Link>
        </p>
      </Screen>
    </main>
  );
}
