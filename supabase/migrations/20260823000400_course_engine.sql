-- =============================================================================
-- Deutsch auf der Baustelle — 0004: course engine
--
-- Progress, lesson ordering and completion live in the database, not in the
-- application, for three reasons:
--   1. Idempotency is a data property. "Completing a lesson twice must not
--      inflate progress" is enforced in one place, not in every caller.
--   2. These functions run SECURITY INVOKER, so RLS applies unchanged: a user
--      without an entitlement counts only what they are allowed to see.
--   3. They are testable against Postgres directly, without PostgREST.
-- =============================================================================

-- ---------------------------------------------------------- ACCESSIBILITY ---
-- A lesson is available to a user when its module is core, or when the module
-- belongs to a profession the user actually selected.
create or replace function public.accessible_lessons()
returns table (
  lesson_id      uuid,
  lesson_slug    text,
  module_id      uuid,
  module_order   integer,
  lesson_order   integer,
  scope          module_scope,
  profession_id  uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  select l.id, l.slug, m.id, m.order_index, l.order_index, m.scope, m.profession_id
  from lessons l
  join modules m on m.id = l.module_id
  where l.is_published
    and m.is_published
    and (
      m.scope = 'core'
      or exists (
        select 1 from user_professions up
        where up.user_id = auth.uid()
          and up.profession_id = m.profession_id
      )
    );
$$;

-- --------------------------------------------------------------- ORDERING ---
-- The next lesson is whatever the course data says it is: first published,
-- accessible, not-yet-completed lesson in (module order, lesson order).
-- Core content comes before trade content because core modules carry lower
-- order_index values — no hardcoded lesson list anywhere.
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
  order by (a.scope = 'profession'), a.module_order, a.lesson_order
  limit 1;
$$;

-- --------------------------------------------------------------- PROGRESS ---
-- Real denominators, taken from the content the user can actually reach.
-- No invented "+20": if the course has eleven lessons, the denominator is
-- eleven.
create or replace function public.course_progress()
returns table (
  lessons_total     integer,
  lessons_completed integer,
  phrases_total     integer,
  phrases_learned   integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*)::integer from public.accessible_lessons()),
    (select count(*)::integer
       from lesson_progress lp
       join public.accessible_lessons() a on a.lesson_id = lp.lesson_id
      where lp.user_id = auth.uid() and lp.status = 'completed'),
    (select count(distinct lpx.phrase_id)::integer
       from lesson_phrases lpx
       join public.accessible_lessons() a on a.lesson_id = lpx.lesson_id),
    (select count(*)::integer
       from phrase_progress pp
      where pp.user_id = auth.uid()
        and pp.state in ('understood', 'mastered'));
$$;

-- ------------------------------------------------------------- COMPLETION ---
-- Idempotent by construction:
--   * lesson_progress.completed_at is written once and never moved, so a
--     second pass cannot re-date or double-count a completion;
--   * phrase_progress rows are inserted only when missing, so re-opening a
--     lesson never increments a counter or resets a review schedule.
-- Returns true when this call was the completion, false when it was a repeat.
create or replace function public.complete_lesson(p_lesson_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_first_time boolean;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- RLS on lessons decides whether this row is visible at all.
  if not exists (
    select 1 from public.accessible_lessons() a where a.lesson_id = p_lesson_id
  ) then
    raise exception 'lesson not available';
  end if;

  insert into lesson_progress (user_id, lesson_id, status, completed_at)
  values (v_user, p_lesson_id, 'completed', now())
  on conflict (user_id, lesson_id) do update
    set status       = 'completed',
        completed_at = coalesce(lesson_progress.completed_at, now())
  returning (xmax = 0) into v_first_time;

  -- Seed spaced repetition for phrases the user has not met before. Existing
  -- rows are left untouched: their counters and next_review_at belong to the
  -- review engine, not to lesson completion.
  insert into phrase_progress (user_id, phrase_id, state, last_seen_at, next_review_at)
  select v_user, lp.phrase_id, 'learning', now(), now() + interval '1 day'
  from lesson_phrases lp
  where lp.lesson_id = p_lesson_id
  on conflict (user_id, phrase_id) do nothing;

  return coalesce(v_first_time, false);
end;
$$;

-- Marks a lesson as started. Separate from completion so that opening a lesson
-- and finishing it are distinguishable in analytics.
create or replace function public.start_lesson(p_lesson_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into lesson_progress (user_id, lesson_id, status)
  values (auth.uid(), p_lesson_id, 'started')
  on conflict (user_id, lesson_id) do nothing;
$$;

grant execute on function public.accessible_lessons() to authenticated;
grant execute on function public.next_lesson() to authenticated;
grant execute on function public.course_progress() to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;
grant execute on function public.start_lesson(uuid) to authenticated;
