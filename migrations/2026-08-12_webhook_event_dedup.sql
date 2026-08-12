-- ============================================================
-- Migration: Webhook delivery de-duplication
-- Date: 2026-08-12
--
-- RUN AS: project owner, in the Supabase SQL editor.
-- Safe to re-run (idempotent).
--
-- WHY:
--   The Dodo webhook verified each delivery's HMAC and then acted on it. A
--   signature does not expire, and nothing recorded which deliveries had
--   already been handled, so the same signed request could be replayed
--   indefinitely. The route now rejects anything outside a five-minute
--   timestamp window and claims the webhook id here; whichever delivery
--   inserts the row first is the one that gets processed.
--
--   This also absorbs the provider's own at-least-once retries, which are
--   ordinary traffic rather than an attack.
--
--   The app still works without this migration — claimWebhookEvent() logs and
--   processes the event anyway when the insert fails — so the code can ship
--   first. Until it is applied, only the timestamp window bounds replays.
-- ============================================================

begin;

create table if not exists public.webhook_events (
  -- The provider's delivery id (the `webhook-id` header), not a payment id:
  -- retries of one event reuse it, which is exactly the property we want.
  id text primary key,
  provider text not null,
  received_at timestamptz not null default now()
);

-- Lets the housekeeping delete below stay cheap once this table is large.
create index if not exists webhook_events_received_at_idx
  on public.webhook_events (received_at);

-- Written only by the service-role client from the webhook route. No end user
-- has any reason to read or write it, so RLS is on with no policies at all.
alter table public.webhook_events enable row level security;

revoke all on table public.webhook_events from public;
revoke all on table public.webhook_events from anon;
revoke all on table public.webhook_events from authenticated;
grant select, insert, delete on table public.webhook_events to service_role;

commit;

-- ------------------------------------------------------------
-- Housekeeping (optional). Rows only need to outlive the provider's retry
-- window; anything older is dead weight. Run periodically, or schedule with
-- pg_cron if it is enabled on the project.
--
--   delete from public.webhook_events where received_at < now() - interval '30 days';
-- ------------------------------------------------------------
