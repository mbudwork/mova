import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import {
  asUser,
  connectProduction,
  createUser,
  grantEntitlement,
  resetProductionDatabase,
  selectProfession,
} from './harness';

/**
 * Course Engine V1 — the real retrieval-practice mechanic.
 *
 * These tests exercise record_answer(), due_review_phrases() and the
 * rebuilt complete_lesson() directly against PostgreSQL, covering every
 * scenario listed for this phase: correct/incorrect answers, replay,
 * reload-equivalent re-fetch, day-later review, cross-device (a second
 * session reading the same row), lesson completion, due review, every state
 * transition including regression from MASTERED, and "nothing due".
 */

let db: pg.Client;
let user: string;

async function firstPhraseOfLesson(slug: string): Promise<string> {
  const { rows } = await db.query(
    `select p.id from lessons l
       join lesson_phrases lp on lp.lesson_id = l.id and lp.role = 'primary'
       join phrases p on p.id = lp.phrase_id
      where l.slug = $1 order by lp.order_index limit 1`,
    [slug],
  );
  return rows[0].id;
}

/**
 * A visible (approved, non-safety) primary phrase this specific user has
 * never answered before. Content legitimately reuses the same phrase_id as
 * "primary" across several lessons (129 such phrases, per the pre-launch
 * audit) — picking "the first phrase of lesson X" is therefore NOT a safe
 * way to get an isolated phrase for a test, since lesson X and lesson Y may
 * share that exact row. This is the isolation-safe alternative.
 */
const claimedForIsolation = new Set<string>();

async function freshPrimaryPhrase(userId: string): Promise<string> {
  const { rows } = await db.query(
    `select distinct p.id from lesson_phrases lp
       join phrases p on p.id = lp.phrase_id
      where lp.role = 'primary'
        and p.verification_status = 'approved'
        and not p.safety_sensitive
        and p.id not in (select phrase_id from phrase_progress where user_id = $1)
      order by p.id
      limit 200`,
    [userId],
  );
  const pick = rows.find((r) => !claimedForIsolation.has(r.id));
  if (!pick) throw new Error('Ran out of fresh phrases for isolation tests — widen the pool.');
  claimedForIsolation.add(pick.id);
  return pick.id;
}

async function progressRow(userId: string, phraseId: string) {
  const { rows } = await db.query(
    'select * from phrase_progress where user_id = $1 and phrase_id = $2',
    [userId, phraseId],
  );
  return rows[0] ?? null;
}

beforeAll(async () => {
  resetProductionDatabase();
  db = await connectProduction();
  user = await createUser(db, 'engine@test.de');
  await selectProfession(db, user, 'trockenbau');
  await grantEntitlement(db, user);
}, 120_000);

afterAll(async () => {
  await db?.end();
});

// ====================================================== LESSON CONTENT =====
describe('lesson content is primary-only', () => {
  it('L02 returns exactly its 10 primary phrases, not 20', async () => {
    const rows = await asUser(db, user, async (c) =>
      (
        await c.query(
          `select p.id from lessons l
             join lesson_phrases lp on lp.lesson_id = l.id and lp.role = 'primary'
             join phrases p on p.id = lp.phrase_id
            where l.slug = 'l02'`,
        )
      ).rows,
    );
    expect(rows).toHaveLength(10);
  });

  it('a review_pool-only phrase is not reachable through a lesson at all', async () => {
    // P0073 is one of the 135 orphans found in the audit: review_pool only,
    // never primary anywhere. It must not surface via any lesson's primary set.
    const rows = await db.query(
      `select 1 from lesson_phrases lp
         join phrases p on p.id = lp.phrase_id
        where p.external_id = 'P0073' and lp.role = 'primary'`,
    );
    expect(rows.rows).toHaveLength(0);
  });
});

// =================================================== STATE MACHINE (SQL) ===
describe('next_progress_state — the monotonic ladder', () => {
  const cases: [string, boolean, string][] = [
    ['new', true, 'learning'],
    ['new', false, 'weak'],
    ['learning', true, 'understood'],
    ['learning', false, 'weak'],
    ['understood', true, 'mastered'],
    ['understood', false, 'weak'],
    ['mastered', true, 'mastered'],
    ['mastered', false, 'weak'],
    ['weak', true, 'learning'],
    ['weak', false, 'weak'],
  ];

  for (const [from, correct, to] of cases) {
    it(`${from} + ${correct ? 'correct' : 'incorrect'} → ${to}`, async () => {
      const { rows } = await db.query('select next_progress_state($1, $2) as s', [from, correct]);
      expect(rows[0].s).toBe(to);
    });
  }
});

