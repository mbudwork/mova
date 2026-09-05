import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

/**
 * Integration tests run against a real PostgreSQL with the real migrations and
 * the real RLS policies applied. Supabase's own stack needs Docker, which is
 * not available here, so `auth.users`, `auth.uid()` and the storage tables are
 * stubbed — everything else is production SQL, unmodified.
 */

const PG_HOST = '/tmp';
const PG_PORT = 5433;
const DB_NAME = 'dadb_test';
const PROD_DB_NAME = 'dadb_prod_test';
const WORKBOOK = 'content/deutsch_auf_der_baustelle_FINAL_v2.xlsx';
const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

const AUTH_STUB = `
create schema if not exists auth;
create schema if not exists storage;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- Supabase grants these by default; the stub must match or SECURITY INVOKER
-- functions fail with "permission denied for schema auth".
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;
`;

function psql(args: string[], input?: string) {
  return execFileSync('psql', ['-h', PG_HOST, '-p', String(PG_PORT), '-U', 'postgres', ...args], {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function applySchema(dbName: string) {
  psql(['-q', '-d', 'postgres', '-c', `drop database if exists ${dbName}`]);
  psql(['-q', '-d', 'postgres', '-c', `create database ${dbName}`]);
  psql(['-q', '-d', dbName, '-v', 'ON_ERROR_STOP=1'], AUTH_STUB);

  const migrationsDir = path.join(REPO_ROOT, 'supabase', 'migrations');
  for (const file of readdirSync(migrationsDir).sort()) {
    psql(['-q', '-d', dbName, '-v', 'ON_ERROR_STOP=1', '-f', path.join(migrationsDir, file)]);
  }
}

/** Rebuilds the demo database from migrations + demo seed. */
export function resetDatabase() {
  applySchema(DB_NAME);
  psql(['-q', '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-f', path.join(REPO_ROOT, 'supabase', 'seed.sql')]);
}

/**
 * Rebuilds a database holding the real Content Master and nothing else — no
 * demo seed, so the production course is tested in isolation.
 */
export function resetProductionDatabase() {
  applySchema(PROD_DB_NAME);
  runImporter();
}

export function runImporter(): string {
  return execFileSync(
    'node',
    [
      path.join(REPO_ROOT, 'scripts', 'import-course-content.mjs'),
      path.join(REPO_ROOT, WORKBOOK),
      '--db',
      productionDbUrl(),
    ],
    { encoding: 'utf8', cwd: REPO_ROOT },
  );
}

export function productionDbUrl() {
  return `postgresql://postgres@/${PROD_DB_NAME}?host=${PG_HOST}&port=${PG_PORT}`;
}

export function workbookPath() {
  return path.join(REPO_ROOT, WORKBOOK);
}

export async function connect(database: string = DB_NAME) {
  const client = new pg.Client({
    host: PG_HOST,
    port: PG_PORT,
    user: 'postgres',
    database,
  });
  await client.connect();
  return client;
}

export async function connectProduction() {
  return connect(PROD_DB_NAME);
}

/**
 * Runs a block the way the app's browser client would: as the `authenticated`
 * role, with a JWT subject, so every RLS policy applies exactly as it does in
 * production. Writes are committed, since several tests check that state
 * survives into a later session.
 */
export async function asUser<T>(
  client: pg.Client,
  userId: string,
  body: (client: pg.Client) => Promise<T>,
): Promise<T> {
  await client.query('begin');
  await client.query('set local role authenticated');
  await client.query(`set local request.jwt.claim.sub = '${userId}'`);
  try {
    const result = await body(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

/** Same, for a signed-out visitor. */
export async function asAnon<T>(
  client: pg.Client,
  body: (client: pg.Client) => Promise<T>,
): Promise<T> {
  await client.query('begin');
  await client.query('set local role anon');
  try {
    const result = await body(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

/** Server-side privileged work: signup, entitlement grants, content authoring. */
export async function createUser(client: pg.Client, email: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    'insert into auth.users (email) values ($1) returning id',
    [email],
  );
  return rows[0]!.id;
}

export async function grantEntitlement(client: pg.Client, userId: string) {
  await client.query(
    "insert into entitlements (user_id, product_code, source) values ($1, 'FULL_ACCESS', 'manual')",
    [userId],
  );
}

export async function selectProfession(client: pg.Client, userId: string, slug: string) {
  await client.query(
    `insert into user_professions (user_id, profession_id, is_primary)
     select $1, id, true from professions where slug = $2`,
    [userId, slug],
  );
}
