import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type LessonPhrase = {
  id: string;
  germanText: string;
  translation: string;
  pronunciation: string | null;
};

export type LessonView = {
  id: string;
  slug: string;
  title: string;
  goal: string | null;
  phrases: LessonPhrase[];
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
 * Real numbers, computed from the content this user can actually reach.
 * The denominators come from the course itself — a user with two accessible
 * modules sees the size of those two modules, not an invented constant.
 */
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

/**
 * Course order decides what comes next — module order, then lesson order,
 * with core content ahead of trade content. Nothing here is hardcoded, and
 * a profession module only appears for a user who selected that profession.
 */
export async function getNextLessonSlug(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('next_lesson');
  if (error) return null;
  return data ?? null;
}

/**
 * Phrase filtering is RLS's job, not this query's: a draft phrase, or a
 * safety phrase without safety approval, is already absent from the result.
 */
export async function getLesson(slug: string, locale: string): Promise<LessonView | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('lessons')
    .select(
      `id, slug,
       lesson_translations(title, goal, language_code),
       lesson_phrases(order_index,
         phrases(id, german_text,
           phrase_translations(text, pronunciation, language_code)))`,
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) return null;

  const meta = pickByLocale(data.lesson_translations, locale);

  const phrases: LessonPhrase[] = data.lesson_phrases
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap((link) => {
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
