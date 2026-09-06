-- =============================================================================
-- MOVA — 0009: spaced repetition timing fix
--
-- Two bugs found in review, both in the timing logic — the state machine and
-- interval table themselves (next_progress_state, next_review_interval) are
-- unchanged and correct.
--
--   1. due_review_phrases() used `next_review_at <= now() OR state = 'weak'`,
--      which put a WEAK phrase back in front of the user immediately,
--      regardless of its own 4-hour interval. WEAK is now just another state
--      with a due time like any other; it only gets priority ORDERING among
--      phrases that are already due, not an exemption from being due at all.
--
--   2. record_answer() promoted the ladder on every correct answer, with no
--      timing check — three rapid taps on the same phrase reached MASTERED
--      in one sitting. Promotion now requires a genuine review: either this
--      is the phrase's first-ever answer (no row exists yet), or an existing
--      row's next_review_at has actually elapsed. Answering correctly before
--      that time is allowed as practice — it does not error, does not fail —
--      but changes nothing about state or schedule. An incorrect answer is
--      always a real signal, at any time, so it always demotes to WEAK and
--      always restarts that phrase's short clock.
-- =============================================================================

-- --------------------------------------------------------- DUE REVIEW ------
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
    and pp.next_review_at <= now()
  order by (pp.state = 'weak') desc, pp.next_review_at asc
  limit greatest(p_limit, 1);
$$;

-- --------------------------------------------------------- RECORD ANSWER ---
create or replace function public.record_answer(p_phrase_id uuid, p_correct boolean)
returns table (state progress_state, next_review_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing phrase_progress%rowtype;
  v_is_first_exposure boolean;
  v_is_due boolean;
  v_next progress_state;
  v_new_next_review_at timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from phrases p
    where p.id = p_phrase_id
      and p.verification_status = 'approved'
      and (not p.safety_sensitive or p.safety_approved)
      and (p.is_free_preview or public.has_full_access())
  ) then
    raise exception 'phrase not available';
  end if;

  select * into v_existing
  from phrase_progress pp
  where pp.user_id = v_user and pp.phrase_id = p_phrase_id;

  v_is_first_exposure := not found;
  v_is_due := v_is_first_exposure or (v_existing.next_review_at <= now());

  if not p_correct then
    -- A mistake is informative whenever it happens: first exposure, a real
    -- scheduled review, or an early practice replay all land on WEAK with a
    -- fresh 4-hour clock. This is the one case that ignores due-ness on
    -- purpose — the ladder-eligibility gate below exists to stop premature
    -- correct answers from farming mastery, not to soften a wrong answer.
    v_next := 'weak';
    v_new_next_review_at := now() + public.next_review_interval(v_next);

  elsif v_is_first_exposure then
    v_next := public.next_progress_state('new', true);
    v_new_next_review_at := now() + public.next_review_interval(v_next);

  elsif v_is_due then
    -- A genuine scheduled review: the ladder may advance.
    v_next := public.next_progress_state(v_existing.state, true);
    v_new_next_review_at := now() + public.next_review_interval(v_next);

  else
    -- Correct, but early — e.g. replaying a lesson a minute after finishing
    -- it. Treated as practice: recorded, but neither the state nor the
    -- review clock move, so it cannot shortcut spaced repetition.
    v_next := v_existing.state;
    v_new_next_review_at := v_existing.next_review_at;
  end if;

  insert into phrase_progress (
    user_id, phrase_id, state, correct_count, incorrect_count,
    current_streak, last_answer_correct, last_seen_at, next_review_at
  )
  values (
    v_user, p_phrase_id, v_next,
    case when p_correct then 1 else 0 end,
    case when p_correct then 0 else 1 end,
    case when p_correct then 1 else 0 end,
    p_correct, now(), v_new_next_review_at
  )
  on conflict (user_id, phrase_id) do update set
    state               = v_next,
    correct_count       = phrase_progress.correct_count + case when p_correct then 1 else 0 end,
    incorrect_count     = phrase_progress.incorrect_count + case when p_correct then 0 else 1 end,
    current_streak      = case when p_correct then phrase_progress.current_streak + 1 else 0 end,
    last_answer_correct = p_correct,
    last_seen_at        = now(),
    next_review_at      = v_new_next_review_at;

  return query select v_next, v_new_next_review_at;
end;
$$;
