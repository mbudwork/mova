-- =============================================================================
-- MOVA — 0007: landing V2 support
--
-- Three additive concerns:
--   1. checkout_leads — an honest adapter for "get access" when Stripe is not
--      configured. It records intent, never a successful payment.
--   2. Ukrainian draft text on the diagnostic snapshot only. The 432-phrase
--      course is untouched — languages.uk stays inactive for course content.
--   3. locale on funnel events and in funnel_summary(), so RU/UA traffic can
--      be told apart in the owner report.
-- =============================================================================

create type lead_status as enum ('pending', 'contacted', 'converted', 'dismissed');

create table checkout_leads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  product_code text not null default 'FULL_ACCESS',
  status       lead_status not null default 'pending',
  locale       text references languages(code),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One open lead per user per product: re-visiting checkout must not spam
-- duplicate rows into the owner's follow-up queue.
create unique index checkout_leads_open_idx
  on checkout_leads (user_id, product_code) where status = 'pending';

alter table checkout_leads enable row level security;

create policy checkout_leads_own on public.checkout_leads
  for select to authenticated using (user_id = auth.uid());

create policy checkout_leads_insert_own on public.checkout_leads
  for insert to authenticated with check (user_id = auth.uid());

create policy checkout_leads_admin on public.checkout_leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.checkout_leads to authenticated;

create trigger checkout_leads_touch before update on checkout_leads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------- DIAGNOSTIC — UK DRAFT TEXT --
-- Draft, not reviewed by a native speaker. Deliberately kept on the 7-row
-- diagnostic snapshot only — the production course's Ukrainian column stays
-- untouched and languages.uk.is_active stays false, so nothing here can be
-- mistaken for a reviewed course translation.
alter table diagnostic_questions
  add column skill_label_uk text,
  add column is_uk_reviewed boolean not null default false;

alter table diagnostic_options
  add column text_uk text;

comment on column diagnostic_questions.is_uk_reviewed is
  'False until a native Ukrainian speaker has reviewed skill_label_uk and the '
  'linked options'' text_uk. Never set true by an import script.';

-- --------------------------------------------------------- FUNNEL: LOCALE ---
alter table analytics_events
  add column landing_locale text references languages(code);

create index analytics_locale_idx on analytics_events (landing_locale, created_at desc);

drop function if exists public.funnel_summary(timestamptz, timestamptz);

create or replace function public.funnel_summary(
  p_from   timestamptz default now() - interval '30 days',
  p_to     timestamptz default now(),
  p_locale text default null
)
returns table (
  utm_campaign      text,
  landing_locale    text,
  landing_views     bigint,
  tests_started     bigint,
  tests_completed   bigint,
  offers_viewed     bigint,
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
    coalesce(e.landing_locale, '(unknown)'),
    count(*) filter (where e.event_type = 'landing_view'),
    count(*) filter (where e.event_type = 'full_test_started'),
    count(*) filter (where e.event_type = 'test_completed'),
    count(*) filter (where e.event_type = 'offer_viewed'),
    count(*) filter (where e.event_type = 'purchase_clicked'),
    count(*) filter (where e.event_type = 'checkout_started'),
    count(*) filter (where e.event_type = 'purchase_completed')
  from analytics_events e
  where e.created_at between p_from and p_to
    and (p_locale is null or e.landing_locale = p_locale)
  group by 1, 2
  order by 3 desc;
$$;

grant execute on function public.funnel_summary(timestamptz, timestamptz, text) to authenticated;
