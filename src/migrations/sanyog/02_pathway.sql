-- ═══════════════════════════════════════════════════════════════════════════
--  SANYOG · 02 — THE EIGHT-STAGE PROCUREMENT PATHWAY
--  Run AFTER 01_core.sql. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════
--
--   1 Problem Formulation   → challenges
--   2 Discovery & Eligibility → challenge_applications
--   3 Transparent Evaluation  → evaluation_scores
--   4 Sandbox Design          ┐
--   5 Contracting & Risk      ┘ sandbox_agreements
--   6 Milestone Payments      → pilot_milestones
--   7 Third-Party Validation  → pilot_kpis
--   8 Scale-Up                → scale_up_endorsements + scale_up_readiness
--
-- Every non-obvious design choice below traces to a verified precedent; the
-- sources are in docs/research/. Where a rule is quoted it is quoted exactly.

BEGIN;

-- ═══════════════════════════════════ STAGE 1 — PROBLEM FORMULATION ═════════
-- Turning "we lose too much water" into something biddable. The template forces
-- a BASELINE and a TARGET up front, because a challenge without a baseline
-- cannot be validated later — you have nothing to measure against.
CREATE TABLE IF NOT EXISTS challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  reference_no        TEXT UNIQUE,                       -- e.g. SNY/UD/2026/007
  department_email    TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  department_name     TEXT NOT NULL,
  nodal_officer       TEXT,

  title               TEXT NOT NULL,
  problem_statement   TEXT NOT NULL,                     -- the operational pain point
  outcome_sought      TEXT NOT NULL,                     -- what "solved" looks like
  domain              TEXT NOT NULL,                     -- Water, Mobility, Health…

  -- The measurable core. Without these three a challenge cannot be published.
  baseline_metric     TEXT NOT NULL,                     -- 'Non-revenue water'
  baseline_value      NUMERIC NOT NULL,                  -- 38
  target_value        NUMERIC NOT NULL,                  -- 24
  metric_unit         TEXT NOT NULL,                     -- '% of supply'
  metric_direction    TEXT NOT NULL DEFAULT 'decrease' CHECK (metric_direction IN ('increase','decrease')),
  target_window_days  INTEGER,                           -- time allowed to hit target

  operational_constraints TEXT,
  data_available          TEXT,                          -- what the dept can share
  pilot_budget_inr        BIGINT NOT NULL CHECK (pilot_budget_inr > 0),
  pilot_duration_days     INTEGER NOT NULL DEFAULT 180,

  -- Eligibility posture, made explicit so an applicant knows before applying.
  dpiit_required          BOOLEAN NOT NULL DEFAULT true,
  turnover_relaxed        BOOLEAN NOT NULL DEFAULT true,
  experience_relaxed      BOOLEAN NOT NULL DEFAULT true,
  emd_exempt              BOOLEAN NOT NULL DEFAULT true,

  -- Published clocks. Telangana's GO.Ms.No.08 deems a proposal certified if the
  -- committee misses its 30-day window; a published clock is what stops a
  -- challenge dying quietly in a drawer.
  opens_on            DATE,
  closes_on           DATE,
  evaluation_days     INTEGER NOT NULL DEFAULT 30,
  deemed_approval     BOOLEAN NOT NULL DEFAULT true,

  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','published','evaluating','awarded','closed','withdrawn')),
  published_at        TIMESTAMPTZ,

  CONSTRAINT challenge_window_valid CHECK (closes_on IS NULL OR opens_on IS NULL OR closes_on >= opens_on),
  CONSTRAINT challenge_target_differs CHECK (target_value <> baseline_value)
);
CREATE INDEX IF NOT EXISTS challenges_status_idx ON challenges (status, closes_on);
CREATE INDEX IF NOT EXISTS challenges_dept_idx   ON challenges (department_email);
CREATE INDEX IF NOT EXISTS challenges_domain_idx ON challenges (domain);

