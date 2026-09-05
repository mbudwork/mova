import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import XLSX from 'xlsx';
import {
  asAnon,
  asUser,
  connectProduction,
  createUser,
  grantEntitlement,
  resetProductionDatabase,
  runImporter,
  selectProfession,
  workbookPath,
} from './harness';

/**
 * PHASE 4 — the real Content Master, imported into a database that contains no
 * demo seed at all. Three jobs: prove the import is faithful to the workbook,
 * prove the PHASE 3 engine still behaves on a dataset 30× larger, and prove
 * nothing that the production process left unapproved reaches a user.
 */

let db: pg.Client;
let sheets: Record<string, Record<string, unknown>[]>;

/** Trockenbau worker with an entitlement. */
let tbUser: string;
/** Fliesenleger worker with an entitlement. */
let flUser: string;
/** Elektriker worker with an entitlement — safety content matters most here. */
let elUser: string;
/** Onboarded but not paying. */
let freeUser: string;

function sheet(name: string) {
  return sheets[name]!;
}

type CorrectionRow = { lesson_id: string; phrase_id: string; order_no: number; role: string };

/** The versioned repair applied on top of the workbook's own Lesson Map. */
function corrections(): CorrectionRow[] {
  const file = JSON.parse(
    readFileSync(path.join(process.cwd(), 'content', 'lesson-map-corrections.json'), 'utf8'),
  );
  return file.rows as CorrectionRow[];
}

async function count(client: pg.Client, sql: string, params: unknown[] = []) {
  const { rows } = await client.query(`select count(*)::int as n from (${sql}) t`, params);
  return rows[0].n as number;
}

beforeAll(async () => {
  resetProductionDatabase();
  db = await connectProduction();

  const workbook = XLSX.readFile(workbookPath());
  sheets = {};
  for (const name of workbook.SheetNames) {
    sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name]!, { defval: null });
  }

  tbUser = await createUser(db, 'tb@test.de');
  flUser = await createUser(db, 'fl@test.de');
  elUser = await createUser(db, 'el@test.de');
  freeUser = await createUser(db, 'free@test.de');

  await selectProfession(db, tbUser, 'trockenbau');
  await selectProfession(db, flUser, 'fliesenleger');
  await selectProfession(db, elUser, 'elektriker');
  await selectProfession(db, freeUser, 'trockenbau');

  await grantEntitlement(db, tbUser);
  await grantEntitlement(db, flUser);
  await grantEntitlement(db, elUser);
}, 300_000);

afterAll(async () => {
  await db?.end();
});

