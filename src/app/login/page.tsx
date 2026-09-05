import { AuthForm } from '@/components/AuthForm';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { signIn } from '@/app/auth/actions';

export default function LoginPage() {
  return (
    <main>
      <Screen>
        <ScreenHeader title="Вход" back="/" />
        <AuthForm mode="login" action={signIn} />
      </Screen>
    </main>
  );
}