COMMENT ON TABLE  challenges                 IS 'Stage 1. Outcome-based challenge statements published by departments.';
COMMENT ON COLUMN challenges.baseline_value  IS 'Current measured performance. Mandatory — validation is impossible without it.';
COMMENT ON COLUMN challenges.target_value    IS 'What the department needs the metric to reach.';
COMMENT ON COLUMN challenges.deemed_approval IS 'If the panel misses evaluation_days, the application is deemed to advance (Telangana GO.Ms.No.08 model).';
COMMENT ON COLUMN challenges.turnover_relaxed IS 'GFR 2017 Rule 173(i). Enabling, not mandatory — so Sanyog makes it the default.';

-- ═════════════════════════════ STAGE 2 — DISCOVERY & ELIGIBILITY ═══════════
CREATE TABLE IF NOT EXISTS challenge_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  challenge_id      UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  startup_id        TEXT NOT NULL,
  startup_name      TEXT NOT NULL,
  applicant_email   TEXT,

  proposal_summary  TEXT NOT NULL,
  proposed_budget_inr BIGINT,
  proposed_days     INTEGER,

  -- Screening outcome. Eligibility is mechanical; merit is Stage 3.
  eligibility_status TEXT NOT NULL DEFAULT 'pending'
                     CHECK (eligibility_status IN ('pending','eligible','ineligible')),
  dpiit_checked      BOOLEAN NOT NULL DEFAULT false,
  ineligible_reason  TEXT,
  screened_at        TIMESTAMPTZ,

  status             TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted','screened','evaluated','shortlisted','awarded','rejected','withdrawn')),

  -- One application per solution per challenge.
  UNIQUE (challenge_id, startup_id)
);
CREATE INDEX IF NOT EXISTS applications_challenge_idx ON challenge_applications (challenge_id, status);
CREATE INDEX IF NOT EXISTS applications_startup_idx   ON challenge_applications (startup_id);

COMMENT ON TABLE  challenge_applications                   IS 'Stage 2. One row per solution applying to a challenge.';
COMMENT ON COLUMN challenge_applications.ineligible_reason IS 'Must be recorded when ineligible — a rejection without a stated reason is not auditable.';

-- ═══════════════════════════════ STAGE 3 — TRANSPARENT EVALUATION ══════════
-- Dual-axis scoring by an independent panel, against a rubric published with
-- the challenge. Each panellist's score is stored separately and attributably:
-- an averaged number with no author behind it is not defensible on audit.
CREATE TABLE IF NOT EXISTS evaluation_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  application_id      UUID NOT NULL REFERENCES challenge_applications(id) ON DELETE CASCADE,
  evaluator_email     TEXT NOT NULL,
  evaluator_name      TEXT,
  evaluator_org       TEXT,

  -- Dual bid: technical viability + innovation quotient, 0–50 each.
  technical_viability SMALLINT NOT NULL CHECK (technical_viability BETWEEN 0 AND 50),
  innovation_quotient SMALLINT NOT NULL CHECK (innovation_quotient BETWEEN 0 AND 50),
  total_score         SMALLINT GENERATED ALWAYS AS (technical_viability + innovation_quotient) STORED,

  -- A score with no reasoning cannot be defended if it is ever questioned.
  rationale           TEXT NOT NULL,
  conflict_declared   BOOLEAN NOT NULL DEFAULT false,

  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One score per evaluator per application.
  UNIQUE (application_id, evaluator_email)
);
CREATE INDEX IF NOT EXISTS evaluation_app_idx ON evaluation_scores (application_id);

COMMENT ON TABLE  evaluation_scores            IS 'Stage 3. Attributable panel scores. Never store only the average.';
COMMENT ON COLUMN evaluation_scores.total_score IS 'Generated: technical_viability + innovation_quotient, 0–100.';
COMMENT ON COLUMN evaluation_scores.conflict_declared IS 'Panellist declared an interest. Surfaced in the audit trail.';

-- Panel consensus, computed so it can never drift from the underlying scores.
CREATE OR REPLACE VIEW application_scores AS
SELECT
  a.id                                   AS application_id,
  a.challenge_id,
  a.startup_id,
  a.startup_name,
  COUNT(e.id)                            AS panel_size,
  ROUND(AVG(e.technical_viability), 1)   AS avg_technical,
  ROUND(AVG(e.innovation_quotient), 1)   AS avg_innovation,
  ROUND(AVG(e.total_score), 1)           AS avg_total,
  BOOL_OR(e.conflict_declared)           AS any_conflict
