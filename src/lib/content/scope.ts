import 'server-only';

import { unstable_cache } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CourseScope = {
  lessons: number;
  phrases: number;
  vocabulary: number;
  trades: string[];
  /** Одобренные фразы общего модуля — «язык стройки», который учат все. */
  corePhrases: number;
  /** Одобренные фразы профессиональных модулей, суммарно по всем шести. */
  professionPhrases: number;
};

/**
 * Numbers shown on the landing page come from the production database, never
 * from a constant. If the course grows or shrinks, the claim moves with it —
 * and if the query fails, the section renders zeros rather than a stale boast.
 *
 * Counting runs with the service role because an anonymous visitor legitimately
 * cannot read the course tables. Only aggregate counts and profession names
 * leave this function; no content crosses the boundary.
 */
/**
 * Объём курса кэшируется на пять минут.
 *
 * Считается он четырьмя запросами с вложенными соединениями, а меняется раз в
 * недели — когда публикуются новые уроки. Пересчитывать это на каждый показ
 * лендинга, включая заходы поисковых роботов, значит платить за неизменные
 * цифры сетевой задержкой в самом начале отрисовки.
 *
 * Пять минут, а не час: после публикации контента приятно увидеть новые числа
 * на витрине сразу, а не после сброса кэша вручную.
 */
export const getCourseScope = unstable_cache(
  async (): Promise<CourseScope> => getCourseScopeUncached(),
  ['course-scope'],
  { revalidate: 300, tags: ['course-scope'] },
);

async function getCourseScopeUncached(): Promise<CourseScope> {
  const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const admin = createSupabaseAdminClient();

  try {
    /*
      CORE и профессиональные фразы считаются отдельно: лендинг обещает
      «столько-то общих плюс модуль профессии», и это обещание должно
      считаться из базы. В макете стояло 232 CORE — число, которого в курсе
      никогда не было, и повторять его на живом сайте значит завышать объём.
    */
    const [lessons, phrases, vocabulary, trades, core, prof] = await Promise.all([
      admin.from('lessons').select('*', { count: 'exact', head: true }).eq('is_published', true),
      admin.from('phrases').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved'),
      admin
        .from('vocabulary_items')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'approved'),
      admin
        .from('modules')
        .select('scope, is_published, professions(profession_translations(name, language_code))')
        .eq('scope', 'profession')
        .eq('is_published', true),
      admin.rpc('count_scope_phrases', { p_scope: 'core' }),
      admin.rpc('count_scope_phrases', { p_scope: 'profession' }),
    ]);

    const tradeNames: string[] = [];
    for (const row of trades.data ?? []) {
      const translations = row.professions?.profession_translations ?? [];
      const ru = translations.find((t) => t.language_code === 'ru');
      if (ru) tradeNames.push(ru.name.split('/')[0]!.trim());
    }

    return {
      lessons: lessons.count ?? 0,
      phrases: phrases.count ?? 0,
      vocabulary: vocabulary.count ?? 0,
      trades: tradeNames.sort(),
      corePhrases: core.data ?? 0,
      professionPhrases: prof.data ?? 0,
    };
  } catch {
    return {
      lessons: 0,
      phrases: 0,
      vocabulary: 0,
      trades: [],
      corePhrases: 0,
      professionPhrases: 0,
    };
  }
}

/** Keeps the marketing surface honest: never render a claim we cannot count. */
export async function createSupabaseServerClientForScope() {
  return createSupabaseServerClient();
}
