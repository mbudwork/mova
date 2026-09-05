import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { asAnon, asUser, connectProduction, createUser, grantEntitlement, resetProductionDatabase, selectProfession } from './harness';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * The funnel opens a public surface for the first time. These tests exist to
 * prove that opening it did not open anything else.
 */

let db: pg.Client;
let paidUser: string;

beforeAll(async () => {
  resetProductionDatabase();
  db = await connectProduction();

  execFileSync(
    'node',
    [
      path.join(process.cwd(), 'scripts', 'seed-diagnostic.mjs'),
      '--db',
      `postgresql://postgres@/dadb_prod_test?host=/tmp&port=5433`,
    ],
    { encoding: 'utf8' },
  );

  paidUser = await createUser(db, 'funnel@test.de');
  await selectProfession(db, paidUser, 'trockenbau');
  await grantEntitlement(db, paidUser);
}, 300_000);

afterAll(async () => {
  await db?.end();
});

describe('the public diagnostic', () => {
  it('is readable by an anonymous visitor', async () => {
    const rows = await asAnon(db, async (c) =>
      (await c.query('select position, german_text from diagnostic_questions where is_active order by position')).rows,
    );
    expect(rows).toHaveLength(7);
    expect(rows[0].german_text).toBe('Hol die Wasserwaage.');
  });

  it('gives every question exactly one correct answer among four', async () => {
    const rows = await asAnon(db, async (c) =>
      (
        await c.query(
          `select q.position, count(o.id)::int as options,
                  count(*) filter (where o.is_correct)::int as correct
             from diagnostic_questions q
             join diagnostic_options o on o.question_id = q.id
            group by q.position order by q.position`,
        )
      ).rows,
    );
    for (const row of rows) {
      expect(row.options).toBe(4);
      expect(row.correct).toBe(1);
    }
  });

  it('carries no audio until real audio exists', async () => {
    const rows = await asAnon(db, async (c) =>
      (await c.query("select 1 from diagnostic_questions where audio_status <> 'pending'")).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it('uses only approved, non-safety, CORE phrases', async () => {
    const { rows } = await db.query(
      `select q.source_phrase, p.verification_status, p.safety_sensitive, p.profession_id
         from diagnostic_questions q
         join phrases p on p.external_id = q.source_phrase`,
    );
    expect(rows).toHaveLength(7);
    for (const row of rows) {
      expect(row.verification_status).toBe('approved');
      expect(row.safety_sensitive).toBe(false);
      expect(row.profession_id).toBeNull();
    }
  });

  it('is a snapshot: the German matches the course content exactly', async () => {
    const { rows } = await db.query(
      `select q.german_text as snapshot, p.german_text as source
         from diagnostic_questions q join phrases p on p.external_id = q.source_phrase`,
    );
    for (const row of rows) expect(row.snapshot).toBe(row.source);
  });

  it('is idempotent: reseeding changes nothing', async () => {
    const before = (await db.query('select count(*)::int as n from diagnostic_options')).rows[0].n;
    execFileSync(
      'node',
      [
        path.join(process.cwd(), 'scripts', 'seed-diagnostic.mjs'),
        '--db',
        `postgresql://postgres@/dadb_prod_test?host=/tmp&port=5433`,
      ],
      { encoding: 'utf8' },
    );
    const after = (await db.query('select count(*)::int as n from diagnostic_options')).rows[0].n;
    expect(after).toBe(before);
  });
});

describe('opening the funnel did not open the course', () => {
  it('still refuses anonymous access to phrases', async () => {
    await expect(asAnon(db, (c) => c.query('select id from phrases'))).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('still refuses anonymous access to lessons and vocabulary', async () => {
    for (const table of ['lessons', 'vocabulary_items', 'lesson_phrases']) {
      await expect(asAnon(db, (c) => c.query(`select 1 from ${table}`))).rejects.toThrow(
        /permission denied/i,
      );
    }
  });

  it('still gives an entitled user the full course', async () => {
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query('select count(*)::int as n from phrases')).rows,
    );
    expect(rows[0].n).toBe(404);
  });

  it('does not let an anonymous visitor read analytics back', async () => {
    await expect(asAnon(db, (c) => c.query('select 1 from analytics_events'))).rejects.toThrow(
      /permission denied/i,
    );
  });
});

describe('attribution', () => {
  it('accepts an anonymous funnel event with UTM values', async () => {
    await asAnon(db, (c) =>
      c.query(
        `insert into analytics_events (event_type, anonymous_id, session_id,
            utm_source, utm_campaign, device_category, landing_locale)
         values ('landing_view','anon-1','sess-1','facebook','test_campaign','mobile','ru')`,
      ),
    );
    const { rows } = await db.query(
      "select utm_campaign from analytics_events where anonymous_id = 'anon-1'",
    );
    expect(rows[0].utm_campaign).toBe('test_campaign');
  });

  it('carries UTM through the whole funnel for one anonymous id', async () => {
    for (const event of ['full_test_started', 'test_completed', 'purchase_clicked']) {
      await asAnon(db, (c) =>
        c.query(
          `insert into analytics_events (event_type, anonymous_id, utm_source, utm_campaign, landing_locale)
           values ($1,'anon-1','facebook','test_campaign','ru')`,
          [event],
        ),
      );
    }
    const { rows } = await db.query(
      `select count(distinct utm_campaign)::int as campaigns, count(*)::int as events
         from analytics_events where anonymous_id = 'anon-1'`,
    );
    expect(rows[0].campaigns).toBe(1);
    expect(rows[0].events).toBe(4);
  });

  it('links attribution to the account once the visitor signs up', async () => {
    await db.query(
      `insert into user_attribution (user_id, anonymous_id, utm_source, utm_campaign)
       values ($1,'anon-1','facebook','test_campaign')`,
      [paidUser],
    );
    const rows = await asUser(db, paidUser, async (c) =>
      (await c.query('select utm_campaign from user_attribution')).rows,
    );
    expect(rows[0].utm_campaign).toBe('test_campaign');
  });

  it('does not leak one user\'s attribution to another', async () => {
    const other = await createUser(db, 'other@test.de');
    const rows = await asUser(db, other, async (c) =>
      (await c.query('select count(*)::int as n from user_attribution')).rows,
    );
    expect(rows[0].n).toBe(0);
  });

  it('reports the funnel by campaign and locale', async () => {
    const { rows } = await db.query(
      "select * from funnel_summary() where utm_campaign = 'test_campaign' and landing_locale = 'ru'",
    );
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].landing_views)).toBe(1);
    expect(Number(rows[0].tests_started)).toBe(1);
    expect(Number(rows[0].tests_completed)).toBe(1);
    expect(Number(rows[0].purchase_clicks)).toBe(1);
    expect(Number(rows[0].purchases)).toBe(0);
  });

  it('filters the summary to one locale when asked', async () => {
    const { rows } = await db.query("select * from funnel_summary(p_locale => 'uk')");
    expect(rows.every((r) => r.landing_locale === 'uk' || r.landing_views === '0')).toBe(true);
  });
});

