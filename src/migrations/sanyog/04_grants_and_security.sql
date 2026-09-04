-- ═══════════════════════════════════════════════════════════════════════════
--  SANYOG · 04 — GRANTS AND SECURITY POSTURE
--  Run AFTER 03_platform.sql, and after ANY future migration that adds tables.
--  Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- HOW ACCESS WORKS HERE
-- Every database call goes through src/server.ts using the SUPABASE SERVICE
-- ROLE key, behind routes that verify a signed JWT and check ownership. The
-- browser never talks to Postgres directly with elevated rights.
--
-- Two consequences:
--   1. service_role needs full access to everything.
--   2. anon / authenticated need almost NOTHING. Several tables hold password
--      hashes (vc_profiles, startups.owner_password_hash) and confidential
--      submissions. Granting the public anon key any read on those would expose
--      them to anyone who opens devtools.
--
-- THE BUG THIS PREVENTS
-- A table created in the SQL editor does not automatically inherit the
-- service_role grant. The previous schema hit this repeatedly — seven tables
-- existed but returned HTTP 403 "permission denied", so events, RSVPs, stage
-- advances, diligence and the audit log all failed silently. The
-- ALTER DEFAULT PRIVILEGES statements below are what stop that recurring for
-- tables created later.

BEGIN;

-- ═════════════════════════════════════════════════════ SERVICE ROLE ════════
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Anything created from here on, by any role that creates objects in public.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- ═══════════════════════════════════════════ ANON / AUTHENTICATED ══════════
-- Start from zero rather than assuming Supabase's defaults are safe.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Nothing is granted back. Public browsing (the challenge board, the department
-- directory) is served through the server's own routes, which filter to
-- published/approved rows. Keeping anon at zero means a leaked anon key —
-- which ships in the browser bundle by design — grants an attacker nothing.

-- ══════════════════════════════════════════════ ROW LEVEL SECURITY ═════════
-- service_role BYPASSES RLS, so enabling it costs the application nothing while
-- adding defence in depth: if anon/authenticated are ever granted access by
-- mistake, RLS with no permissive policy still denies every row.
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE vc_profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_agreements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_milestones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_kpis               ENABLE ROW LEVEL SECURITY;
ALTER TABLE scale_up_endorsements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps              ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_advance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_interests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE diligence_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE diligence_audit          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages         ENABLE ROW LEVEL SECURITY;

-- No policies are created on purpose: with RLS on and no policy, every role
-- except service_role sees zero rows. That is the intended posture.

COMMIT;

-- ── VERIFY ──────────────────────────────────────────────────────────────────
-- 1. service_role can reach everything — every row should read true:
--
--   SELECT table_name,
--          has_table_privilege('service_role','public.'||table_name,'SELECT') AS ok
--   FROM information_schema.tables
--   WHERE table_schema='public' AND table_type='BASE TABLE'
--   ORDER BY ok, table_name;
--
-- 2. anon can reach nothing — every row should read false:
--
--   SELECT table_name,
--          has_table_privilege('anon','public.'||table_name,'SELECT') AS anon_can_read
--   FROM information_schema.tables
--   WHERE table_schema='public' AND table_type='BASE TABLE'
--   ORDER BY anon_can_read DESC, table_name;
--
-- 3. RLS is on everywhere:
--
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relnamespace='public'::regnamespace AND relkind='r'
--   ORDER BY relrowsecurity, relname;
