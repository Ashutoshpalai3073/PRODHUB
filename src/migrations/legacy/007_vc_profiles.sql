-- ── Migration 007: VC Profiles (mandate + credentials) ──────────────────────
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS vc_profiles (
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