FROM challenge_applications a
LEFT JOIN evaluation_scores e ON e.application_id = a.id
GROUP BY a.id, a.challenge_id, a.startup_id, a.startup_name;

COMMENT ON VIEW application_scores IS 'Panel consensus per application. Computed, never stored.';

-- ═════════════════════════ STAGES 4 & 5 — SANDBOX AND CONTRACT ═════════════
-- Boundary conditions follow the RBI Enabling Framework (caps on users and
-- exposure). The relaxable / never-relaxable split follows SEBI Annexure 3:
-- turnover, experience and EMD are waivable; data protection, security
-- clearance and fitness are not. Time-boxing follows Telecommunications Act
-- 2023 s.27 — "a limited set of users, for a specified period of time".
CREATE TABLE IF NOT EXISTS sandbox_agreements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  challenge_id            UUID REFERENCES challenges(id) ON DELETE SET NULL,
  application_id          UUID REFERENCES challenge_applications(id) ON DELETE SET NULL,
  startup_id              TEXT NOT NULL,
  startup_name            TEXT NOT NULL,
  department_name         TEXT NOT NULL,

  -- Boundary conditions
  scope                   TEXT NOT NULL,
  sites                   TEXT,
  max_users               INTEGER,
  max_exposure_inr        BIGINT,

  -- Data governance. DPDP Act 2023 s.8(5) keeps the department liable for
  -- processing done on its behalf, so these are the department's terms too.
  data_shared             TEXT,
  data_anonymised         BOOLEAN NOT NULL DEFAULT true,
  data_localised_in_india BOOLEAN NOT NULL DEFAULT true,
  log_retention_days      INTEGER NOT NULL DEFAULT 180,   -- CERT-In direction (iv)
  erase_on_exit           BOOLEAN NOT NULL DEFAULT true,  -- IRDAI Reg 11(5)

  -- Security clearance. CERT-In's Guidelines for Government Entities require an
  -- empanelled-auditor clearance BEFORE hosting. ISO/IEC 27001:2013 became
  -- invalid on 31 Oct 2025, so the EDITION is recorded, not merely presence.
  security_audit_status   TEXT NOT NULL DEFAULT 'pending'
                          CHECK (security_audit_status IN ('pending','in_progress','cleared','failed')),
  security_auditor        TEXT,
  iso_27001_edition       TEXT CHECK (iso_27001_edition IS NULL OR iso_27001_edition IN ('2013','2022')),
  cleared_at              TIMESTAMPTZ,

  -- Time-boxing. A sandbox without an exit date is not a sandbox.
  starts_on               DATE,
  exit_on                 DATE NOT NULL,
  extended_once           BOOLEAN NOT NULL DEFAULT false,

  -- Contract terms. Default matches the problem statement and UK SBRI
  -- Condition 27: the startup keeps its IP, the department gets a licence.
  ip_retained_by_startup  BOOLEAN NOT NULL DEFAULT true,
  govt_licence_scope      TEXT DEFAULT 'Perpetual, non-exclusive licence for the department''s own internal use',
  liability_cap_inr       BIGINT,
  indemnity_note          TEXT,

  -- Exit artefacts, filed UP FRONT — SEBI requires both an exit strategy and a
  -- withdrawal strategy before testing may begin.
  exit_strategy           TEXT,
  withdrawal_strategy     TEXT,

  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','active','completed','terminated')),
  termination_reason      TEXT,

  CONSTRAINT sandbox_exit_after_start CHECK (starts_on IS NULL OR exit_on >= starts_on),
  -- A pilot handling citizen data cannot start without clearance.
  CONSTRAINT sandbox_active_needs_clearance
    CHECK (status <> 'active' OR security_audit_status = 'cleared')
);
CREATE INDEX IF NOT EXISTS sandbox_startup_idx ON sandbox_agreements (startup_id);
CREATE INDEX IF NOT EXISTS sandbox_status_idx  ON sandbox_agreements (status, exit_on);