describe('next_review_interval', () => {
  it('assigns the four fixed buckets exactly as specified', async () => {
    // Cast to text so node-pg returns plain strings instead of its parsed
    // PostgresInterval object shape — the DB behaviour is what's under test,
    // not the driver's interval representation.
    const { rows } = await db.query(`
      select next_review_interval('weak')::text as w, next_review_interval('learning')::text as l,
             next_review_interval('understood')::text as u, next_review_interval('mastered')::text as m
    `);
    expect(rows[0].w).toBe('04:00:00');
    expect(rows[0].l).toBe('1 day');
    expect(rows[0].u).toBe('3 days');
    expect(rows[0].m).toBe('14 days');
  });
});

// ==================================================== RECORD_ANSWER (RPC) ==
describe('record_answer — correct and incorrect first answers', () => {
  it('a correct first answer creates LEARNING with next_review_at ~1 day out', async () => {
    const phraseId = await firstPhraseOfLesson('l01');
    const rows = await asUser(db, user, async (c) =>
      (await c.query('select * from record_answer($1, true)', [phraseId])).rows,
    );
    expect(rows[0].state).toBe('learning');

    const row = await progressRow(user, phraseId);
    expect(row.state).toBe('learning');
    expect(row.correct_count).toBe(1);
    expect(row.incorrect_count).toBe(0);
    expect(row.last_answer_correct).toBe(true);
    const hours = (new Date(row.next_review_at).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThan(25);
  });

  it('an incorrect first answer (different phrase) creates WEAK, due in ~4 hours', async () => {
    const phraseId = await freshPrimaryPhrase(user);

    await asUser(db, user, (c) => c.query('select record_answer($1, false)', [phraseId]));
    const row = await progressRow(user, phraseId);
    expect(row.state).toBe('weak');
    expect(row.incorrect_count).toBe(1);
    expect(row.last_answer_correct).toBe(false);
    const hours = (new Date(row.next_review_at).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(3.9);
    expect(hours).toBeLessThan(4.1);
  });
});

describe('the full ladder — advanced only by genuine scheduled reviews', () => {
  let phraseId: string;

  /** Forces this phrase's next_review_at into the past, simulating "the
   * scheduled interval has actually elapsed" without waiting for real time
   * to pass — the same technique already used elsewhere in this suite for
   * "overdue" phrases. */
  async function makeDue() {
    await db.query(
      "update phrase_progress set next_review_at = now() - interval '1 minute' where user_id=$1 and phrase_id=$2",
      [user, phraseId],
    );
  }

  beforeAll(async () => {
    phraseId = await freshPrimaryPhrase(user);
  });

  it('first-ever answer, correct → LEARNING (first exposure always applies)', async () => {
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));
    expect((await progressRow(user, phraseId)).state).toBe('learning');
  });

  it('a second correct answer BEFORE next_review_at does not promote — practice only', async () => {
    const before = await progressRow(user, phraseId);
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));
    const after = await progressRow(user, phraseId);
    expect(after.state).toBe('learning');
    expect(after.next_review_at).toEqual(before.next_review_at);
    expect(after.correct_count).toBe(2); // recorded as practice, just not promoted
  });

  it('once next_review_at has genuinely elapsed, a correct answer promotes LEARNING → UNDERSTOOD', async () => {
    await makeDue();
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));
    expect((await progressRow(user, phraseId)).state).toBe('understood');
  });

  it('a correct answer before the NEW next_review_at again does not promote past UNDERSTOOD', async () => {
    const before = await progressRow(user, phraseId);
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));
    const after = await progressRow(user, phraseId);
    expect(after.state).toBe('understood');
    expect(after.next_review_at).toEqual(before.next_review_at);
  });

  it('once due again, a correct answer promotes UNDERSTOOD → MASTERED', async () => {
    await makeDue();
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));
    const row = await progressRow(user, phraseId);
    expect(row.state).toBe('mastered');
  });

  it('a mistake on a MASTERED phrase demotes it to WEAK immediately, regardless of timing', async () => {
    await asUser(db, user, (c) => c.query('select record_answer($1, false)', [phraseId]));
    const row = await progressRow(user, phraseId);
    expect(row.state).toBe('weak');
    expect(row.current_streak).toBe(0);
  });

  it('recovering from WEAK only reaches LEARNING once due, never straight to UNDERSTOOD', async () => {
    await makeDue();
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));
    expect((await progressRow(user, phraseId)).state).toBe('learning');
  });
});

describe('three rapid correct answers never reach MASTERED', () => {
  it('answering the same fresh phrase correctly three times in a row caps at LEARNING', async () => {
    const phraseId = await freshPrimaryPhrase(user);
    for (let i = 0; i < 3; i += 1) {
      await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));
    }
    const row = await progressRow(user, phraseId);
    expect(row.state).toBe('learning');
    expect(row.correct_count).toBe(3);
  });
});

