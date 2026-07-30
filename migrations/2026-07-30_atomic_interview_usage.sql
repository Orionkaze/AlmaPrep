-- ============================================================
-- Migration: Atomic interview-quota consumption
-- Date: 2026-07-30
--
-- RUN AS: project owner, in the Supabase SQL editor.
-- Safe to re-run (idempotent).
--
-- WHY:
--   checkInterviewAllowance() used to SELECT the current count, compare it to
--   the limit, then UPSERT count + 1. Two interview starts that overlap both
--   read the same value and both write the same +1, so a user on a 3/month plan
--   can exceed it by starting several at once. Postgres can do the whole thing
--   in one statement; this function is that statement.
--
--   The app still works without this migration — lib/quota.ts falls back to the
--   old read-then-write path and logs — so the code can ship first.
-- ============================================================

begin;

-- The ON CONFLICT below needs this; the previous upsert assumed it existed.
create unique index if not exists interview_usage_user_month_idx
  on public.interview_usage (user_id, month);

-- Returns allowed=false without incrementing when the user is already at the
-- limit. The `where` clause on the conflict target is what makes the check and
-- the increment a single atomic step.
create or replace function public.consume_interview(
  p_user_id uuid,
  p_month text,
  p_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.interview_usage (user_id, month, count)
  values (p_user_id, p_month, 1)
  on conflict (user_id, month) do update
    set count = public.interview_usage.count + 1
    where public.interview_usage.count < p_limit
  returning public.interview_usage.count into v_count;

  if v_count is null then
    -- Conflict fired but the guard rejected the update: already at the limit.
    select iu.count into v_count
      from public.interview_usage iu
     where iu.user_id = p_user_id and iu.month = p_month;
    return query select false, coalesce(v_count, 0);
  else
    return query select true, v_count;
  end if;
end;
$$;

-- Service-role only. It is SECURITY DEFINER, so it must not be reachable by a
-- normal session; the app calls it through the service-role client.
revoke all on function public.consume_interview(uuid, text, integer) from public;
revoke all on function public.consume_interview(uuid, text, integer) from anon;
revoke all on function public.consume_interview(uuid, text, integer) from authenticated;
grant execute on function public.consume_interview(uuid, text, integer) to service_role;

commit;
