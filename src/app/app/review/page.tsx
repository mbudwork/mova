import { ButtonLink } from '@/components/ui/Button';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  await requireOnboarded();

  return (
    <Screen>
      <ScreenHeader title="Повторить слабые фразы" back="/app" />
      <EmptyState
        title="Пока нечего повторять"
        hint="Фразы, в которых ты ошибся, вернутся сюда сами."
        action={
          <ButtonLink href="/app" variant="quiet">
            К урокам
          </ButtonLink>
        }
      />
    </Screen>
  );
}
