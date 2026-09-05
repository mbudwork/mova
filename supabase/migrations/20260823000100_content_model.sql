-- =============================================================================
-- Deutsch auf der Baustelle — 0001: enums, reference data, content model
-- German is ALWAYS the source language. All learner-facing text is localized
-- via *_translations tables (RU today; UA/PL/RO/BG/EN later, no core rewrite).
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ----------------------------------------------------------------- ENUMS ----
create type app_role              as enum ('user', 'admin');

create type speaker_type          as enum ('bauleiter', 'polier', 'colleague', 'worker', 'customer');

-- DE_TO_L1 / L1_TO_DE instead of DE_TO_RU / RU_TO_DE: "L1" = the learner's
-- first language, which is Russian today but must not be baked into the enum.
create type phrase_direction      as enum ('DE_TO_L1', 'L1_TO_DE');

create type verification_status   as enum (
  'draft', 'language_review', 'trade_review', 'safety_review',
  'approved', 'rejected', 'archived');

create type source_type           as enum ('manual', 'field_collected', 'imported', 'template_generated');

create type component_type        as enum (
  'ACTION', 'OBJECT', 'LOCATION', 'QUANTITY',
  'MEASUREMENT', 'SEQUENCE', 'QUALITY', 'WARNING');

create type audio_speed           as enum ('slow', 'normal', 'natural');

-- Internal levels only. NOT CEFR. Never surfaced as A1/A2/B1 in the UI.
create type skill_level           as enum ('B0', 'B1', 'B2', 'B3', 'B4');

create type module_scope          as enum ('core', 'profession');
create type lesson_kind           as enum ('intro', 'training', 'listening', 'mixed', 'test');

create type progress_state        as enum ('new', 'learning', 'recognizing', 'understood', 'weak', 'mastered');

create type question_type         as enum (
  'audio_to_translation',
  'de_to_l1',
  'l1_to_de',
  'audio_to_reaction',
  'audio_identify_object',
  'audio_identify_measurement',
  'audio_identify_location',
  'audio_identify_sequence',
  'unseen_combination');

create type test_kind             as enum ('diagnostic', 'lesson', 'module', 'final');
create type entitlement_status    as enum ('active', 'revoked', 'expired');
create type payment_status        as enum ('pending', 'succeeded', 'failed', 'refunded');
create type favorite_type         as enum ('phrase', 'vocabulary', 'lesson');
create type self_reported_level   as enum ('none', 'words', 'simple_commands', 'some_speaking');
create type job_status            as enum ('queued', 'running', 'done', 'failed');

-- ------------------------------------------------------------- UTILITIES ----
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------- LANGUAGES ----
create table languages (
  code          text primary key,          -- ISO 639-1: 'de', 'ru', 'uk', 'pl', 'ro', 'bg', 'en'
  name_native   text not null,
  name_en       text not null,
  is_source     boolean not null default false,   -- true only for 'de'
  is_active     boolean not null default true,
  sort_order    integer not null default 0
);

create unique index languages_single_source_idx on languages (is_source) where is_source;

-- ----------------------------------------------------------- PROFESSIONS ----
create table professions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,        -- 'allgemein','trockenbau','fliesenleger',...
  icon        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table profession_translations (
  profession_id  uuid not null references professions(id) on delete cascade,
  language_code  text not null references languages(code) on delete cascade,
  name           text not null,
  description    text,
  primary key (profession_id, language_code)
);

-- --------------------------------------------------------------- MODULES ----
create table modules (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  scope          module_scope not null default 'core',
  profession_id  uuid references professions(id) on delete cascade,
  order_index    integer not null default 0,
  min_level      skill_level not null default 'B0',
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint modules_scope_profession_ck check (
    (scope = 'core'       and profession_id is null) or
    (scope = 'profession' and profession_id is not null))
);
create trigger modules_touch before update on modules
  for each row execute function public.touch_updated_at();

