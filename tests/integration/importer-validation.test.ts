import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import XLSX from 'xlsx';
import { loadWorkbook, validate, ValidationError } from '../../scripts/import-course-content.mjs';
import { workbookPath } from './harness';

/**
 * The validator is the gate that stops a damaged workbook from reaching the
 * database. These tests corrupt a copy of the real data in the specific ways
 * the import plan lists as fatal, and check that each one is caught by name.
 */

function freshData() {
  return loadWorkbook(workbookPath());
}

/**
 * Indexed access under `noUncheckedIndexedAccess` yields `T | undefined`.
 * These tests deliberately reach for a specific row, so failing loudly when it
 * is absent is better than widening the type.
 */
function at<T>(rows: T[], index: number): T {
  const row = rows[index];
  if (!row) throw new Error(`Fixture row ${index} is missing`);
  return row;
}

describe('workbook validation', () => {
  it('accepts the approved Content Master unchanged', () => {
    expect(() => validate(freshData())).not.toThrow();
  });

  it('rejects a duplicate phrase ID', () => {
    const data = freshData();
    data.phrases.push({ ...at(data.phrases, 0) });
    expect(() => validate(data)).toThrow(ValidationError);
  });

  it('rejects an empty German field', () => {
    const data = freshData();
    at(data.phrases, 5).German = '';
    expect(() => validate(data)).toThrow(/empty German/);
  });

  it('rejects an empty Russian field', () => {
    const data = freshData();
    at(data.phrases, 5).Russian = null;
    expect(() => validate(data)).toThrow(/empty Russian/);
  });

  it('rejects an unknown trade', () => {
    const data = freshData();
    at(data.phrases, 0).Trade = 'DACHDECKER';
    expect(() => validate(data)).toThrow(/unknown trade/);
  });

  it('rejects an invalid priority', () => {
    const data = freshData();
    at(data.phrases, 0).Priority = 'Z';
    expect(() => validate(data)).toThrow(/invalid priority/);
  });

  it('rejects an invalid stage', () => {
    const data = freshData();
    at(data.phrases, 0).Stage = 'ADVANCED';
    expect(() => validate(data)).toThrow(/invalid stage/);
  });

  it('rejects an invalid safety value', () => {
    const data = freshData();
    at(data.phrases, 0).Safety = 'MAYBE';
    expect(() => validate(data)).toThrow(/invalid safety value/);
  });

  it('rejects an unsupported status', () => {
    const data = freshData();
    at(data.phrases, 0).Status = 'published';
    expect(() => validate(data)).toThrow(/unsupported status/);
  });

  it('rejects a lesson map row pointing at a phrase that does not exist', () => {
    const data = freshData();
    data.lessonMap.push({ lesson_id: 'L01', phrase_id: 'P9999', order_no: 99, role: 'primary' });
    expect(() => validate(data)).toThrow(/orphan row: unknown phrase/);
  });

  it('rejects a lesson map row pointing at a lesson that does not exist', () => {
    const data = freshData();
    data.lessonMap.push({ lesson_id: 'L99', phrase_id: 'P0001', order_no: 1, role: 'primary' });
    expect(() => validate(data)).toThrow(/orphan row: unknown lesson/);
  });

  it('rejects an invalid lesson map role', () => {
    const data = freshData();
    data.lessonMap.push({ lesson_id: 'L01', phrase_id: 'P0001', order_no: 98, role: 'extra' });
    expect(() => validate(data)).toThrow(/invalid role/);
  });

  it('rejects an audio manifest row for an unknown phrase', () => {
    const data = freshData();
    data.audio.push({ phrase_id: 'P9999', voice: 'voice_1', speed: 'normal', audio_status: 'PENDING' });
    expect(() => validate(data)).toThrow(/orphan row: unknown phrase/);
  });

  it('rejects an audio row claiming to be produced with no url', () => {
    const data = freshData();
    at(data.audio, 0).audio_status = 'READY';
    at(data.audio, 0).audio_url = null;
    expect(() => validate(data)).toThrow(/without an audio_url/);
  });

  it('rejects a duplicate vocabulary ID', () => {
    const data = freshData();
    data.vocabulary.push({ ...at(data.vocabulary, 0) });
    expect(() => validate(data)).toThrow(/duplicate vocabulary ID/);
  });

  it('rejects a duplicate lesson ID', () => {
    const data = freshData();
    data.lessons.push({ ...at(data.lessons, 0) });
    expect(() => validate(data)).toThrow(/duplicate lesson ID/);
  });

  it('rejects a lesson ID that carries no explicit order', () => {
    const data = freshData();
    at(data.lessons, 0).Lesson = 'INTRO';
    expect(() => validate(data)).toThrow(/expected L<number> form/);
  });

  it('rejects a family with only one register', () => {
    const data = freshData();
    at(data.families, 0)['Level 2'] = null;
    at(data.families, 0)['Level 3'] = null;
    at(data.families, 0)['Level 4 (natural)'] = null;
    expect(() => validate(data)).toThrow(/at least two registers/);
  });

  it('rejects a natural variant missing a register', () => {
    const data = freshData();
    at(data.naturalVariants, 0).Natural = '';
    expect(() => validate(data)).toThrow(/empty Natural/);
  });

  it('catches a German mismatch between the two production phrase sheets', () => {
    const data = freshData();
    at(data.supabase, 0).german = 'Etwas ganz anderes.';
    expect(() => validate(data)).toThrow(/German\/german disagree/);
  });

  it('catches a status mismatch between the two production phrase sheets', () => {
    const data = freshData();
    at(data.supabase, 3).status = 'draft';
    expect(() => validate(data)).toThrow(/Status\/status disagree/);
  });

  it('catches a phrase present in only one of the two sheets', () => {
    const data = freshData();
    data.supabase.pop();
    expect(() => validate(data)).toThrow(/missing here/);
  });

  it('fails loudly when a required sheet is absent', () => {
    const brokenPath = path.join(tmpdir(), 'dadb-missing-sheet.xlsx');
    const workbook = XLSX.readFile(workbookPath());
    workbook.SheetNames = workbook.SheetNames.filter((n) => n !== 'Lesson Map');
    delete workbook.Sheets['Lesson Map'];
    XLSX.writeFile(workbook, brokenPath);

    expect(() => loadWorkbook(brokenPath)).toThrow(/missing the required sheet "Lesson Map"/);
    rmSync(brokenPath, { force: true });
  });

  it('reports every problem at once rather than stopping at the first', () => {
    const data = freshData();
    at(data.phrases, 0).German = '';
    at(data.phrases, 1).Priority = 'Z';
    at(data.phrases, 2).Trade = 'NOPE';
    try {
      validate(data);
      expect.unreachable('validation should have failed');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).problems.length).toBeGreaterThanOrEqual(3);
    }
  });
});
