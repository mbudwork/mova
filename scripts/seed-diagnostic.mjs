#!/usr/bin/env node
/**
 * Builds the public diagnostic test from approved production content.
 *
 * Seven questions, seven real phrases. Nothing here is written by hand: the
 * German and the correct Russian are read from the imported Content Master,
 * and the distractors are other real approved phrases drawn from different
 * content modules, so a wrong answer is plausible rather than absurd.
 *
 * The result is a snapshot in diagnostic_questions / diagnostic_options. The
 * public funnel reads only those tables, so anonymous access never reaches
 * `phrases` and the course stays behind RLS and entitlement.
 *
 *   node scripts/seed-diagnostic.mjs --db <postgres-url>
 *
 * Idempotent: keyed by question position.
 */

import pg from 'pg';

/**
 * Chosen for skill coverage and rising difficulty, not for how they sound.
 * Every id is an approved, non-safety, CORE phrase.
 */
const PLAN = [
  { position: 1, phrase: 'P0031', skill: 'Инструмент',            skillUk: 'Інструмент',            distractorModules: ['Materials', 'Quality', 'Workday'] },
  { position: 2, phrase: 'P0049', skill: 'Материал и место',      skillUk: 'Матеріал і місце',       distractorModules: ['Tools', 'Sequence', 'Quality'] },
  { position: 3, phrase: 'P0063', skill: 'Направление',           skillUk: 'Напрямок',               distractorModules: ['Measurements', 'Tools', 'Workday'] },
  { position: 4, phrase: 'P0089', skill: 'Размер и число',        skillUk: 'Розмір і число',         distractorModules: ['Location', 'Quality', 'Tools'] },
  { position: 5, phrase: 'P0143', skill: 'Переделка',             skillUk: 'Переробка',              distractorModules: ['Sequence', 'Measurements', 'Materials'] },
  { position: 6, phrase: 'P0112', skill: 'Последовательность',    skillUk: 'Послідовність',          distractorModules: ['Quality', 'Tools', 'Location'] },
  { position: 7, phrase: 'P0109', skill: 'Команда из двух шагов', skillUk: 'Команда з двох кроків',  distractorModules: ['Workday', 'Materials', 'Location'] },
];

/**
 * Ukrainian text for the diagnostic snapshot only — a deliberately small,
 * hand-authored set for 7 marketing/funnel strings, not a translation of the
 * production course. Written by this script's author (an AI), not reviewed
 * by a native Ukrainian speaker: `is_uk_reviewed` is set to false and stays
 * false here on purpose. See docs/MOVA_LANDING_V2_STRATEGY.md §14.
 */
const RU_TO_UK_ANSWER = {
  'Принеси, пожалуйста, уровень.': 'Принеси, будь ласка, рівень.',
  'Отнеси материал наверх.': 'Віднеси матеріал нагору.',
  'Поставь материал сюда.': 'Постав матеріал сюди.',
  'Немного дальше влево.': 'Трохи далі вліво.',
  'Не здесь, там.': 'Не тут, там.',
  'Сделай это на пять миллиметров выше.': 'Зроби це на п’ять міліметрів вище.',
  'Принеси один рулон.': 'Принеси один рулон.',
  'Сначала сделай это.': 'Спочатку зроби це.',
  'Сначала закончи эту стену.': 'Спочатку закінчи цю стіну.',
  'Это нужно переделать.': 'Це треба переробити.',
  'Сначала измерить, потом резать.': 'Спочатку виміряти, потім різати.',
};

function toUkDraft(russian) {
  return RU_TO_UK_ANSWER[russian] ?? null;
}

const args = process.argv.slice(2);
const dbIndex = args.indexOf('--db');
const dbUrl = dbIndex >= 0 ? args[dbIndex + 1] : process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('usage: seed-diagnostic.mjs --db <postgres-url>');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

/** Deterministic pick so two runs produce the same test. */
function pick(rows, seed) {
  if (rows.length === 0) return null;
  return rows[seed % rows.length];
}

try {
  await client.query('begin');

  for (const item of PLAN) {
    const { rows: source } = await client.query(
      `select p.german_text, t.text as russian, p.content_module,
              p.verification_status, p.safety_sensitive, p.profession_id
         from phrases p
         join phrase_translations t on t.phrase_id = p.id and t.language_code = 'ru'
        where p.external_id = $1`,
      [item.phrase],
    );

    if (source.length === 0) {
      throw new Error(
        `Phrase ${item.phrase} is not in the database. Run the content import first.`,
      );
    }

    const phrase = source[0];

    // Guard rails: the funnel must never surface unapproved, safety-sensitive
    // or trade-specific material to an anonymous visitor.
    if (phrase.verification_status !== 'approved') {
      throw new Error(`${item.phrase} is ${phrase.verification_status}, not approved`);
    }
    if (phrase.safety_sensitive) {
      throw new Error(`${item.phrase} is safety-sensitive and cannot enter the public test`);
    }
    if (phrase.profession_id !== null) {
      throw new Error(`${item.phrase} is trade-specific and cannot enter the public test`);
    }

    const { rows: questionRows } = await client.query(
      `insert into diagnostic_questions (position, source_phrase, german_text, skill_label, skill_label_uk, is_uk_reviewed)
       values ($1,$2,$3,$4,$5,false)
       on conflict (position) do update set
         source_phrase  = excluded.source_phrase,
         german_text    = excluded.german_text,
         skill_label    = excluded.skill_label,
         skill_label_uk = excluded.skill_label_uk,
         is_active      = true
       returning id`,
      [item.position, item.phrase, phrase.german_text, item.skill, item.skillUk],
    );
    const questionId = questionRows[0].id;

    // Rebuild options wholesale: partial updates would risk two correct rows.
    await client.query('delete from diagnostic_options where question_id = $1', [questionId]);

    const distractors = [];
    for (const [i, moduleName] of item.distractorModules.entries()) {
      const { rows: candidates } = await client.query(
        `select t.text as russian
           from phrases p
           join phrase_translations t on t.phrase_id = p.id and t.language_code = 'ru'
          where p.content_module = $1
            and p.verification_status = 'approved'
            and not p.safety_sensitive
            and p.profession_id is null
            and t.text <> $2
            and t.text <> all($3::text[])
          order by p.external_id`,
        [moduleName, phrase.russian, distractors],
      );
      const chosen = pick(candidates, item.position * 7 + i * 3);
      if (!chosen) throw new Error(`No distractor available from module ${moduleName}`);
      distractors.push(chosen.russian);
    }

    // Correct answer position rotates so it is not always first.
    const correctSlot = (item.position - 1) % 4;
    const texts = [...distractors];
    texts.splice(correctSlot, 0, phrase.russian);

    for (const [index, text] of texts.entries()) {
      await client.query(
        `insert into diagnostic_options (question_id, position, text_ru, text_uk, is_correct)
         values ($1,$2,$3,$4,$5)`,
        [questionId, index + 1, text, toUkDraft(text), index === correctSlot],
      );
    }
  }

  // Anything left over from an older plan is deactivated, not silently kept.
  await client.query('update diagnostic_questions set is_active = false where position > $1', [
    PLAN.length,
  ]);

  await client.query('commit');

  const { rows: summary } = await client.query(
    `select q.position, q.source_phrase, q.german_text, q.audio_status,
            count(o.id)::int as options
       from diagnostic_questions q
       left join diagnostic_options o on o.question_id = q.id
      where q.is_active
      group by q.id order by q.position`,
  );
  console.table(summary);
} catch (error) {
  await client.query('rollback');
  console.error(error.message);
  process.exit(1);
} finally {
  await client.end();
}
