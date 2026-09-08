import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { ResetRequestForm } from './ResetRequestForm';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <main>
      <Screen>
        <div className="pt-8">
          <Brand />
        </div>
        <ScreenHeader title="Забыл пароль" back="/login" />

        {sent ? (
          <>
            <p className="notice notice-gold">Если такой аккаунт есть, письмо отправлено.</p>
            <p className="mt-4 text-slate">
              Открой письмо и нажми ссылку — откроется экран, где можно задать новый пароль.
              Загляни в «Спам»: письма о паролях часто попадают туда.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg leading-snug">
              Введи почту, на которую оформлял доступ. Пришлём ссылку для смены пароля.
            </p>
            <div className="mt-8">
              <ResetRequestForm />
            </div>
          </>
        )}

        <p className="pt-8 text-center text-slate">
          Вспомнил?{' '}
          <Link href="/login" className="font-bold text-gold-deep underline">
            Войти
          </Link>
        </p>
      </Screen>
    </main>
  );
}
