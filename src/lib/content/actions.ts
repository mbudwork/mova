'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireOnboarded } from '@/lib/auth/guards';

export type CompletionResult = { nextSlug: string | null } | { error: string };
export type AnswerResult = { state: string; nextReviewAt: string } | { error: string };

/**
 * The single write path for phrase_progress. Called exactly once per scored
 * exercise, the moment the user answers — not batched at lesson end. The
 * state machine and interval schedule live in the database
 * (record_answer()), not here, so the rule is enforced once regardless of
 * which screen calls it (lesson or review).
 */
export async function submitAnswer(phraseId: string, correct: boolean): Promise<AnswerResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc('record_answer', {
    p_phrase_id: phraseId,
    p_correct: correct,
  });

  if (error || !data?.[0]) return { error: 'Не получилось сохранить ответ. Проверь интернет.' };

  const row = data[0];
  return { state: row.state ?? 'learning', nextReviewAt: row.next_review_at ?? '' };
}

/**
 * Lesson completion is now purely bookkeeping (lesson_progress): every
 * phrase's understanding was already recorded by submitAnswer() as the user
 * went through the lesson. Idempotent — see complete_lesson() in migration
 * 0008.
 */
export async function completeLesson(lessonId: string): Promise<CompletionResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc('complete_lesson', { p_lesson_id: lessonId });
  if (error) return { error: 'Не получилось сохранить урок. Проверь интернет.' };

  const { data: nextSlug } = await supabase.rpc('next_lesson');
  revalidatePath('/app');
  return { nextSlug: nextSlug ?? null };
}

export async function startLesson(lessonId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc('start_lesson', { p_lesson_id: lessonId });
}
