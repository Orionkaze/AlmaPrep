-- ============================================================
-- Migration: Tier system hardening (for the paywall)
-- Date: 2026-07-16
--
-- RUN AS: project owner, in the Supabase SQL editor.
-- The app developer does NOT run this. Review each step first.
-- Safe to re-run (idempotent). Recommend running inside one transaction.
--
-- Before running, eyeball existing values:
--     select distinct subscription_tier from public.users;
--
-- KNOWN BLOCKER (pre-existing, NOT introduced here):
--   database_schema.sql lines 58-60 contain an unterminated CREATE POLICY for
--   feedback INSERT (missing `));`). That file therefore cannot run top to
--   bottom. This migration does NOT depend on it. The two-character fix is to
--   close that policy statement — but confirm what the live DB already has
--   before touching it, since the file has been applied by hand.
-- ============================================================

begin;

-- 1. Normalize existing tier values BEFORE adding the constraint.
--    'premium' was written by demo mode; anything unknown collapses to 'free'.
update public.users set subscription_tier = 'pro'
  where lower(subscription_tier) in ('premium', 'pro');
update public.users set subscription_tier = 'free'
  where subscription_tier is null
     or lower(subscription_tier) not in ('free', 'pro', 'enterprise');

-- 2. Lock the column down.
alter table public.users alter column subscription_tier set default 'free';
alter table public.users alter column subscription_tier set not null;
alter table public.users drop constraint if exists users_subscription_tier_check;
alter table public.users add constraint users_subscription_tier_check
  check (subscription_tier in ('free', 'pro', 'enterprise'));

-- 3. RLS FIX: users must not be able to self-upgrade.
--    The old policy used `using (auth.uid() = id)` with NO `with check`, so a
--    user could set their own subscription_tier to 'enterprise'. This rewrite
--    lets a user update their row but blocks changing subscription_tier away
--    from its current value. Tier changes now require the service-role key
--    (which bypasses RLS) via grantTier().
drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile" on public.users
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and subscription_tier is not distinct from
        (select u.subscription_tier from public.users u where u.id = auth.uid())
  );

-- 4. RLS FIX: users must not be able to reset their own usage counter.
--    The old interview_usage UPDATE/INSERT policies had no `with check`, so a
--    user could `update interview_usage set count = 0`. Writes become
--    service-role only; SELECT stays so the UI can show "2 of 3 used".
drop policy if exists "Users can update their own usage" on public.interview_usage;
drop policy if exists "Users can insert their own usage" on public.interview_usage;

-- 5. Audit trail for tier grants (manual now, Dodo later).
create table if not exists public.tier_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  from_tier text,
  to_tier text not null,
  source text not null default 'manual',   -- 'manual' | 'razorpay'
  note text,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.tier_grants enable row level security;
-- Deny-all by design; service-role only.

commit;

-- ============================================================
-- ORDERING NOTE FOR DEPLOY:
--   SUPABASE_SERVICE_ROLE_KEY must be present in the app's deploy environment
--   BEFORE step 4 takes effect in production, otherwise the quota loses its
--   only write path and (by design) stops enforcing. Ship the app code that
--   tolerates a missing key first, then run this migration.
-- ============================================================
