-- ── Migration 011: Diligence Room Audit Log ──────────────────────────────────
-- Run this in your Supabase SQL editor.
-- Every investor action in the Scout Hub diligence room (view / request / download
-- of a document) is logged here so the Audit Log panel is backed by live activity.

CREATE TABLE IF NOT EXISTS diligence_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  vc_email    TEXT NOT NULL,
  actor       TEXT,                 -- display name of the acting investor / fund partner
  action      TEXT NOT NULL CHECK (action IN ('Viewed', 'Requested', 'Downloaded')),
  doc_id      TEXT,
  doc_name    TEXT NOT NULL,
  startup     TEXT
);

CREATE INDEX IF NOT EXISTS diligence_audit_vc_idx ON diligence_audit (vc_email, created_at DESC);

-- Optional: stream new audit events to the browser in realtime
ALTER PUBLICATION supabase_realtime ADD TABLE diligence_audit;
