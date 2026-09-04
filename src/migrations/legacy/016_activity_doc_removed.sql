-- ── Migration 016: allow new activity types (e.g. doc_removed) ───────────────
-- Run this in your Supabase SQL editor.
-- Migration 015 pinned activity_events.type to a fixed CHECK list. We now log
-- 'doc_removed' too (and want to add future event types without a schema change),
-- so drop the restrictive constraint. The app tolerates unknown types gracefully.

ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_type_check;
