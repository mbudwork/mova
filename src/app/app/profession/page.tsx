import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function ProfessionPage() {
  await requireOnboarded();

  return (
    <Screen>
      <ScreenHeader title="Моя профессия" back="/app" />
      <EmptyState
        title="Сначала общая часть"
        hint="Слова и команды твоей специальности открываются после основного курса."
      />
    </Screen>
  );
}
