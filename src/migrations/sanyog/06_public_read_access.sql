-- ═══════════════════════════════════════════════════════════════════════════
--  SANYOG · 06 — SAFE PUBLIC READ ACCESS
--  Run AFTER 04_grants_and_security.sql. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHY THIS FILE EXISTS
-- Both hubs query Supabase DIRECTLY FROM THE BROWSER using the anon key:
--     hub.tsx:971    supabase.from('startups').select('*')
--     hub.tsx:1019   supabase.from('documents').select('*')
--     scout.tsx:899  supabase.from('startups').select('*')
--     scout.tsx:958  realtime channel on `startups` INSERT/UPDATE
--
-- After 04 revoked anon, those calls fail with 42501 and both hubs silently
-- fall back to their hardcoded demo arrays — so nothing a user creates ever
-- appears. This file restores exactly enough access to fix that.
--
-- ⚠️ DO NOT "FIX" THIS BY FOLLOWING POSTGRES'S HINT.
-- The error suggests `GRANT SELECT ON public.startups TO anon`. Running that
-- would be a serious breach: the anon key SHIPS IN THE BROWSER BUNDLE and is
-- readable by anyone, and `select('*')` on these tables returns
--     startups.owner_password_hash      ← credential material
--     startups.owner_email              ← personal data
--     documents WHERE deck_type='investor'  ← confidential submissions
--
-- So access is granted at COLUMN level, and narrowed further by RLS policy.
-- Postgres enforces both: a column not granted is not returned even by
-- `select('*')`, and a row not matching the policy is not returned at all.

BEGIN;

-- ══════════════════════════════════════════════════════════ STARTUPS ═══════
-- Column-level grant. Everything omitted here is unreachable by anon no matter
-- what the client asks for. Deliberately EXCLUDED:
--     owner_password_hash   credential material
--     owner_email           personal data
--     created_by_email      personal data
--     dpiit_recognition_no  identifier, not needed for public display
GRANT SELECT (
  id, created_at, name, tagline, description, founder, industry, stage,
  funding_goal, raised, pitch_score, members,
  dpiit_verified, turnover_waived, experience_waived,
  status, reviewed_at
) ON public.startups TO anon, authenticated;

-- Row-level: only solutions that have cleared review are publicly visible.
-- Pending and rejected registrations stay invisible until an admin approves.
DROP POLICY IF EXISTS startups_public_read ON public.startups;
CREATE POLICY startups_public_read ON public.startups
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

COMMENT ON POLICY startups_public_read ON public.startups IS
  'Public sees approved solutions only. Column grant already excludes password hash and emails.';

-- ═════════════════════════════════════════════════════════ DOCUMENTS ═══════
-- Column-level grant. `file_path` is EXCLUDED: it is the internal object path
-- inside the storage bucket and is not needed to render or open a document.
GRANT SELECT (
  id, created_at, name, type, status, date, views, score,
  file_url, startup_name, deck_type
) ON public.documents TO anon, authenticated;

-- ⚠️ THE IMPORTANT LINE IN THIS FILE.
-- Only PUBLIC ('brand') material is exposed. Confidential submissions
-- (deck_type = 'investor') are NEVER readable with the anon key — they are
-- released through the server's own guarded route, only to departments the
-- startup has explicitly approved.
--
-- CONSEQUENCE, and it is intentional: scout.tsx:921 queries
--   documents.eq('deck_type','investor')
-- directly from the browser. That query will now return ZERO ROWS. That is the
-- correct outcome — it must be moved to an authenticated server route before
-- the Evaluation Room can show live confidential documents. Until then the tab
-- renders its demo data.
DROP POLICY IF EXISTS documents_public_read ON public.documents;
CREATE POLICY documents_public_read ON public.documents
  FOR SELECT TO anon, authenticated
  USING (deck_type = 'brand');

COMMENT ON POLICY documents_public_read ON public.documents IS
  'Public material only. Confidential submissions never leave via the anon key.';

