/**
 * Domain enums, kept in sync with the Postgres enums by hand.
 * `src/types/database.ts` is generated (see README) and holds row shapes;
 * this file holds the small, stable vocabulary the UI reasons about.
 */

export type AppRole = 'user' | 'admin';

export type SpeakerType = 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer';

/** L1 = the learner's first language (Russian at launch). */
export type PhraseDirection = 'DE_TO_L1' | 'L1_TO_DE';

export type VerificationStatus =
  | 'draft'
  | 'language_review'
  | 'native_review'
  | 'trade_review'
  | 'safety_review'
  | 'approved'
  | 'rejected'
  | 'archived';

export const REVIEW_PIPELINE: VerificationStatus[] = [
  'draft',
  'language_review',
  'native_review',
  'trade_review',
  'safety_review',
  'approved',
];

export type SourceType = 'manual' | 'field_collected' | 'imported' | 'template_generated';

export type ComponentType =
  | 'ACTION'
  | 'OBJECT'
  | 'LOCATION'
  | 'QUANTITY'
  | 'MEASUREMENT'
  | 'SEQUENCE'
  | 'QUALITY'
  | 'WARNING';

export type AudioSpeed = 'slow' | 'normal' | 'natural';

/** Internal progression only. Deliberately NOT CEFR — never render as A1/A2/B1. */
export type SkillLevel = 'B0' | 'B1' | 'B2' | 'B3' | 'B4';

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  B0: 'Выживание на объекте',
  B1: 'Базовая стройка',
  B2: 'Рабочий уровень',
  B3: 'Самостоятельно',
  B4: 'Профессия',
};

export type ModuleScope = 'core' | 'profession';
export type LessonKind = 'intro' | 'training' | 'listening' | 'mixed' | 'test';

export type ProgressState =
  | 'new'
  | 'learning'
  | 'recognizing'
  | 'understood'
  | 'weak'
  | 'mastered';

export type QuestionType =
  | 'audio_to_translation'
  | 'de_to_l1'
  | 'l1_to_de'
  | 'audio_to_reaction'
  | 'audio_identify_object'
  | 'audio_identify_measurement'
  | 'audio_identify_location'
  | 'audio_identify_sequence'
  | 'unseen_combination';

export type TestKind = 'diagnostic' | 'lesson' | 'module' | 'final';
export type EntitlementStatus = 'active' | 'revoked' | 'expired';
export type FavoriteType = 'phrase' | 'vocabulary' | 'lesson';
export type SelfReportedLevel = 'none' | 'words' | 'simple_commands' | 'some_speaking';

export const SELF_LEVEL_LABELS: Record<SelfReportedLevel, string> = {
  none: 'Практически не знаю',
  words: 'Знаю отдельные слова',
  simple_commands: 'Иногда понимаю простые команды',
  some_speaking: 'Могу немного разговаривать',
};

export const PRODUCT_CODE = 'FULL_ACCESS' as const;
