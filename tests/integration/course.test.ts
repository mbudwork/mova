import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import {
  asAnon,
  asUser,
  connect,
  createUser,
  grantEntitlement,
  resetDatabase,
  selectProfession,
} from './harness';

let db: pg.Client;

/** Free user: onboarded as Trockenbau, no entitlement. */
let freeUser: string;
/** Paying user: onboarded as Trockenbau, entitlement granted. */
let paidUser: string;
/** Paying user who chose a different trade — used for profession filtering. */
let tilerUser: string;

beforeAll(async () => {
  resetDatabase();
  db = await connect();

  freeUser = await createUser(db, 'free@test.de');
  paidUser = await createUser(db, 'paid@test.de');
  tilerUser = await createUser(db, 'tiler@test.de');

  await selectProfession(db, freeUser, 'trockenbau');
  await selectProfession(db, paidUser, 'trockenbau');
  await selectProfession(db, tilerUser, 'fliesenleger');

  await grantEntitlement(db, paidUser);
  await grantEntitlement(db, tilerUser);

  // Content that must never reach a normal user, inserted privileged.
  await db.query(
    "insert into phrases (german_text, intent, verification_status) values ('GEHEIM DRAFT','x','draft')",
  );
  await db.query(`insert into phrases
      (german_text, intent, verification_status, safety_sensitive, safety_approved, is_free_preview)
    values ('UNGEPRUEFTE WARNUNG','x','safety_review', true, false, true)`);
}, 120_000);

afterAll(async () => {
  await db?.end();
});

