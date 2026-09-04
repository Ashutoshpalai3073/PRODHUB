-- ── Migration 006: Event RSVPs table ──────────────────────────────────────────
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS event_rsvps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  event_id         TEXT NOT NULL,
  event_title      TEXT,
  event_date       TEXT,

  -- Registrant details
  attendee_name    TEXT NOT NULL,
  attendee_firm    TEXT,
  attendee_role    TEXT,
  attendee_email   TEXT NOT NULL,
  attendee_phone   TEXT,
  note             TEXT,

  -- Source: 'scout_hub' | 'explore_hub'
  source           TEXT DEFAULT 'unknown'
);

CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON event_rsvps (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS event_rsvps_email_idx ON event_rsvps (attendee_email);
