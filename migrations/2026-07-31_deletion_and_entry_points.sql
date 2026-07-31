-- ============================================================
-- Migration: make account deletion complete, and let challenges
--            declare their own entry point
-- Date: 2026-07-31
--
-- RUN AS: project owner, in the Supabase SQL editor.
-- Safe to re-run (idempotent).
-- ============================================================

begin;

-- ── 1. Deletion actually deletes ────────────────────────────────────────────
-- interview_sessions and interview_reports reference auth.users(id) with no
-- ON DELETE action, so removing a profile row left the submitted code, the
-- full agent transcript and the hiring-recommendation report behind. The app
-- now deletes these rows explicitly; this makes the database enforce it too,
-- so a deletion performed any other way (SQL console, Supabase dashboard,
-- future admin tooling) cannot leave orphans.
alter table public.interview_sessions
  drop constraint if exists interview_sessions_user_id_fkey;
alter table public.interview_sessions
  add constraint interview_sessions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.interview_reports
  drop constraint if exists interview_reports_user_id_fkey;
alter table public.interview_reports
  add constraint interview_reports_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- A report is meaningless without its session.
alter table public.interview_reports
  drop constraint if exists interview_reports_session_id_fkey;
alter table public.interview_reports
  add constraint interview_reports_session_id_fkey
  foreign key (session_id) references public.interview_sessions(id) on delete cascade;

-- interview_sessions had no DELETE policy, so a user could never remove their
-- own coding sessions even though they can read and update them.
drop policy if exists "Users can delete their own sessions" on public.interview_sessions;
create policy "Users can delete their own sessions" on public.interview_sessions
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can delete their own reports" on public.interview_reports;
create policy "Users can delete their own reports" on public.interview_reports
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can delete their own interviews" on public.interviews;
create policy "Users can delete their own interviews" on public.interviews
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can delete their own activity" on public.activity_log;
create policy "Users can delete their own activity" on public.activity_log
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can delete their own badges" on public.user_badges;
create policy "Users can delete their own badges" on public.user_badges
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can delete their own behavioral analysis" on public.behavioral_analysis;
create policy "Users can delete their own behavioral analysis" on public.behavioral_analysis
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can delete their own profile" on public.users;
create policy "Users can delete their own profile" on public.users
  for delete using (auth.uid() = id);

-- ── 2. Challenges declare their own entry point ─────────────────────────────
-- The browser test runner mapped challenge TITLES to function names with a
-- hardcoded if-else chain. A Python challenge whose title was not in that list
-- resolved to an empty name and raised a SyntaxError on every test — reported
-- to the candidate as a real 0/N and a "No Hire". Setting entry_point on the
-- row means adding a challenge no longer requires a client release.
--
-- Nullable on purpose: existing rows keep working through the legacy title map,
-- and the runner falls back to the first function the submission defines.
alter table public.challenges
  add column if not exists entry_point text;

comment on column public.challenges.entry_point is
  'Name of the function a submission must define, e.g. two_sum. Null falls back to the client title map, then to the first function defined.';

commit;
