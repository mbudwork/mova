-- =============================================================================
-- RLS smoke test — run against a freshly reset local database:
--
--   supabase db reset
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/tests/rls_smoke.sql
--
-- Every line marked MUST is an acceptance criterion (§42.13, §42.14, §42.19).
-- These same assertions are mirrored as Playwright E2E tests in PHASE 12.
-- =============================================================================

\set uid '11111111-1111-1111-1111-111111111111'

insert into auth.users (id, email) values (:'uid', 'worker@test.de')
on conflict (id) do nothing;

-- Content a normal USER must never see.
insert into phrases (german_text, intent, verification_status)
  values ('GEHEIM DRAFT', 'x', 'draft');
insert into phrases (german_text, intent, verification_status,
                     safety_sensitive, safety_approved, is_free_preview)
  values ('UNGEPRUEFTE WARNUNG', 'x', 'safety_review', true, false, true);

select 'A. profile auto-created on signup' as check, count(*)::text as result from profiles;

-- ---------------------------------------------------- without entitlement ---
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = :'uid';
  select 'B. free-preview phrases visible',        count(*)::text from phrases;
  select 'C. draft visible          (MUST be 0)',  count(*)::text from phrases where german_text = 'GEHEIM DRAFT';
  select 'D. unsafe warning visible (MUST be 0)',  count(*)::text from phrases where german_text = 'UNGEPRUEFTE WARNUNG';
  select 'E. vocabulary visible     (MUST be 0)',  count(*)::text from vocabulary_items;
  select 'F. other profiles visible (MUST be 1)',  count(*)::text from profiles;
  select 'G. has_full_access        (MUST be f)',  has_full_access()::text;
commit;

-- ------------------------------------------------------- with entitlement ---
insert into entitlements (user_id, product_code, source) values (:'uid', 'FULL_ACCESS', 'manual');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = :'uid';
  select 'H. phrases visible with access',         count(*)::text from phrases;
  select 'I. draft STILL hidden     (MUST be 0)',  count(*)::text from phrases where german_text = 'GEHEIM DRAFT';
  select 'J. vocabulary with access',              count(*)::text from vocabulary_items;
commit;

-- ---------------------------------------------------- privilege escalation ---
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = :'uid';
  update profiles set role = 'admin', display_name = 'Hacker' where id = :'uid';
commit;

select 'K. self-promotion blocked (MUST be user)', role::text from profiles where id = :'uid';
select 'L. own field still editable',              coalesce(display_name, 'NULL') from profiles where id = :'uid';

-- ------------------------------------------------ direct content write -------
-- MUST fail with: permission denied for table phrases
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = :'uid';
  insert into phrases (german_text, verification_status) values ('HACK', 'approved');
rollback;
