'use client';

import { useRouter } from 'next/navigation';
import { ScoredExercise } from '@/components/ScoredExercise';
import type { ExercisePhrase } from '@/lib/content/course';

/** Review has no "lesson" to complete — finishing just returns home. Each
 * answer already updated phrase_progress via the same submitAnswer() path
 * the lesson uses. */
export function ReviewSessionClient({ phrases }: { phrases: ExercisePhrase[] }) {
  const router = useRouter();
  return <ScoredExercise phrases={phrases} mode="review" onFinish={() => router.push('/app')} />;
}
