import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function SayPage() {
  await requireOnboarded();

  return (
    <Screen>
      <ScreenHeader title="Быстро сказать" back="/app" />

      <label className="block">
        <span className="sr-only">Что нужно сказать</span>
        <input
          type="search"
          disabled
          placeholder="закончился клей"
          className="min-h-[68px] w-full rounded-[18px] border border-[var(--line-light)] bg-paper px-4 text-lg"
        />
      </label>

      <div className="mt-6">
        <EmptyState
          title="Поиск заработает в следующем шаге"
          hint="Ищет только по проверенным фразам. Найдёшь нужную — покажешь немцу на весь экран."
        />
      </div>
    </Screen>
  );
}
