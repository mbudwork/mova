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
  /** Закреплены: верный ответ при повторе, когда подошёл срок. */
  phrasesLearned: number;
  /** Тронуты: по фразе есть хоть один ответ. Растёт каждое занятие. */
  phrasesStarted: number;
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
    return {
      lessonsTotal: 0,
      lessonsCompleted: 0,
      phrasesTotal: 0,
      phrasesLearned: 0,
      phrasesStarted: 0,
    };
  }
  return {
    lessonsTotal: row.lessons_total ?? 0,
    lessonsCompleted: row.lessons_completed ?? 0,
    phrasesTotal: row.phrases_total ?? 0,
    phrasesLearned: row.phrases_learned ?? 0,
    phrasesStarted: row.phrases_started ?? 0,
  };
}

/**
 * Уроки, доступные текущему пользователю: общая часть плюс выбранная им
 * профессия. Тот же источник, что у course_progress — иначе экраны начинают
 * спорить друг с другом о размере курса.
 */
async function accessibleLessonIds(): Promise<Set<string> | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('accessible_lessons');
  if (error || !data) return null;
  return new Set(data.map((row) => row.lesson_id).filter((id): id is string => id !== null));
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
export type ReviewSession = {
  phrases: ExercisePhrase[];
  /** Тренировка вне расписания: срок ещё не наступил, но слабые фразы есть. */
  aheadOfSchedule: boolean;
  /** Сколько слабых фраз всего, включая те, чей срок впереди. */
  weakTotal: number;
  /** Когда подойдёт ближайшая, если сейчас очередь пуста. */
  nextDueAt: string | null;
};

/**
 * Очередь повторения, а при пустой очереди — слабые фразы для тренировки
 * вне расписания.
 *
 * Зачем второе. Ошибка переводит фразу в состояние weak, а weak назначает
 * следующий показ через четыре часа. Человек ошибается девять раз подряд,
 * заходит в «Повторить» — и видит «пока нечего повторять». Формально верно,
 * по ощущению — сломано, и именно в тот момент, когда мотивация выше всего.
 *
 * Расписание при этом не ломается: record_answer сам игнорирует ответы,
 * данные раньше срока (v_is_due), так что досрочная тренировка не сдвигает
 * интервалы ни в одну сторону. Она просто даёт потрогать то, на чём
 * споткнулся, пока не остыло.
 */
export async function getReviewSession(locale: string, limit = 8): Promise<ReviewSession> {
  const supabase = await createSupabaseServerClient();
  const empty: ReviewSession = {
    phrases: [],
    aheadOfSchedule: false,
    weakTotal: 0,
    nextDueAt: null,
  };

  const { data: due } = await supabase.rpc('due_review_phrases', { p_limit: limit });

  let ids = (due ?? []).map((d) => d.phrase_id).filter((id): id is string => id !== null);
  let aheadOfSchedule = false;

  const { data: weak } = await supabase
    .from('phrase_progress')
    .select('phrase_id, next_review_at')
    .eq('state', 'weak')
    .order('next_review_at');

  const weakTotal = weak?.length ?? 0;

  if (ids.length === 0) {
    if (weakTotal === 0) return empty;
    aheadOfSchedule = true;
    ids = (weak ?? []).slice(0, limit).map((w) => w.phrase_id);
  }

  if (ids.length === 0) return empty;

  const { data, error } = await supabase
    .from('phrases')
    .select('id, german_text, phrase_translations(text, pronunciation, language_code)')
    .in('id', ids);

  if (error || !data) return empty;

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
  return {
    phrases: withAudio.map((p) => ({ ...p, options: buildOptions(p, source) })),
    aheadOfSchedule,
    weakTotal,
    nextDueAt: weak?.[0]?.next_review_at ?? null,
  };
}

