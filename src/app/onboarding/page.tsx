import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/States';
import { requireUser } from '@/lib/auth/guards';
import { getProfessionChoices } from '@/lib/content/professions';
import { OnboardingFlow } from './OnboardingFlow';
import { completeOnboarding } from './actions';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  await requireUser();

  // Тот же источник, что у экрана смены профессии: список с реальным объёмом
  // каждой специальности. Иначе два экрана про одно и то же начинают
  // расходиться — на одном подписи есть, на другом нет.
  const professions = await getProfessionChoices('ru');

  if (professions.length === 0) {
    return (
      <main>
        <Screen>
          <div className="pt-10">
            <ErrorState
              title="Список профессий не загрузился"
              hint="Проверь интернет и обнови страницу."
            />
          </div>
        </Screen>
      </main>
    );
  }

  return (
    <main>
      <Screen>
        <div className="pt-8">
          <OnboardingFlow professions={professions} action={completeOnboarding} />
        </div>
      </Screen>
    </main>
  );
}
