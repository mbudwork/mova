import { ButtonLink } from '@/components/ui/Button';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { requireOnboarded } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * Optional by design: nothing in the app requires this test, and skipping it
 * costs the user nothing. It exists for people who want to start further in.
 */
export default async function CheckPage() {
  await requireOnboarded();

  return (
    <Screen>
      <ScreenHeader title="Проверить уровень" back="/app" />
      <p className="text-lg">
        Десять коротких записей. Слушаешь и выбираешь, что от тебя хотят. Около двух минут.
      </p>
      <p className="mt-4 text-slate">
        Проверку можно пропустить — курс начнётся с самого начала.
      </p>

      <div className="mt-10 space-y-3">
        <ButtonLink href="/app" size="lg" variant="quiet">
          Пропустить и начать урок
        </ButtonLink>
      </div>
    </Screen>
  );
}
