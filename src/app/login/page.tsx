import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { signIn } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';

/**
 * `next` comes from proxy.ts when it bounces an anonymous request off a
 * protected route. It used to be set and then ignored, so a user sent here
 * from /onboarding was dropped on /app instead.
 *
 * `error` comes from /auth/callback when the confirmation link fails — until
 * now it was passed and never rendered, so an expired link looked like a
 * blank login form.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const linkProblem =
    error === 'expired_link'
      ? 'Ссылка из письма больше не действует.'
      : error === 'missing_code'
        ? 'Ссылка из письма открылась не полностью.'
        : null;

  return (
    <main>
      <Screen>
        <div className="pt-8">
          <Brand />
        </div>
        <ScreenHeader title="Вход" back="/" />

        {linkProblem ? (
          <div className="mb-6 notice notice-bad">
            <p>{linkProblem}</p>
            <p className="mt-2 font-normal text-slate">
              <Link href="/register/check-email" className="font-bold text-gold-deep underline">
                Отправить письмо ещё раз
              </Link>
            </p>
          </div>
        ) : null}

        <AuthForm mode="login" action={signIn} next={next} />

        <p className="pt-6 text-center">
          <Link href="/reset-password" className="font-bold text-gold-deep underline">
            Забыл пароль
          </Link>
        </p>
      </Screen>
    </main>
  );
}
