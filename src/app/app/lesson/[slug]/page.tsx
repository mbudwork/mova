import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { LessonExerciseClient } from '@/components/LessonExerciseClient';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded, hasFullAccess } from '@/lib/auth/guards';
import { getFollowingLessonSlug, getLesson, isLessonCompleted } from '@/lib/content/course';
import { startLesson } from '@/lib/content/actions';

export const dynamic = 'force-dynamic';

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await requireOnboarded();
  const lesson = await getLesson(slug, profile.uiLocale);

  if (!lesson) notFound();

  /*
    Три независимых обращения к базе идут разом, а не по очереди. Отметка о
    начале урока — запись, её результат никому не нужен, но бросать промис без
    ожидания в серверном компоненте нельзя: он может не успеть выполниться.
  */
  const [, alreadyDone, followingSlug] = await Promise.all([
    startLesson(lesson.id),
    isLessonCompleted(lesson.id, profile.id),
    getFollowingLessonSlug(lesson.id),
  ]);

  if (lesson.phrases.length === 0) {
    const entitled = await hasFullAccess();
    return (
      <Screen>
        <ScreenHeader title={lesson.title} back="/app" />
        {entitled ? (
          <EmptyState
            title="В уроке пока нет фраз"
            hint="Контент проверяется и появится здесь после утверждения."
            action={
              <ButtonLink href="/app" variant="ghost">
                На главную
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            title="Этот урок в полном доступе"
            hint="Открой полный курс, чтобы продолжить с этого места."
            action={<ButtonLink href="/purchase">Открыть полный доступ</ButtonLink>}
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={lesson.title} back="/app" />
      {lesson.goal ? <p className="-mt-2 mb-2 text-slate">{lesson.goal}</p> : null}
      {alreadyDone ? (
        <p className="mb-4 text-sm font-bold text-good">Урок уже пройден — это повторение</p>
      ) : null}
      <LessonExerciseClient
        lessonId={lesson.id}
        phrases={lesson.phrases}
        followingSlug={followingSlug}
      />
    </Screen>
  );
}