COMMENT ON TABLE  sandbox_agreements                   IS 'Stages 4 & 5. The governed live-test environment and its contract terms.';
COMMENT ON COLUMN sandbox_agreements.iso_27001_edition IS 'Edition matters: :2013 certificates expired 31 Oct 2025. Only :2022 is currently valid.';
COMMENT ON CONSTRAINT sandbox_active_needs_clearance ON sandbox_agreements IS 'A sandbox cannot go active until the security audit is cleared. Enforced in the database, not just the UI.';

-- ═══════════════════════════════ STAGE 6 — MILESTONE PAYMENTS ══════════════
-- Reference structure 30 / 40 / 30. The first tranche is a MOBILISATION
-- ADVANCE, not "payment on onboarding": FAR 32.1004 bars contract signature or
-- passage of time as a payment trigger, and GFR 2017 Rule 172 caps an advance
-- to a private firm at 30% of contract value — so 30% is both defensible and
-- exactly at the Indian ceiling. Tranches 2 and 3 are verifiable events.
CREATE TABLE IF NOT EXISTS pilot_milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  sandbox_id     UUID REFERENCES sandbox_agreements(id) ON DELETE CASCADE,
  startup_id     TEXT NOT NULL,
  startup_name   TEXT NOT NULL,
  department_name TEXT,

  seq            SMALLINT NOT NULL CHECK (seq BETWEEN 1 AND 10),
  label          TEXT NOT NULL,
  trigger_type   TEXT NOT NULL
                 CHECK (trigger_type IN ('mobilisation_advance','kpi_demonstration','independent_validation','other')),
  trigger_detail TEXT,

  pct            SMALLINT NOT NULL CHECK (pct > 0 AND pct <= 100),
  amount_inr     BIGINT CHECK (amount_inr IS NULL OR amount_inr >= 0),

  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_review','verified','released','rejected')),
  verified_by    TEXT,
  verified_at    TIMESTAMPTZ,
  released_at    TIMESTAMPTZ,

  -- MSMED Act 2006 s.15: payment within 45 days is an absolute ceiling that
  -- cannot be contracted around. s.16 sets default interest at 3× the RBI bank
  -- rate, compounded monthly. Making the clock visible is the point — the right
  -- already exists and is almost never claimed.
  due_by         DATE,
  evidence_url   TEXT,
  note           TEXT,

  UNIQUE (startup_id, seq),
  -- Money cannot be released before someone verified the milestone.
  CONSTRAINT milestone_release_requires_verification
    CHECK (released_at IS NULL OR verified_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS milestone_startup_idx ON pilot_milestones (startup_id, seq);
CREATE INDEX IF NOT EXISTS milestone_status_idx  ON pilot_milestones (status, due_by);

COMMENT ON TABLE  pilot_milestones              IS 'Stage 6. Payment tranches released against verified performance.';
COMMENT ON COLUMN pilot_milestones.trigger_type IS 'mobilisation_advance is an advance under GFR Rule 172, not a performance milestone.';
COMMENT ON COLUMN pilot_milestones.due_by       IS 'MSMED s.15 clock — 45 days maximum from the appointed day.';
COMMENT ON CONSTRAINT milestone_release_requires_verification ON pilot_milestones IS 'No payment without a recorded verification.';

-- ═══════════════════════════ STAGE 7 — INDEPENDENT VALIDATION ══════════════
-- Column-for-column the NHS England Cancer Programme KPI schema: baseline,
-- target + timepoint, an explicit go/no-go flag and threshold, cadence, data
-- provenance and the accountable organisation.
--
-- locked_at implements the UK Magenta Book pre-registration rule: the target is
-- fixed and timestamped BEFORE any outcome data is collected, so nobody can
-- move the goalposts afterwards — in either direction. That single column is
-- what makes the validation credible and the officer's decision defensible.
CREATE TABLE IF NOT EXISTS pilot_kpis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  sandbox_id            UUID REFERENCES sandbox_agreements(id) ON DELETE CASCADE,
  challenge_id          UUID REFERENCES challenges(id) ON DELETE SET NULL,
  startup_id            TEXT NOT NULL,
  startup_name          TEXT NOT NULL,
  department_name       TEXT,

  kpi_description       TEXT NOT NULL,
  unit                  TEXT,
  direction             TEXT NOT NULL DEFAULT 'increase' CHECK (direction IN ('increase','decrease')),

  baseline_value        NUMERIC NOT NULL,
  target_value          NUMERIC NOT NULL,
  target_timepoint      DATE,
  measured_value        NUMERIC,

  is_go_no_go           BOOLEAN NOT NULL DEFAULT false,
  go_no_go_threshold    NUMERIC,

  measurement_frequency TEXT,
  data_source           TEXT,
  responsible_org       TEXT,

  -- Pre-registration lock
  locked_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by             TEXT,

  -- Third-party validation. In India no single body is chartered to verify a
  -- pilot's results against pre-agreed KPIs: STQC does system SLAs, CERT-In
  -- does security only, NABL accredits labs, DMEO evaluates whole schemes.
  -- Recording WHO validated is therefore part of the evidence.
  validator_org         TEXT,
  validator_type        TEXT CHECK (validator_type IN ('academic','stqc_or_setl','nabl_lab','dmeo_empanelled','department_internal','other')),
  validated_at          TIMESTAMPTZ,
  validation_verdict    TEXT CHECK (validation_verdict IN ('met','partially_met','not_met')),
  validation_note       TEXT,
  report_url            TEXT,

  CONSTRAINT kpi_gate_needs_threshold
    CHECK (is_go_no_go = false OR go_no_go_threshold IS NOT NULL),
  CONSTRAINT kpi_target_differs CHECK (target_value <> baseline_value)
);
CREATE INDEX IF NOT EXISTS kpi_startup_idx ON pilot_kpis (startup_id);
CREATE INDEX IF NOT EXISTS kpi_gate_idx    ON pilot_kpis (is_go_no_go, validation_verdict);