create table module_translations (
  module_id      uuid not null references modules(id) on delete cascade,
  language_code  text not null references languages(code) on delete cascade,
  title          text not null,
  description    text,
  primary key (module_id, language_code)
);

-- --------------------------------------------------------------- LESSONS ----
create table lessons (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references modules(id) on delete cascade,
  slug          text not null unique,
  kind          lesson_kind not null default 'mixed',
  order_index   integer not null default 0,
  est_minutes   integer not null default 10,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index lessons_module_idx on lessons (module_id, order_index);
create trigger lessons_touch before update on lessons
  for each row execute function public.touch_updated_at();

create table lesson_translations (
  lesson_id      uuid not null references lessons(id) on delete cascade,
  language_code  text not null references languages(code) on delete cascade,
  title          text not null,
  goal           text,                     -- "Что ты научишься понимать"
  primary key (lesson_id, language_code)
);

-- -------------------------------------------------------- PHRASE FAMILIES ---
-- One communicative intention, several registers (§14).
create table phrase_families (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,        -- 'bring_wasserwaage'
  intent      text not null,               -- 'request_tool'
  notes       text,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- PHRASES ----
create table phrases (
  id                  uuid primary key default gen_random_uuid(),
  german_text         text not null,
  natural_variant     text,                -- how it is really said on site
  formal_variant      text,                -- textbook / Sie-form
  intent              text,
  speaker             speaker_type not null default 'bauleiter',
  direction           phrase_direction not null default 'DE_TO_L1',
  family_id           uuid references phrase_families(id) on delete set null,
  register_level      smallint not null default 1
                        check (register_level between 1 and 4),  -- §14 L1..L4
  difficulty          smallint not null default 1 check (difficulty between 1 and 5),
  frequency_score     smallint not null default 50 check (frequency_score between 0 and 100),
  min_level           skill_level not null default 'B0',
  profession_id       uuid references professions(id) on delete set null, -- null = core
  safety_sensitive    boolean not null default false,
  safety_approved     boolean not null default false,
  verification_status verification_status not null default 'draft',
  -- Derived, never hand-set: keeps "verified" in the model without drift.
  verified            boolean generated always as (verification_status = 'approved') stored,
  source_type         source_type not null default 'manual',
  is_free_preview     boolean not null default false,  -- visible without entitlement
  notes               text,
  created_by          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint phrases_safety_ck check (not (safety_sensitive and verification_status = 'approved' and not safety_approved))
);
create index phrases_status_idx      on phrases (verification_status);
create index phrases_family_idx      on phrases (family_id, register_level);
create index phrases_profession_idx  on phrases (profession_id);
create index phrases_german_trgm_idx on phrases using gin (german_text gin_trgm_ops);
create trigger phrases_touch before update on phrases
  for each row execute function public.touch_updated_at();

create table phrase_translations (
  phrase_id        uuid not null references phrases(id) on delete cascade,
  language_code    text not null references languages(code) on delete cascade,
  text             text not null,
  pronunciation    text,                   -- "холь битэ ди вассэрваагэ"
  literal_hint     text,
  keywords         text[] not null default '{}',   -- search synonyms: болгарка, УШМ
  primary key (phrase_id, language_code)
);
create index phrase_tr_text_trgm_idx on phrase_translations using gin (text gin_trgm_ops);
create index phrase_tr_keywords_idx  on phrase_translations using gin (keywords);

-- ----------------------------------------------------- PHRASE COMPONENTS ----
-- Semantic markup (§10). Offsets point into phrases.german_text.
create table phrase_components (
  id                  uuid primary key default gen_random_uuid(),
  phrase_id           uuid not null references phrases(id) on delete cascade,
  component_type      component_type not null,
  surface_text        text not null,       -- exact inflected form as it appears
  char_start          integer,
  char_end            integer,
  order_index         integer not null default 0,
  vocabulary_item_id  uuid,                -- FK added after vocabulary_items
  constraint phrase_components_span_ck check (
    char_start is null or char_end is null or char_end > char_start)
);
create index phrase_components_phrase_idx on phrase_components (phrase_id, order_index);
create index phrase_components_type_idx   on phrase_components (component_type);

create table lesson_phrases (
  lesson_id    uuid not null references lessons(id) on delete cascade,
  phrase_id    uuid not null references phrases(id) on delete cascade,
  order_index  integer not null default 0,
  primary key (lesson_id, phrase_id)
);

-- ------------------------------------------------------------ VOCABULARY ----
create table vocabulary_items (
  id                  uuid primary key default gen_random_uuid(),
  german_term         text not null,       -- canonical headword
  formal_term         text,                -- Winkelschleifer
  colloquial_term     text,                -- Flex
  article             text check (article in ('der', 'die', 'das')),
  plural_form         text,
  part_of_speech      text not null default 'noun',
  category            text,                -- 'tool','material','measurement','place'
  profession_id       uuid references professions(id) on delete set null,
  frequency           smallint not null default 50 check (frequency between 0 and 100),
  difficulty          smallint not null default 1 check (difficulty between 1 and 5),
  safety_sensitive    boolean not null default false,
  verification_status verification_status not null default 'draft',
  verified            boolean generated always as (verification_status = 'approved') stored,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index vocab_german_trgm_idx on vocabulary_items using gin (german_term gin_trgm_ops);
create index vocab_status_idx      on vocabulary_items (verification_status);
create trigger vocabulary_touch before update on vocabulary_items
  for each row execute function public.touch_updated_at();

alter table phrase_components
  add constraint phrase_components_vocab_fk
  foreign key (vocabulary_item_id) references vocabulary_items(id) on delete set null;

create table vocabulary_translations (
  vocabulary_item_id  uuid not null references vocabulary_items(id) on delete cascade,
  language_code       text not null references languages(code) on delete cascade,
  term                text not null,       -- болгарка
  synonyms            text[] not null default '{}',  -- {УШМ, шлифмашина}
  pronunciation       text,
  primary key (vocabulary_item_id, language_code)
);
create index vocab_tr_term_trgm_idx on vocabulary_translations using gin (term gin_trgm_ops);
create index vocab_tr_synonyms_idx  on vocabulary_translations using gin (synonyms);

create table phrase_vocabulary (
  phrase_id           uuid not null references phrases(id) on delete cascade,
  vocabulary_item_id  uuid not null references vocabulary_items(id) on delete cascade,
  primary key (phrase_id, vocabulary_item_id)
);

-- ---------------------------------------------------- TEMPLATE ENGINE (§16) --
create table content_templates (
  id                  uuid primary key default gen_random_uuid(),
  pattern             text not null,       -- 'Schneid {object} {measurement} kürzer.'
  description         text,
  speaker             speaker_type not null default 'bauleiter',
  difficulty          smallint not null default 2,
  verification_status verification_status not null default 'draft',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger templates_touch before update on content_templates
  for each row execute function public.touch_updated_at();

create table template_slots (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references content_templates(id) on delete cascade,
  slot_key       text not null,            -- 'object'
  component_type component_type not null,  -- OBJECT
  position       integer not null default 0,
  unique (template_id, slot_key)
);

-- IMPORTANT: german_surface stores the FULLY INFLECTED form required at this
-- slot position (e.g. accusative "die Platte"), not a dictionary lemma.
-- The engine concatenates surfaces; it never inflects German itself.
create table template_slot_options (
  id                  uuid primary key default gen_random_uuid(),
  slot_id             uuid not null references template_slots(id) on delete cascade,
  german_surface      text not null,
  vocabulary_item_id  uuid references vocabulary_items(id) on delete set null,
  approved            boolean not null default false,
  created_at          timestamptz not null default now()
);
create index template_slot_options_slot_idx on template_slot_options (slot_id) where approved;

create table template_slot_option_translations (
  option_id      uuid not null references template_slot_options(id) on delete cascade,
  language_code  text not null references languages(code) on delete cascade,
  text           text not null,
  primary key (option_id, language_code)
);

-- Materialized unseen combinations (so audio can be cached against a stable id).
create table generated_combinations (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references content_templates(id) on delete cascade,
  german_text  text not null,
  slot_values  jsonb not null default '{}'::jsonb,   -- {"object":"<option_id>",...}
  approved     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (template_id, german_text)
);

create table generated_combination_translations (
  combination_id  uuid not null references generated_combinations(id) on delete cascade,
  language_code   text not null references languages(code) on delete cascade,
  text            text not null,
  primary key (combination_id, language_code)
);

-- -------------------------------------------------------------- AUDIO (§11) --
create table voices (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null default 'elevenlabs',
  provider_voice_id text not null,
  label             text not null,         -- 'Polier Nord (m)'
  gender            text,
  role_hint         speaker_type,
  is_active         boolean not null default true,
  unique (provider, provider_voice_id)
);

create table audio_assets (
  id              uuid primary key default gen_random_uuid(),
  phrase_id       uuid references phrases(id) on delete cascade,
  combination_id  uuid references generated_combinations(id) on delete cascade,
  voice_id        uuid not null references voices(id) on delete restrict,
  speed           audio_speed not null default 'normal',
  style           text,
  provider        text not null default 'elevenlabs',
  storage_path    text not null,           -- private bucket key, served via signed URL
  duration_ms     integer,
  text_checksum   text,                    -- invalidate when german_text changes
  approved        boolean not null default false,
  generated_at    timestamptz not null default now(),
  constraint audio_target_ck check (num_nonnulls(phrase_id, combination_id) = 1)
);
create unique index audio_phrase_variant_idx
  on audio_assets (phrase_id, voice_id, speed) where phrase_id is not null;
create unique index audio_combination_variant_idx
  on audio_assets (combination_id, voice_id, speed) where combination_id is not null;

create table audio_generation_jobs (
  id           uuid primary key default gen_random_uuid(),
  phrase_id    uuid references phrases(id) on delete cascade,
  combination_id uuid references generated_combinations(id) on delete cascade,
  voice_id     uuid not null references voices(id) on delete cascade,
  speed        audio_speed not null default 'normal',
  status       job_status not null default 'queued',
  error        text,
  requested_by uuid,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index audio_jobs_status_idx on audio_generation_jobs (status, created_at);

-- ---------------------------------------------------------- TESTS (§25/26) --
create table tests (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  kind           test_kind not null,
  module_id      uuid references modules(id) on delete cascade,
  profession_id  uuid references professions(id) on delete set null,
  question_count integer not null default 10,
  pass_percent   smallint not null default 70,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now()
);

create table test_questions (
  id              uuid primary key default gen_random_uuid(),
  test_id         uuid not null references tests(id) on delete cascade,
  question_type   question_type not null,
  phrase_id       uuid references phrases(id) on delete set null,
  combination_id  uuid references generated_combinations(id) on delete set null,
  prompt_mode     text not null default 'audio_only',  -- audio_only|text_audio|text
  order_index     integer not null default 0,
  scoring_bucket  text                                  -- listening|commands|measurements|safety|profession
);
create index test_questions_test_idx on test_questions (test_id, order_index);

create table test_question_options (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references test_questions(id) on delete cascade,
  order_index  integer not null default 0,
  is_correct   boolean not null default false,
  german_text  text
);

create table test_question_option_translations (
  option_id      uuid not null references test_question_options(id) on delete cascade,
  language_code  text not null references languages(code) on delete cascade,
  text           text not null,
  primary key (option_id, language_code)
);

-- ------------------------------------------------ CONTENT REVIEW AUDIT (§28) --
create table content_reviews (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,              -- 'phrase' | 'vocabulary_item' | 'content_template'
  entity_id    uuid not null,
  from_status  verification_status,
  to_status    verification_status not null,
  reviewer_id  uuid,
  note         text,
  created_at   timestamptz not null default now()
);
create index content_reviews_entity_idx on content_reviews (entity_type, entity_id, created_at desc);
