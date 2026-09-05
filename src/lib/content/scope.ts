import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CourseScope = {
  lessons: number;
  phrases: number;
  vocabulary: number;
  trades: string[];
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
export async function getCourseScope(): Promise<CourseScope> {
  const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const admin = createSupabaseAdminClient();

  try {
    const [lessons, phrases, vocabulary, trades] = await Promise.all([
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
    };
  } catch {
    return { lessons: 0, phrases: 0, vocabulary: 0, trades: [] };
  }
}

/** Keeps the marketing surface honest: never render a claim we cannot count. */
export async function createSupabaseServerClientForScope() {
  return createSupabaseServerClient();
}