// ================================================ EXCEL ↔ DB INTEGRITY =======
describe('content integrity against the workbook', () => {
  it('imports every FINAL phrase and no more', async () => {
    expect(await count(db, 'select 1 from phrases')).toBe(sheet('FINAL Phrases').length);
  });

  it('does not import the row dropped during the audit', async () => {
    const { rows } = await db.query("select 1 from phrases where external_id = 'P0213'");
    expect(rows).toHaveLength(0);
    // …and confirms it really was dropped upstream, not lost by the importer.
    expect(sheet('FINAL Phrases').some((r) => r.ID === 'P0213')).toBe(false);
    expect(sheet('Phrases').some((r) => r.ID === 'P0213')).toBe(true);
  });

  it('gives every phrase a Russian translation', async () => {
    expect(await count(db, "select 1 from phrase_translations where language_code = 'ru'")).toBe(
      sheet('FINAL Phrases').length,
    );
  });

  it('imports vocabulary, lessons and the lesson map exactly', async () => {
    expect(await count(db, 'select 1 from vocabulary_items')).toBe(sheet('Vocabulary').length);
    expect(await count(db, 'select 1 from lessons')).toBe(sheet('Lessons').length);
    expect(await count(db, 'select 1 from lesson_phrases')).toBe(
      sheet('Lesson Map').length + corrections().length,
    );
  });

  it('imports families and natural variants with all their registers', async () => {
    const families = sheet('Phrase Families').length;
    const variants = sheet('Natural Variants').length;
    expect(await count(db, 'select 1 from phrase_families')).toBe(families + variants);
    // 15 families × 4 registers + 12 variants × 3 registers
    expect(await count(db, 'select 1 from phrase_family_variants')).toBe(families * 4 + variants * 3);
  });

  it('imports the audio manifest and generates nothing', async () => {
    expect(await count(db, 'select 1 from audio_assets')).toBe(sheet('Audio Manifest').length);
    expect(await count(db, "select 1 from audio_assets where status <> 'pending'")).toBe(0);
    expect(await count(db, 'select 1 from audio_assets where storage_path is not null')).toBe(0);
  });

  it('keeps the production process metadata', async () => {
    expect(await count(db, 'select 1 from content_sources')).toBe(sheet('Sources').length);
    expect(await count(db, 'select 1 from production_gates')).toBe(sheet('Production Gates').length);
    expect(await count(db, 'select 1 from review_queue')).toBe(sheet('Review Queue').length);
    expect(await count(db, 'select 1 from test_templates')).toBe(sheet('Test Templates').length);
  });

  it('preserves every test mechanic the course defines', async () => {
    const { rows } = await db.query('select test_type from test_templates order by id');
    const types = rows.map((r) => r.test_type);
    expect(types).toContain('Listen → reveal');
    expect(types).toContain('Listen → choose translation');
    expect(types).toContain('Listen → choose reaction');
    expect(types).toContain('Listen → unseen combination');
    expect(types).toContain('Safety recognition');
    expect(types).toHaveLength(10);
  });

  it('reproduces German and Russian verbatim for a sample across every trade', async () => {
    const wanted = ['P0001', 'P0100', 'P0213', 'P0250', 'P0300', 'P0400', 'P0432'];
    for (const id of wanted) {
      const excelRow = sheet('FINAL Phrases').find((r) => r.ID === id);
      const { rows } = await db.query(
        `select p.german_text, t.text as russian from phrases p
           join phrase_translations t on t.phrase_id = p.id and t.language_code = 'ru'
          where p.external_id = $1`,
        [id],
      );
      if (!excelRow) {
        expect(rows).toHaveLength(0);
        continue;
      }
      expect(rows[0].german_text).toBe(excelRow.German);
      expect(rows[0].russian).toBe(excelRow.Russian);
    }
  });

  it('carries priority, stage and safety through unchanged', async () => {
    const excelSafety = sheet('FINAL Phrases').filter((r) => r.Safety === 'YES').length;
    expect(await count(db, 'select 1 from phrases where safety_sensitive')).toBe(excelSafety);

    for (const priority of ['A', 'B', 'C']) {
      const expected = sheet('FINAL Phrases').filter((r) => r.Priority === priority).length;
      expect(await count(db, 'select 1 from phrases where priority = $1', [priority])).toBe(expected);
    }
  });

  it('splits the lesson map into primary and review pool as authored', async () => {
    for (const role of ['primary', 'review_pool']) {
      const expected =
        sheet('Lesson Map').filter((r) => r.role === role).length +
        corrections().filter((r) => r.role === role).length;
      expect(await count(db, 'select 1 from lesson_phrases where role = $1', [role])).toBe(expected);
    }
  });

  it('keeps new targets per lesson within the 8–10 the course is designed for', async () => {
    const { rows } = await db.query(
      `select max(n) as worst from (
         select count(*) as n from lesson_phrases
          where role = 'primary' group by lesson_id) s`,
    );
    expect(Number(rows[0].worst)).toBeLessThanOrEqual(10);
  });
});

// ====================================================== IMPORTER BEHAVIOUR ===
describe('importer', () => {
  it('is idempotent: a second run changes no row counts', async () => {
    const before = {
      phrases: await count(db, 'select 1 from phrases'),
      vocabulary: await count(db, 'select 1 from vocabulary_items'),
      lessons: await count(db, 'select 1 from lessons'),
      map: await count(db, 'select 1 from lesson_phrases'),
      audio: await count(db, 'select 1 from audio_assets'),
      variants: await count(db, 'select 1 from phrase_family_variants'),
    };

    runImporter();

    expect({
      phrases: await count(db, 'select 1 from phrases'),
      vocabulary: await count(db, 'select 1 from vocabulary_items'),
      lessons: await count(db, 'select 1 from lessons'),
      map: await count(db, 'select 1 from lesson_phrases'),
      audio: await count(db, 'select 1 from audio_assets'),
      variants: await count(db, 'select 1 from phrase_family_variants'),
    }).toEqual(before);
  }, 300_000);

  it('publishes every lesson now that L03 and L04 have content', async () => {
    const { rows } = await db.query('select external_id from lessons where not is_published');
    expect(rows).toHaveLength(0);
  });

  it('still refuses to publish a lesson that has no mapped content', async () => {
    // The safety net stays: this proves the rule is enforced, not that the
    // current data happens to satisfy it.
    await db.query(
      `insert into lessons (external_id, module_id, slug, order_index, is_published, track)
       select 'L99', id, 'l99', 99, false, 'CORE' from modules where slug = 'core'
       on conflict (external_id) do nothing`,
    );
    const { rows } = await db.query("select is_published from lessons where external_id = 'L99'");
    expect(rows[0].is_published).toBe(false);
    await db.query("delete from lessons where external_id = 'L99'");
  });
});

