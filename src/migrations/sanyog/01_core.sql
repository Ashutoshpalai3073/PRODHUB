-- ═══════════════════════════════════════════════════════════════════════════
--  SANYOG · 01 — CORE
--  Identity, departments, solutions, and the solution vault.
--  Run FIRST. Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sanyog is an innovation-procurement pathway: government departments publish
-- outcome-based challenges, recognised startups apply, the best run a governed
-- sandbox pilot, get paid on verified milestones, are independently validated,
-- and then scale without a fresh tender.
--
-- NAMING NOTE — read before renaming anything.
-- Three tables carry names inherited from the previous product:
--     vc_profiles         → actually DEPARTMENT profiles
--     deal_interests      → actually department interest in a solution
--     diligence_requests  → actually access requests for confidential documents
-- They are kept because src/server.ts addresses them by name across ~45 routes.
-- Renaming them buys nothing a reviewer can see and risks every endpoint. The
-- COMMENT ON statements below record what each really means.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ════════════════════════════════════════════════════════════ IDENTITY ═════
CREATE TABLE IF NOT EXISTS users (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  auth_method TEXT        NOT NULL DEFAULT 'otp' CHECK (auth_method IN ('otp','google')),
  google_id   TEXT,
  avatar_url  TEXT,

  -- Sanyog roles:
  --   visitor    → browsing only
  --   startup    → has registered a solution
  --   department → nodal officer, verified, can publish challenges
  --   evaluator  → subject-matter expert on the scoring panel
  --   validator  → independent third party who signs off pilot results
  --   admin      → MSInS / platform operator
  --
  -- LEGACY ALIASES — 'founder' and 'vc' are still WRITTEN by src/server.ts
  -- (`UPDATE users SET role = 'founder'` on first registration) and are still in
  -- the AuthUser type in src/context/AuthContext.tsx. Excluding them here would
  -- make startup registration fail with a constraint violation.
  --   founder    ≡ startup
  --   vc         ≡ department
  --   pending_vc ≡ pending_department
  -- Keep both sets until the code is migrated, then drop the three legacy values
  -- from this CHECK in a follow-up migration.
  role        TEXT        NOT NULL DEFAULT 'visitor'
              CHECK (role IN (
                'visitor','startup','department','pending_department','evaluator','validator','admin',
                'founder','vc','pending_vc'   -- legacy aliases, see note above
              )),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Display names are NOT unique: Google sign-in routinely produces duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

COMMENT ON TABLE  users      IS 'All platform accounts. Role drives which portal and actions are available.';
COMMENT ON COLUMN users.role IS 'visitor | startup | department | pending_department | evaluator | validator | admin';

CREATE TABLE IF NOT EXISTS otps (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT        NOT NULL,
  code       TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otps_email_idx   ON otps(email);
CREATE INDEX IF NOT EXISTS otps_expiry_idx  ON otps(expires_at);
COMMENT ON TABLE otps IS 'Short-lived email sign-in codes. Rows are disposable; prune anything past expires_at.';

-- ═══════════════════════════════════════════════════════ DEPARTMENTS ═══════
-- Table name is legacy (see NAMING NOTE). This is the register of government
-- departments, urban bodies and undertakings that publish challenges.
-- Verified by an admin before it can publish. Holds a password hash — this
-- table must NEVER be readable with the public anon key.
CREATE TABLE IF NOT EXISTS vc_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  email             TEXT NOT NULL UNIQUE REFERENCES users(email) ON DELETE CASCADE,
  firm_name         TEXT NOT NULL,   -- department / urban body name
  partner_name      TEXT NOT NULL,   -- nodal officer
  investment_thesis TEXT,            -- procurement mandate: the problems it buys for
  sectors           TEXT,            -- comma-separated problem domains
  stage_pref        TEXT,            -- comma-separated: Pilot, Scale-up
  check_min         BIGINT,          -- pilot budget floor  (₹)
  check_max         BIGINT,          -- pilot budget ceiling (₹)

  -- Sanyog-native additions
  department_type   TEXT CHECK (department_type IN ('state_department','urban_body','undertaking','district','other')),
  district          TEXT,
  annual_innovation_budget BIGINT,   -- e.g. the 0.5%-of-outlay commitment

  password_hash     TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note        TEXT,
  reviewed_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS vc_profiles_status_idx ON vc_profiles (status, created_at DESC);

COMMENT ON TABLE  vc_profiles                   IS 'DEPARTMENT register (legacy table name). Verified before it may publish challenges.';
COMMENT ON COLUMN vc_profiles.firm_name         IS 'Department / urban body / undertaking name';
COMMENT ON COLUMN vc_profiles.partner_name      IS 'Nodal officer responsible for the challenge';
COMMENT ON COLUMN vc_profiles.investment_thesis IS 'Procurement mandate — the class of problems this department buys solutions for';
COMMENT ON COLUMN vc_profiles.check_min         IS 'Lower bound of pilot budget per challenge, in rupees';
COMMENT ON COLUMN vc_profiles.check_max         IS 'Upper bound of pilot budget per challenge, in rupees';

-- ══════════════════════════════════════════════ SOLUTIONS (startups) ═══════
-- `id` is TEXT because the app mints readable ids ('st-1'), not UUIDs.
--
-- STAGE is the procurement pathway position and is matched by EXACT STRING in
-- both kanban boards. A value outside this list renders no column and the card
-- silently disappears — hence the CHECK constraint, which the old schema lacked.
CREATE TABLE IF NOT EXISTS startups (
  id                  TEXT PRIMARY KEY,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  name                TEXT NOT NULL,
  tagline             TEXT,
  description         TEXT,
  founder             TEXT,
  industry            TEXT,                    -- problem domain: Water, Mobility, Health…

  stage               TEXT NOT NULL DEFAULT 'Applied'
                      CHECK (stage IN ('Applied','Screened','In Pilot','Validated','Scaled')),

  funding_goal        BIGINT  DEFAULT 0,       -- pilot budget sought (₹)
  raised              BIGINT  DEFAULT 0,       -- milestone payments released (₹)
  pitch_score         INTEGER DEFAULT 0 CHECK (pitch_score BETWEEN 0 AND 100),  -- FitScore™
  members             INTEGER DEFAULT 1,

  -- Eligibility. GFR 2017 Rule 173(i) permits relaxing prior turnover and prior
  -- experience for recognised startups "subject to meeting of quality &
  -- technical specifications" — the relaxation is never a quality waiver.
  dpiit_recognition_no TEXT,
  dpiit_verified       BOOLEAN NOT NULL DEFAULT false,
  incorporation_date   DATE,
  turnover_waived      BOOLEAN NOT NULL DEFAULT true,
  experience_waived    BOOLEAN NOT NULL DEFAULT true,

  -- Ownership always comes from the verified JWT, never the request body.
  created_by_email    TEXT REFERENCES users(email) ON DELETE SET NULL,
  owner_email         TEXT,
  owner_password_hash TEXT,

  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
  reviewed_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS startups_status_idx ON startups (status, created_at DESC);
CREATE INDEX IF NOT EXISTS startups_stage_idx  ON startups (stage);
CREATE INDEX IF NOT EXISTS startups_owner_idx  ON startups (owner_email);

COMMENT ON TABLE  startups                  IS 'Startup solutions on the pathway. One row per solution, not per company.';
COMMENT ON COLUMN startups.stage            IS 'Applied → Screened → In Pilot → Validated → Scaled. Matched by exact string in both kanban boards.';
COMMENT ON COLUMN startups.funding_goal     IS 'Pilot budget sought, in rupees. Typically ₹5–25 lakh.';
COMMENT ON COLUMN startups.raised           IS 'Sum of milestone tranches actually released, in rupees.';
COMMENT ON COLUMN startups.pitch_score      IS 'FitScore™ — AI assessment of solution-to-challenge fit, 0–100.';
COMMENT ON COLUMN startups.turnover_waived  IS 'GFR 2017 Rule 173(i) relaxation. Never waives technical or quality criteria.';

-- ════════════════════════════════════════════════════ SOLUTION VAULT ═══════
-- deck_type is relied on by the server and the Evaluation Room:
--   'brand'    → public material, aids discovery
--   'investor' → confidential, released only to departments the startup approves
-- The two literals are load-bearing. Do not rename them.
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'Doc' CHECK (type IN ('Deck','Doc','Sheet','Video','Bundle')),
  status       TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Review','Final')),
  date         TEXT,                     -- display string, e.g. 'Jun 12'
  views        INTEGER NOT NULL DEFAULT 0,
  score        INTEGER NOT NULL DEFAULT 50 CHECK (score BETWEEN 0 AND 100),

  file_url     TEXT,
  file_path    TEXT,                     -- path inside the `pitch-vault` bucket
  startup_name TEXT,

  deck_type    TEXT NOT NULL DEFAULT 'brand' CHECK (deck_type IN ('brand','investor')),

  remark       TEXT,
  read_access  BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS documents_startup_idx ON documents (startup_name, deck_type);
CREATE INDEX IF NOT EXISTS documents_name_idx    ON documents (name);

COMMENT ON TABLE  documents           IS 'Solution Vault. One public and one confidential document per solution.';
COMMENT ON COLUMN documents.deck_type IS 'brand = public · investor = confidential, released only to approved departments';
COMMENT ON COLUMN documents.score     IS 'FitScore™ contribution assessed for this document by the Phase 2 analysis.';

COMMIT;

-- ── VERIFY ──────────────────────────────────────────────────────────────────
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' ORDER BY 1;
--   -- expect: documents, otps, startups, users, vc_profiles
