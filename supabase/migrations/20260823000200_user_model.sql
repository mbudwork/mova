-- =============================================================================
-- Deutsch auf der Baustelle — 0002: identity, access, progress, analytics
-- =============================================================================

-- --------------------------------------------------------------- PROFILES ----
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  app_role not null default 'user',
  display_name          text,
  ui_locale             text not null default 'ru' references languages(code),
  self_level            self_reported_level,
  current_level         skill_level not null default 'B0',
  primary_profession_id uuid references professions(id) on delete set null,
  onboarding_completed  boolean not null default false,
  daily_goal_minutes    integer not null default 10,
  streak_days           integer not null default 0,
  last_active_on        date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger profiles_touch before update on profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row on signup. SECURITY DEFINER: runs as owner so the
-- auth schema trigger can write into public.profiles regardless of RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table user_professions (
  user_id       uuid not null references profiles(id) on delete cascade,
  profession_id uuid not null references professions(id) on delete cascade,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (user_id, profession_id)
);
create unique index user_professions_one_primary_idx
  on user_professions (user_id) where is_primary;

-- ------------------------------------------------------ ACCESS / PAYMENTS ----
create table entitlements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  product_code text not null default 'FULL_ACCESS',
  status       entitlement_status not null default 'active',
  source       text not null default 'stripe',   -- stripe | manual | demo
  granted_at   timestamptz not null default now(),
  expires_at   timestamptz,                      -- null = perpetual (one-time purchase)
  created_at   timestamptz not null default now()
);
create unique index entitlements_active_idx
  on entitlements (user_id, product_code) where status = 'active';

create table payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles(id) on delete set null,
  provider            text not null default 'stripe',
  provider_payment_id text not null,
  product_code        text not null default 'FULL_ACCESS',
  amount_cents        integer not null,
  currency            text not null default 'eur',
  status              payment_status not null default 'pending',
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

-- Webhook idempotency: a replayed Stripe event must never double-grant access.
create table processed_webhook_events (
  provider    text not null,
  event_id    text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ------------------------------------------------------- PROGRESS (§15) ------
create table phrase_progress (
  user_id           uuid not null references profiles(id) on delete cascade,
  phrase_id         uuid not null references phrases(id) on delete cascade,
  state             progress_state not null default 'new',
  correct_count     integer not null default 0,
  incorrect_count   integer not null default 0,
  current_streak    integer not null default 0,
  interval_days     integer not null default 0,
  listening_seen    integer not null default 0,
  listening_correct integer not null default 0,
  text_seen         integer not null default 0,
  text_correct      integer not null default 0,
  listening_accuracy numeric(5,2) generated always as (
    case when listening_seen = 0 then null
         else round(100.0 * listening_correct / listening_seen, 2) end) stored,
  text_accuracy numeric(5,2) generated always as (
    case when text_seen = 0 then null
         else round(100.0 * text_correct / text_seen, 2) end) stored,
  last_seen_at      timestamptz,
  next_review_at    timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, phrase_id)
);
create index phrase_progress_due_idx on phrase_progress (user_id, next_review_at);
create index phrase_progress_state_idx on phrase_progress (user_id, state);
create trigger phrase_progress_touch before update on phrase_progress
  for each row execute function public.touch_updated_at();

create table lesson_progress (
  user_id      uuid not null references profiles(id) on delete cascade,
  lesson_id    uuid not null references lessons(id) on delete cascade,
  status       text not null default 'started',   -- started | completed
  score_percent smallint,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create table favorites (
  user_id    uuid not null references profiles(id) on delete cascade,
  item_type  favorite_type not null,
  item_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

create table test_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  test_id         uuid not null references tests(id) on delete cascade,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  total_questions integer not null default 0,
  total_correct   integer not null default 0,
  scores          jsonb not null default '{}'::jsonb  -- per scoring_bucket percentages
);
create index test_attempts_user_idx on test_attempts (user_id, started_at desc);

create table test_answers (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references test_attempts(id) on delete cascade,
  question_id        uuid not null references test_questions(id) on delete cascade,
  selected_option_id uuid references test_question_options(id) on delete set null,
  is_correct         boolean not null default false,
  response_ms        integer,
  created_at         timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ------------------------------------------------------- ANALYTICS (§29) -----
-- The single most valuable table in the product: queries that returned nothing
-- tell us exactly which real phrases the content team still has to write.
create table search_queries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete set null,
  query_text       text not null,
  query_language   text not null default 'ru' references languages(code),
  results_count    integer not null default 0,
  clicked_phrase_id uuid references phrases(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index search_queries_empty_idx on search_queries (created_at desc) where results_count = 0;
create index search_queries_text_idx  on search_queries using gin (query_text gin_trgm_ops);

create table analytics_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  event_type text not null,               -- lesson_started, audio_played, answer_submitted...
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_type_idx on analytics_events (event_type, created_at desc);
create index analytics_events_user_idx on analytics_events (user_id, created_at desc);
