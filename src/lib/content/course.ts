import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAudioProvider } from '@/lib/audio/provider';
import { buildOptions, type ExerciseOption } from '@/lib/exercise';

export type ExercisePhrase = {
  id: string;
  germanText: string;
  translation: string;
  pronunciation: string | null;
  /** Signed URL for the approved clip, or null when none exists yet. */
  audioUrl: string | null;
  options: ExerciseOption[];
};

export type LessonView = {
  id: string;
  slug: string;
  title: string;
  goal: string | null;
  phrases: ExercisePhrase[];
};

export type CourseProgress = {
  lessonsTotal: number;
  lessonsCompleted: number;
  phrasesTotal: number;
  phrasesLearned: number;
};

function pickByLocale<T extends { language_code: string }>(rows: T[], locale: string): T | null {
  return rows.find((row) => row.language_code === locale) ?? rows[0] ?? null;
}

/**
 * Mints one signed URL per phrase, in parallel.
 *
 * The exercise is a LISTENING exercise: the whole product is "прораб сказал —
 * что он сказал?". Until now nothing on this path ever asked for audio, so the
 * lesson screen hardcoded a reading fallback and 564 recorded clips were never
 * heard by anyone. A phrase with no approved asset still resolves to null, and
 * that phrase alone falls back to reading.
 */
async function attachAudio<T extends { id: string }>(
  rows: T[],
): Promise<(T & { audioUrl: string | null })[]> {
  const audio = createAudioProvider();
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      audioUrl: (await audio.getTrack(row.id))?.url ?? null,
    })),
  );
}

export async function getCourseProgress(): Promise<CourseProgress> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('course_progress');
  const row = data?.[0];
  if (error || !row) {
    return { lessonsTotal: 0, lessonsCompleted: 0, phrasesTotal: 0, phrasesLearned: 0 };
  }
  return {
    lessonsTotal: row.lessons_total ?? 0,
    lessonsCompleted: row.lessons_completed ?? 0,
    phrasesTotal: row.phrases_total ?? 0,
    phrasesLearned: row.phrases_learned ?? 0,
  };
}

export async function getNextLessonSlug(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('next_lesson');
  if (error) return null;
  return data ?? null;
}

/**
 * A lesson is built ONLY from role='primary' phrases — the fix for the audit
 * finding that getLesson() previously returned every lesson_phrases row
 * regardless of role, silently doubling lesson length with untagged review
 * material. The filter happens in TypeScript rather than as a PostgREST
 * embedded-resource filter (`.eq('lesson_phrases.role', ...)`) because that
 * embedded-filter behaviour has never been exercised against a live
 * PostgREST instance in this project — see docs/COURSE_ENGINE_V1_REPORT.md.
 * Filtering the fetched rows in JS is unambiguous regardless of that layer.
 */
export async function getLesson(slug: string, locale: string): Promise<LessonView | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('lessons')
    .select(
      `id, slug,
       lesson_translations(title, goal, language_code),
       lesson_phrases(order_index, role,
         phrases(id, german_text,
           phrase_translations(text, pronunciation, language_code)))`,
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) return null;

  const meta = pickByLocale(data.lesson_translations, locale);

  const primaryLinks = data.lesson_phrases
    .filter((link) => link.role === 'primary')
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  const source = primaryLinks.flatMap((link) => {
    const phrase = link.phrases;
    if (!phrase) return [];
    const translation = pickByLocale(phrase.phrase_translations, locale);
    return [
      {
        id: phrase.id,
        germanText: phrase.german_text,
        translation: translation?.text ?? '',
        pronunciation: translation?.pronunciation ?? null,
      },
    ];
  });

  const withAudio = await attachAudio(source);
  const phrases: ExercisePhrase[] = withAudio.map((p) => ({
    ...p,
    options: buildOptions(p, source),
  }));

  return {
    id: data.id,
    slug: data.slug,
    title: meta?.title ?? 'Урок',
    goal: meta?.goal ?? null,
    phrases,
  };
}

export async function isLessonCompleted(lessonId: string, userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('lesson_progress')
    .select('status')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  return data?.status === 'completed';
}

/**
 * A review session: due-by-time or WEAK phrases for this user, capped at a
 * small batch. Distractor options are built from the OTHER phrases in the
 * same batch — real content, contextually mixed rather than same-lesson,
 * which is appropriate since review phrases by definition come from
 * different lessons.
 */
export async function getReviewSession(locale: string, limit = 8): Promise<ExercisePhrase[]> {
  const supabase = await createSupabaseServerClient();

  const { data: due, error: dueError } = await supabase.rpc('due_review_phrases', {
    p_limit: limit,
  });
  if (dueError || !due || due.length === 0) return [];

  const ids = due.map((d) => d.phrase_id).filter((id): id is string => id !== null);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('phrases')
    .select('id, german_text, phrase_translations(text, pronunciation, language_code)')
    .in('id', ids);

  if (error || !data) return [];

  // Preserve the due-queue's own order (weak-first, then oldest-overdue).
  const order = new Map(ids.map((id, i) => [id, i]));
  const source = data
    .map((phrase) => {
      const translation = pickByLocale(phrase.phrase_translations, locale);
      return {
        id: phrase.id,
        germanText: phrase.german_text,
        translation: translation?.text ?? '',
        pronunciation: translation?.pronunciation ?? null,
      };
    })
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const withAudio = await attachAudio(source);
  return withAudio.map((p) => ({ ...p, options: buildOptions(p, source) }));
}
