import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { ResendForm } from './ResendForm';

export const dynamic = 'force-dynamic';

/**
 * Экран после регистрации, которая не выдала сессию.
 *
 * Раньше он утверждал, что письмо отправлено. С выключенным подтверждением
 * почты это неправда всегда: попасть сюда можно только зарегистрировавшись на
 * уже занятый адрес, а в этом случае Supabase намеренно не отправляет ничего.
 * Человек шёл проверять ящик и спам, ничего не находил и уходил — хотя войти
 * мог сразу.
 *
 * Текст намеренно не говорит, занят адрес или нет: иначе форма регистрации
 * стала бы способом проверять чужие почты. Но действия он предлагает такие,
 * которые сработают в любом случае.
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
        <ScreenHeader title="Почти готово" back="/" />

        {resent ? (
          <p className="notice notice-gold mb-6">
            Если для этого адреса нужно письмо, оно отправлено.
          </p>
        ) : null}

        <p className="text-lg leading-snug">
          Возможно, аккаунт с такой почтой у тебя уже есть — тогда новый не создаётся, и войти
          нужно старым паролем.
        </p>

        <div className="mt-8 space-y-3">
          <ButtonLink href="/login" size="lg">
            Войти
          </ButtonLink>
          <Link href="/reset-password" className="btn btn-ghost btn-block">
            Не помню пароль
          </Link>
        </div>

        <div className="mt-10 border-t border-[var(--line)] pt-8">
          <p className="text-slate">
            Если аккаунта раньше не было и ты ждёшь письмо с подтверждением — проверь «Спам», а при
            необходимости отправь его ещё раз.
          </p>
          <div className="mt-5">
            <ResendForm />
          </div>
        </div>
      </Screen>
    </main>
  );
}