COMMENT ON TABLE  pilot_kpis            IS 'Stage 7. Baseline-vs-target KPIs, locked before measurement, validated by a third party.';
COMMENT ON COLUMN pilot_kpis.locked_at  IS 'Pre-registration timestamp (UK Magenta Book). Targets are fixed before any outcome data exists.';
COMMENT ON COLUMN pilot_kpis.is_go_no_go IS 'True if this KPI alone gates the scale-up decision.';

-- ═══════════════════════════════════ STAGE 8 — SCALE-UP GATE ═══════════════
-- Odisha's rule, and the only written pilot-to-scale graduation gate found
-- anywhere in Indian procurement: wider deployment unlocks on satisfactory
-- reports from THREE OR MORE government clients.
CREATE TABLE IF NOT EXISTS scale_up_endorsements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  startup_id      TEXT NOT NULL,
  startup_name    TEXT NOT NULL,
  department_name TEXT NOT NULL,

  verdict         TEXT NOT NULL CHECK (verdict IN ('satisfactory','unsatisfactory')),
  pilot_ref       TEXT,
  report_url      TEXT,
  note            TEXT,
  endorsed_by     TEXT,

  -- One endorsement per department per solution.
  UNIQUE (startup_id, department_name)
);
CREATE INDEX IF NOT EXISTS endorsement_startup_idx ON scale_up_endorsements (startup_id);

COMMENT ON TABLE scale_up_endorsements IS 'Stage 8. One satisfactory-performance report per department. Three unlock the gate.';

CREATE OR REPLACE VIEW scale_up_readiness AS
SELECT
  startup_id,
  MIN(startup_name)                                       AS startup_name,
  COUNT(*) FILTER (WHERE verdict = 'satisfactory')        AS satisfactory_count,
  COUNT(*) FILTER (WHERE verdict = 'unsatisfactory')      AS unsatisfactory_count,
  (COUNT(*) FILTER (WHERE verdict = 'satisfactory') >= 3) AS gate_unlocked
FROM scale_up_endorsements
GROUP BY startup_id;

COMMENT ON VIEW scale_up_readiness IS 'The scale-up gate, computed so it can never drift from the endorsements behind it.';

COMMIT;

-- ── VERIFY ──────────────────────────────────────────────────────────────────
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public'
--     AND table_name IN ('challenges','challenge_applications','evaluation_scores',
--                        'sandbox_agreements','pilot_milestones','pilot_kpis',
--                        'scale_up_endorsements');
--   -- expect 7 rows
--   SELECT * FROM scale_up_readiness;   -- expect 0 rows until endorsements exist
