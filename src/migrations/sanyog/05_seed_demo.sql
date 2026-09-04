-- ═══════════════════════════════════════════════════════════════════════════
--  SANYOG · 05 — DEMO SEED
--  Run LAST. Idempotent (every insert is ON CONFLICT DO NOTHING).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Purpose: an empty board demos badly. This seeds ONE solution all the way
-- through the pathway so a reviewer can follow a single thread end to end:
--
--   JalRakshak  Applied → Screened → In Pilot → Validated
--               challenge → application → panel scores → sandbox →
--               3 milestones (2 released) → 2 KPIs (1 a go/no-go) → 2 endorsements
--
--   AarogyaTrack  already Scaled, with THREE satisfactory endorsements, so
--                 scale_up_readiness.gate_unlocked = true — the Odisha rule
--                 visibly firing.
--
-- The other four sit at different stages so every kanban column is populated.
--
-- SAFE TO SKIP in production. Delete with 06_reset_demo.sql (see bottom).

BEGIN;

-- ══════════════════════════════════════════════════════════════ USERS ══════
INSERT INTO users (email, name, role, auth_method) VALUES
  ('nodal.ud@demo.sanyog.in',      'Aryan Mehta',      'department', 'otp'),
  ('nodal.water@demo.sanyog.in',   'Ishaan Kapoor',    'department', 'otp'),
  ('nodal.health@demo.sanyog.in',  'Vani Reddy',       'department', 'otp'),
  ('nodal.transport@demo.sanyog.in','Rohan Das',       'department', 'otp'),
  ('panel.vjti@demo.sanyog.in',    'Dr. Priya Sharma', 'evaluator',  'otp'),
  ('panel.iitb@demo.sanyog.in',    'Dr. Sneha Reddy',  'evaluator',  'otp'),
  ('audit.certin@demo.sanyog.in',  'Rahul Mehta',      'evaluator',  'otp'),
  ('validator.vjti@demo.sanyog.in','VJTI Assessment Cell', 'validator','otp')
ON CONFLICT (email) DO NOTHING;

-- ═══════════════════════════════════════════════════════ DEPARTMENTS ═══════
INSERT INTO vc_profiles (email, firm_name, partner_name, investment_thesis, sectors, stage_pref, check_min, check_max, department_type, district, status)
VALUES
  ('nodal.ud@demo.sanyog.in', 'Urban Development Department', 'Aryan Mehta',
   'Outcome-based challenges on non-revenue water, road asset condition and civic service delivery across municipal corporations.',
   'Water, Mobility, Urban Infra', 'Pilot, Scale-up', 500000, 2500000, 'state_department', 'Mumbai', 'approved'),
  ('nodal.water@demo.sanyog.in', 'Water Supply & Sanitation', 'Ishaan Kapoor',
   'Reducing distribution losses and improving continuity of supply in urban and peri-urban networks.',
   'Water, Sanitation', 'Pilot', 500000, 2500000, 'state_department', 'Pune', 'approved'),
  ('nodal.health@demo.sanyog.in', 'Public Health Department', 'Vani Reddy',
   'Earlier detection and higher screening throughput in high-burden blocks, measured against district baselines.',
   'Health, Diagnostics', 'Pilot, Scale-up', 500000, 2500000, 'state_department', 'Nagpur', 'approved'),
  ('nodal.transport@demo.sanyog.in', 'Transport Department (MSRTC)', 'Rohan Das',
   'Schedule adherence, fleet utilisation and passenger information across depot operations.',
   'Mobility, Logistics', 'Pilot', 500000, 1500000, 'undertaking', 'Aurangabad', 'approved')
ON CONFLICT (email) DO NOTHING;

-- ═══════════════════════════════════════════════════════════ SOLUTIONS ═════
-- ids match the frontend constants in hub.tsx / scout.tsx.
INSERT INTO startups (id, name, tagline, description, founder, industry, stage,
                      funding_goal, raised, pitch_score, members,
                      dpiit_recognition_no, dpiit_verified, status)
