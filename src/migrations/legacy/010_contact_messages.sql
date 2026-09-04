-- ── Migration 010: Contact Messages ──────────────────────────────────────────
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,

  read       BOOLEAN NOT NULL DEFAULT false,
  admin_note TEXT
);

CREATE INDEX IF NOT EXISTS contact_messages_read_idx ON contact_messages (read, created_at DESC);
