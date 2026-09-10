import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { requireOnboarded } from '@/lib/auth/guards';
import { getProfessionChoices, getCurrentProfessionId } from '@/lib/content/professions';
import { ProfessionPicker } from './ProfessionPicker';

export const dynamic = 'force-dynamic';

/**
 * Смена профессии.
 *
 * Экран был заглушкой, потом редиректом. Теперь он делает то, что обещал с
 * самого начала: даёт поменять специальность. Это нужно чаще, чем кажется —
 * двое из первых пользователей выбрали «Разнорабочего» и остались без
 * профессионального модуля, а исправить это можно было только через базу.
 */
export default async function ProfessionPage() {
  const profile = await requireOnboarded();
  const [choices, currentId] = await Promise.all([
    getProfessionChoices(profile.uiLocale),
    getCurrentProfessionId(),
  ]);

  return (
    <Screen>
      <ScreenHeader title="Моя профессия" back="/app" />
      <p className="-mt-2 mb-6 text-slate">
        Общая часть курса одна для всех. Профессия добавляет к ней свои уроки — и её можно
        поменять в любой момент, прогресс не сбросится.
      </p>
      <ProfessionPicker choices={choices} currentId={currentId} />
    </Screen>
  );
}
