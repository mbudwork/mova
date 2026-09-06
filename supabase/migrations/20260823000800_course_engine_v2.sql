-- =============================================================================
-- MOVA — 0008: course engine v1 — real retrieval practice
--
-- Replaces the exposure-only lesson mechanic with a scored exercise that
-- actually records understanding, and replaces the static review_pool
-- concept with dynamic, per-user spaced repetition driven by real answers.
--
-- Root cause this migration fixes: getLesson() previously fetched every
-- lesson_phrases row regardless of role, and complete_lesson() seeded
-- phrase_progress for all of them once, then nothing ever touched those rows
-- again. The database was structurally correct; nothing read it correctly.
-- =============================================================================

-- ---------------------------------------------------------------- SCHEMA ---
alter table phrase_progress
  add column last_answer_correct boolean;

-- ----------------------------------------------------- STATE MACHINE (§5) --
-- A monotonic four-rung ladder: WEAK(0) < LEARNING(1) < UNDERSTOOD(2) <
-- MASTERED(3). A correct answer moves up one rung (capped at MASTERED); a
-- wrong answer drops to the bottom rung from any state. No ease factors, no
-- per-phrase difficulty weighting — deliberately simpler than SM-2, because
-- the product needs one retrieval loop that works, not a tuned algorithm.
create or replace function public.next_progress_state(
  p_current progress_state,
  p_correct boolean
)
returns progress_state
language sql
immutable
as $$
  select case
    when not p_correct then 'weak'::progress_state
    when p_current in ('weak', 'new', 'recognizing') then 'learning'::progress_state
    when p_current = 'learning' then 'understood'::progress_state
    when p_current = 'understood' then 'mastered'::progress_state
    when p_current = 'mastered' then 'mastered'::progress_state
    else 'learning'::progress_state
  end;
$$;

create or replace function public.next_review_interval(p_state progress_state)
returns interval
language sql
immutable
as $$
  select case p_state
    when 'weak'      then interval '4 hours'
    when 'learning'  then interval '1 day'
    when 'understood' then interval '3 days'
    when 'mastered'  then interval '14 days'
    else interval '1 day'
  end;
$$;

-- --------------------------------------------------------- RECORD ANSWER ---
-- The single writer of phrase_progress. Called once per scored exercise —
-- inside a lesson (first exposure) or inside a review session (a later,
-- distinct encounter) — never batch-seeded. Whether a row already exists is
-- exactly what tells LEARNING from a first answer.
create or replace function public.record_answer(p_phrase_id uuid, p_correct boolean)
returns table (state progress_state, next_review_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_current progress_state;
  v_next progress_state;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- The phrase must actually be visible to this user (approved, and either
  -- free-preview or entitled) — the same rule phrases_read already enforces,
  -- checked again here because a function runs once, not per-row through RLS
  -- the way a plain select does.
  if not exists (
    select 1 from phrases p
    where p.id = p_phrase_id
      and p.verification_status = 'approved'
      and (not p.safety_sensitive or p.safety_approved)
      and (p.is_free_preview or public.has_full_access())
  ) then
    raise exception 'phrase not available';
  end if;

  select pp.state into v_current
  from phrase_progress pp
  where pp.user_id = v_user and pp.phrase_id = p_phrase_id;

  v_next := public.next_progress_state(coalesce(v_current, 'new'), p_correct);

  insert into phrase_progress (
    user_id, phrase_id, state, correct_count, incorrect_count,
    current_streak, last_answer_correct, last_seen_at, next_review_at
  )
  values (
    v_user, p_phrase_id, v_next,
    case when p_correct then 1 else 0 end,
    case when p_correct then 0 else 1 end,
    case when p_correct then 1 else 0 end,
    p_correct, now(), now() + public.next_review_interval(v_next)
  )
  on conflict (user_id, phrase_id) do update set
    state              = v_next,
    correct_count      = phrase_progress.correct_count + case when p_correct then 1 else 0 end,
    incorrect_count    = phrase_progress.incorrect_count + case when p_correct then 0 else 1 end,
    current_streak     = case when p_correct then phrase_progress.current_streak + 1 else 0 end,
    last_answer_correct = p_correct,
    last_seen_at       = now(),
    next_review_at     = now() + public.next_review_interval(v_next);

  return query select v_next, (now() + public.next_review_interval(v_next));
end;
$$;

grant execute on function public.record_answer(uuid, boolean) to authenticated;

-- ------------------------------------------------------- DYNAMIC REVIEW ----
-- Due-by-time, backfilled with WEAK phrases regardless of timing so a weak
-- item does not wait out its own cooldown before the user sees it again.
-- Ordering: weak first, then oldest-overdue first. Capped by the caller.
create or replace function public.due_review_phrases(p_limit integer default 10)
returns table (phrase_id uuid, state progress_state, next_review_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select pp.phrase_id, pp.state, pp.next_review_at
  from phrase_progress pp
  where pp.user_id = auth.uid()
    and (pp.next_review_at <= now() or pp.state = 'weak')
  order by (pp.state = 'weak') desc, pp.next_review_at asc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.due_review_phrases(integer) to authenticated;

-- ---------------------------------------------------- LESSON COMPLETION ----
-- No longer touches phrase_progress at all: each phrase's progress is now
-- recorded the moment it is answered, inside the lesson, via record_answer().
-- Seeding progress in bulk at the end (the old behaviour) recorded a phrase
-- as "learning" even if the user never actually saw or answered it — this
-- version cannot, because there is nothing left here to seed.
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

  return coalesce(v_first_time, false);
end;
$$;

-- ------------------------------------------------------- COURSE PROGRESS ---
-- phrases_total now counts distinct PRIMARY phrases only — the real taught
-- content — not every lesson_phrases row regardless of role. This is the
-- same 164-phrase figure verified against production data before this
-- migration was written, not a number invented for the migration.
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
       join public.accessible_lessons() a on a.lesson_id = lpx.lesson_id
      where lpx.role = 'primary'),
    (select count(*)::integer
       from phrase_progress pp
      where pp.user_id = auth.uid()
        and pp.state in ('understood', 'mastered'));
$$;
