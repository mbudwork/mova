import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function DictionaryPage() {
  await requireOnboarded();

  return (
    <Screen>
      <ScreenHeader title="Словарь" back="/app" />
      <EmptyState
        title="Словарь подключается следующим"
        hint="Инструменты, материалы и размеры — с официальным словом и тем, как говорят на стройке."
      />
    </Screen>
  );
}
