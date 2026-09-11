'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ScoredExercise } from '@/components/ScoredExercise';
import { completeLesson } from '@/lib/content/actions';
import { track } from '@/lib/analytics/client';
import type { ExercisePhrase } from '@/lib/content/course';

/** Thin client wrapper: ScoredExercise handles the per-question loop, this
 * handles what happens once every phrase in the lesson has been answered —
 * marking the lesson complete and moving to whatever next_lesson() says. */
export function LessonExerciseClient({
  lessonId,
  phrases,
}: {
  lessonId: string;
  phrases: ExercisePhrase[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function finish() {
    startTransition(async () => {
      const result = await completeLesson(lessonId);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      // Событие не писалось вовсе: в базе 34 пройденных урока и ноль
      // lesson_completed. Воронка обрывалась ровно там, где начинается
      // удержание, — а именно оно решает, вернётся человек завтра или нет.
      track('lesson_completed', { lesson_id: lessonId });

      router.push(result.nextSlug ? `/app/lesson/${result.nextSlug}` : '/app');
    });
  }

  if (error) {
    return (
      <p role="alert" className="notice notice-bad">
        {error}
      </p>
    );
  }

  return (
    <>
      <ScoredExercise phrases={phrases} mode="lesson" onFinish={finish} />
      {/*
        Ожидание теперь видно глазами, а не только экранному диктору. Переход
        к следующему уроку занимает заметное время — грузятся фразы и ссылки на
        озвучку, — и без подписи кнопка выглядела зависшей.
      */}
      {pending ? (
        <p role="status" className="mt-4 text-center text-slate">
          Сохраняю урок…
        </p>
      ) : null}
    </>
  );
}
