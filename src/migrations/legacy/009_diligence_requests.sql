-- ── Migration 009: Diligence Document Access Requests ────────────────────────
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS diligence_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  vc_email     TEXT NOT NULL,
  vc_firm      TEXT,
  doc_id       TEXT NOT NULL,
  doc_name     TEXT NOT NULL,
  startup      TEXT NOT NULL,
  reason       TEXT,

  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note   TEXT,
  reviewed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS diligence_req_status_idx ON diligence_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS diligence_req_vc_idx     ON diligence_requests (vc_email);
