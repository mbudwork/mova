import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { ButtonLink } from '@/components/ui/Button';
import { requireUser } from '@/lib/auth/guards';
import { EmailForm } from './EmailForm';

export const dynamic = 'force-dynamic';

export default async function AccountEmailPage() {
  const user = await requireUser();

  return (
    <Screen>
      <ScreenHeader title="Почта и вход" back="/app" />
      <p className="-mt-2 mb-6 text-slate">
        Этот адрес — твой логин. На него приходят подтверждение покупки и ссылка для
        восстановления пароля.
      </p>
      <EmailForm current={user.email ?? ''} />

      <div className="mt-10 border-t border-[var(--line)] pt-8">
        <p className="text-slate">Пароль меняется на отдельном экране.</p>
        <div className="mt-4">
          <ButtonLink href="/account/password" variant="ghost">
            Сменить пароль
          </ButtonLink>
        </div>
      </div>
    </Screen>
  );
}
