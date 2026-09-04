-- ── Migration 012: Shortlist Events ──────────────────────────────────────────
-- Run this in your Supabase SQL editor.
-- Append-only notification feed for the admin: every time a VC shortlists a startup
-- in the Scout Hub Deal Flow board — or revokes a shortlist (with a stated reason) —
-- an event is logged here and surfaced in the Explore Hub admin panel.

CREATE TABLE IF NOT EXISTS shortlist_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  vc_email      TEXT NOT NULL,
  vc_firm       TEXT,
  action        TEXT NOT NULL CHECK (action IN ('shortlisted', 'revoked')),
  startup_id    TEXT NOT NULL,
  startup_name  TEXT NOT NULL,
  reason        TEXT                      -- required by the UI for 'revoked'
);

CREATE INDEX IF NOT EXISTS shortlist_events_created_idx ON shortlist_events (created_at DESC);

-- Optional: stream new shortlist events to connected admins in realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shortlist_events;
