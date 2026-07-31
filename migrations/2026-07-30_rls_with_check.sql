-- ============================================================
-- Migration: close the `with check` gap on every UPDATE policy
-- Date: 2026-07-30
--
-- RUN AS: project owner, in the Supabase SQL editor.
-- Safe to re-run (idempotent). Recommend running inside one transaction.
--
-- WHY:
--   `using` decides which rows a policy lets you touch. `with check` decides
--   what the row is allowed to look like AFTERWARDS. An UPDATE policy with only
--   `using (auth.uid() = user_id)` lets you select your own row and then rewrite
--   user_id to somebody else's — handing your row to another account, or
--   attaching your data to theirs.
--
--   The 2026-07-16 migration fixed exactly this on public.users (to stop
--   self-upgrades of subscription_tier) and explained the mechanism. Every other
--   table still had the original one-sided policy. This applies the same fix
--   across the board.
--
--   Also here: two small consistency fixes noted in the same review — RLS was
--   never enabled on public.badges (the only table without it), and
--   public.notifications had no INSERT policy at all, so nothing could ever
--   write a notification.
-- ============================================================

begin;

-- ── interviews ──────────────────────────────────────────────────────────────
drop policy if exists "Users can update their own interviews" on public.interviews;
create policy "Users can update their own interviews" on public.interviews
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── interview_sessions ──────────────────────────────────────────────────────
drop policy if exists "Users can update their own sessions" on public.interview_sessions;
create policy "Users can update their own sessions" on public.interview_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── github_analysis ─────────────────────────────────────────────────────────
drop policy if exists "Users can update their own github analysis" on public.github_analysis;
create policy "Users can update their own github analysis" on public.github_analysis
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── coding_solutions ────────────────────────────────────────────────────────
drop policy if exists "Users can update their own coding solutions" on public.coding_solutions;
create policy "Users can update their own coding solutions" on public.coding_solutions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── notifications ───────────────────────────────────────────────────────────
drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications" on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The table had SELECT/UPDATE/DELETE but no INSERT policy, so with RLS on,
-- nothing could ever create a notification.
drop policy if exists "Users can insert their own notifications" on public.notifications;
create policy "Users can insert their own notifications" on public.notifications
  for insert
  with check (auth.uid() = user_id);

-- ── badges ──────────────────────────────────────────────────────────────────
-- The only table in the schema with RLS never enabled. The rows are public
-- reference data (name/icon/rarity), so the policy is a deliberate read-to-all
-- rather than an accident of configuration. Writes stay service-role only.
alter table public.badges enable row level security;
drop policy if exists "Badge definitions are readable by everyone" on public.badges;
create policy "Badge definitions are readable by everyone" on public.badges
  for select using (true);

-- ── challenges ──────────────────────────────────────────────────────────────
-- Was `using (true)`, i.e. readable with the public anon key by anyone, signed
-- in or not — including the hidden_tests and expected_outcomes columns.
--
-- HONEST LIMIT: this does not make the tests secret. They are executed in the
-- candidate's browser (see the Web Worker in interview/session/[session_id]),
-- so a signed-in user can always read them from the network response. Hiding
-- them for real requires running submissions server-side; until then, treat
-- coding scores as self-reported. This narrows the exposure from "the entire
-- internet" to "people with an account", which is worth having on its own.
drop policy if exists "Allow read access to challenges" on public.challenges;
create policy "Allow read access to challenges" on public.challenges
  for select using (auth.role() = 'authenticated');

commit;
