-- ── Migration 008: Deal Interests ────────────────────────────────────────────
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS deal_interests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  vc_email     TEXT NOT NULL,
  vc_firm      TEXT,
  startup_id   TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  note         TEXT,

  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'reviewed', 'passed')),
  admin_note   TEXT,
  reviewed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS deal_interests_status_idx ON deal_interests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS deal_interests_vc_idx    ON deal_interests (vc_email);
