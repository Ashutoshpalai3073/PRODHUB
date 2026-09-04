-- ── Migration 017: FIX activity_events permissions (run this in Supabase) ─────
-- Root cause of the empty admin activity feed: the API's service_role had NO
-- privilege on activity_events, so every insert AND read failed with
-- "permission denied for table activity_events" (Postgres 42501) — silently,
-- because logging is fire-and-forget and the reader swallows errors.
--
-- This migration is idempotent and self-contained: safe to run even if 015/016
-- were already applied. Running ONLY this one is enough to get the feed working.

-- 1. Ensure the table exists (no-op if already created by migration 015).
CREATE TABLE IF NOT EXISTS public.activity_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  type         TEXT NOT NULL,
  actor_email  TEXT,
  title        TEXT NOT NULL,
  detail       TEXT,
  meta         JSONB
);

-- 2. Drop the restrictive CHECK from migration 015 so new event types
--    (doc_removed, and future ones) are accepted.
ALTER TABLE public.activity_events DROP CONSTRAINT IF EXISTS activity_events_type_check;

CREATE INDEX IF NOT EXISTS activity_events_created_idx ON public.activity_events (created_at DESC);

-- 3. THE ACTUAL FIX — grant the server's service_role access to the table.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.activity_events TO service_role;

-- 4. The feed is only reached through the admin-guarded /api/admin/activity
--    endpoint using the service_role key, never the public anon/authenticated
--    keys — so we intentionally do NOT grant those, keeping the audit log private.
--    service_role bypasses RLS, so RLS state is irrelevant here.
