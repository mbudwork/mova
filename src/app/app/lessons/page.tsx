import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
import { requireOnboarded } from '@/lib/auth/guards';
import { getLessonList } from '@/lib/content/course';
import { withPlural, FORMS } from '@/lib/plural';

export const dynamic = 'force-dynamic';

/**
 * Список уроков — единственный способ вернуться к уже пройденному.
 *
 * Кнопка «Продолжить» на главной ведёт только вперёд, на следующий
 * непройденный урок. Сама страница урока повторение допускает и даже
 * подписывает «это повторение» — дойти до неё было нечем.
 */
export default async function LessonsPage() {
  const profile = await requireOnboarded();
  const lessons = await getLessonList(profile.uiLocale);

  if (lessons.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Уроки" back="/app" />
        <EmptyState
          title="Уроки пока недоступны"
          hint="Открой полный доступ, чтобы начать курс."
          action={<ButtonLink href="/purchase">Открыть полный доступ</ButtonLink>}
        />
      </Screen>
    );
  }

  const done = lessons.filter((l) => l.completed).length;

  /*
    Две группы вместо сплошного списка. «Общая часть» и «Твоя профессия» — то
    же деление, которое обещано на лендинге, и человек должен видеть его
    внутри курса, иначе обещание остаётся словами. Заодно это сняло нужду в
    отдельном экране профессии, который всё равно был заглушкой.
  */
  const groups = [
    { title: 'Общая часть', items: lessons.filter((l) => l.moduleSlug === 'core') },
    { title: 'Твоя профессия', items: lessons.filter((l) => l.moduleSlug !== 'core') },
  ].filter((g) => g.items.length > 0);

  return (
    <Screen>
      <ScreenHeader title="Уроки" back="/app" />
      <p className="-mt-2 mb-5 text-slate">
        Пройдено {done} из {lessons.length}. Любой урок можно открыть заново — прогресс не
        сбросится.
      </p>

      {groups.map((group) => (
        <section key={group.title} className="mb-8">
          <p className="eyebrow mb-3">{group.title}</p>
          <ol className="space-y-3">
            {group.items.map((lesson, index) => (
              <li key={lesson.slug}>
                <Link
                  href={`/app/lesson/${lesson.slug}`}
                  className="card flex items-center gap-4 px-5 py-4"
                >
                  <span
                    aria-hidden
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                      lesson.completed ? 'bg-good text-white' : 'bg-ink-3 text-slate'
                    }`}
                  >
                    {lesson.completed ? '✓' : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-tight tracking-tight">
                      {lesson.title}
                    </span>
                    <span className="block text-sm text-slate">
                      {withPlural(lesson.phraseCount, FORMS.phrase)}
                      {lesson.completed ? ' · пройден' : ''}
                    </span>
                  </span>
                  <span aria-hidden className="text-xl text-mist">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Screen>
  );
}
