import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { requireOnboarded } from '@/lib/auth/guards';
import { withPlural, FORMS } from '@/lib/plural';
import { getCoreScope, getProfessionChoices, getUserProfessions } from '@/lib/content/professions';
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
  const [choices, mine, core] = await Promise.all([
    getProfessionChoices(profile.uiLocale),
    getUserProfessions(),
    getCoreScope(),
  ]);

  return (
    <Screen>
      <ScreenHeader title="Моя профессия" back="/app" />
      {/*
        Общая часть показана отдельной карточкой сверху, а не упомянута в
        тексте. Раньше человек видел у профессии «4 урока · 42 фразы» и решал,
        что весь курс такой, — цифра верная, но она описывает надстройку над
        двадцатью восемью уроками, о которых экран молчал.
      */}
      <div className="card mb-6 p-5">
        <p className="eyebrow">Общая часть — у всех одинаковая</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight">
          {withPlural(core.lessons, FORMS.lesson)} · {withPlural(core.phrases, FORMS.phrase)}
        </p>
        <p className="mt-1 text-sm text-slate">
          Команды, которые слышит любой рабочий: принеси, подожди, сначала закончи это.
        </p>
      </div>

      <p className="mb-4 text-slate">
        Профессия добавляет свои уроки поверх общей части. Можно взять несколько — например,
        закрыть свою специальность и перейти к смежной.
      </p>

      <ProfessionPicker
        choices={choices}
        selectedIds={mine.ids}
        primaryId={mine.primaryId}
        core={core}
      />
    </Screen>
  );
}