-- ════════════════════════════════════════════════════════ CHALLENGES ══════
-- The challenge board is meant to be public — that is the entire point of
-- publishing departmental demand. Drafts and withdrawn challenges stay hidden.
GRANT SELECT (
  id, created_at, reference_no, department_name, nodal_officer,
  title, problem_statement, outcome_sought, domain,
  baseline_metric, baseline_value, target_value, metric_unit, metric_direction,
  target_window_days, operational_constraints, data_available,
  pilot_budget_inr, pilot_duration_days,
  dpiit_required, turnover_relaxed, experience_relaxed, emd_exempt,
  opens_on, closes_on, evaluation_days, status, published_at
) ON public.challenges TO anon, authenticated;
-- department_email is omitted on purpose: it is an officer's personal address.

DROP POLICY IF EXISTS challenges_public_read ON public.challenges;
CREATE POLICY challenges_public_read ON public.challenges
  FOR SELECT TO anon, authenticated
  USING (status IN ('published','evaluating','awarded','closed'));

COMMENT ON POLICY challenges_public_read ON public.challenges IS
  'Published challenges are public. Drafts and withdrawn ones are not.';

-- ═══════════════════════════════════════════════ DEPARTMENT DIRECTORY ══════
-- The directory of participating departments is public, but this table also
-- holds password_hash — so the column grant matters more here than anywhere.
GRANT SELECT (
  id, created_at, firm_name, partner_name, investment_thesis,
  sectors, stage_pref, check_min, check_max,
  department_type, district, status
) ON public.vc_profiles TO anon, authenticated;
-- email and password_hash are NOT granted.

DROP POLICY IF EXISTS vc_profiles_public_read ON public.vc_profiles;
CREATE POLICY vc_profiles_public_read ON public.vc_profiles
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

COMMENT ON POLICY vc_profiles_public_read ON public.vc_profiles IS
  'Verified departments only. Column grant withholds email and password_hash.';

-- ═════════════════════════════════════════════════════════════ EVENTS ══════
GRANT SELECT (
  id, created_at, title, type, event_date, event_time, location_mode,
  location, description, max_capacity, prize, application_required,
  registration_deadline, organiser_name, organiser_org, status
) ON public.events TO anon, authenticated;
-- organiser_email and submitted_by are withheld.

DROP POLICY IF EXISTS events_public_read ON public.events;
CREATE POLICY events_public_read ON public.events
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- ═══════════════════════════════════════════════════════════ REALTIME ══════
-- scout.tsx subscribes to INSERT/UPDATE on `startups` so a newly registered
-- solution appears live in the Department Hub. Realtime respects RLS and the
-- column grants above, so a subscriber receives only approved rows and only
-- the granted columns.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'startups'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.startups;
    END IF;
  END IF;
END $$;

COMMIT;

-- ── VERIFY ──────────────────────────────────────────────────────────────────
-- 1. anon CAN read approved solutions:
--      curl "$SUPABASE_URL/rest/v1/startups?select=name,stage&limit=3" \
--           -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--
-- 2. anon CANNOT read the password hash — this must return 42501:
--      curl "$SUPABASE_URL/rest/v1/startups?select=owner_password_hash&limit=1" \
--           -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--
-- 3. anon CANNOT read confidential documents — this must return []:
--      curl "$SUPABASE_URL/rest/v1/documents?deck_type=eq.investor&select=name" \
--           -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--
-- 4. Which columns anon may read:
--      SELECT table_name, column_name FROM information_schema.column_privileges
--      WHERE grantee='anon' AND table_schema='public' ORDER BY table_name, column_name;

-- ── FOLLOW-UP WORK THIS CREATES ─────────────────────────────────────────────
-- scout.tsx:921 must move to an authenticated server route before the
-- Evaluation Room can display live confidential documents. Suggested:
--   GET /api/documents/confidential   → verifies the caller is an approved
--   department AND that the owning startup granted it access, then returns
--   rows using the service-role client.
