import 'server-only';

import { unstable_cache } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Объём общей части — она одна для всех и составляет большую половину курса. */
export type CoreScope = { lessons: number; phrases: number };

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
export const getProfessionChoices = unstable_cache(
  async (locale: string): Promise<ProfessionChoice[]> => getProfessionChoicesUncached(locale),
  ['profession-choices'],
  { revalidate: 300, tags: ['course-scope'] },
);

/*
  Читается админ-клиентом, а не пользовательским, по двум причинам сразу.

  Первая: unstable_cache не работает поверх запросов, которые читают куки, —
  а пользовательский клиент читает их всегда. Вторая: здесь нет ничего
  личного. Названия профессий и число уроков в каждой — витрина курса, она
  одинакова для всех и видна ещё до регистрации.
*/
async function getProfessionChoicesUncached(locale: string): Promise<ProfessionChoice[]> {
  const supabase = createSupabaseAdminClient();

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

/**
 * Сколько уроков и фраз в общей части.
 *
 * Нужно экрану выбора профессии. Там человек видел «4 урока · 42 фразы» и
 * решал, что весь курс такой — хотя это только надстройка над общей частью из
 * двадцати восьми уроков. Цифра верная, подача обманывала.
 */
export const getCoreScope = unstable_cache(
  async (): Promise<CoreScope> => getCoreScopeUncached(),
  ['core-scope'],
  { revalidate: 300, tags: ['course-scope'] },
);

async function getCoreScopeUncached(): Promise<CoreScope> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('modules')
    .select('lessons(id, is_published, lesson_phrases(role))')
    .eq('scope', 'core')
    .eq('is_published', true);

  if (error || !data) return { lessons: 0, phrases: 0 };

  let lessons = 0;
  let phrases = 0;
  for (const module of data) {
    for (const lesson of module.lessons) {
      if (!lesson.is_published) continue;
      lessons += 1;
      phrases += lesson.lesson_phrases.filter((lp) => lp.role === 'primary').length;
    }
  }
  return { lessons, phrases };
}

/** Профессии пользователя: весь набор и та, что отмечена основной. */
export async function getUserProfessions(): Promise<{ ids: string[]; primaryId: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_professions')
    .select('profession_id, is_primary');

  if (error || !data) return { ids: [], primaryId: null };

  return {
    ids: data.map((row) => row.profession_id),
    primaryId: data.find((row) => row.is_primary)?.profession_id ?? data[0]?.profession_id ?? null,
  };
}
