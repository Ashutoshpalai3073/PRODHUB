-- ═══════════════════════════════════════════════════════════════════════════
--  SANYOG · 03 — PLATFORM SUPPORT
--  Events, access control, audit trail and the admin activity feed.
--  Run AFTER 02_pathway.sql. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- These tables are what make a department's decision DEFENSIBLE. The single
-- biggest blocker to a government officer choosing a two-year-old company is
-- not the rules — GFR 2017 Rule 173(i) already permits it — it is the fear of
-- an audit query three years later. Everything here exists so that when that
-- query comes, the answer is a record rather than a memory.
--
-- NAMING NOTE — legacy names kept for src/server.ts compatibility:
--   deal_interests     → a department registering interest in a solution
--   diligence_requests → a department requesting access to a confidential doc
--   diligence_audit    → who opened which document, and when
--   shortlist_events   → shortlist added / revoked, with a stated reason

BEGIN;

-- ═══════════════════════════════════════════════════════════════ EVENTS ════
CREATE TABLE IF NOT EXISTS events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  title                 TEXT NOT NULL,
  type                  TEXT NOT NULL
                        CHECK (type IN ('Pitching','Workshop','Mentorship','Hackathon','Networking','Demo Day','Panel Discussion','Other')),
  event_date            DATE NOT NULL,
  event_time            TEXT NOT NULL,                 -- 'HH:MM' IST
  location_mode         TEXT NOT NULL DEFAULT 'physical'
                        CHECK (location_mode IN ('physical','online','virtual')),
  location              TEXT NOT NULL,                 -- venue or meeting link
  description           TEXT NOT NULL,
  max_capacity          INTEGER CHECK (max_capacity IS NULL OR max_capacity > 0),
  prize                 TEXT,
  application_required  BOOLEAN NOT NULL DEFAULT false,
  registration_deadline DATE,

  organiser_name        TEXT NOT NULL,
  organiser_email       TEXT NOT NULL,
  organiser_org         TEXT NOT NULL,
  submitted_by          TEXT REFERENCES users(email) ON DELETE SET NULL,

  -- Community submissions are reviewed before appearing publicly.
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected')),
  admin_note            TEXT,

  CONSTRAINT event_deadline_before_date
    CHECK (registration_deadline IS NULL OR registration_deadline <= event_date)
);
CREATE INDEX IF NOT EXISTS events_status_date_idx ON events (status, event_date);

COMMENT ON TABLE events IS 'Demo days, challenge briefings, sandbox-readiness workshops. Moderated before publication.';

CREATE TABLE IF NOT EXISTS event_rsvps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  event_id       TEXT NOT NULL,          -- TEXT: seeded events use string ids
  event_title    TEXT,
  event_date     TEXT,

  attendee_name  TEXT NOT NULL,
  attendee_firm  TEXT,
  attendee_role  TEXT,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  note           TEXT,

  -- DELIBERATELY UNCONSTRAINED. handleEventRsvp passes `source` through from the
  -- request body unchecked AND swallows insert errors ("still return success so
  -- UI doesn't break"). A CHECK here would turn an unexpected value into a
  -- silently discarded RSVP — the worst possible failure mode. Expected values
  -- are 'startup_hub', 'department_hub', 'unknown'.
  source         TEXT DEFAULT 'unknown',

  -- One RSVP per person per event. A repeat RSVP now no-ops instead of creating
  -- a duplicate row; the handler's error-swallowing makes that idempotent.
  UNIQUE (event_id, attendee_email)
);
CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON event_rsvps (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS event_rsvps_email_idx ON event_rsvps (attendee_email);

COMMENT ON TABLE event_rsvps IS 'Event registrations. Unique per person per event — the old schema allowed duplicates.';

-- ══════════════════════════════════════════════ STAGE ADVANCE REQUESTS ═════
-- A startup cannot move itself along the pathway. Advancing from, say, In Pilot
-- to Validated requires review — otherwise the stage means nothing.
CREATE TABLE IF NOT EXISTS startup_advance_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  startup_id    TEXT NOT NULL,
  startup_name  TEXT NOT NULL,
  current_stage TEXT NOT NULL CHECK (current_stage IN ('Applied','Screened','In Pilot','Validated','Scaled')),
  target_stage  TEXT NOT NULL CHECK (target_stage  IN ('Applied','Screened','In Pilot','Validated','Scaled')),
  justification TEXT NOT NULL,
  submitted_by  TEXT REFERENCES users(email) ON DELETE SET NULL,
  proof_url     TEXT,

  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note    TEXT,
  reviewed_at   TIMESTAMPTZ,

  CONSTRAINT advance_must_change_stage CHECK (target_stage <> current_stage)
);
CREATE INDEX IF NOT EXISTS advance_requests_status_idx  ON startup_advance_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS advance_requests_startup_idx ON startup_advance_requests (startup_id);

