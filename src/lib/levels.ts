import type { SkillLevel } from '@/types/domain';

/**
 * B0–B4 are internal only. The UI never shows them, and never shows anything
 * that could be mistaken for CEFR A1/A2/B1 — the product does not issue and
 * does not imply an official language certificate.
 */
const LEVEL_NAMES: Record<SkillLevel, string> = {
  B0: 'Начало',
  B1: 'Базовые команды',
  B2: 'Рабочее понимание',
  B3: 'Уверенная работа',
  B4: 'Моя специальность',
};

export function levelName(level: SkillLevel): string {
  return LEVEL_NAMES[level];
}

export function levelOrder(level: SkillLevel): number {
  return (['B0', 'B1', 'B2', 'B3', 'B4'] as const).indexOf(level);
}