describe('checkout adapter honesty (V2 offer)', () => {
  it('records a lead without granting an entitlement', async () => {
    const buyer = await createUser(db, 'buyer@test.de');
    await asUser(db, buyer, (c) =>
      c.query(
        `insert into checkout_leads (user_id, product_code, locale, status)
         values ($1,'FULL_ACCESS','ru','pending')`,
        [buyer],
      ),
    );

    const entitlements = await asUser(db, buyer, async (c) =>
      (await c.query('select 1 from entitlements where user_id = $1', [buyer])).rows,
    );
    expect(entitlements).toHaveLength(0);

    const stillNoAccess = await asUser(db, buyer, async (c) =>
      (await c.query('select has_full_access() as ok')).rows[0].ok,
    );
    expect(stillNoAccess).toBe(false);
  });

  it('does not create a duplicate open lead on a second visit to checkout', async () => {
    const buyer = await createUser(db, 'buyer2@test.de');
    for (let i = 0; i < 2; i += 1) {
      await asUser(db, buyer, (c) =>
        c.query(
          `insert into checkout_leads (user_id, product_code, locale, status)
           values ($1,'FULL_ACCESS','ru','pending')
           on conflict (user_id, product_code) where status = 'pending' do nothing`,
          [buyer],
        ),
      );
    }
    const rows = await asUser(db, buyer, async (c) =>
      (await c.query('select count(*)::int as n from checkout_leads where user_id = $1', [buyer])).rows,
    );
    expect(rows[0].n).toBe(1);
  });

  it('does not let one user read another user\'s lead', async () => {
    const a = await createUser(db, 'lead-a@test.de');
    const b = await createUser(db, 'lead-b@test.de');
    await asUser(db, a, (c) =>
      c.query(
        `insert into checkout_leads (user_id, product_code, locale) values ($1,'FULL_ACCESS','ru')`,
        [a],
      ),
    );
    const rows = await asUser(db, b, async (c) =>
      (await c.query('select 1 from checkout_leads where user_id = $1', [a])).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it('is invisible to an anonymous visitor', async () => {
    await expect(asAnon(db, (c) => c.query('select 1 from checkout_leads'))).rejects.toThrow(
      /permission denied/i,
    );
  });
});

describe('diagnostic locale content', () => {
  it('carries a Ukrainian draft alongside the reviewed Russian text', async () => {
    const rows = await asAnon(db, async (c) =>
      (
        await c.query(
          `select q.skill_label, q.skill_label_uk, q.is_uk_reviewed
             from diagnostic_questions q where q.position = 1`,
        )
      ).rows,
    );
    expect(rows[0].skill_label).toBe('Инструмент');
    expect(rows[0].skill_label_uk).toBe('Інструмент');
    expect(rows[0].is_uk_reviewed).toBe(false);
  });

  it('never marks Ukrainian diagnostic content as reviewed by the seeder', async () => {
    const rows = await asAnon(db, async (c) =>
      (await c.query('select 1 from diagnostic_questions where is_uk_reviewed')).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it('leaves the production course Ukrainian column untouched', async () => {
    const rows = await db.query(
      "select 1 from phrase_translations where language_code = 'uk' limit 1",
    );
    expect(rows.rows).toHaveLength(0);
  });

  it('keeps languages.uk inactive for the course even though the funnel supports it', async () => {
    const rows = await db.query("select is_active from languages where code = 'uk'");
    expect(rows.rows[0].is_active).toBe(false);
  });
});
