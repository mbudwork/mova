import { ButtonLink } from '@/components/ui/Button';
import { ReviewSessionClient } from '@/components/ReviewSessionClient';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';
import { getReviewSession } from '@/lib/content/course';
import { plural, FORMS } from '@/lib/plural';

export const dynamic = 'force-dynamic';

/** Через сколько часов подойдёт ближайшая фраза. Округляем вверх: «через 0
 *  часов» звучит как ошибка, а «меньше часа» — как ответ. */
function untilLabel(iso: string | null): string {
  if (!iso) return '';
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return '';
  const hours = Math.ceil(diffMs / 3_600_000);
  if (hours <= 1) return 'меньше чем через час';
  if (hours < 24) return `примерно через ${hours} ч`;
  return `завтра`;
}

export default async function ReviewPage() {
  const profile = await requireOnboarded();
  const session = await getReviewSession(profile.uiLocale);

  if (session.phrases.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Повторение" back="/app" />
        <EmptyState
          title="Пока нечего повторять"
          hint="Фразы появятся здесь сами: по расписанию или после ошибки в уроке."
          action={
            <ButtonLink href="/app/lessons" variant="ghost">
              К урокам
            </ButtonLink>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Повторение" back="/app" />

      {/*
        Раньше при пустой очереди экран говорил «пока нечего повторять» даже
        человеку, который только что ошибся девять раз: ошибка ставит показ
        через четыре часа. Формально верно, по ощущению — сломано, причём в
        момент, когда желание разобраться выше всего. Теперь такие фразы
        доступны сразу, но честно помечены как тренировка вне расписания:
        расписание от неё не сдвигается.
      */}
      {session.aheadOfSchedule ? (
        <p className="-mt-2 mb-4 text-slate">
          По расписанию пока ничего нет — ближайшая {untilLabel(session.nextDueAt)}. Но у тебя{' '}
          <b className="text-cream">{session.weakTotal}</b> {plural(session.weakTotal, FORMS.weak)}{' '}
          {plural(session.weakTotal, FORMS.phrase)}, и их можно прогнать прямо сейчас. На
          расписание это не повлияет.
        </p>
      ) : null}

      <ReviewSessionClient phrases={session.phrases} />
    </Screen>
  );
}
