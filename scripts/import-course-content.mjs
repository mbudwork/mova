#!/usr/bin/env node
/**
 * Production content importer.
 *
 * Reads the approved Content Master workbook, validates it, and writes it into
 * the database in a single transaction. Deterministic and idempotent: every
 * row is keyed by its Excel ID, so a second run updates in place and creates
 * nothing new.
 *
 *   node scripts/import-course-content.mjs <xlsx-path> [--db <postgres-url>] [--dry-run]
 *
 * The workbook is the source of truth. This script never edits educational
 * content — it maps it. Where the workbook and the schema disagreed, the
 * schema was extended (see docs/PHASE_4_IMPORT_PLAN.md); nothing here silently
 * rewrites German, Russian, safety flags, priorities or statuses.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import XLSX from 'xlsx';

// ---------------------------------------------------------------- CONSTANTS --

/** Excel trade label → professions.slug. CORE has no profession. */
const TRADE_TO_PROFESSION = {
  CORE: null,
  TROCKENBAU: 'trockenbau',
  FLIESEN: 'fliesenleger',
  MALER: 'maler',
  MAURER: 'maurer',
  ELEKTRO: 'elektriker',
  SHK: 'sanitaer',
};

/** Excel track → module slug, scope and ordering. */
const TRACK_TO_MODULE = {
  CORE: { slug: 'core', scope: 'core', order: 1, profession: null },
  TROCKENBAU: { slug: 'trockenbau', scope: 'profession', order: 2, profession: 'trockenbau' },
  FLIESEN: { slug: 'fliesen', scope: 'profession', order: 2, profession: 'fliesenleger' },
  MALER: { slug: 'maler', scope: 'profession', order: 2, profession: 'maler' },
  MAURER: { slug: 'maurer', scope: 'profession', order: 2, profession: 'maurer' },
  ELEKTRO: { slug: 'elektro', scope: 'profession', order: 2, profession: 'elektriker' },
  SHK: { slug: 'shk', scope: 'profession', order: 2, profession: 'sanitaer' },
  // The closing assessment is available to everyone; its content is already
  // trade-specific through the phrases it maps to.
  ALL: { slug: 'assessment', scope: 'core', order: 3, profession: null },
};

const MODULE_TITLES_RU = {
  core: 'Основной курс',
  trockenbau: 'Trockenbau',
  fliesen: 'Плитка',
  maler: 'Малярные работы',
  maurer: 'Каменная кладка',
  elektro: 'Электрика',
  shk: 'Сантехника и отопление',
  assessment: 'Итоговая проверка',
};

const VALID_PRIORITIES = new Set(['A', 'B', 'C']);
const VALID_STAGES = new Set(['SURVIVAL', 'WORKING CORE', 'TRADE']);
const VALID_SPEAKERS = new Set(['bauleiter', 'polier', 'colleague', 'worker', 'customer']);
const VALID_STATUSES = new Set([
  'draft',
  'language_review',
  'native_review',
  'trade_review',
  'safety_review',
  'approved',
  'rejected',
]);
const VALID_ROLES = new Set(['primary', 'review_pool']);
const VALID_SAFETY = new Set(['YES', 'NO']);

// ------------------------------------------------------------------ HELPERS --

class ValidationError extends Error {
  constructor(problems) {
    // The first problems go into the message itself: a stack trace or a CI log
    // that says only "3 problems" tells whoever is on call nothing.
    const preview = problems.slice(0, 5).join('; ');
    const more = problems.length > 5 ? ` … and ${problems.length - 5} more` : '';
    super(`Content validation failed with ${problems.length} problem(s): ${preview}${more}`);
    this.problems = problems;
  }
}

function text(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' || s.toLowerCase() === 'nan' ? null : s;
}

function required(value) {
  const s = text(value);
  if (s === null) throw new Error('required value missing');
  return s;
}

