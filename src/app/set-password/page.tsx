import { redirect } from 'next/navigation';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Brand } from '@/components/ui/Brand';
import { SetPasswordForm } from '@/app/purchase/success/SetPasswordForm';
import { requireUser, needsPassword } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * Шлагбаум для аккаунтов, созданных оплатой.
 *
 * Намеренно использует requireUser, а не requireProfile: requireProfile сам
 * перенаправляет сюда, и вызов оттуда же закольцевал бы редиректы.
 */
export default async function SetPasswordPage() {
  await requireUser();

  // Пароль уже есть — экран отработал своё и больше не показывается.
  if (!(await needsPassword())) redirect('/app');

  return (
    <main>
      <Screen>
        <div className="pt-8">
          <Brand />
        </div>
        <ScreenHeader title="Придумай пароль" />

        <p className="text-lg leading-snug">
          Курс оплачен и открыт. Остался один шаг: пароль, чтобы заходить с любого телефона.
        </p>
        <p className="mt-4 text-slate">
          Сейчас ты внутри, потому что вернулся сразу после оплаты. Если закрыть браузер или
          очистить его память, без пароля войти не получится.
        </p>

        <div className="mt-8">
          <SetPasswordForm />
        </div>
      </Screen>
    </main>
  );
}
