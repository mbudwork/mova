'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireOnboarded } from '@/lib/auth/guards';

export type CompletionResult = { nextSlug: string | null } | { error: string };

/**
 * Completion is idempotent in the database: complete_lesson() writes
 * completed_at once and never moves it, and seeds spaced-repetition rows only
 * for phrases the user has not met. Replaying a lesson therefore cannot
 * inflate progress — that guarantee lives in one place, not in every caller.
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
