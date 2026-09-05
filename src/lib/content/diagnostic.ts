import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Locale } from '@/lib/locale';

export type DiagnosticOption = { id: string; text: string; isCorrect: boolean };
export type DiagnosticQuestion = {
  id: string;
  position: number;
  germanText: string;
  skillLabel: string;
  audioUrl: string | null;
  /** True only when a native speaker has reviewed the non-Russian text shown. */
  translationReviewed: boolean;
  options: DiagnosticOption[];
};

/**
 * Reads the public diagnostic snapshot, localized. Still never touches
 * `phrases` — anonymous visitors reach only this snapshot, exactly as in the
 * funnel phase before this one.
 *
 * For `uk`, the Ukrainian text is a draft (see seed-diagnostic.mjs):
 * `translationReviewed` surfaces that honestly to the UI so a "draft" note
 * can be shown instead of silently presenting unreviewed text as final.
 */
export async function getDiagnostic(locale: Locale): Promise<DiagnosticQuestion[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('diagnostic_questions')
    .select(
      'id, position, german_text, skill_label, skill_label_uk, is_uk_reviewed, audio_path, audio_status, diagnostic_options(id, position, text_ru, text_uk, is_correct)',
    )
    .eq('is_active', true)
    .order('position');

  if (error || !data) return [];

  return data.map((row) => {
    const skillLabel = locale === 'uk' ? (row.skill_label_uk ?? row.skill_label) : row.skill_label;

    return {
      id: row.id,
      position: row.position,
      germanText: row.german_text,
      skillLabel,
      audioUrl: row.audio_status === 'ready' ? row.audio_path : null,
      translationReviewed: locale === 'ru' ? true : row.is_uk_reviewed,
      options: row.diagnostic_options
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          id: option.id,
          text: locale === 'uk' ? (option.text_uk ?? option.text_ru) : option.text_ru,
          isCorrect: option.is_correct,
        })),
    };
  });
}
