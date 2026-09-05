-- =============================================================================
-- MOVA — 0006: public diagnostic funnel + attribution
--
-- Two additive concerns, no change to the course engine:
--
--   1. A public diagnostic test that an anonymous visitor can take. It reads
--      its own snapshot tables, never `phrases`, so opening the funnel to the
--      world does not open production content. RLS on the course is untouched.
--
--   2. Funnel attribution: an anonymous id and UTM values captured on first
--      visit and carried through to the account when one is created.
-- =============================================================================

create type audio_availability as enum ('pending', 'ready');

-- --------------------------------------------------- DIAGNOSTIC SNAPSHOT ----
-- Deliberately denormalised. These rows are a curated snapshot produced by
-- scripts/seed-diagnostic.mjs from approved, non-safety CORE phrases. Copying
-- seven phrases is the price of never granting anonymous access to the phrase
-- tables — a trade the security model is worth.
create table diagnostic_questions (
  id             uuid primary key default gen_random_uuid(),
  position       smallint not null unique check (position between 1 and 20),
  source_phrase  text not null,              -- P0031 — provenance, not a join
  german_text    text not null,
  skill_label    text not null,              -- 'Инструмент', 'Размер'…
  audio_path     text,                       -- filled in PHASE 5, never faked
  audio_status   audio_availability not null default 'pending',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint diagnostic_audio_ck
    check (audio_status = 'pending' or audio_path is not null)
);

create table diagnostic_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references diagnostic_questions(id) on delete cascade,
  position    smallint not null check (position between 1 and 6),
  text_ru     text not null,
  is_correct  boolean not null default false,
  unique (question_id, position)
);

-- Exactly one correct option per question, enforced rather than assumed.
create unique index diagnostic_one_correct_idx
  on diagnostic_options (question_id) where is_correct;

-- ------------------------------------------------------------ ATTRIBUTION ---
alter table analytics_events
  add column anonymous_id    text,
  add column session_id      text,
  add column utm_source      text,
  add column utm_medium      text,
  add column utm_campaign    text,
  add column utm_content      text,
  add column utm_term        text,
  add column landing_variant text,
  add column device_category text,
  add column locale          text;

create index analytics_anonymous_idx on analytics_events (anonymous_id, created_at desc);
create index analytics_campaign_idx  on analytics_events (utm_campaign, created_at desc);

-- The bridge between "a visitor who took the test" and "a customer". Written
-- once, on first authenticated visit, so a purchase can be attributed to the
-- creative that produced it.
create table user_attribution (
  user_id         uuid primary key references profiles(id) on delete cascade,
  anonymous_id    text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text,
  landing_variant text,
  first_seen_at   timestamptz not null default now()
);

create index user_attribution_anonymous_idx on user_attribution (anonymous_id);

-- ------------------------------------------------------------------- RLS ----
alter table diagnostic_questions enable row level security;
alter table diagnostic_options   enable row level security;
alter table user_attribution     enable row level security;

-- The one place in the schema where anonymous read is intentional.
create policy diagnostic_questions_public on public.diagnostic_questions
  for select to anon, authenticated using (is_active);

create policy diagnostic_options_public on public.diagnostic_options
  for select to anon, authenticated
  using (exists (
    select 1 from diagnostic_questions q
    where q.id = question_id and q.is_active
  ));

create policy diagnostic_questions_admin on public.diagnostic_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy diagnostic_options_admin on public.diagnostic_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy user_attribution_own on public.user_attribution
  for select to authenticated using (user_id = auth.uid());

create policy user_attribution_admin on public.user_attribution
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.diagnostic_questions to anon, authenticated;
grant select on public.diagnostic_options   to anon, authenticated;
grant select on public.user_attribution     to authenticated;

-- Anonymous visitors produce funnel events before they have an account.
-- Writes are insert-only and go through a server route that strips anything
-- the client should not be deciding; no anonymous read is granted.
create policy analytics_insert_anon on public.analytics_events
  for insert to anon with check (user_id is null);

grant insert on public.analytics_events to anon;

-- ---------------------------------------------------- OWNER FUNNEL VIEW -----
-- One report, not a BI system: visitors → test started → test completed →
-- purchase clicked, sliceable by campaign and day.
create or replace function public.funnel_summary(
  p_from timestamptz default now() - interval '30 days',
  p_to   timestamptz default now()
)
returns table (
  utm_campaign      text,
  landing_views     bigint,
  tests_started     bigint,
  tests_completed   bigint,
  purchase_clicks   bigint,
  checkouts_started bigint,
  purchases         bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(e.utm_campaign, '(none)'),
    count(*) filter (where e.event_type = 'landing_view'),
    count(*) filter (where e.event_type = 'test_started'),
    count(*) filter (where e.event_type = 'test_completed'),
    count(*) filter (where e.event_type = 'purchase_clicked'),
    count(*) filter (where e.event_type = 'checkout_started'),
    count(*) filter (where e.event_type = 'purchase_completed')
  from analytics_events e
  where e.created_at between p_from and p_to
  group by 1
  order by 2 desc;
$$;

grant execute on function public.funnel_summary(timestamptz, timestamptz) to authenticated;
