-- =============================================================================
-- Deutsch auf der Baustelle — 0003: Row Level Security
--
-- Model: deny by default. Enable RLS everywhere, then grant the narrowest
-- readable slice. Writes to content, entitlements and payments never come from
-- the browser — they go through server routes using the service role or the
-- admin policies below.
-- =============================================================================

-- ------------------------------------------------------- AUTH HELPERS -------
-- SECURITY DEFINER so the helper itself is not subject to RLS on profiles
-- (which would otherwise recurse through the profiles policy).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_full_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.entitlements e
    where e.user_id = auth.uid()
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Single source of truth for "is this phrase allowed to reach a normal USER".
create or replace function public.phrase_is_public(p phrases)
returns boolean
language sql
immutable
as $$
  select p.verification_status = 'approved'
     and (not p.safety_sensitive or p.safety_approved);
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.has_full_access() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_full_access() to authenticated;

-- ------------------------------------------------------- ENABLE RLS ---------
do $$
declare t text;
begin
  foreach t in array array[
    'languages','professions','profession_translations',
    'modules','module_translations','lessons','lesson_translations',
    'phrase_families','phrases','phrase_translations','phrase_components',
    'lesson_phrases','vocabulary_items','vocabulary_translations','phrase_vocabulary',
    'content_templates','template_slots','template_slot_options',
    'template_slot_option_translations','generated_combinations',
    'generated_combination_translations','voices','audio_assets',
    'audio_generation_jobs','tests','test_questions','test_question_options',
    'test_question_option_translations','content_reviews',
    'profiles','user_professions','entitlements','payments',
    'processed_webhook_events','phrase_progress','lesson_progress','favorites',
    'test_attempts','test_answers','search_queries','analytics_events'
  ]
  loop
    -- ENABLE, not FORCE. FORCE would also subject the table owner to RLS, which
    -- breaks the SECURITY DEFINER signup trigger on self-hosted Postgres where
    -- the owner lacks BYPASSRLS. It buys nothing here: service_role bypasses RLS
    -- by design, and the app never connects as the table owner.
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ------------------------------------------------ TABLE PRIVILEGES ---------
-- Supabase's default privileges hand anon/authenticated ALL on every new table
-- in public, leaving RLS as the only barrier. Two barriers are better than one:
-- revoke, then grant write only where a user legitimately writes.
do $$
declare t text;
begin
  execute 'revoke all on all tables in schema public from anon, authenticated';

  -- Read-only for everything the learner consumes.
  execute 'grant select on all tables in schema public to authenticated';
  foreach t in array array['languages','professions','profession_translations']
  loop
    execute format('grant select on public.%I to anon', t);
  end loop;

  -- Write only on the user's own rows (still narrowed by RLS on top).
  foreach t in array array[
    'user_professions','phrase_progress','lesson_progress','favorites',
    'test_attempts','test_answers'
  ]
  loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;

  execute 'grant update on public.profiles to authenticated';
  execute 'grant insert on public.search_queries to authenticated';
  execute 'grant insert on public.analytics_events to authenticated';

  -- Admin writes go through server actions on the service role, which bypasses
  -- both grants and RLS. Admins hold no direct write privilege from the browser.
end;
$$;

-- ------------------------------------------------- ADMIN FULL CONTROL -------
do $$
declare t text;
begin
  foreach t in array array[
    'languages','professions','profession_translations',
    'modules','module_translations','lessons','lesson_translations',
    'phrase_families','phrases','phrase_translations','phrase_components',
    'lesson_phrases','vocabulary_items','vocabulary_translations','phrase_vocabulary',
    'content_templates','template_slots','template_slot_options',
    'template_slot_option_translations','generated_combinations',
    'generated_combination_translations','voices','audio_assets',
    'audio_generation_jobs','tests','test_questions','test_question_options',
    'test_question_option_translations','content_reviews',
    'entitlements','payments','search_queries','analytics_events','profiles'
  ]
  loop
    execute format($f$
      create policy %1$I_admin_all on public.%1$I
        for all to authenticated
        using (public.is_admin())
        with check (public.is_admin())
    $f$, t);
  end loop;
end;
$$;

-- ------------------------------------------ PUBLIC REFERENCE DATA (read) ----
-- Needed by onboarding and the landing page before any purchase exists.
create policy languages_read on public.languages
  for select to anon, authenticated using (is_active);

create policy professions_read on public.professions
  for select to anon, authenticated using (is_active);

create policy profession_tr_read on public.profession_translations
  for select to anon, authenticated using (true);

-- ------------------------------------------------ COURSE STRUCTURE (read) ---
create policy modules_read on public.modules
  for select to authenticated using (is_published);

create policy module_tr_read on public.module_translations
  for select to authenticated
  using (exists (select 1 from modules m where m.id = module_id and m.is_published));

create policy lessons_read on public.lessons
  for select to authenticated using (is_published);

create policy lesson_tr_read on public.lesson_translations
  for select to authenticated
  using (exists (select 1 from lessons l where l.id = lesson_id and l.is_published));

-- ---------------------------------------------------- PHRASES (read) --------
-- A draft phrase is invisible to a normal USER, full stop (§8).
-- Free-preview phrases are readable without an entitlement so the landing
-- demo and the diagnostic test work before purchase.
create policy phrases_read on public.phrases
  for select to authenticated
  using (
    verification_status = 'approved'
    and (not safety_sensitive or safety_approved)
    and (is_free_preview or public.has_full_access())
  );

