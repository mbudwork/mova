#!/usr/bin/env node
/**
 * Creates the owner review account.
 *
 * The account is an ordinary user: it signs in through the normal Supabase
 * auth flow and reaches content through the normal entitlement + RLS path.
 * Nothing is bypassed, no policy is relaxed, and no password is ever written
 * to a file or into the client bundle — it is generated here, printed once,
 * and never stored.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... \
 *     node scripts/create-review-user.mjs review@example.com
 *
 * The service role key is read from the environment and used only by this
 * script, on your machine or in CI — never by the application at runtime.
 */

import { randomBytes } from 'node:crypto';
import pg from 'pg';

const email = process.argv[2];
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL;

if (!email || !supabaseUrl || !serviceKey || !dbUrl) {
  console.error(
    'usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... ' +
      'node scripts/create-review-user.mjs <email>',
  );
  process.exit(1);
}

/** 24 bytes of entropy, URL-safe. Not derived from anything guessable. */
function generatePassword() {
  return randomBytes(24).toString('base64url');
}

const password = generatePassword();

// --- 1. create the auth user -------------------------------------------------
// email_confirm short-circuits the confirmation mail only; the account still
// authenticates with a real password through the normal sign-in flow.
const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Review' },
  }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Failed to create user (${response.status}): ${body}`);
  console.error('If the user already exists, delete it in Supabase → Authentication → Users.');
  process.exit(1);
}

const { id: userId } = await response.json();

// --- 2. grant the entitlement ------------------------------------------------
// Written server-side, exactly as the Stripe webhook will write it in PHASE 9.
// The app never grants entitlements to itself.
const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

try {
  await client.query(
    `insert into entitlements (user_id, product_code, status, source)
     values ($1, 'FULL_ACCESS', 'active', 'manual')
     on conflict (user_id, product_code) where status = 'active' do nothing`,
    [userId],
  );

  const { rows } = await client.query(
    `select p.onboarding_completed,
            (select count(*)::int from entitlements e
              where e.user_id = p.id and e.status = 'active') as entitlements
       from profiles p where p.id = $1`,
    [userId],
  );

  if (rows.length === 0) {
    throw new Error(
      'No profile row was created for the new user. The handle_new_user trigger ' +
        'is missing — check that migration 20260823000200 applied.',
    );
  }

  console.log('\nREVIEW ACCOUNT CREATED\n');
  console.log(`  LOGIN:    ${email}`);
  console.log(`  PASSWORD: ${password}`);
  console.log('\n  This password is shown once and is not stored anywhere.');
  console.log(`  Profile created: yes · active entitlements: ${rows[0].entitlements}`);
  console.log(`  Onboarding completed: ${rows[0].onboarding_completed} (expected false)\n`);
} finally {
  await client.end();
}
