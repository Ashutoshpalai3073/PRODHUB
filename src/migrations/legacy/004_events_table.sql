-- ── Migration 004: Events table ───────────────────────────────────────────
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Core event info
  title                TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('Pitching','Workshop','Mentorship','Hackathon','Networking','Demo Day','Panel Discussion','Other')),
  event_date           DATE NOT NULL,
  event_time           TEXT NOT NULL,           -- stored as HH:MM string (IST)
  location_mode        TEXT NOT NULL DEFAULT 'physical' CHECK (location_mode IN ('physical','online','virtual')),
  location             TEXT NOT NULL,           -- venue address OR meeting link
  description          TEXT NOT NULL,
  max_capacity         INTEGER,
  prize                TEXT,
  application_required BOOLEAN NOT NULL DEFAULT FALSE,
  registration_deadline DATE,

  -- Organiser info
  organiser_name       TEXT NOT NULL,
  organiser_email      TEXT NOT NULL,
  organiser_org        TEXT NOT NULL,
  submitted_by         TEXT REFERENCES users(email) ON DELETE SET NULL,

  -- Admin moderation
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note           TEXT
);

-- Index for quick approved-events lookup
CREATE INDEX IF NOT EXISTS events_status_date_idx ON events (status, event_date);