VALUES
  ('st-1','JalRakshak Systems','Acoustic leak detection for municipal water mains.',
   'Clamp-on acoustic sensors on distribution mains localise leaks above 5 litres/min within 3 hours, cutting non-revenue water loss.',
   'Ashutosh Palai','WaterTech','Validated', 2500000, 1750000, 87, 6, 'DIPP-DEMO-10241', true, 'approved'),
  ('st-2','TransitIQ','Live occupancy and schedule adherence for public bus fleets.',
   'Retrofit GPS and passenger-counting telemetry gives depot managers live occupancy, bunching alerts and schedule adherence.',
   'Kabir Sen','Mobility','In Pilot', 1500000, 450000, 78, 4, 'DIPP-DEMO-11876', true, 'approved'),
  ('st-3','AarogyaTrack','AI-assisted chest X-ray triage for tuberculosis screening.',
   'Computer-aided detection on handheld X-ray units flags presumptive TB at the point of screening.',
   'Meera Iyer','HealthTech','Scaled', 2500000, 2500000, 91, 8, 'DIPP-DEMO-09312', true, 'approved'),
  ('st-4','FasalSetu','Vernacular crop advisory and mandi price intelligence.',
   'Voice advisory over low-end phones combining local weather, soil-card data and mandi arrival prices.',
   'Chetan Sharma','AgriTech','Applied', 1500000, 0, 69, 3, 'DIPP-DEMO-13990', true, 'approved'),
  ('st-5','CivicLens','Road defect detection from municipal vehicle dashcams.',
   'Dashcams on existing municipal vehicles survey road condition continuously; vision models flag potholes onto the ward GIS layer.',
   'Ankit Raj Singh','Urban Infra','Screened', 1500000, 0, 74, 4, 'DIPP-DEMO-12455', true, 'approved'),
  ('st-6','GridSense','Distribution transformer health monitoring.',
   'Retrofit sensors predict transformer failures from load and oil-temperature signatures.',
   'Pawan Kumar','Energy','In Pilot', 2500000, 750000, 83, 5, 'DIPP-DEMO-10877', true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════ STAGE 1 — CHALLENGES ═══════════════════
INSERT INTO challenges (reference_no, department_email, department_name, nodal_officer,
                        title, problem_statement, outcome_sought, domain,
                        baseline_metric, baseline_value, target_value, metric_unit, metric_direction,
                        target_window_days, operational_constraints, data_available,
                        pilot_budget_inr, pilot_duration_days, opens_on, closes_on, status, published_at)
VALUES
  ('SNY/WSS/2026/001','nodal.water@demo.sanyog.in','Water Supply & Sanitation','Ishaan Kapoor',
   'Reduce non-revenue water in the Kothrud distribution zone',
   'Roughly two-fifths of treated water entering the Kothrud zone is unaccounted for. Leaks are currently found only when they surface, by which time the loss has run for weeks.',
   'Detect and localise leaks above 5 litres per minute within 3 hours of onset, without excavating to search.',
   'Water','Non-revenue water', 38, 24, '% of supply entering the zone','decrease',
   180,'No excavation without ward permission. Sensors must not interrupt supply during installation.',
   'SCADA flow logs at 12 district metering areas; GIS pipe network; 24 months of billing data.',
   2500000, 180, DATE '2026-01-15', DATE '2026-02-15','awarded', TIMESTAMPTZ '2026-01-15 10:00+05:30'),

  ('SNY/PH/2026/002','nodal.health@demo.sanyog.in','Public Health Department','Vani Reddy',
   'Raise tuberculosis case detection in high-burden blocks',
   'Presumptive TB cases are missed at screening camps because radiologist review is centralised and slow, so patients are lost to follow-up before confirmation.',
   'Increase confirmed TB notifications from screening camps without adding radiologist headcount.',
   'Health','Confirmed notifications per 1,000 screened', 4.2, 6.5, 'per 1,000 screened','increase',
   240,'Must run offline on handheld X-ray units. No patient identifier leaves the district network.',
   'Anonymised prior-year screening outcomes; camp schedules; NTEP notification counts.',
   2500000, 240, DATE '2025-11-01', DATE '2025-12-01','awarded', TIMESTAMPTZ '2025-11-01 10:00+05:30'),

  ('SNY/TR/2026/003','nodal.transport@demo.sanyog.in','Transport Department (MSRTC)','Rohan Das',
   'Improve schedule adherence on high-frequency depot routes',
   'Buses bunch on the four busiest routes; depot managers only learn of it from passenger complaints, hours after the fact.',
   'Give depot control live occupancy and bunching alerts so headway can be corrected during the service day.',
   'Mobility','On-time departures', 61, 80, '% of scheduled departures','increase',
   180,'No modification to existing ticketing hardware. Retrofit only.',
   'Depot schedules; 12 months of trip logs; existing GPS feed where fitted.',
   1500000, 180, DATE '2026-02-01', DATE '2026-03-05','evaluating', TIMESTAMPTZ '2026-02-01 10:00+05:30'),

  ('SNY/UD/2026/004','nodal.ud@demo.sanyog.in','Urban Development Department','Aryan Mehta',
   'Continuous road-defect survey without a dedicated survey fleet',
   'Road condition is recorded only when a complaint is filed or an annual survey is commissioned, so the asset register is stale for most of the year.',
   'Maintain a ward-level road condition layer refreshed at least weekly, using vehicles already on the road.',
   'Urban Infra','Wards with condition data <7 days old', 8, 85, '% of wards','increase',
   150,'No new vehicles. Footage containing faces or number plates must be blurred at source.',
   'Ward GIS boundaries; municipal vehicle routes; historical complaint log.',
   1500000, 150, DATE '2026-03-01', DATE '2026-04-01','published', TIMESTAMPTZ '2026-03-01 10:00+05:30')
ON CONFLICT (reference_no) DO NOTHING;

-- ═══════════════════════════ STAGE 2 & 3 — APPLICATIONS + SCORES ═══════════
INSERT INTO challenge_applications (challenge_id, startup_id, startup_name, applicant_email,
                                    proposal_summary, proposed_budget_inr, proposed_days,
                                    eligibility_status, dpiit_checked, screened_at, status)
SELECT c.id,'st-1','JalRakshak Systems',NULL,
       'Clamp-on acoustic sensors at 12 DMA nodes, correlation-based localisation, dashboard integrated with the existing SCADA view.',
       2500000,180,'eligible',true, TIMESTAMPTZ '2026-01-22 11:00+05:30','awarded'
FROM challenges c WHERE c.reference_no='SNY/WSS/2026/001'
ON CONFLICT (challenge_id, startup_id) DO NOTHING;

INSERT INTO challenge_applications (challenge_id, startup_id, startup_name,
                                    proposal_summary, proposed_budget_inr, proposed_days,
                                    eligibility_status, dpiit_checked, screened_at, status)
SELECT c.id,'st-3','AarogyaTrack',
       'On-device CAD inference on handheld X-ray units; presumptive cases flagged at the camp, no images leave the district network.',
       2500000,240,'eligible',true, TIMESTAMPTZ '2025-11-10 11:00+05:30','awarded'
FROM challenges c WHERE c.reference_no='SNY/PH/2026/002'
ON CONFLICT (challenge_id, startup_id) DO NOTHING;

INSERT INTO challenge_applications (challenge_id, startup_id, startup_name,
                                    proposal_summary, proposed_budget_inr, proposed_days,
                                    eligibility_status, dpiit_checked, screened_at, status)
SELECT c.id,'st-2','TransitIQ',
       'Retrofit GPS plus doorway passenger counters on 60 buses across 4 routes, with a depot control dashboard.',
       1500000,180,'eligible',true, TIMESTAMPTZ '2026-02-12 11:00+05:30','shortlisted'
FROM challenges c WHERE c.reference_no='SNY/TR/2026/003'
ON CONFLICT (challenge_id, startup_id) DO NOTHING;

INSERT INTO challenge_applications (challenge_id, startup_id, startup_name,
                                    proposal_summary, proposed_budget_inr, proposed_days,
                                    eligibility_status, dpiit_checked, status)
SELECT c.id,'st-5','CivicLens',
       'Dashcam retrofit on 40 municipal vehicles; on-device blurring of faces and plates before upload; weekly ward condition layer.',
       1500000,150,'eligible',true,'screened'
FROM challenges c WHERE c.reference_no='SNY/UD/2026/004'
ON CONFLICT (challenge_id, startup_id) DO NOTHING;

-- Panel scores — attributable, with rationale, as Stage 3 requires.
INSERT INTO evaluation_scores (application_id, evaluator_email, evaluator_name, evaluator_org,
                               technical_viability, innovation_quotient, rationale)
SELECT a.id,'panel.vjti@demo.sanyog.in','Dr. Priya Sharma','VJTI Mumbai',43,40,
       'Correlation-based localisation is well established; the contribution is doing it on a retrofit clamp without service interruption. Claimed 3-hour detection is plausible given the DMA density proposed.'
FROM challenge_applications a WHERE a.startup_id='st-1'
ON CONFLICT (application_id, evaluator_email) DO NOTHING;

INSERT INTO evaluation_scores (application_id, evaluator_email, evaluator_name, evaluator_org,
                               technical_viability, innovation_quotient, rationale)
SELECT a.id,'audit.certin@demo.sanyog.in','Rahul Mehta','CERT-In empanelled auditor',40,38,
       'No citizen personal data in scope, so the data-protection surface is small. Sensor telemetry must still terminate inside the state network; noted as a sandbox condition.'
FROM challenge_applications a WHERE a.startup_id='st-1'
ON CONFLICT (application_id, evaluator_email) DO NOTHING;

INSERT INTO evaluation_scores (application_id, evaluator_email, evaluator_name, evaluator_org,
                               technical_viability, innovation_quotient, rationale)
SELECT a.id,'panel.iitb@demo.sanyog.in','Dr. Sneha Reddy','IIT Bombay',45,42,
       'Offline on-device inference is the right call for camp settings. Sensitivity claims are supported by the submitted validation set; independent measurement against district notification data is still required.'
FROM challenge_applications a WHERE a.startup_id='st-3'
ON CONFLICT (application_id, evaluator_email) DO NOTHING;

-- ══════════════════════════ STAGES 4 & 5 — SANDBOX AGREEMENTS ══════════════
INSERT INTO sandbox_agreements (startup_id, startup_name, department_name, scope, sites, max_users,
                                data_shared, data_anonymised, data_localised_in_india,
                                security_audit_status, security_auditor, iso_27001_edition, cleared_at,
                                starts_on, exit_on, liability_cap_inr,
                                exit_strategy, withdrawal_strategy, status)
VALUES
  ('st-1','JalRakshak Systems','Water Supply & Sanitation',
   'Twelve district metering areas in the Kothrud zone. Read-only SCADA integration; no control actions.',
   'Kothrud zone, DMA 01–12', NULL,
   'SCADA flow telemetry and GIS pipe network. No customer or billing records.', true, true,
   'cleared','CERT-In empanelled auditor','2022', TIMESTAMPTZ '2026-02-20 16:00+05:30',
   DATE '2026-03-01', DATE '2026-08-28', 2500000,
   'On success, hand over the sensor register and dashboard; department retains a perpetual non-exclusive internal-use licence.',
   'On termination, remove all sensors within 14 days, return SCADA access, and delete all telemetry copies held outside the state network.',
   'completed'),
  ('st-6','GridSense','Urban Development Department',
   'Forty distribution transformers across two feeders. Monitoring only; no switching authority.',
   'Feeder 3 and Feeder 7', NULL,
   'Transformer load and oil-temperature telemetry. No consumer data.', true, true,
   'cleared','CERT-In empanelled auditor','2022', TIMESTAMPTZ '2026-04-05 12:00+05:30',
   DATE '2026-04-15', DATE '2026-10-12', 1500000,
   'Hand over the sensor register and failure-prediction model outputs.',
   'Remove sensors within 14 days; delete all telemetry copies.',
   'active')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════ STAGE 6 — MILESTONES ═══════════════════════
-- 30 / 40 / 30. Tranche 1 is a mobilisation ADVANCE (GFR Rule 172 caps advances
-- to a private firm at 30%), tranches 2 and 3 are verifiable events.
INSERT INTO pilot_milestones (startup_id, startup_name, department_name, seq, label, trigger_type,
                              trigger_detail, pct, amount_inr, status, verified_by, verified_at, released_at, due_by)
VALUES
  ('st-1','JalRakshak Systems','Water Supply & Sanitation',1,'Mobilisation advance','mobilisation_advance',
   'Released against a bank guarantee on signature of the sandbox agreement. Not a performance milestone.',
   30, 750000,'released','Ishaan Kapoor', TIMESTAMPTZ '2026-03-01 10:00+05:30', TIMESTAMPTZ '2026-03-06 10:00+05:30', DATE '2026-04-15'),
  ('st-1','JalRakshak Systems','Water Supply & Sanitation',2,'Mid-term KPI demonstration','kpi_demonstration',
   'Live demonstration of leak localisation within 3 hours on at least 5 seeded leaks across 3 DMAs.',
   40,1000000,'released','Ishaan Kapoor', TIMESTAMPTZ '2026-06-02 15:00+05:30', TIMESTAMPTZ '2026-06-09 11:00+05:30', DATE '2026-07-17'),
  ('st-1','JalRakshak Systems','Water Supply & Sanitation',3,'Independent validation','independent_validation',
   'Release on receipt of the third-party report measuring non-revenue water against the agreed baseline.',
   30, 750000,'verified','VJTI Assessment Cell', TIMESTAMPTZ '2026-09-01 12:00+05:30', NULL, DATE '2026-10-16'),

  ('st-6','GridSense','Urban Development Department',1,'Mobilisation advance','mobilisation_advance',
   'Released against a bank guarantee on signature of the sandbox agreement.',
   30, 750000,'released','Aryan Mehta', TIMESTAMPTZ '2026-04-15 10:00+05:30', TIMESTAMPTZ '2026-04-21 10:00+05:30', DATE '2026-05-30'),
  ('st-6','GridSense','Urban Development Department',2,'Mid-term KPI demonstration','kpi_demonstration',
   'Demonstrate prediction of at least 3 impending failures confirmed by inspection.',
   40,1000000,'in_review',NULL,NULL,NULL, DATE '2026-08-29'),
  ('st-6','GridSense','Urban Development Department',3,'Independent validation','independent_validation',
   'Third-party measurement of unplanned outage minutes against baseline.',
   30, 750000,'pending',NULL,NULL,NULL, DATE '2026-11-26')
ON CONFLICT (startup_id, seq) DO NOTHING;

-- ════════════════════════════════ STAGE 7 — KPIs ═══════════════════════════
INSERT INTO pilot_kpis (startup_id, startup_name, department_name, kpi_description, unit, direction,
                        baseline_value, target_value, target_timepoint, measured_value,
                        is_go_no_go, go_no_go_threshold, measurement_frequency, data_source,
                        responsible_org, locked_by, validator_org, validator_type,
                        validated_at, validation_verdict, validation_note)
VALUES
  ('st-1','JalRakshak Systems','Water Supply & Sanitation',
   'Non-revenue water in the Kothrud distribution zone','% of supply entering the zone','decrease',
   38, 24, DATE '2026-08-28', 25.1,
   true, 28,'Monthly','SCADA district metering vs billed consumption','Water Supply & Sanitation',
   'Ishaan Kapoor','VJTI Assessment Cell','academic',
   TIMESTAMPTZ '2026-09-01 12:00+05:30','partially_met',
   'Measured 25.1% against a 24% target — target not fully met, but comfortably inside the 28% go/no-go threshold. Recommend proceeding to scale-up.'),

  ('st-1','JalRakshak Systems','Water Supply & Sanitation',
   'Median time from leak onset to localisation','hours','decrease',
   72, 3, DATE '2026-08-28', 2.4,
   false, NULL,'Per incident','Sensor event log cross-checked against ward repair tickets','VJTI Assessment Cell',
   'Ishaan Kapoor','VJTI Assessment Cell','academic',
   TIMESTAMPTZ '2026-09-01 12:00+05:30','met',
   'Median 2.4 hours across 34 confirmed leak events. Target met.'),

  ('st-6','GridSense','Urban Development Department',
   'Unplanned transformer outage minutes per month','minutes','decrease',
   860, 500, DATE '2026-10-12', NULL,
   true, 620,'Monthly','Feeder outage log','Urban Development Department',
   'Aryan Mehta', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════ STAGE 8 — SCALE-UP GATE ═══════════════════════
-- AarogyaTrack has THREE satisfactory endorsements, so the Odisha gate fires.
-- JalRakshak has two — one short, deliberately, so the gate visibly holds shut.
INSERT INTO scale_up_endorsements (startup_id, startup_name, department_name, verdict, pilot_ref, note, endorsed_by) VALUES
  ('st-3','AarogyaTrack','Public Health Department','satisfactory','SNY/PH/2026/002','Notification rate rose from 4.2 to 6.9 per 1,000 screened over the pilot window.','Vani Reddy'),
  ('st-3','AarogyaTrack','Urban Development Department','satisfactory','UD/HEALTH/PILOT/11','Deployed at two urban health posts; throughput sustained without additional radiologist time.','Aryan Mehta'),
  ('st-3','AarogyaTrack','Water Supply & Sanitation','satisfactory','WSS/OHS/2026/03','Used for occupational health screening of field staff. No adverse findings.','Ishaan Kapoor'),
  ('st-1','JalRakshak Systems','Water Supply & Sanitation','satisfactory','SNY/WSS/2026/001','Independently validated. Recommend wider deployment.','Ishaan Kapoor'),
  ('st-1','JalRakshak Systems','Urban Development Department','satisfactory','UD/WATER/2026/07','Secondary deployment on two ward mains performed as described.','Aryan Mehta')
ON CONFLICT (startup_id, department_name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════ EVENTS ════════
INSERT INTO events (title, type, event_date, event_time, location_mode, location, description,
                    organiser_name, organiser_email, organiser_org, status) VALUES
  ('Maharashtra Innovation Challenge — Demo Day','Demo Day', DATE '2026-06-15','10:00','physical',
   'Yashwantrao Chavan Centre, Mumbai',
   'Shortlisted startups demonstrate working solutions against live departmental challenge statements, in front of nodal officers and the evaluation panel.',
   'Maharashtra State Innovation Society','events@demo.sanyog.in','MSInS','approved'),
  ('Challenge Briefing — Urban Water Loss','Panel Discussion', DATE '2026-06-28','15:30','online',
   'MS Teams',
   'Open briefing on the non-revenue water challenge: baseline figures, sandbox boundaries, data-sharing protocol and the security clearance checklist.',
   'Water Supply & Sanitation','nodal.water@demo.sanyog.in','Water Supply & Sanitation','approved'),
  ('Sandbox Readiness Workshop','Workshop', DATE '2026-07-08','11:00','physical',
   'MCCIA, Pune',
   'What a department expects before it opens a sandbox: anonymisation, CERT-In audit clearance, hosting constraints and the checklist that gates pilot start.',
   'Maharashtra State Innovation Society','events@demo.sanyog.in','MSInS','approved')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════ ACTIVITY FEED ═════════
INSERT INTO activity_events (type, actor_email, title, detail) VALUES
  ('challenge_published','nodal.water@demo.sanyog.in','Reduce non-revenue water in the Kothrud distribution zone','Water Supply & Sanitation · pilot budget ₹25L · baseline 38% → target 24%'),
  ('application_submitted',NULL,'JalRakshak Systems','Applied to SNY/WSS/2026/001'),
  ('eligibility_cleared',NULL,'JalRakshak Systems','Recognition verified · turnover and prior-experience conditions waived'),
  ('panel_scored','panel.vjti@demo.sanyog.in','JalRakshak Systems','Panel consensus 80.5 / 100 across 2 evaluators'),
  ('sandbox_opened','nodal.water@demo.sanyog.in','JalRakshak Systems','Security audit cleared · sandbox active 01 Mar – 28 Aug 2026'),
  ('milestone_released','nodal.water@demo.sanyog.in','JalRakshak Systems','Tranche 2 of 3 released — mid-term KPI demonstration verified'),
  ('kpi_validated','validator.vjti@demo.sanyog.in','JalRakshak Systems','Non-revenue water 38% → 25.1% · inside go/no-go threshold'),
  ('scaled_up','nodal.health@demo.sanyog.in','AarogyaTrack','Scale-up gate unlocked — 3 satisfactory departmental endorsements')
ON CONFLICT DO NOTHING;

COMMIT;

-- ── VERIFY THE DEMO THREAD ──────────────────────────────────────────────────
--   SELECT stage, count(*) FROM startups GROUP BY stage;
--     -- every kanban column populated
--
--   SELECT * FROM scale_up_readiness ORDER BY satisfactory_count DESC;
--     -- AarogyaTrack gate_unlocked = true (3) · JalRakshak = false (2)
--
--   SELECT seq, label, pct, status FROM pilot_milestones
--   WHERE startup_id='st-1' ORDER BY seq;
--     -- 30 released · 40 released · 30 verified, awaiting release
--
--   SELECT kpi_description, baseline_value, target_value, measured_value, validation_verdict
--   FROM pilot_kpis WHERE startup_id='st-1';
--
--   SELECT * FROM application_scores WHERE startup_id='st-1';

-- ── TO RESET THE DEMO ───────────────────────────────────────────────────────
--   DELETE FROM activity_events      WHERE actor_email LIKE '%@demo.sanyog.in' OR actor_email IS NULL;
--   DELETE FROM scale_up_endorsements WHERE startup_id LIKE 'st-%';
--   DELETE FROM pilot_kpis            WHERE startup_id LIKE 'st-%';
--   DELETE FROM pilot_milestones      WHERE startup_id LIKE 'st-%';
--   DELETE FROM sandbox_agreements    WHERE startup_id LIKE 'st-%';
--   DELETE FROM evaluation_scores     WHERE evaluator_email LIKE '%@demo.sanyog.in';
--   DELETE FROM challenge_applications WHERE startup_id LIKE 'st-%';
--   DELETE FROM challenges            WHERE reference_no LIKE 'SNY/%';
--   DELETE FROM startups              WHERE id LIKE 'st-%';
--   DELETE FROM vc_profiles           WHERE email LIKE '%@demo.sanyog.in';
--   DELETE FROM users                 WHERE email LIKE '%@demo.sanyog.in';
