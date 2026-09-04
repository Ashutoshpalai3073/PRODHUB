-- ── Migration 005: Startup stage advance requests ─────────────────────────────
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS startup_advance_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  startup_id    TEXT NOT NULL,
  startup_name  TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  target_stage  TEXT NOT NULL,
  justification TEXT NOT NULL,
  submitted_by  TEXT REFERENCES users(email) ON DELETE SET NULL,
  proof_url     TEXT,

  -- Admin decision
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note    TEXT,
  reviewed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS advance_requests_status_idx ON startup_advance_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS advance_requests_startup_idx ON startup_advance_requests (startup_id);