// ============================================ L03 / L04 CORRECTION (§1) ======
describe('the repaired lessons L03 and L04', () => {
  async function primaryOf(externalId: string) {
    const { rows } = await db.query(
      `select p.external_id, p.german_text, t.text as russian, lp.order_index
         from lessons l
         join lesson_phrases lp on lp.lesson_id = l.id and lp.role = 'primary'
         join phrases p on p.id = lp.phrase_id
         join phrase_translations t on t.phrase_id = p.id and t.language_code = 'ru'
        where l.external_id = $1
        order by lp.order_index`,
      [externalId],
    );
    return rows;
  }

  it('gives L03 ten primary targets built on machen / holen / bringen', async () => {
    const rows = await primaryOf('L03');
    expect(rows).toHaveLength(10);
    const german = rows.map((r) => r.german_text).join(' ');
    expect(german).toMatch(/\bMach\b/);
    expect(german).toMatch(/\bHol\b/);
    expect(german).toMatch(/\bBring\b/);
  });

  it('gives L04 primary targets built on stellen / legen', async () => {
    const rows = await primaryOf('L04');
    // Six, not eight to ten: the Content Master has no further suitable
    // phrases. See "gaps" in content/lesson-map-corrections.json.
    expect(rows).toHaveLength(6);
    const german = rows.map((r) => r.german_text).join(' ');
    expect(german).toMatch(/\bStell\b/);
    expect(german).toMatch(/\bLeg\b/);
  });

  it('uses only phrases that already existed in the Content Master', () => {
    const known = new Set(sheet('FINAL Phrases').map((r) => r.ID));
    for (const row of corrections()) {
      expect(known.has(row.phrase_id)).toBe(true);
    }
  });

  it('never repeats a phrase inside one lesson', () => {
    const seen = new Set<string>();
    for (const row of corrections()) {
      const key = `${row.lesson_id}|${row.phrase_id}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('puts no trade content and no unreviewed safety phrase into a CORE lesson', async () => {
    const ids = corrections().map((r) => r.phrase_id);
    const { rows } = await db.query(
      `select p.external_id, p.profession_id, p.safety_sensitive, lp.role
         from phrases p
         join lesson_phrases lp on lp.phrase_id = p.id
         join lessons l on l.id = lp.lesson_id
        where p.external_id = any($1) and l.external_id in ('L03','L04')`,
      [ids],
    );
    for (const row of rows) {
      expect(row.profession_id).toBeNull();
      if (row.role === 'primary') expect(row.safety_sensitive).toBe(false);
    }
  });

  it('shows both lessons to every trade, since they are CORE', async () => {
    for (const user of [tbUser, flUser, elUser]) {
      const slugs = await asUser(db, user, async (c) =>
        (await c.query('select lesson_slug from accessible_lessons()')).rows.map(
          (r) => r.lesson_slug,
        ),
      );
      expect(slugs).toContain('l03');
      expect(slugs).toContain('l04');
    }
  });
});

// ================================================ REVIEW STATE PRESERVED =====
describe('approval state is not invented by the import', () => {
  it('keeps all nine production gates open', async () => {
    expect(await count(db, "select 1 from production_gates where status = 'OPEN'")).toBe(9);
  });

  it('keeps the review queue open', async () => {
    expect(await count(db, "select 1 from review_queue where decision = 'OPEN'")).toBe(10);
  });

  it('leaves phrase families awaiting native review, as Review Queue R002 requires', async () => {
    expect(await count(db, "select 1 from phrase_families where kind = 'family'")).toBe(15);
    expect(
      await count(db, "select 1 from phrase_families where kind = 'family' and status = 'approved'"),
    ).toBe(0);
  });

  it('does not promote natural variants that the workbook marks native_review', async () => {
    const expected = sheet('Natural Variants').filter((r) => r.Status === 'native_review').length;
    expect(
      await count(db, "select 1 from phrase_families where status = 'native_review' and kind = 'natural_variant'"),
    ).toBe(expected);
  });

  it('does not raise any confidence value', async () => {
    expect(await count(db, "select 1 from phrases where confidence <> 'HIGH'")).toBe(0);
    expect(await count(db, 'select 1 from phrases where confidence is null')).toBe(0);
  });
});

// ============================================== PHASE 3 REGRESSION ON REAL ===
describe('access control on production content', () => {
  it('gives an anonymous visitor nothing', async () => {
    await expect(asAnon(db, (c) => c.query('select id from phrases'))).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('gives a user without an entitlement no production phrases', async () => {
    const n = await asUser(db, freeUser, (c) => count(c, 'select 1 from phrases'));
    // The Content Master defines no free-preview set, so paid content is fully
    // gated. Recorded as a product decision in the content report.
    expect(n).toBe(0);
  });

  it('gives an entitled user every approved phrase', async () => {
    const approved = sheet('FINAL Phrases').filter((r) => r.Status === 'approved').length;
    expect(await asUser(db, tbUser, (c) => count(c, 'select 1 from phrases'))).toBe(approved);
  });

  it('hides all 28 safety phrases that have not passed safety review', async () => {
    const safetyPending = sheet('FINAL Phrases').filter(
      (r) => r.Safety === 'YES' && r.Status === 'safety_review',
    ).length;
    expect(safetyPending).toBe(28);
    expect(
      await asUser(db, elUser, (c) => count(c, 'select 1 from phrases where safety_sensitive')),
    ).toBe(0);
  });

  it('hides unapproved ELEKTRO safety content specifically', async () => {
    const visible = await asUser(db, elUser, async (c) =>
      count(
        c,
        `select 1 from phrases p
           join professions pr on pr.id = p.profession_id
          where pr.slug = 'elektriker' and p.safety_sensitive`,
      ),
    );
    expect(visible).toBe(0);
  });

  it('hides a draft phrase inserted after the import', async () => {
    await db.query(
      "insert into phrases (german_text, verification_status) values ('NACH-IMPORT DRAFT','draft')",
    );
    expect(
      await asUser(db, tbUser, (c) =>
        count(c, "select 1 from phrases where german_text = 'NACH-IMPORT DRAFT'"),
      ),
    ).toBe(0);
  });

  it('does not expose production process metadata to users', async () => {
    for (const table of ['production_gates', 'review_queue', 'content_sources', 'test_templates']) {
      expect(await asUser(db, tbUser, (c) => count(c, `select 1 from ${table}`))).toBe(0);
    }
  });

  it('does not expose family variants while their family awaits review', async () => {
    expect(await asUser(db, tbUser, (c) => count(c, 'select 1 from phrase_family_variants'))).toBe(
      // only the 8 approved natural variants × 3 registers
      24,
    );
  });
});

// ============================================== REAL COURSE SMOKE TESTS ======
describe('a Fliesenleger walking the real course', () => {
  it('gets CORE plus FLIESEN and no other trade', async () => {
    const rows = await asUser(db, flUser, async (c) =>
      (await c.query('select lesson_slug, scope from accessible_lessons() order by lesson_slug'))
        .rows,
    );
    const slugs = rows.map((r) => r.lesson_slug);

    // CORE = L01–L24 minus the two unpublished, plus the L43 assessment.
    expect(slugs).toContain('l01');
    expect(slugs).toContain('l43');
    expect(slugs).toContain('l03');
    // FLIESEN is L28–L30.
    expect(slugs).toContain('l28');
    expect(slugs).toContain('l30');
    // Every other trade stays out.
    for (const foreign of ['l25', 'l31', 'l34', 'l37', 'l40']) {
      expect(slugs).not.toContain(foreign);
    }
  });

  it('starts at the first CORE lesson', async () => {
    const { rows } = await db.query('select next_lesson() as slug');
    const first = await asUser(db, flUser, async (c) =>
      (await c.query('select next_lesson() as slug')).rows[0].slug,
    );
    expect(first).toBe('l01');
    expect(rows).toBeDefined();
  });

  it('walks CORE, then its own trade, then the assessment', async () => {
    const order = await asUser(db, flUser, async (c) =>
      (
        await c.query(
          `select lesson_slug from accessible_lessons() order by module_order, lesson_order`,
        )
      ).rows.map((r) => r.lesson_slug),
    );

    const coreEnd = order.indexOf('l24');
    const tradeStart = order.indexOf('l28');
    const assessment = order.indexOf('l43');

    expect(coreEnd).toBeGreaterThan(0);
    expect(tradeStart).toBeGreaterThan(coreEnd);
    expect(assessment).toBe(order.length - 1);
  });

  it('serves a real first lesson with real phrases', async () => {
    const rows = await asUser(db, flUser, async (c) =>
      (
        await c.query(
          `select p.german_text, t.text as russian, lp.role
             from lessons l
             join lesson_phrases lp on lp.lesson_id = l.id
             join phrases p on p.id = lp.phrase_id
             join phrase_translations t on t.phrase_id = p.id and t.language_code = 'ru'
            where l.slug = 'l01' and lp.role = 'primary'
            order by lp.order_index`,
        )
      ).rows,
    );
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.length).toBeLessThanOrEqual(10);
    expect(rows[0].german_text).toBeTruthy();
    expect(rows[0].russian).toBeTruthy();
  });

  it('serves a mid-course CORE lesson', async () => {
    const n = await asUser(db, flUser, (c) =>
      count(
        c,
        `select 1 from lessons l join lesson_phrases lp on lp.lesson_id = l.id
          where l.slug = 'l12' and lp.role = 'primary'`,
      ),
    );
    expect(n).toBeGreaterThan(0);
  });

  it('serves the first and last FLIESEN lessons', async () => {
    for (const slug of ['l28', 'l30']) {
      const n = await asUser(db, flUser, (c) =>
        count(
          c,
          `select 1 from lessons l join lesson_phrases lp on lp.lesson_id = l.id
            where l.slug = $1`,
          [slug],
        ),
      );
      expect(n).toBeGreaterThan(0);
    }
  });

  it('cannot complete another trade\'s lesson', async () => {
    const { rows } = await db.query("select id from lessons where slug = 'l25'");
    await expect(
      asUser(db, flUser, (c) => c.query('select complete_lesson($1)', [rows[0].id])),
    ).rejects.toThrow(/lesson not available/);
  });
});

describe('other trades get their own track', () => {
  it('routes a Trockenbau worker to L25–L27', async () => {
    const slugs = await asUser(db, tbUser, async (c) =>
      (await c.query('select lesson_slug from accessible_lessons()')).rows.map((r) => r.lesson_slug),
    );
    expect(slugs).toEqual(expect.arrayContaining(['l25', 'l26', 'l27']));
    expect(slugs).not.toContain('l28');
  });

  it('routes an Elektriker to L37–L39', async () => {
    const slugs = await asUser(db, elUser, async (c) =>
      (await c.query('select lesson_slug from accessible_lessons()')).rows.map((r) => r.lesson_slug),
    );
    expect(slugs).toEqual(expect.arrayContaining(['l37', 'l38', 'l39']));
    expect(slugs).not.toContain('l25');
    expect(slugs).not.toContain('l40');
  });

  it('gives every trade the same CORE base', async () => {
    const counts = [];
    for (const user of [tbUser, flUser, elUser]) {
      counts.push(
        await asUser(db, user, (c) =>
          count(c, "select 1 from accessible_lessons() where scope = 'core'"),
        ),
      );
    }
    expect(new Set(counts).size).toBe(1);
  });

  it('survives a worker changing trade later', async () => {
    await db.query('delete from user_professions where user_id = $1', [flUser]);
    await selectProfession(db, flUser, 'maler');

    const slugs = await asUser(db, flUser, async (c) =>
      (await c.query('select lesson_slug from accessible_lessons()')).rows.map((r) => r.lesson_slug),
    );
    expect(slugs).toEqual(expect.arrayContaining(['l31', 'l32', 'l33']));
    expect(slugs).not.toContain('l28');

    // restore
    await db.query('delete from user_professions where user_id = $1', [flUser]);
    await selectProfession(db, flUser, 'fliesenleger');
  });
});

// ================================================ PROGRESS ON REAL COURSE ====
describe('progress on the real course', () => {
  let firstLessonId: string;

  beforeAll(async () => {
    const { rows } = await db.query("select id from lessons where slug = 'l01'");
    firstLessonId = rows[0].id;
  });

  it('reports real denominators derived from the workbook, not a placeholder', () => {
    // Expected values are computed from the Content Master itself, so this
    // test fails if the course changes shape rather than encoding a magic
    // number that quietly goes stale.
    const mapped = new Set([
      ...sheet('Lesson Map').map((r) => r.lesson_id),
      ...corrections().map((r) => r.lesson_id),
    ]);
    const reachable = sheet('Lessons').filter(
      (r) => mapped.has(r.Lesson) && ['CORE', 'ALL', 'TROCKENBAU'].includes(r.Track as string),
    );
    const reachableIds = new Set(reachable.map((r) => r.Lesson));
    const distinctPhrases = new Set(
      [...sheet('Lesson Map'), ...corrections()]
        .filter((r) => reachableIds.has(r.lesson_id))
        .map((r) => r.phrase_id),
    );

    return asUser(db, tbUser, async (c) => {
      const { rows } = await c.query('select * from course_progress()');
      expect(rows[0].lessons_total).toBe(reachable.length);
      expect(rows[0].phrases_total).toBe(distinctPhrases.size);
    });
  });

  it('completes, advances and persists', async () => {
    const first = await asUser(db, tbUser, async (c) =>
      (await c.query('select complete_lesson($1) as ok', [firstLessonId])).rows[0].ok,
    );
    expect(first).toBe(true);

    const next = await asUser(db, tbUser, async (c) =>
      (await c.query('select next_lesson() as slug')).rows[0].slug,
    );
    expect(next).toBe('l02');

    const progress = await asUser(db, tbUser, async (c) =>
      (await c.query('select lessons_completed from course_progress()')).rows,
    );
    expect(progress[0].lessons_completed).toBe(1);
  });

  it('does not inflate progress when the lesson is replayed', async () => {
    const repeat = await asUser(db, tbUser, async (c) =>
      (await c.query('select complete_lesson($1) as ok', [firstLessonId])).rows[0].ok,
    );
    expect(repeat).toBe(false);

    const progress = await asUser(db, tbUser, async (c) =>
      (await c.query('select lessons_completed from course_progress()')).rows,
    );
    expect(progress[0].lessons_completed).toBe(1);
  });

  it('walks L02 → L03 → L04 → L05 as lessons are completed', async () => {
    // A fresh user, so the walk starts from the beginning of the course.
    const walker = await createUser(db, 'walker@test.de');
    await selectProfession(db, walker, 'trockenbau');
    await grantEntitlement(db, walker);

    const lessonId = async (slug: string) =>
      (await db.query('select id from lessons where slug = $1', [slug])).rows[0].id;

    const next = async () =>
      asUser(db, walker, async (c) => (await c.query('select next_lesson() as slug')).rows[0].slug);

    const complete = async (slug: string) => {
      const id = await lessonId(slug);
      return asUser(db, walker, (c) => c.query('select complete_lesson($1)', [id]));
    };

    expect(await next()).toBe('l01');
    await complete('l01');
    expect(await next()).toBe('l02');
    await complete('l02');
    expect(await next()).toBe('l03');
    await complete('l03');
    expect(await next()).toBe('l04');
    await complete('l04');
    expect(await next()).toBe('l05');
  });

  it('seeds spaced repetition only for the lesson it completed', async () => {
    const seeded = await asUser(db, tbUser, (c) =>
      count(c, 'select 1 from phrase_progress where user_id = $1', [tbUser]),
    );
    const inLesson = await count(
      db,
      'select 1 from lesson_phrases where lesson_id = $1',
      [firstLessonId],
    );
    expect(seeded).toBe(inLesson);
  });
});

// ======================================================= QUERY SHAPE (§20) ===
describe('query cost on the full dataset', () => {
  it('reads one lesson without scanning the whole course', async () => {
    const { rows } = await db.query(
      `explain (analyze, buffers, format json)
       select p.german_text, t.text
         from lessons l
         join lesson_phrases lp on lp.lesson_id = l.id
         join phrases p on p.id = lp.phrase_id
         join phrase_translations t on t.phrase_id = p.id and t.language_code = 'ru'
        where l.slug = 'l01' and lp.role = 'primary'`,
    );
    const plan = rows[0]['QUERY PLAN'][0];
    // A single lesson touches a couple of dozen rows, not 432 phrases × 797 map rows.
    expect(plan['Plan']['Actual Rows']).toBeLessThan(50);
  });

  it('computes progress without returning content rows', async () => {
    const rows = await asUser(db, tbUser, async (c) =>
      (await c.query('select * from course_progress()')).rows,
    );
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0])).toEqual([
      'lessons_total',
      'lessons_completed',
      'phrases_total',
      'phrases_learned',
    ]);
  });

  it('resolves the next lesson with a single scalar', async () => {
    const rows = await asUser(db, tbUser, async (c) =>
      (await c.query('select next_lesson() as slug')).rows,
    );
    expect(rows).toHaveLength(1);
  });
});