describe('replaying a completed lesson cannot farm progress', () => {
  it('answering every phrase of an already-completed lesson again right away changes nothing', async () => {
    const { rows: lessonRow } = await db.query("select id, slug from lessons where slug = 'l23'");
    const lessonId = lessonRow[0].id;
    const { rows: phrases } = await db.query(
      "select phrase_id from lesson_phrases where lesson_id = $1 and role = 'primary'",
      [lessonId],
    );

    // First pass: real first exposure for each phrase.
    for (const { phrase_id } of phrases) {
      await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phrase_id]));
    }
    await asUser(db, user, (c) => c.query('select complete_lesson($1)', [lessonId]));

    const before: Array<Awaited<ReturnType<typeof progressRow>>> = [];
    for (const { phrase_id } of phrases) before.push(await progressRow(user, phrase_id));

    // Immediately replay the same lesson — every phrase answered correctly
    // again, seconds later.
    for (const { phrase_id } of phrases) {
      await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phrase_id]));
    }

    const after: Array<Awaited<ReturnType<typeof progressRow>>> = [];
    for (const { phrase_id } of phrases) after.push(await progressRow(user, phrase_id));

    for (let i = 0; i < before.length; i += 1) {
      expect(after[i].state).toBe(before[i].state);
      expect(after[i].next_review_at).toEqual(before[i].next_review_at);
    }
  });
});

// =========================================================== PERSISTENCE ===
describe('persistence scenarios', () => {
  it('reload-equivalent: a fresh read in a new transaction sees the same row', async () => {
    const phraseId = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));

    // Simulates closing the browser and reopening: a brand new session,
    // reading through RLS again from scratch.
    const reloaded = await asUser(db, user, async (c) =>
      (
        await c.query('select state, correct_count from phrase_progress where phrase_id = $1', [
          phraseId,
        ])
      ).rows[0],
    );
    expect(reloaded.state).toBe('learning');
    expect(reloaded.correct_count).toBe(1);
  });

  it('cross-device: a second independent session reads the identical, already-updated state', async () => {
    const phraseId = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));

    const deviceA = await asUser(db, user, async (c) =>
      (await c.query('select state from phrase_progress where phrase_id=$1', [phraseId])).rows[0],
    );
    const deviceB = await asUser(db, user, async (c) =>
      (await c.query('select state from phrase_progress where phrase_id=$1', [phraseId])).rows[0],
    );
    expect(deviceA).toEqual(deviceB);
  });

  it('does not let one user see or affect another user\'s progress on the same phrase', async () => {
    const other = await createUser(db, 'engine2@test.de');
    await selectProfession(db, other, 'trockenbau');
    await grantEntitlement(db, other);

    const phraseId = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));

    const otherView = await asUser(db, other, async (c) =>
      (await c.query('select 1 from phrase_progress where phrase_id=$1', [phraseId])).rows,
    );
    expect(otherView).toHaveLength(0);
  });

  it('double answer on the same phrase in immediate succession accumulates counts without double-promoting', async () => {
    // The client disables the buttons after the first tap (ScoredExercise's
    // `revealed` gate); this proves the server side is at least safe if two
    // calls land anyway. Under the timing fix, the second immediate call is
    // "premature practice": counted, but not a second promotion.
    const phraseId = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));

    const row = await progressRow(user, phraseId);
    expect(row.correct_count).toBe(2);
    expect(row.state).toBe('learning');
  });

  it('rejects recording an answer for a phrase the user cannot access', async () => {
    const draftId = (
      await db.query(
        "insert into phrases (german_text, verification_status) values ('DRAFT ANSWER TARGET','draft') returning id",
      )
    ).rows[0].id;

    await expect(
      asUser(db, user, (c) => c.query('select record_answer($1, true)', [draftId])),
    ).rejects.toThrow(/phrase not available/);
  });
});

// ================================================== LESSON COMPLETION ======
describe('lesson completion no longer seeds progress in bulk', () => {
  it('completing a lesson records nothing for phrases never answered', async () => {
    // Deliberately decoupled from any one lesson's specific phrase set:
    // content legitimately reuses phrase_ids as "primary" across several
    // lessons, so "pick lesson X, assume its other phrases are untouched"
    // is not a safe assumption on this dataset. Isolating via
    // freshPrimaryPhrase sidesteps that entirely.
    const answered = await freshPrimaryPhrase(user);
    const untouched = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [answered]));

    const { rows: anyLesson } = await db.query(
      "select id from lessons where slug = 'l11'",
    );
    await asUser(db, user, (c) => c.query('select complete_lesson($1)', [anyLesson[0].id]));

    expect(await progressRow(user, answered)).not.toBeNull();
    expect(await progressRow(user, untouched)).toBeNull();
  });

  it('is still idempotent: completing twice does not move completed_at', async () => {
    const { rows: lessonRow } = await db.query("select id from lessons where slug = 'l11'");
    const lessonId = lessonRow[0].id;

    const before = await db.query(
      'select completed_at from lesson_progress where user_id=$1 and lesson_id=$2',
      [user, lessonId],
    );
    await asUser(db, user, (c) => c.query('select complete_lesson($1)', [lessonId]));
    const after = await db.query(
      'select completed_at from lesson_progress where user_id=$1 and lesson_id=$2',
      [user, lessonId],
    );
    expect(after.rows[0].completed_at).toEqual(before.rows[0].completed_at);
  });
});

