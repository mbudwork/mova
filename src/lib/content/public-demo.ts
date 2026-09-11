import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createAudioProvider } from '@/lib/audio/provider';

export type DemoPhrase = {
  germanText: string;
  correct: string;
  options: string[];
  audioUrl: string | null;
};

/**
 * Случайная фраза из курса для демо в шапке лендинга.
 *
 * Раньше здесь была одна зашитая фраза и один публичный mp3 — посетитель,
 * заглянувший второй раз, видел ровно то же самое, и демо выглядело
 * записанным роликом, а не живым курсом.
 *
 * Читает админ-клиентом в обход RLS, и это осознанно. Анонимному посетителю
 * прав на таблицу phrases не выдано вовсе, поэтому обычный клиент вернул бы
 * пустоту. Взамен наружу отдаётся строго одна фраза за загрузку и только
 * тексты вариантов — не список, не выборка, не структура курса. Платный
 * доступ этим не размывается: витрина показывает одну карточку, а не полку.
 *
 * Фразы с safety_sensitive исключены намеренно: команды про напряжение и газ
 * не место для маркетингового демо, где половина посетителей отвечает наугад.
 */
export async function getDemoPhrase(locale: string): Promise<DemoPhrase | null> {
  const supabase = createSupabaseAdminClient();

  /*
    Случайное окно вместо всей библиотеки.

    Раньше сюда прилетали все 400+ одобренных фраз с переводами — на КАЖДЫЙ
    заход на лендинг, включая заходы ботов и поисковиков. Это заметный объём
    по сети и по памяти ради одной показанной карточки, и именно он делал
    первую отрисовку главной вязкой.

    Теперь берётся случайное окно из двенадцати строк: одна становится
    вопросом, две — отвлекающими вариантами. Смещение считается от общего
    числа, поэтому окно каждый раз из другого места курса и демо остаётся
    разным при каждом заходе.
  */
  const WINDOW = 12;

  const { count } = await supabase
    .from('phrases')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'approved')
    .eq('safety_sensitive', false);

  const total = count ?? 0;
  if (total < 4) return null;

  const offset = Math.max(0, Math.floor(Math.random() * Math.max(1, total - WINDOW)));

  const { data, error } = await supabase
    .from('phrases')
    .select('id, german_text, phrase_translations(text, language_code)')
    .eq('verification_status', 'approved')
    .eq('safety_sensitive', false)
    .order('external_id')
    .range(offset, offset + WINDOW - 1);

  if (error || !data || data.length < 4) {
    if (error) console.error('[demo] phrase pool failed', error);
    return null;
  }

  const pool = data.flatMap((row) => {
    const translation =
      row.phrase_translations.find((t) => t.language_code === locale) ??
      row.phrase_translations[0];
    if (!translation?.text) return [];
    return [{ id: row.id, germanText: row.german_text, translation: translation.text }];
  });

  if (pool.length < 4) return null;

  const target = pool[Math.floor(Math.random() * pool.length)]!;

  /*
    Отвлекающие варианты — переводы других настоящих фраз курса, а не
    выдуманные. Придуманный неверный вариант почти всегда звучит нелепо, и
    тест становится проверкой чувства юмора, а не понимания.
  */
  const distractors: string[] = [];
  const seen = new Set([target.translation]);
  while (distractors.length < 2 && seen.size < pool.length) {
    const candidate = pool[Math.floor(Math.random() * pool.length)]!;
    if (seen.has(candidate.translation)) continue;
    seen.add(candidate.translation);
    distractors.push(candidate.translation);
  }

  const options = [target.translation, ...distractors];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }

  const audio = createAudioProvider();
  const track = await audio.getTrack(target.id);

  return {
    germanText: target.germanText,
    correct: target.translation,
    options,
    audioUrl: track?.url ?? null,
  };
}