COMMENT ON TABLE startup_advance_requests IS 'Requests to move along the pathway. Reviewed — a stage nobody checks is decoration.';

-- ═══════════════════════════════════════ DEPARTMENT INTEREST & ACCESS ══════
CREATE TABLE IF NOT EXISTS deal_interests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  vc_email     TEXT NOT NULL,          -- department officer's email
  vc_firm      TEXT,                   -- department name
  startup_id   TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  note         TEXT,

  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','passed')),
  admin_note   TEXT,
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS deal_interests_status_idx ON deal_interests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS deal_interests_vc_idx     ON deal_interests (vc_email);

COMMENT ON TABLE deal_interests IS 'A department registering interest in a solution (legacy table name).';

-- Confidential documents are released only to departments the startup approves.
-- The startup decides; the platform records the decision.
CREATE TABLE IF NOT EXISTS diligence_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  vc_email    TEXT NOT NULL,
  vc_firm     TEXT,
  doc_id      TEXT NOT NULL,
  doc_name    TEXT NOT NULL,
  startup     TEXT NOT NULL,
  reason      TEXT,

  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note  TEXT,
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS diligence_req_status_idx ON diligence_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS diligence_req_vc_idx     ON diligence_requests (vc_email);

COMMENT ON TABLE diligence_requests IS 'Access requests for a confidential submission. The startup approves or declines.';

-- ═══════════════════════════════════════════════════════ AUDIT TRAIL ═══════
-- Append-only. Nothing in the application updates or deletes these rows.
CREATE TABLE IF NOT EXISTS diligence_audit (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  vc_email   TEXT NOT NULL,
  actor      TEXT,
  action     TEXT NOT NULL CHECK (action IN ('Viewed','Requested','Downloaded')),
  doc_id     TEXT,
  doc_name   TEXT NOT NULL,
  startup    TEXT
);
CREATE INDEX IF NOT EXISTS diligence_audit_vc_idx  ON diligence_audit (vc_email, created_at DESC);
CREATE INDEX IF NOT EXISTS diligence_audit_doc_idx ON diligence_audit (doc_id, created_at DESC);

COMMENT ON TABLE diligence_audit IS 'Append-only record of who opened which confidential document, and when.';

CREATE TABLE IF NOT EXISTS shortlist_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  vc_email     TEXT NOT NULL,
  vc_firm      TEXT,
  action       TEXT NOT NULL CHECK (action IN ('shortlisted','revoked')),
  startup_id   TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  reason       TEXT,

  -- A revocation without a reason is exactly the arbitrariness this platform
  -- exists to remove, so the database refuses it.
  CONSTRAINT revoke_requires_reason
    CHECK (action <> 'revoked' OR (reason IS NOT NULL AND length(btrim(reason)) > 0))
);
CREATE INDEX IF NOT EXISTS shortlist_events_created_idx ON shortlist_events (created_at DESC);

COMMENT ON TABLE shortlist_events IS 'Shortlist added / revoked. Revocations must carry a stated reason.';
COMMENT ON CONSTRAINT revoke_requires_reason ON shortlist_events IS 'Enforced in the database so it cannot be bypassed by a client that forgets to ask.';

-- ══════════════════════════════════════════════════════ ACTIVITY FEED ══════
-- Deliberately NO check constraint on `type`: new event kinds get added often
-- and a rigid list previously caused silent insert failures. Unknown types are
-- rendered generically by the UI.
CREATE TABLE IF NOT EXISTS activity_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  type        TEXT NOT NULL,   -- challenge_published, application_submitted,
                               -- eligibility_cleared, panel_scored, sandbox_opened,
                               -- milestone_released, kpi_validated, scaled_up …
  actor_email TEXT,
  title       TEXT NOT NULL,
  detail      TEXT,
  meta        JSONB
);
CREATE INDEX IF NOT EXISTS activity_events_created_idx ON activity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_type_idx    ON activity_events (type, created_at DESC);

COMMENT ON TABLE  activity_events      IS 'Append-only platform activity feed shown in the admin panel.';
COMMENT ON COLUMN activity_events.type IS 'Intentionally unconstrained — a rigid CHECK caused silent insert failures before.';

-- ══════════════════════════════════════════════════════════════ CONTACT ════
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

COMMENT ON TABLE contact_messages IS 'Enquiries from the public contact form.';

COMMIT;

-- ── VERIFY ──────────────────────────────────────────────────────────────────
--   SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
--   -- expect 20 tables after 01 + 02 + 03
