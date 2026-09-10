import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAudioProvider } from '@/lib/audio/provider';

export type VocabularyEntry = {
  id: string;
  german: string;
  article: string | null;
  plural: string | null;
  translation: string;
  category: string | null;
  colloquial: string | null;
};

export type PhraseCard = {
  id: string;
  germanText: string;
  translation: string;
  pronunciation: string | null;
  audioUrl: string | null;
};

/**
 * Escapes the wildcards PostgREST's `ilike` treats as pattern syntax.
 * Without this, a user typing `%` matches the entire dictionary and a user
 * typing `_` silently gets wrong rows — a search box is exactly where stray
 * pattern characters arrive.
 */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * The dictionary. RLS (`vocabulary_read`) already limits this to approved
 * entries for entitled users, so no status filter is repeated here — one
 * source of truth for who sees what, and it lives in the database.
 *
 * Search covers the German term and the translation together: a worker who
 * knows the Russian word and needs the German one is the more common case
 * than the reverse.
 */
export async function searchVocabulary(
  locale: string,
  query: string,
  category?: string,
): Promise<VocabularyEntry[]> {
  const supabase = await createSupabaseServerClient();
  const term = query.trim();

  let request = supabase
    .from('vocabulary_items')
    .select(
      'id, german_term, article, plural_form, category, colloquial_note, vocabulary_translations(term, language_code)',
    )
    .order('german_term')
    .limit(term ? 60 : 120);

  if (category) request = request.eq('category', category);
  if (term) {
    const safe = `%${escapeLike(term)}%`;
    request = request.or(`german_term.ilike.${safe},vocabulary_translations.term.ilike.${safe}`);
  }

  const { data, error } = await request;
  if (error || !data) return [];

  return data.map((row) => {
    const translation =
      row.vocabulary_translations.find((t) => t.language_code === locale) ??
      row.vocabulary_translations[0];

    return {
      id: row.id,
      german: row.german_term,
      article: row.article,
      plural: row.plural_form,
      translation: translation?.term ?? '',
      category: row.category,
      colloquial: row.colloquial_note,
    };
  });
}

/** Categories actually present in what this user can read, for the filter row. */
export async function vocabularyCategories(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('vocabulary_items').select('category').limit(500);
  if (error || !data) return [];

  const seen = new Set<string>();
  for (const row of data) if (row.category) seen.add(row.category);
  return [...seen].sort();
}

/**
 * "Быстро сказать": find a phrase by meaning, then show it to a German
 * colleague full-screen.
 *
 * Searches the Russian translation first because that is how the need
 * arrives — the worker knows what he wants to say, not how it sounds in
 * German. German is searched too, for someone who half-remembers a phrase
 * from a lesson.
 */
export async function searchPhrases(locale: string, query: string): Promise<PhraseCard[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const supabase = await createSupabaseServerClient();
  const safe = `%${escapeLike(term)}%`;

  const { data, error } = await supabase
    .from('phrases')
    .select('id, german_text, phrase_translations(text, pronunciation, language_code)')
    .or(`german_text.ilike.${safe},phrase_translations.text.ilike.${safe}`)
    .limit(25);

  if (error || !data) return [];

  const rows = data.map((row) => {
    const translation =
      row.phrase_translations.find((t) => t.language_code === locale) ?? row.phrase_translations[0];
    return {
      id: row.id,
      germanText: row.german_text,
      translation: translation?.text ?? '',
      pronunciation: translation?.pronunciation ?? null,
    };
  });

  const tracks = await createAudioProvider().getTracks(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, audioUrl: tracks.get(row.id)?.url ?? null }));
}
