import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { SetPasswordForm } from '@/app/purchase/success/SetPasswordForm';
import { requireUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * Смена пароля. Сюда приводит ссылка из письма о восстановлении: /auth/callback
 * меняет одноразовый код на сессию и передаёт человека дальше уже вошедшим.
 *
 * requireUser, а не requireProfile: requireProfile умеет перенаправлять на
 * /set-password, и для того, кто именно пароль сейчас и задаёт, это был бы
 * лишний круг.
 */
export default async function AccountPasswordPage() {
  await requireUser();

  return (
    <main>
      <Screen>
        <div className="pt-8">
          <Brand />
        </div>
        <ScreenHeader title="Новый пароль" back="/app" />
        <p className="text-lg leading-snug">Придумай новый пароль — старый перестанет работать.</p>
        <div className="mt-8">
          <SetPasswordForm />
        </div>
      </Screen>
    </main>
  );
}