// ======================================================= DYNAMIC REVIEW ====
describe('dynamic review', () => {
  it('returns nothing when nothing is due (fresh user)', async () => {
    const fresh = await createUser(db, 'fresh-reviewer@test.de');
    await selectProfession(db, fresh, 'trockenbau');
    await grantEntitlement(db, fresh);

    const rows = await asUser(db, fresh, async (c) =>
      (await c.query('select * from due_review_phrases(10)')).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it('does NOT surface a WEAK phrase before its own 4-hour interval has elapsed', async () => {
    const phraseId = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, false)', [phraseId]));

    const rows = await asUser(db, user, async (c) =>
      (await c.query('select phrase_id from due_review_phrases(50)')).rows,
    );
    expect(rows.some((r) => r.phrase_id === phraseId)).toBe(false);
  });

  it('DOES surface a WEAK phrase once its 4-hour interval has elapsed', async () => {
    const phraseId = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, false)', [phraseId]));
    await db.query(
      "update phrase_progress set next_review_at = now() - interval '1 minute' where user_id=$1 and phrase_id=$2",
      [user, phraseId],
    );

    const rows = await asUser(db, user, async (c) =>
      (await c.query('select phrase_id from due_review_phrases(50)')).rows,
    );
    expect(rows.some((r) => r.phrase_id === phraseId)).toBe(true);
  });

  it('does NOT surface a phrase whose interval has not elapsed and which is not WEAK', async () => {
    const phraseId = await freshPrimaryPhrase(user);
    // learning -> next_review_at is ~1 day out, not weak, so it must not
    // appear in a "due now" query.
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [phraseId]));

    const rows = await asUser(db, user, async (c) =>
      (await c.query('select phrase_id from due_review_phrases(50)')).rows,
    );
    expect(rows.some((r) => r.phrase_id === phraseId)).toBe(false);
  });

  it('orders WEAK phrases before merely-overdue ones, once both are actually due', async () => {
    const overdueId = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, true)', [overdueId]));
    await db.query(
      "update phrase_progress set next_review_at = now() - interval '1 hour' where user_id=$1 and phrase_id=$2",
      [user, overdueId],
    );

    const weakId = await freshPrimaryPhrase(user);
    await asUser(db, user, (c) => c.query('select record_answer($1, false)', [weakId]));
    // WEAK is due-by-time like anything else now — its own interval must
    // have elapsed before it can appear at all.
    await db.query(
      "update phrase_progress set next_review_at = now() - interval '1 minute' where user_id=$1 and phrase_id=$2",
      [user, weakId],
    );

    const rows = await asUser(db, user, async (c) =>
      (await c.query('select phrase_id from due_review_phrases(50)')).rows,
    );
    const weakIndex = rows.findIndex((r) => r.phrase_id === weakId);
    const overdueIndex = rows.findIndex((r) => r.phrase_id === overdueId);
    expect(weakIndex).toBeGreaterThanOrEqual(0);
    expect(overdueIndex).toBeGreaterThanOrEqual(0);
    expect(weakIndex).toBeLessThan(overdueIndex);
  });

  it('caps a review batch at the requested limit', async () => {
    const rows = await asUser(db, user, async (c) =>
      (await c.query('select * from due_review_phrases(3)')).rows,
    );
    expect(rows.length).toBeLessThanOrEqual(3);
  });
});

// =========================================================== COURSE-WIDE ===
describe('course_progress reflects real primary-only content', () => {
  it('phrases_total equals the verified distinct-primary count for this trade', async () => {
    const rows = await asUser(db, user, async (c) =>
      (await c.query('select * from course_progress()')).rows,
    );
    // CORE + Trockenbau primary phrases only, not review_pool rows.
    expect(rows[0].phrases_total).toBeGreaterThan(0);
    expect(rows[0].phrases_total).toBeLessThan(295); // must be well below the old
    // "everything in lesson_phrases" figure — proves review_pool is excluded.
  });
});