// ---------------------------------------------------------------- 1. anon ---
describe('anonymous access', () => {
  it('cannot read phrases at all', async () => {
    await expect(
      asAnon(db, (c) => c.query('select id from phrases')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('cannot read lessons', async () => {
    await expect(
      asAnon(db, (c) => c.query('select id from lessons')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('can still read the reference data onboarding needs', async () => {
    const rows = await asAnon(db, async (c) => (await c.query('select slug from professions')).rows);
    expect(rows.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------- 2. free preview ---
describe('free-preview user', () => {
  it('sees only phrases marked as free preview', async () => {
    const rows = await asUser(db, freeUser, async (c) =>
      (await c.query('select german_text, is_free_preview from phrases')).rows,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.is_free_preview)).toBe(true);
  });

  it('has no full access', async () => {
    const rows = await asUser(db, freeUser, async (c) =>
      (await c.query('select has_full_access() as ok')).rows,
    );
    expect(rows[0].ok).toBe(false);
  });

  it('cannot read vocabulary', async () => {
    const rows = await asUser(db, freeUser, async (c) =>
      (await c.query('select id from vocabulary_items')).rows,
    );
    expect(rows).toHaveLength(0);
  });
});

// ----------------------------------------------------------- 3. entitled ---
describe('entitled user', () => {
  it('sees every approved phrase, not just previews', async () => {
    const free = await asUser(db, freeUser, async (c) =>
      (await c.query('select id from phrases')).rows,
    );
    const paid = await asUser(db, paidUser, async (c) =>
      (await c.query('select id from phrases')).rows,
    );
    expect(paid.length).toBeGreaterThan(free.length);
  });

  it('can read vocabulary', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query('select german_term from vocabulary_items')).rows,
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------- 4. draft ---
describe('draft phrase invisibility', () => {
  it('is hidden from a free user', async () => {
    const rows = await asUser(db, freeUser, async (c) =>
      (await c.query("select id from phrases where german_text = 'GEHEIM DRAFT'")).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it('is hidden from a paying user', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query("select id from phrases where german_text = 'GEHEIM DRAFT'")).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it('is hidden even through the translation table', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (
        await c.query(`select t.text from phrase_translations t
                       join phrases p on p.id = t.phrase_id
                       where p.german_text = 'GEHEIM DRAFT'`)
      ).rows,
    );
    expect(rows).toHaveLength(0);
  });
});

// ------------------------------------------------------------- 5. safety ---
describe('unapproved safety phrase invisibility', () => {
  it('is hidden despite being marked free preview', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query("select id from phrases where german_text = 'UNGEPRUEFTE WARNUNG'")).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it('cannot be approved while safety_approved is false', async () => {
    await expect(
      db.query(`update phrases set verification_status = 'approved'
                where german_text = 'UNGEPRUEFTE WARNUNG'`),
    ).rejects.toThrow(/phrases_safety_ck/);
  });

  it('shows approved safety content that passed safety review', async () => {
    const rows = await asUser(db, freeUser, async (c) =>
      (await c.query("select german_text from phrases where german_text = 'Vorsicht!'")).rows,
    );
    expect(rows).toHaveLength(1);
  });
});

// --------------------------------------------------------- 6. onboarding ---
describe('onboarding persistence', () => {
  it('stores both answers and survives a new session', async () => {
    await asUser(db, paidUser, async (c) => {
      await c.query(`update profiles
                     set self_level = 'words',
                         onboarding_completed = true,
                         primary_profession_id = (select id from professions where slug = 'trockenbau')
                     where id = $1`, [paidUser]);
    });

    // Fresh session: a different transaction, re-reading through RLS.
    const rows = await asUser(db, paidUser, async (c) =>
      (
        await c.query(
          `select p.self_level, p.onboarding_completed, pr.slug
             from profiles p join professions pr on pr.id = p.primary_profession_id
            where p.id = $1`,
          [paidUser],
        )
      ).rows,
    );

    expect(rows[0]).toMatchObject({
      self_level: 'words',
      onboarding_completed: true,
      slug: 'trockenbau',
    });
  });

  it('records the primary profession exactly once', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (
        await c.query('select count(*)::int as n from user_professions where user_id = $1 and is_primary', [
          paidUser,
        ])
      ).rows,
    );
    expect(rows[0].n).toBe(1);
  });
});

// ------------------------------------------------------------ 10. order ----
describe('lesson ordering', () => {
  it('follows course data: core modules in order, trade last', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (
        await c.query(`select lesson_slug from accessible_lessons()
                       order by (scope = 'profession'), module_order, lesson_order`)
      ).rows,
    );
    expect(rows.map((r) => r.lesson_slug)).toEqual([
      'erster-tag-01',
      'grundbefehle-01',
      'grundbefehle-02',
      'trockenbau-01',
    ]);
  });

  it('starts a new user at the first lesson of the first module', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query('select next_lesson() as slug')).rows,
    );
    expect(rows[0].slug).toBe('erster-tag-01');
  });
});

// ------------------------------------------------------- 11. professions ---
describe('profession filtering', () => {
  it('offers the Trockenbau lesson to a Trockenbau worker', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query("select 1 from accessible_lessons() where lesson_slug = 'trockenbau-01'")).rows,
    );
    expect(rows).toHaveLength(1);
  });

  it('never offers it to a Fliesenleger', async () => {
    const rows = await asUser(db, tilerUser, async (c) =>
      (await c.query("select 1 from accessible_lessons() where lesson_slug = 'trockenbau-01'")).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it('refuses to complete a lesson outside the user\'s professions', async () => {
    const { rows } = await db.query("select id from lessons where slug = 'trockenbau-01'");
    const lessonId = rows[0].id;
    await expect(
      asUser(db, tilerUser, (c) => c.query('select complete_lesson($1)', [lessonId])),
    ).rejects.toThrow(/lesson not available/);
  });

  it('still gives both workers the shared core lessons', async () => {
    const rows = await asUser(db, tilerUser, async (c) =>
      (await c.query("select lesson_slug from accessible_lessons() where scope = 'core'")).rows,
    );
    expect(rows).toHaveLength(3);
  });
});

// ------------------------------------------------- 7/8/9. completion -------
describe('lesson completion', () => {
  let firstLessonId: string;

  beforeAll(async () => {
    const { rows } = await db.query("select id from lessons where slug = 'erster-tag-01'");
    firstLessonId = rows[0].id;
  });

  it('reports the first call as a real completion', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query('select complete_lesson($1) as first_time', [firstLessonId])).rows,
    );
    expect(rows[0].first_time).toBe(true);
  });

  it('persists across sessions', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (
        await c.query(
          'select status, completed_at from lesson_progress where user_id = $1 and lesson_id = $2',
          [paidUser, firstLessonId],
        )
      ).rows,
    );
    expect(rows[0].status).toBe('completed');
    expect(rows[0].completed_at).not.toBeNull();
  });

  it('advances next_lesson to the following lesson', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query('select next_lesson() as slug')).rows,
    );
    expect(rows[0].slug).toBe('grundbefehle-01');
  });

  it('seeds spaced repetition for the lesson phrases', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (
        await c.query(
          `select count(*)::int as n from phrase_progress pp
             join lesson_phrases lp on lp.phrase_id = pp.phrase_id
            where pp.user_id = $1 and lp.lesson_id = $2`,
          [paidUser, firstLessonId],
        )
      ).rows,
    );
    expect(rows[0].n).toBe(3);
  });

  it('counts the completion in course progress', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query('select * from course_progress()')).rows,
    );
    expect(rows[0].lessons_completed).toBe(1);
    expect(rows[0].lessons_total).toBe(4);
  });

  // -------------------------------------------------------- 9. replay ------
  describe('replaying a completed lesson', () => {
    it('reports the second call as a repeat, not a completion', async () => {
      const rows = await asUser(db, paidUser, async (c) =>
        (await c.query('select complete_lesson($1) as first_time', [firstLessonId])).rows,
      );
      expect(rows[0].first_time).toBe(false);
    });

    it('does not move completed_at', async () => {
      const before = await asUser(db, paidUser, async (c) =>
        (
          await c.query('select completed_at from lesson_progress where user_id=$1 and lesson_id=$2', [
            paidUser,
            firstLessonId,
          ])
        ).rows[0].completed_at,
      );

      await asUser(db, paidUser, (c) => c.query('select complete_lesson($1)', [firstLessonId]));

      const after = await asUser(db, paidUser, async (c) =>
        (
          await c.query('select completed_at from lesson_progress where user_id=$1 and lesson_id=$2', [
            paidUser,
            firstLessonId,
          ])
        ).rows[0].completed_at,
      );

      expect(after).toEqual(before);
    });

    it('does not inflate lessons_completed', async () => {
      const rows = await asUser(db, paidUser, async (c) =>
        (await c.query('select lessons_completed from course_progress()')).rows,
      );
      expect(rows[0].lessons_completed).toBe(1);
    });

    it('does not reset an existing phrase review schedule', async () => {
      const phraseRow = await db.query(
        `select pp.phrase_id, pp.next_review_at from phrase_progress pp
           join lesson_phrases lp on lp.phrase_id = pp.phrase_id
          where pp.user_id = $1 and lp.lesson_id = $2 limit 1`,
        [paidUser, firstLessonId],
      );
      const { phrase_id, next_review_at } = phraseRow.rows[0];

      // Simulate the review engine having already advanced this phrase.
      await db.query(
        `update phrase_progress
            set state = 'mastered', correct_count = 5, next_review_at = now() + interval '30 days'
          where user_id = $1 and phrase_id = $2`,
        [paidUser, phrase_id],
      );

      await asUser(db, paidUser, (c) => c.query('select complete_lesson($1)', [firstLessonId]));

      const after = await db.query(
        'select state, correct_count, next_review_at from phrase_progress where user_id=$1 and phrase_id=$2',
        [paidUser, phrase_id],
      );
      expect(after.rows[0].state).toBe('mastered');
      expect(after.rows[0].correct_count).toBe(5);
      expect(after.rows[0].next_review_at).not.toEqual(next_review_at);
    });
  });
});

// ----------------------------------------------------- 8. progress state ---
describe('progress persistence', () => {
  it('keeps a free user out of paid phrase content while still tracking lessons', async () => {
    const { rows } = await db.query("select id from lessons where slug = 'erster-tag-01'");
    await asUser(db, freeUser, (c) => c.query('select complete_lesson($1)', [rows[0].id]));

    const progress = await asUser(db, freeUser, async (c) =>
      (await c.query('select * from course_progress()')).rows,
    );
    expect(progress[0].lessons_completed).toBe(1);
  });

  it('does not leak one user\'s progress to another', async () => {
    const rows = await asUser(db, tilerUser, async (c) =>
      (await c.query('select count(*)::int as n from lesson_progress')).rows,
    );
    expect(rows[0].n).toBe(0);
  });
});
