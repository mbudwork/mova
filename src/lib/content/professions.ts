import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ProfessionChoice = {
  id: string;
  name: string;
  /** Уроков в собственном модуле профессии. Ноль — модуля ещё нет. */
  lessons: number;
  /** Фраз в этих уроках. Показывается, чтобы выбор был осознанным. */
  phrases: number;
};

/**
 * Список профессий для выбора — с реальным объёмом каждой.
 *
 * Раньше экран просто перечислял названия, и «Разнорабочий / Allgemein»
 * стоял первым, хотя у него нет ни одного урока. Человек по инерции жал
 * верхний вариант и получал половину продукта, не понимая почему.
 *
 * Числа считаются из базы, а не подписываются руками: появятся уроки —
 * цифра вырастет сама, и никто не забудет обновить подпись.
 */
export async function getProfessionChoices(locale: string): Promise<ProfessionChoice[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: professions, error }, { data: names }, { data: modules }] = await Promise.all([
    supabase.from('professions').select('id, sort_order').eq('is_active', true).order('sort_order'),
    supabase
      .from('profession_translations')
      .select('profession_id, name')
      .eq('language_code', locale === 'uk' ? 'uk' : 'ru'),
    supabase
      .from('modules')
      .select('id, profession_id, lessons(id, is_published, lesson_phrases(role))')
      .eq('scope', 'profession')
      .eq('is_published', true),
  ]);

  if (error || !professions) return [];

  const nameById = new Map((names ?? []).map((row) => [row.profession_id, row.name]));

  const stats = new Map<string, { lessons: number; phrases: number }>();
  for (const module of modules ?? []) {
    if (!module.profession_id) continue;
    const published = module.lessons.filter((lesson) => lesson.is_published);
    const phrases = published.reduce(
      (sum, lesson) => sum + lesson.lesson_phrases.filter((lp) => lp.role === 'primary').length,
      0,
    );
    const current = stats.get(module.profession_id) ?? { lessons: 0, phrases: 0 };
    stats.set(module.profession_id, {
      lessons: current.lessons + published.length,
      phrases: current.phrases + phrases,
    });
  }

  return professions.map((row) => {
    const stat = stats.get(row.id) ?? { lessons: 0, phrases: 0 };
    return {
      id: row.id,
      name: nameById.get(row.id) ?? 'Allgemein',
      lessons: stat.lessons,
      phrases: stat.phrases,
    };
  });
}

/** Текущая профессия пользователя, если выбрана. */
export async function getCurrentProfessionId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('profiles').select('primary_profession_id').maybeSingle();
  return data?.primary_profession_id ?? null;
}