create policy phrase_tr_read on public.phrase_translations
  for select to authenticated
  using (exists (
    select 1 from phrases p where p.id = phrase_id
      and p.verification_status = 'approved'
      and (not p.safety_sensitive or p.safety_approved)
      and (p.is_free_preview or public.has_full_access())));

create policy phrase_components_read on public.phrase_components
  for select to authenticated
  using (exists (
    select 1 from phrases p where p.id = phrase_id
      and p.verification_status = 'approved'
      and (not p.safety_sensitive or p.safety_approved)
      and (p.is_free_preview or public.has_full_access())));

create policy phrase_families_read on public.phrase_families
  for select to authenticated using (public.has_full_access());

create policy lesson_phrases_read on public.lesson_phrases
  for select to authenticated
  using (exists (select 1 from lessons l where l.id = lesson_id and l.is_published));

create policy phrase_vocabulary_read on public.phrase_vocabulary
  for select to authenticated using (public.has_full_access());

-- ------------------------------------------------- VOCABULARY (read) --------
create policy vocabulary_read on public.vocabulary_items
  for select to authenticated
  using (verification_status = 'approved' and public.has_full_access());

create policy vocabulary_tr_read on public.vocabulary_translations
  for select to authenticated
  using (exists (
    select 1 from vocabulary_items v where v.id = vocabulary_item_id
      and v.verification_status = 'approved') and public.has_full_access());

-- ------------------------------------------- GENERATED COMBINATIONS ---------
create policy combinations_read on public.generated_combinations
  for select to authenticated using (approved and public.has_full_access());

create policy combination_tr_read on public.generated_combination_translations
  for select to authenticated
  using (exists (select 1 from generated_combinations g
                 where g.id = combination_id and g.approved)
         and public.has_full_access());

-- Templates and slot options are authoring artifacts: admin only (no read policy).

-- --------------------------------------------------------- AUDIO (read) -----
-- Metadata only. The file itself lives in a private bucket and is delivered
-- as a short-lived signed URL minted server-side.
create policy voices_read on public.voices
  for select to authenticated using (is_active);

create policy audio_read on public.audio_assets
  for select to authenticated
  using (
    approved and (
      (phrase_id is not null and exists (
        select 1 from phrases p where p.id = phrase_id
          and p.verification_status = 'approved'
          and (not p.safety_sensitive or p.safety_approved)
          and (p.is_free_preview or public.has_full_access())))
      or
      (combination_id is not null and exists (
        select 1 from generated_combinations g
        where g.id = combination_id and g.approved) and public.has_full_access())
    )
  );

-- ---------------------------------------------------------- TESTS (read) ----
create policy tests_read on public.tests
  for select to authenticated using (is_published);

create policy test_questions_read on public.test_questions
  for select to authenticated
  using (exists (select 1 from tests t where t.id = test_id and t.is_published));

create policy test_options_read on public.test_question_options
  for select to authenticated
  using (exists (select 1 from test_questions q join tests t on t.id = q.test_id
                 where q.id = question_id and t.is_published));

create policy test_option_tr_read on public.test_question_option_translations
  for select to authenticated
  using (exists (select 1 from test_question_options o
                 join test_questions q on q.id = o.question_id
                 join tests t on t.id = q.test_id
                 where o.id = option_id and t.is_published));

-- NOTE: test_question_options.is_correct is readable by the client. For the
-- final Baustelle test, answers are graded server-side against a question set
-- fetched with the service role; the client-facing endpoint strips is_correct.

-- ------------------------------------------------------------- OWN DATA -----
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

-- Users may edit their own profile.
--
-- Role escalation is blocked by a trigger, NOT by the policy: a WITH CHECK that
-- subqueries public.profiles would be evaluated under this very policy and
-- recurse infinitely. The trigger sees OLD/NEW directly and cannot recurse.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_no_self_promotion
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

create policy user_professions_own on public.user_professions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy phrase_progress_own on public.phrase_progress
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy lesson_progress_own on public.lesson_progress
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy favorites_own on public.favorites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy test_attempts_own on public.test_attempts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy test_answers_own on public.test_answers
  for all to authenticated
  using (exists (select 1 from test_attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (select 1 from test_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- Read-only for the user: granting access is a server-side operation.
create policy entitlements_select_own on public.entitlements
  for select to authenticated using (user_id = auth.uid());

create policy payments_select_own on public.payments
  for select to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------- TELEMETRY (insert) ---
create policy search_queries_insert_own on public.search_queries
  for insert to authenticated with check (user_id = auth.uid());

create policy search_queries_select_own on public.search_queries
  for select to authenticated using (user_id = auth.uid());

create policy analytics_insert_own on public.analytics_events
  for insert to authenticated with check (user_id = auth.uid());

-- processed_webhook_events: service role only. No policies on purpose.

-- ----------------------------------------------------- STORAGE (audio) ------
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

create policy audio_bucket_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'audio' and public.is_admin())
  with check (bucket_id = 'audio' and public.is_admin());
-- Playback for normal users happens exclusively through signed URLs created by
-- the server after it has re-checked entitlement + phrase visibility.