function readSheet(workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Workbook is missing the required sheet "${name}"`);
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

/** L01 → 1. The course order is explicit in the ID, never inferred from titles. */
function lessonOrder(externalId) {
  const match = /^L(\d+)$/.exec(externalId);
  if (!match) throw new Error(`Lesson id "${externalId}" is not in the expected L<number> form`);
  return Number(match[1]);
}

// --------------------------------------------------------------- VALIDATION --

function validate(data) {
  const problems = [];
  const fail = (sheet, row, message) => problems.push(`${sheet}[${row}]: ${message}`);

  const phraseIds = new Set();
  for (const [i, row] of data.phrases.entries()) {
    const id = text(row.ID);
    if (!id) fail('FINAL Phrases', i + 2, 'empty ID');
    else if (phraseIds.has(id)) fail('FINAL Phrases', i + 2, `duplicate phrase ID ${id}`);
    else phraseIds.add(id);

    if (!text(row.German)) fail('FINAL Phrases', i + 2, `${id}: empty German`);
    if (!text(row.Russian)) fail('FINAL Phrases', i + 2, `${id}: empty Russian`);
    if (!VALID_PRIORITIES.has(text(row.Priority)))
      fail('FINAL Phrases', i + 2, `${id}: invalid priority "${row.Priority}"`);
    if (!VALID_STAGES.has(text(row.Stage)))
      fail('FINAL Phrases', i + 2, `${id}: invalid stage "${row.Stage}"`);
    if (!(text(row.Trade) in TRADE_TO_PROFESSION))
      fail('FINAL Phrases', i + 2, `${id}: unknown trade "${row.Trade}"`);
    if (!VALID_SPEAKERS.has(text(row.Speaker)))
      fail('FINAL Phrases', i + 2, `${id}: invalid speaker "${row.Speaker}"`);
    if (!VALID_SAFETY.has(text(row.Safety)))
      fail('FINAL Phrases', i + 2, `${id}: invalid safety value "${row.Safety}"`);
    if (!VALID_STATUSES.has(text(row.Status)))
      fail('FINAL Phrases', i + 2, `${id}: unsupported status "${row.Status}"`);
  }

  // The two production phrase sheets must agree. A silent pick between them
  // would be exactly the kind of undocumented decision this import forbids.
  const bySupabaseId = new Map(data.supabase.map((r) => [text(r.phrase_id), r]));
  for (const row of data.phrases) {
    const id = text(row.ID);
    const other = bySupabaseId.get(id);
    if (!other) {
      fail('Supabase Import', 0, `${id} present in FINAL Phrases but missing here`);
      continue;
    }
    for (const [a, b] of [
      ['German', 'german'],
      ['Russian', 'translation'],
      ['Trade', 'trade'],
      ['Stage', 'stage'],
      ['Priority', 'priority'],
      ['Status', 'status'],
    ]) {
      if (text(row[a]) !== text(other[b])) {
        fail('Supabase Import', 0, `${id}: ${a}/${b} disagree ("${row[a]}" vs "${other[b]}")`);
      }
    }
  }
  for (const row of data.supabase) {
    const id = text(row.phrase_id);
    if (!phraseIds.has(id)) fail('Supabase Import', 0, `${id} has no row in FINAL Phrases`);
  }

  const vocabIds = new Set();
  for (const [i, row] of data.vocabulary.entries()) {
    const id = text(row.ID);
    if (!id) fail('Vocabulary', i + 2, 'empty ID');
    else if (vocabIds.has(id)) fail('Vocabulary', i + 2, `duplicate vocabulary ID ${id}`);
    else vocabIds.add(id);
    if (!text(row.German)) fail('Vocabulary', i + 2, `${id}: empty German`);
    if (!text(row.Russian)) fail('Vocabulary', i + 2, `${id}: empty Russian`);
    if (!VALID_PRIORITIES.has(text(row.Priority)))
      fail('Vocabulary', i + 2, `${id}: invalid priority "${row.Priority}"`);
    if (!(text(row.Trade) in TRADE_TO_PROFESSION))
      fail('Vocabulary', i + 2, `${id}: unknown trade "${row.Trade}"`);
    if (!VALID_STATUSES.has(text(row.Status)))
      fail('Vocabulary', i + 2, `${id}: unsupported status "${row.Status}"`);
  }

  const lessonIds = new Set();
  for (const [i, row] of data.lessons.entries()) {
    const id = text(row.Lesson);
    if (!id) fail('Lessons', i + 2, 'empty lesson ID');
    else if (lessonIds.has(id)) fail('Lessons', i + 2, `duplicate lesson ID ${id}`);
    else lessonIds.add(id);
    if (!text(row.Title)) fail('Lessons', i + 2, `${id}: empty title`);
    if (!(text(row.Track) in TRACK_TO_MODULE))
      fail('Lessons', i + 2, `${id}: unknown track "${row.Track}"`);
    try {
      lessonOrder(id);
    } catch (error) {
      fail('Lessons', i + 2, error.message);
    }
  }

  const seenMapRows = new Set();
  for (const [i, row] of data.lessonMap.entries()) {
    const lessonId = text(row.lesson_id);
    const phraseId = text(row.phrase_id);
    const role = text(row.role);
    if (!lessonIds.has(lessonId))
      fail('Lesson Map', i + 2, `orphan row: unknown lesson "${lessonId}"`);
    if (!phraseIds.has(phraseId))
      fail('Lesson Map', i + 2, `orphan row: unknown phrase "${phraseId}"`);
    if (!VALID_ROLES.has(role)) fail('Lesson Map', i + 2, `invalid role "${role}"`);
    const key = `${lessonId}|${role}|${row.order_no}`;
    if (seenMapRows.has(key)) fail('Lesson Map', i + 2, `duplicate order ${key}`);
    seenMapRows.add(key);
  }

  for (const [i, row] of data.audio.entries()) {
    if (!phraseIds.has(text(row.phrase_id)))
      fail('Audio Manifest', i + 2, `orphan row: unknown phrase "${row.phrase_id}"`);
    if (text(row.audio_status) !== 'PENDING' && !text(row.audio_url))
      fail('Audio Manifest', i + 2, `status "${row.audio_status}" without an audio_url`);
  }

  for (const [i, row] of data.families.entries()) {
    if (!text(row.ID)) fail('Phrase Families', i + 2, 'empty ID');
    const levels = [
      row['Level 1 (formal/clear)'],
      row['Level 2'],
      row['Level 3'],
      row['Level 4 (natural)'],
    ].filter((v) => text(v));
    if (levels.length < 2)
      fail('Phrase Families', i + 2, `${row.ID}: a family needs at least two registers`);
    if (!text(row.Meaning)) fail('Phrase Families', i + 2, `${row.ID}: empty meaning`);
  }

  for (const [i, row] of data.naturalVariants.entries()) {
    if (!text(row.ID)) fail('Natural Variants', i + 2, 'empty ID');
    for (const level of ['Clear', 'Normal', 'Natural']) {
      if (!text(row[level])) fail('Natural Variants', i + 2, `${row.ID}: empty ${level}`);
    }
    if (!VALID_STATUSES.has(text(row.Status)))
      fail('Natural Variants', i + 2, `${row.ID}: unsupported status "${row.Status}"`);
  }

  if (problems.length > 0) throw new ValidationError(problems);
}

// ------------------------------------------------------------------ IMPORT ---

async function importAll(client, data, report) {
  const professions = new Map();
  for (const row of (await client.query('select id, slug from professions')).rows) {
    professions.set(row.slug, row.id);
  }
  const professionId = (trade) => {
    const slug = TRADE_TO_PROFESSION[trade];
    if (slug === null) return null;
    const id = professions.get(slug);
    if (!id) throw new Error(`Profession "${slug}" is missing; run the reference migration first`);
    return id;
  };

  // --------------------------------------------------------------- sources --
  for (const row of data.sources) {
    await client.query(
      `insert into content_sources (id, name, url, validates) values ($1,$2,$3,$4)
       on conflict (id) do update set name = excluded.name, url = excluded.url,
                                      validates = excluded.validates`,
      [required(row.ID), required(row.Source), text(row.URL), text(row['What it validates'])],
    );
  }
  report.sources = data.sources.length;

  // --------------------------------------------------------------- phrases --
  const supabaseById = new Map(data.supabase.map((r) => [text(r.phrase_id), r]));
  const phraseIdByExternal = new Map();

  for (const row of data.phrases) {
    const externalId = required(row.ID);
    const flags = supabaseById.get(externalId);
    const isSafety = text(row.Safety) === 'YES';

    const { rows } = await client.query(
      `insert into phrases (
         external_id, german_text, intent, speaker, profession_id,
         content_module, stage, priority, register_level,
         safety_sensitive, safety_approved, verification_status,
         source_type, source_ref, confidence, notes, is_free_preview)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'imported',$13,$14,$15,false)
       on conflict (external_id) do update set
         german_text         = excluded.german_text,
         intent              = excluded.intent,
         speaker             = excluded.speaker,
         profession_id       = excluded.profession_id,
         content_module      = excluded.content_module,
         stage               = excluded.stage,
         priority            = excluded.priority,
         register_level      = excluded.register_level,
         safety_sensitive    = excluded.safety_sensitive,
         safety_approved     = excluded.safety_approved,
         verification_status = excluded.verification_status,
         source_ref          = excluded.source_ref,
         confidence          = excluded.confidence,
         notes               = excluded.notes
       returning id`,
      [
        externalId,
        required(row.German),
        text(row.Intent),
        text(row.Speaker),
        professionId(text(row.Trade)),
        text(row.Module),
        text(row.Stage).replace(' ', '_'),
        text(row.Priority),
        // The workbook marks every production phrase "natural"; register 2 is
        // the normal spoken register in the PHASE 1 family model.
        text(row.Naturalness) === 'natural' ? 2 : 1,
        isSafety,
        Boolean(flags?.safety_approved),
        text(row.Status),
        text(row.Source),
        text(row.Confidence),
        text(row.Notes),
      ],
    );

    const phraseId = rows[0].id;
    phraseIdByExternal.set(externalId, phraseId);

    await client.query(
      `insert into phrase_translations (phrase_id, language_code, text)
       values ($1, 'ru', $2)
       on conflict (phrase_id, language_code) do update set text = excluded.text`,
      [phraseId, required(row.Russian)],
    );
  }
  report.phrases = data.phrases.length;

  // ------------------------------------------------------------ vocabulary --
  for (const row of data.vocabulary) {
    const type = text(row.Type);
    const { rows } = await client.query(
      `insert into vocabulary_items (
         external_id, german_term, part_of_speech, category, priority,
         content_module, profession_id, colloquial_note, source_ref,
         confidence, verification_status, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (external_id) do update set
         german_term         = excluded.german_term,
         part_of_speech      = excluded.part_of_speech,
         category            = excluded.category,
         priority            = excluded.priority,
         content_module      = excluded.content_module,
         profession_id       = excluded.profession_id,
         colloquial_note     = excluded.colloquial_note,
         source_ref          = excluded.source_ref,
         confidence          = excluded.confidence,
         verification_status = excluded.verification_status,
         notes               = excluded.notes
       returning id`,
      [
        required(row.ID),
        required(row.German),
        type === 'verb' ? 'verb' : 'noun',
        type,
        text(row.Priority),
        text(row.Module),
        professionId(text(row.Trade)),
        text(row['Colloquial/Formal note']),
        text(row.Source),
        text(row.Confidence),
        text(row.Status),
        text(row.Notes),
      ],
    );

    await client.query(
      `insert into vocabulary_translations (vocabulary_item_id, language_code, term)
       values ($1, 'ru', $2)
       on conflict (vocabulary_item_id, language_code) do update set term = excluded.term`,
      [rows[0].id, required(row.Russian)],
    );
  }
  report.vocabulary = data.vocabulary.length;

  // ----------------------------------------------------------------- modules --
  const moduleIdBySlug = new Map();
  for (const [, config] of Object.entries(TRACK_TO_MODULE)) {
    if (moduleIdBySlug.has(config.slug)) continue;
    const { rows } = await client.query(
      `insert into modules (slug, scope, profession_id, order_index, is_published)
       values ($1,$2,$3,$4,true)
       on conflict (slug) do update set
         scope = excluded.scope,
         profession_id = excluded.profession_id,
         order_index = excluded.order_index,
         is_published = true
       returning id`,
      [
        config.slug,
        config.scope,
        config.profession ? professions.get(config.profession) : null,
        config.order,
      ],
    );
    moduleIdBySlug.set(config.slug, rows[0].id);

    await client.query(
      `insert into module_translations (module_id, language_code, title)
       values ($1, 'ru', $2)
       on conflict (module_id, language_code) do update set title = excluded.title`,
      [rows[0].id, MODULE_TITLES_RU[config.slug] ?? config.slug],
    );
  }
  report.modules = moduleIdBySlug.size;

  // ----------------------------------------------------------------- lessons --
  // Lessons with no Lesson Map rows are imported in full but left unpublished:
  // an empty lesson is a dead end in the user flow. This is an import-layer
  // decision, recorded in the row itself, not a content change.
  const mappedLessonIds = new Set(data.lessonMap.map((r) => text(r.lesson_id)));
  const lessonIdByExternal = new Map();
  report.lessonsUnpublished = [];

  for (const row of data.lessons) {
    const externalId = required(row.Lesson);
    const track = required(row.Track);
    const config = TRACK_TO_MODULE[track];
    const hasContent = mappedLessonIds.has(externalId);
    if (!hasContent) report.lessonsUnpublished.push(externalId);

    const { rows } = await client.query(
      `insert into lessons (
         external_id, module_id, slug, kind, order_index, est_minutes,
         is_published, track, content_module, outcome, notes)
       values ($1,$2,$3,'mixed',$4,$5,$6,$7,$8,$9,$10)
       on conflict (external_id) do update set
         module_id      = excluded.module_id,
         slug           = excluded.slug,
         order_index    = excluded.order_index,
         est_minutes    = excluded.est_minutes,
         is_published   = excluded.is_published,
         track          = excluded.track,
         content_module = excluded.content_module,
         outcome        = excluded.outcome,
         notes          = excluded.notes
       returning id`,
      [
        externalId,
        moduleIdBySlug.get(config.slug),
        externalId.toLowerCase(),
        lessonOrder(externalId),
        Number(row.Minutes) || 10,
        hasContent,
        track,
        text(row.Module),
        text(row.Outcome),
        hasContent ? null : 'Не опубликован: в Lesson Map нет ни одной строки для этого урока.',
      ],
    );

    lessonIdByExternal.set(externalId, rows[0].id);

    await client.query(
      `insert into lesson_translations (lesson_id, language_code, title, goal)
       values ($1,'ru',$2,$3)
       on conflict (lesson_id, language_code) do update set
         title = excluded.title, goal = excluded.goal`,
      [rows[0].id, required(row.Title), text(row.Outcome)],
    );
  }
  report.lessons = data.lessons.length;

  // -------------------------------------------------------------- lesson map --
  for (const row of data.lessonMap) {
    await client.query(
      `insert into lesson_phrases (lesson_id, phrase_id, order_index, role)
       values ($1,$2,$3,$4)
       on conflict (lesson_id, phrase_id) do update set
         order_index = excluded.order_index, role = excluded.role`,
      [
        lessonIdByExternal.get(text(row.lesson_id)),
        phraseIdByExternal.get(text(row.phrase_id)),
        Number(row.order_no),
        text(row.role),
      ],
    );
  }
  report.lessonMap = data.lessonMap.length;

  // ---------------------------------------------------------------- families --
  async function upsertFamily({ externalId, kind, meaning, module, trade, status, source, levels }) {
    const { rows } = await client.query(
      `insert into phrase_families (external_id, key, intent, kind, content_module,
                                    profession_id, status, source_ref)
       values ($1,$1,$2,$3,$4,$5,$6,$7)
       on conflict (external_id) do update set
         intent = excluded.intent, kind = excluded.kind,
         content_module = excluded.content_module,
         profession_id = excluded.profession_id,
         status = excluded.status, source_ref = excluded.source_ref
       returning id`,
      [externalId, meaning, kind, module, trade ? professionId(trade) : null, status, source],
    );
    const familyId = rows[0].id;

    await client.query(
      `insert into phrase_family_translations (family_id, language_code, meaning)
       values ($1,'ru',$2)
       on conflict (family_id, language_code) do update set meaning = excluded.meaning`,
      [familyId, meaning],
    );

    for (const [level, german] of levels) {
      await client.query(
        `insert into phrase_family_variants (family_id, register_level, german_text)
         values ($1,$2,$3)
         on conflict (family_id, register_level) do update set german_text = excluded.german_text`,
        [familyId, level, german],
      );
    }
    return levels.length;
  }

  report.familyVariants = 0;
  for (const row of data.families) {
    const levels = [
      [1, text(row['Level 1 (formal/clear)'])],
      [2, text(row['Level 2'])],
      [3, text(row['Level 3'])],
      [4, text(row['Level 4 (natural)'])],
    ].filter(([, german]) => german);

    report.familyVariants += await upsertFamily({
      externalId: required(row.ID),
      kind: 'family',
      meaning: required(row.Meaning),
      module: text(row.Module),
      trade: null,
      // The Phrase Families sheet carries no Status column, but Review Queue
      // R002 and Gate G01 both name F01–F15 as awaiting native review. They
      // therefore enter as native_review, not approved: an import must never
      // close a review the production process has left open.
      status: 'native_review',
      source: text(row.Source),
      levels,
    });
  }
  report.families = data.families.length;

  for (const row of data.naturalVariants) {
    report.familyVariants += await upsertFamily({
      externalId: required(row.ID),
      kind: 'natural_variant',
      meaning: required(row['Russian meaning']),
      module: text(row.Module),
      trade: text(row.Trade),
      status: text(row.Status),
      source: null,
      levels: [
        [1, required(row.Clear)],
        [2, required(row.Normal)],
        [3, required(row.Natural)],
      ],
    });
  }
  report.naturalVariants = data.naturalVariants.length;

  // ----------------------------------------------------------------- audio ----
  // Manifest only. No API call, no file, no synthetic placeholder: every row
  // stays pending until PHASE 5 produces real audio.
  const voiceIds = new Map();
  for (const label of [...new Set(data.audio.map((r) => required(r.voice)))]) {
    const { rows } = await client.query(
      `insert into voices (provider, provider_voice_id, label, is_active, notes)
       values ('pending', $1, $1, false, 'Placeholder from Audio Manifest; no provider bound yet')
       on conflict (provider, provider_voice_id) do update set label = excluded.label
       returning id`,
      [label],
    );
    voiceIds.set(label, rows[0].id);
  }

  for (const row of data.audio) {
    await client.query(
      `insert into audio_assets (phrase_id, voice_id, speed, status, approved,
                                 storage_path, provider, external_ref)
       values ($1,$2,$3,'pending',false,null,'pending',$4)
       -- The unique index is partial (phrase_id is not null), so the conflict
       -- target has to carry the same predicate for Postgres to match it.
       on conflict (phrase_id, voice_id, speed) where phrase_id is not null
       do update set status = 'pending', external_ref = excluded.external_ref`,
      [
        phraseIdByExternal.get(text(row.phrase_id)),
        voiceIds.get(required(row.voice)),
        required(row.speed),
        text(row.notes),
      ],
    );
  }
  report.audioManifest = data.audio.length;
  report.audioGenerated = 0;

  // ------------------------------------------------- process metadata (§27) --
  for (const row of data.gates) {
    await client.query(
      `insert into production_gates (gate, scope, content, reviewer, status, rule)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (gate) do update set
         scope = excluded.scope, content = excluded.content,
         reviewer = excluded.reviewer, status = excluded.status,
         rule = excluded.rule, updated_at = now()`,
      [
        required(row.Gate),
        required(row.Scope),
        text(row.Content),
        text(row.Reviewer),
        required(row.Status),
        text(row.Rule),
      ],
    );
  }
  report.gates = data.gates.length;

  for (const row of data.reviewQueue) {
    await client.query(
      `insert into review_queue (id, area, issue, reviewer, decision)
       values ($1,$2,$3,$4,$5)
       on conflict (id) do update set
         area = excluded.area, issue = excluded.issue,
         reviewer = excluded.reviewer, decision = excluded.decision,
         updated_at = now()`,
      [
        required(row.ID),
        required(row.Area),
        required(row.Issue),
        text(row.Reviewer),
        required(row.Decision),
      ],
    );
  }
  report.reviewQueue = data.reviewQueue.length;

  for (const row of data.testTemplates) {
    await client.query(
      `insert into test_templates (id, test_type, track, mechanic, distractor_rule, skill)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (id) do update set
         test_type = excluded.test_type, track = excluded.track,
         mechanic = excluded.mechanic, distractor_rule = excluded.distractor_rule,
         skill = excluded.skill`,
      [
        required(row.ID),
        required(row.Type),
        required(row.Track),
        required(row.Mechanic),
        text(row['Distractor/quality rule']),
        text(row.Skill),
      ],
    );
  }
  report.testTemplates = data.testTemplates.length;
}

// -------------------------------------------------------------------- MAIN ---

/**
 * Corrections to the approved Content Master, applied after its own Lesson
 * Map. The workbook stays the source of truth for every German and Russian
 * string; this file may only reference phrase IDs that already exist in it,
 * and the validator enforces that like any other row.
 *
 * Currently it repairs one defect: lessons L03 and L04 are defined in the
 * Lessons sheet but carry no Lesson Map rows.
 */
function loadCorrections(xlsxPath) {
  const correctionsPath = path.join(path.dirname(xlsxPath), 'lesson-map-corrections.json');
  try {
    const parsed = JSON.parse(readFileSync(correctionsPath, 'utf8'));
    return parsed.rows ?? [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error(`Could not read ${correctionsPath}: ${error.message}`);
  }
}

export function loadWorkbook(xlsxPathArg) {
  const path_ = xlsxPathArg;
  const workbook = XLSX.readFile(path_);
  const corrections = loadCorrections(path_);
  const data = {
    phrases: readSheet(workbook, 'FINAL Phrases'),
    supabase: readSheet(workbook, 'Supabase Import'),
    vocabulary: readSheet(workbook, 'Vocabulary'),
    lessons: readSheet(workbook, 'Lessons'),
    lessonMap: readSheet(workbook, 'Lesson Map'),
    families: readSheet(workbook, 'Phrase Families'),
    naturalVariants: readSheet(workbook, 'Natural Variants'),
    audio: readSheet(workbook, 'Audio Manifest'),
    sources: readSheet(workbook, 'Sources'),
    gates: readSheet(workbook, 'Production Gates'),
    reviewQueue: readSheet(workbook, 'Review Queue'),
    testTemplates: readSheet(workbook, 'Test Templates'),
  };

  data.lessonMap = [...data.lessonMap, ...corrections];
  data.corrections = corrections;
  return data;
}

export { validate, importAll, ValidationError, TRADE_TO_PROFESSION, TRACK_TO_MODULE };

export async function runImport({ xlsxPath, dbUrl, dryRun = false }) {
  const data = loadWorkbook(xlsxPath);
  validate(data);
  if (dryRun) return { dryRun: true };

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  const report = {};
  try {
    await client.query('begin');
    await importAll(client, data, report);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
  return report;
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());

if (isDirectRun) {
  const args = process.argv.slice(2);
  const xlsxPath = args.find((a) => !a.startsWith('--'));
  const dbIndex = args.indexOf('--db');
  const dbUrl = dbIndex >= 0 ? args[dbIndex + 1] : process.env.DATABASE_URL;
  const dryRun = args.includes('--dry-run');

  if (!xlsxPath) {
    console.error('usage: import-course-content.mjs <xlsx> [--db <url>] [--dry-run]');
    process.exit(1);
  }

  try {
    const report = await runImport({ xlsxPath, dbUrl, dryRun });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`\n${error.message}\n`);
      for (const problem of error.problems.slice(0, 50)) console.error(`  - ${problem}`);
      if (error.problems.length > 50) {
        console.error(`  … and ${error.problems.length - 50} more`);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}
