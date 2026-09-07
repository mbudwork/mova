'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ScoredExercise } from '@/components/ScoredExercise';
import { completeLesson } from '@/lib/content/actions';
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
      {pending ? <p className="sr-only" role="status">Сохраняю урок…</p> : null}
    </>
  );
}
