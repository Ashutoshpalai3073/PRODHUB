-- ── Migration 013: Fix vc_profiles schema ────────────────────────────────────
-- Run this in your Supabase SQL editor.
--
-- The live `vc_profiles` table predates the VC mandate feature and uses an
-- incompatible LEGACY schema:
--     id, created_at, name, firm, aum, sectors, stage_pref, check_min, check_max
-- It is MISSING every column the app actually writes (email, firm_name,
-- partner_name, investment_thesis, password_hash, status, updated_at,
-- admin_note, reviewed_at). Because the table already existed, migration 007's
-- `CREATE TABLE IF NOT EXISTS` was silently skipped — so POST /api/vc/mandate
-- fails (PostgREST 42703 "column ... does not exist"), surfacing in the UI as a
-- failed request.
--
-- Those legacy rows are unreadable by the current code anyway (handleVCList /
-- handleVCAdminPending filter on firm_name + status, which don't exist on the
-- old table), so we rebuild the table to match the schema in migration 007.
-- If you have legacy rows you need to keep, back them up before running this.

DROP TABLE IF EXISTS vc_profiles CASCADE;

CREATE TABLE vc_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  email            TEXT NOT NULL UNIQUE REFERENCES users(email) ON DELETE CASCADE,
  firm_name        TEXT NOT NULL,
  partner_name     TEXT NOT NULL,
  investment_thesis TEXT,
  sectors          TEXT,          -- comma-separated e.g. "SaaS,FinTech"
  stage_pref       TEXT,          -- comma-separated e.g. "Seed,Series A"
  check_min        BIGINT,
  check_max        BIGINT,

  password_hash    TEXT,

  -- Admin verification status
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note       TEXT,
  reviewed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS vc_profiles_status_idx ON vc_profiles (status, created_at DESC);

-- The app reaches this table exclusively through the server using the Supabase
-- SERVICE ROLE key (see getVCAdmin() in src/server.ts). A table rebuilt via the
-- SQL editor does not always inherit the service_role grant, which surfaces as
-- "permission denied for table vc_profiles". Grant it explicitly.
--
-- NOTE: intentionally NOT granting `anon` — this table stores password_hash and
-- must never be readable with the public anon key.
GRANT ALL ON TABLE public.vc_profiles TO service_role;
