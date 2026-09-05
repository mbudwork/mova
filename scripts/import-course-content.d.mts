/**
 * Type declarations for the content importer.
 *
 * The importer itself is plain ESM so it can run with bare `node` in CI and in
 * a migration step, without a build. This file gives the test suite real types
 * for it — the alternative would have been an `any` import, which the project
 * does not allow.
 */

export type WorkbookRow = Record<string, string | number | boolean | null>;

export type WorkbookData = {
  phrases: WorkbookRow[];
  supabase: WorkbookRow[];
  vocabulary: WorkbookRow[];
  lessons: WorkbookRow[];
  lessonMap: WorkbookRow[];
  families: WorkbookRow[];
  naturalVariants: WorkbookRow[];
  audio: WorkbookRow[];
  sources: WorkbookRow[];
  gates: WorkbookRow[];
  reviewQueue: WorkbookRow[];
  testTemplates: WorkbookRow[];
};

export type ImportReport = {
  sources: number;
  phrases: number;
  vocabulary: number;
  modules: number;
  lessons: number;
  lessonsUnpublished: string[];
  lessonMap: number;
  families: number;
  familyVariants: number;
  naturalVariants: number;
  audioManifest: number;
  audioGenerated: number;
  gates: number;
  reviewQueue: number;
  testTemplates: number;
};

export declare class ValidationError extends Error {
  problems: string[];
}

export declare function loadWorkbook(path: string): WorkbookData;

/** Throws ValidationError listing every problem found, not just the first. */
export declare function validate(data: WorkbookData): void;

export declare function runImport(options: {
  xlsxPath: string;
  dbUrl?: string;
  dryRun?: boolean;
}): Promise<ImportReport | { dryRun: true }>;

export declare const TRADE_TO_PROFESSION: Record<string, string | null>;
export declare const TRACK_TO_MODULE: Record<
  string,
  { slug: string; scope: 'core' | 'profession'; order: number; profession: string | null }
>;