/**
 * "Что говорит прораб?" — a listening drill over whatever the learner already
 * has access to, independent of lesson order and of the review schedule.
 *
 * Different from getReviewSession on purpose: review is driven by
 * `due_review_phrases` and is empty for a learner with no history, which is
 * why this mode cannot be built on it. Here we take primary phrases from the
 * published lessons RLS already lets this user read, shuffle, and cut a small
 * batch — so the mode works from the very first session.
 *
 * Phrases without an approved clip are filtered out. This mode is listening
 * and nothing else: a silent card here would be the reading fallback wearing
 * the wrong label.
 */
export async function getListeningSession(locale: string, limit = 8): Promise<ExercisePhrase[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('lesson_phrases')
    .select(
      `role, lesson_id,
       lessons!inner(is_published),
       phrases!inner(id, german_text,
         phrase_translations(text, pronunciation, language_code))`,
    )
    .eq('role', 'primary')
    .eq('lessons.is_published', true)
    .limit(400);

  if (error || !data) return [];

  /*
    Только общая часть и своя профессия. Иначе плиточнику в тренировку
    прилетали команды электрика — фразы про фазу и ноль, которых он не видел
    ни в одном своём уроке. Человек справедливо считает это бессмыслицей: его
    просят понять то, чему не учили.
  */
  const accessible = await accessibleLessonIds();
  const rows = accessible ? data.filter((row) => accessible.has(row.lesson_id)) : data;

  const seen = new Set<string>();
  const pool = rows.flatMap((link) => {
    const phrase = link.phrases;
    if (!phrase || seen.has(phrase.id)) return [];
    seen.add(phrase.id);
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

  // Fisher-Yates over the whole pool, then cut. Shuffling before the audio
  // lookup would be cheaper, but a batch drawn from the same corner of the
  // course every time is not a drill.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  const batch = pool.slice(0, limit * 2);
  const withAudio = await attachAudio(batch);
  const audible = withAudio.filter((p) => p.audioUrl !== null).slice(0, limit);

  return audible.map((p) => ({ ...p, options: buildOptions(p, audible) }));
}

export type LessonListItem = {
  slug: string;
  title: string;
  moduleSlug: string;
  orderIndex: number;
  completed: boolean;
  phraseCount: number;
};

/**
 * Все уроки, доступные пользователю, с отметкой о прохождении.
 *
 * До сих пор попасть в урок можно было только через кнопку «Продолжить»,
 * которая ведёт на следующий непройденный. Пройденный урок становился
 * недостижимым: списка не было нигде, и вернуться к нему получалось только
 * набрав адрес руками. Для курса, где повторение — половина смысла, это
 * потеря, а не мелочь: сама страница урока повторение допускает и даже
 * подписывает «это повторение», просто дойти до неё было нечем.
 */
export async function getLessonList(locale: string): Promise<LessonListItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('lessons')
    .select(
      `id, slug, order_index, is_published,
       modules!inner(slug),
       lesson_translations(title, language_code),
       lesson_phrases(role)`,
    )
    .eq('is_published', true)
    .order('order_index');

  if (error || !data) return [];

  /*
    Отсекаем чужие профессии.

    Раньше список показывал все 57 опубликованных уроков, а счётчик на главной
    считал только доступные — общую часть плюс выбранную специальность. Отсюда
    «пройдено 28 из 32» на одном экране и «28 из 57» на другом. Хуже того,
    плиточник видел в списке уроки электрика и мог их открыть, хотя курс ему
    их не обещал и в его прогресс они не входят.
  */
  const accessible = await accessibleLessonIds();
  const rows = accessible ? data.filter((row) => accessible.has(row.id)) : data;

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status');

  const done = new Set(
    (progress ?? []).filter((r) => r.status === 'completed').map((r) => r.lesson_id),
  );

  return rows.map((row) => {
    const translation = pickByLocale(row.lesson_translations, locale);
    return {
      slug: row.slug,
      title: translation?.title ?? row.slug,
      moduleSlug: row.modules.slug,
      orderIndex: row.order_index,
      completed: done.has(row.id),
      phraseCount: row.lesson_phrases.filter((lp) => lp.role === 'primary').length,
    };
  });
}
