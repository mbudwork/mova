import { AuthForm } from '@/components/AuthForm';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { signUp } from '@/app/auth/actions';

export default function RegisterPage() {
  return (
    <main>
      <Screen>
        <ScreenHeader title="Создать аккаунт" back="/" />
        <p className="mb-6 text-slate">Два вопроса после регистрации — и сразу первый урок.</p>
        <AuthForm mode="register" action={signUp} />
      </Screen>
    </main>
  );
}
