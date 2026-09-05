-- =============================================================================
-- Deutsch auf der Baustelle — 0005: production content support
--
-- Extends the PHASE 1–3 schema to hold the approved Content Master without
-- altering any of its educational data. Every addition here exists because a
-- column in the workbook had nowhere to go; nothing is dropped, and no
-- existing guarantee is relaxed.
-- =============================================================================

-- ------------------------------------------------------------------ ENUMS ---
-- The Content Master uses "native_review" for rows awaiting a native German
-- speaker with Baustelle experience (Production Gate G01, Review Queue R002).
-- That is a distinct step from the generic language review already in the
-- pipeline, so the enum grows rather than the content being relabelled.
alter type verification_status add value if not exists 'native_review' after 'language_review';

create type content_priority   as enum ('A', 'B', 'C');
create type content_stage      as enum ('SURVIVAL', 'WORKING_CORE', 'TRADE');
create type lesson_phrase_role as enum ('primary', 'review_pool');
create type audio_asset_status as enum ('pending', 'generated', 'approved', 'rejected');
create type family_kind        as enum ('family', 'natural_variant');

-- ---------------------------------------------------------------- PHRASES ---
alter table phrases
  add column external_id     text unique,          -- P0001 — idempotency key
  add column priority        content_priority,
  add column stage           content_stage,
  add column content_module  text,                 -- 'Survival', 'Tools', 'FLIESEN'…
  add column source_ref      text,                 -- 'S01/S02' → content_sources
  add column confidence      text;

create index phrases_priority_idx on phrases (priority);
create index phrases_stage_idx    on phrases (stage);

-- ------------------------------------------------------------- VOCABULARY ---
alter table vocabulary_items
  add column external_id     text unique,
  add column priority        content_priority,
  add column content_module  text,
  add column colloquial_note text,
  add column source_ref      text,
  add column confidence      text;

-- ---------------------------------------------------------------- LESSONS ---
alter table lessons
  add column external_id    text unique,           -- L01
  add column track          text,                  -- CORE | TROCKENBAU | … | ALL
  add column content_module text,                  -- 'Commands', 'Assessment'…
  add column outcome        text,
  add column notes          text;

-- Lesson content carries a role: primary material versus review pool (§6).
-- Turning every mapped row into a new target would blow past the 8–10 new
-- targets per lesson the course is designed around.
alter table lesson_phrases
  add column role lesson_phrase_role not null default 'primary';

-- order_index is unique per (lesson, role): the two pools are numbered
-- independently in the Content Master.
create unique index lesson_phrases_role_order_idx
  on lesson_phrases (lesson_id, role, order_index);

-- ------------------------------------------------------------------ AUDIO ---
-- A manifest row is a planned asset, not a produced one, so a path cannot be
-- required until something has actually been generated.
alter table audio_assets
  alter column storage_path drop not null,
  add column status      audio_asset_status not null default 'pending',
  add column external_ref text;

alter table audio_assets
  add constraint audio_path_required_when_produced
  check (status = 'pending' or storage_path is not null);

alter table voices add column notes text;

-- --------------------------------------------------------- PHRASE FAMILIES --
-- Families and natural variants are the same idea — one communicative
-- function across registers — so they share a table with a discriminator
-- rather than duplicating the structure twice.
alter table phrase_families
  add column external_id    text unique,
  add column kind           family_kind not null default 'family',
  add column content_module text,
  add column profession_id  uuid references professions(id) on delete set null,
  add column status         verification_status not null default 'draft',
  add column source_ref     text;

create table phrase_family_variants (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references phrase_families(id) on delete cascade,
  register_level smallint not null check (register_level between 1 and 4),
  german_text    text not null,
  created_at     timestamptz not null default now(),
  unique (family_id, register_level)
);

create table phrase_family_translations (
  family_id     uuid not null references phrase_families(id) on delete cascade,
  language_code text not null references languages(code) on delete cascade,
  meaning       text not null,
  primary key (family_id, language_code)
);

-- ------------------------------------------------- PRODUCTION METADATA (§27) --
-- Not user-facing. Kept in the database so the review process stays visible
-- to the system rather than living only in a spreadsheet.
create table content_sources (
  id         text primary key,                     -- S01
  name       text not null,
  url        text,
  validates  text,
  created_at timestamptz not null default now()
);

create table production_gates (
  gate       text primary key,                     -- G01
  scope      text not null,
  content    text,
  reviewer   text,
  status     text not null,                        -- OPEN | PASSED | …
  rule       text,
  updated_at timestamptz not null default now()
);

create table review_queue (
  id         text primary key,                     -- R001
  area       text not null,
  issue      text not null,
  reviewer   text,
  decision   text not null,
  updated_at timestamptz not null default now()
);

create table test_templates (
  id              text primary key,                -- T01
  test_type       text not null,
  track           text not null,
  mechanic        text not null,
  distractor_rule text,
  skill           text,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------- ORDERING -----
-- Replaces the PHASE 3 version. The old sort pushed every profession module
-- behind every core module, which is right for the demo seed but wrong for the
-- production course, where the final assessment module must come after the
-- trade modules. Ordering is now purely (module_order, lesson_order), and the
-- module order values carry the intent — still entirely data-driven.
create or replace function public.next_lesson()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select a.lesson_slug
  from public.accessible_lessons() a
  left join lesson_progress lp
    on lp.lesson_id = a.lesson_id
   and lp.user_id = auth.uid()
   and lp.status = 'completed'
  where lp.lesson_id is null
  order by a.module_order, a.lesson_order
  limit 1;
$$;

-- ----------------------------------------------------------------- ACCESS ---
alter table phrase_family_variants     enable row level security;
alter table phrase_family_translations enable row level security;
alter table content_sources            enable row level security;
alter table production_gates           enable row level security;
alter table review_queue               enable row level security;
alter table test_templates             enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'phrase_family_variants','phrase_family_translations',
    'content_sources','production_gates','review_queue','test_templates'
  ]
  loop
    execute format($f$
      create policy %1$I_admin_all on public.%1$I
        for all to authenticated
        using (public.is_admin()) with check (public.is_admin())
    $f$, t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;

-- Family variants follow the same gate as the rest of the paid content.
create policy family_variants_read on public.phrase_family_variants
  for select to authenticated
  using (
    public.has_full_access()
    and exists (
      select 1 from phrase_families f
      where f.id = family_id and f.status = 'approved'
    )
  );

create policy family_translations_read on public.phrase_family_translations
  for select to authenticated
  using (
    public.has_full_access()
    and exists (
      select 1 from phrase_families f
      where f.id = family_id and f.status = 'approved'
    )
  );

-- content_sources, production_gates, review_queue and test_templates have no
-- read policy for normal users on purpose: they are production process
-- metadata, never product surface.
