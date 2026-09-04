-- ── Migration 015: Platform Activity Events ──────────────────────────────────
-- Run this in your Supabase SQL editor.
-- Append-only audit feed surfaced at the top of the Explore Hub admin panel.
-- Captures the key marketplace events the admin should see at a glance:
--   • startup_registered  — a founder registered a new startup
--   • startup_approved    — admin approved a registration
--   • startup_rejected    — admin rejected a registration
--   • doc_uploaded        — a founder uploaded a brand (public) or investor (private) deck
--   • startup_removed     — a founder removed their startup (with the stated reason)

CREATE TABLE IF NOT EXISTS activity_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  type         TEXT NOT NULL CHECK (type IN (
                 'startup_registered', 'startup_approved', 'startup_rejected',
                 'doc_uploaded', 'startup_removed'
               )),
  actor_email  TEXT,                 -- who triggered it
  title        TEXT NOT NULL,        -- headline (startup or document name)
  detail       TEXT,                 -- reason / "Public brand deck" / "Private investor deck" …
  meta         JSONB                 -- flexible extras (startup_id, deck_type, doc_type …)
);

CREATE INDEX IF NOT EXISTS activity_events_created_idx ON activity_events (created_at DESC);

-- Optional: stream new activity to connected admins in realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;
