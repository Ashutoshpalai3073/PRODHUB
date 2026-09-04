# Sanyog — database schema

Purpose-built for the innovation-procurement pathway. **This set replaces the
legacy Incutrack migrations entirely** (moved to `../legacy/`); do not mix them.

## Run order

Paste each file into the Supabase SQL editor, in this order, on project
**`ecduzzzvyfesegsyuens`** (verify your dashboard URL reads `.../project/ecduzzzvyfesegsyuens`).

| # | File | What it creates |
|---|---|---|
| 1 | `01_core.sql` | `users`, `otps`, `vc_profiles` (departments), `startups`, `documents` |
| 2 | `02_pathway.sql` | `challenges`, `challenge_applications`, `evaluation_scores`, `sandbox_agreements`, `pilot_milestones`, `pilot_kpis`, `scale_up_endorsements` + 2 views |
| 3 | `03_platform.sql` | `events`, `event_rsvps`, `startup_advance_requests`, `deal_interests`, `diligence_requests`, `diligence_audit`, `shortlist_events`, `activity_events`, `contact_messages` |
| 4 | `04_grants_and_security.sql` | service_role grants, anon lockdown, RLS. **Re-run after any future migration.** |
| 5 | `05_seed_demo.sql` | Demo data — one solution walked through all 8 stages. Optional but recommended for the demo. |
| 6 | `06_public_read_access.sql` | **Required.** Column-scoped public read + RLS policies. Without it both hubs show only hardcoded demo data. |

Then, two manual steps:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

and create a **public Storage bucket named `pitch-vault`** (Storage → New bucket) —
document uploads write there.

Every file is idempotent. Re-running is safe.

## The eight stages, and where each lives

| Stage | Table |
|---|---|
| 1 · Problem formulation | `challenges` — baseline and target are **mandatory**; a challenge without a baseline can never be validated |
| 2 · Discovery & eligibility | `challenge_applications` — `ineligible_reason` required on rejection |
| 3 · Transparent evaluation | `evaluation_scores` — per-panellist and attributable, never just an average; `application_scores` view computes consensus |
| 4 · Sandbox design | `sandbox_agreements` — boundary conditions, `exit_on` mandatory |
| 5 · Contracting & risk | same table — IP retained by startup, liability cap, exit **and** withdrawal strategy filed up front |
| 6 · Milestone payments | `pilot_milestones` — 30/40/30, `due_by` carries the MSMED 45-day clock |
| 7 · Independent validation | `pilot_kpis` — NHS England schema + `locked_at` pre-registration stamp |
| 8 · Scale-up | `scale_up_endorsements` + `scale_up_readiness` view — Odisha's 3-department gate |

## Four rules enforced by the database, not the UI

A UI check can be bypassed by any client. These cannot:

- **`sandbox_active_needs_clearance`** — a sandbox cannot go `active` until
  `security_audit_status = 'cleared'`. No pilot touches citizen data unaudited.
- **`milestone_release_requires_verification`** — `released_at` requires
  `verified_at`. No payment without a recorded verification.
- **`revoke_requires_reason`** — revoking a shortlist without a stated reason is
  rejected. Unexplained rejection is precisely the arbitrariness this platform exists to remove.
- **`kpi_gate_needs_threshold`** — a KPI flagged as go/no-go must carry the number
  that decides it.

## Legacy table names, kept on purpose

`src/server.ts` addresses these by name across ~45 routes. Renaming them buys
nothing a reviewer can see and risks every endpoint. `COMMENT ON` records the
real meaning; run `\d+ <table>` in psql to read them.

| Table | Actually means |
|---|---|
| `vc_profiles` | Department register |
| `deal_interests` | Department interest in a solution |
| `diligence_requests` | Access request for a confidential document |
| `diligence_audit` | Who opened which document, when |
| `documents.deck_type` | `brand` = public · `investor` = confidential |

Likewise `users.role` still accepts `founder` / `vc` / `pending_vc`, because
`server.ts` writes `role: 'founder'` on first registration. They alias to
`startup` / `department` / `pending_department`. Drop them once the code migrates.

## Security posture

All database access goes through `server.ts` using the **service role key**,
behind routes that verify a signed JWT and check ownership. Therefore:

- `service_role` — full access, plus `ALTER DEFAULT PRIVILEGES` so tables added
  later inherit it automatically. This is what stops the recurring
  *"table exists but returns 403 permission denied"* bug.
- `anon` / `authenticated` — revoked from everything in `04`, then given back
  **only** narrow, column-scoped read in `06`. The anon key ships in the browser
  bundle by design; it must be worth as little as possible on its own.
- **RLS enabled on every table.** `service_role` bypasses RLS, so this costs the
  app nothing and denies everyone else by default.

### Never run this, however convincing the hint

Both hubs query Supabase straight from the browser, so with `04` alone they hit:

```
42501  permission denied for table startups
hint:  GRANT SELECT ON public.startups TO anon;
```

**Do not follow that hint.** `select('*')` on these tables returns
`startups.owner_password_hash`, `startups.owner_email`, and every
`documents` row where `deck_type = 'investor'` — the confidential submissions.
A blanket grant publishes all of it to anyone who opens devtools.

`06` instead grants **named columns only** and adds RLS policies, so:

| Reachable with the anon key | Never reachable |
|---|---|
| Approved solutions, safe columns | `owner_password_hash`, `owner_email`, `created_by_email` |
| `deck_type = 'brand'` documents | `deck_type = 'investor'` documents |
| Published challenges | `department_email`, challenge drafts |
| Verified departments | `vc_profiles.password_hash`, `vc_profiles.email` |

A column that is not granted is withheld even from `select('*')`.

**Known follow-up:** `scout.tsx:921` fetches confidential documents from the
browser. After `06` that correctly returns zero rows; it needs an authenticated
server route before the Evaluation Room can show live confidential material.

## Verifying

```sql
-- 20 base tables after 01–03
select count(*) from information_schema.tables
where table_schema='public' and table_type='BASE TABLE';

-- service_role reaches everything (all true)
select table_name, has_table_privilege('service_role','public.'||table_name,'SELECT') as ok
from information_schema.tables
where table_schema='public' and table_type='BASE TABLE' order by ok, table_name;

-- anon reaches nothing (all false)
select table_name, has_table_privilege('anon','public.'||table_name,'SELECT') as anon_can_read
from information_schema.tables
where table_schema='public' and table_type='BASE TABLE' order by anon_can_read desc;

-- the scale-up gate, after seeding
select * from scale_up_readiness order by satisfactory_count desc;
```
