// ─── PathwayTab ───────────────────────────────────────────────────────────────
// The eight stages of PS 26136 as one working surface, mounted as a tab in BOTH
// hubs:  mode="department" → publish challenges, score, verify/release
//        milestones, record validations, endorse;  mode="startup" → browse the
//        challenge board, apply (with the eligibility screen), and track the
//        pilot through milestones → validation → the scale-up gate.
//
// All data flows through the server's /api/pathway* routes (service role), so
// this tab works regardless of anon grants. Every write is guarded server-side;
// the UI mirrors those rules but never relies on them.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Landmark, GitBranch, ShieldCheck, Wallet, FlaskConical, BadgeCheck, Rocket,
  FileText, Download, X, Plus, CheckCircle2, AlertTriangle, Lock, Clock4,
  Building2, Scale, ArrowRight, Send, ChevronDown, Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PathwayCosmos } from './PathwayCosmos';
import { CardHolo, MiniPlanet, Constellation, type HoloKind } from './PathwayHolo';

// ─── Types (server payload shapes, kept intentionally loose) ──────────────────
type Challenge = {
  id: string; reference_no: string; department_name: string; nodal_officer?: string;
  title: string; problem_statement: string; outcome_sought: string; domain: string;
  baseline_metric: string; baseline_value: number; target_value: number; metric_unit: string;
  metric_direction: 'increase' | 'decrease'; target_window_days?: number;
  operational_constraints?: string; data_available?: string;
  pilot_budget_inr: number; pilot_duration_days: number;
  dpiit_required: boolean; turnover_relaxed: boolean; experience_relaxed: boolean; emd_exempt: boolean;
  opens_on?: string; closes_on?: string; evaluation_days: number; deemed_approval: boolean;
  status: string; published_at?: string; application_count: number;
};
type Solution = { id: string; name: string; tagline?: string; founder?: string; industry?: string; stage: string; funding_goal: number; raised: number; pitch_score: number; dpiit_verified?: boolean };
type Pathway = {
  startup: Solution & { description?: string; turnover_waived?: boolean; experience_waived?: boolean };
  applications: Array<{ id: string; challenge_id: string; proposal_summary: string; eligibility_status: string; ineligible_reason?: string; status: string; screened_at?: string; created_at: string; challenges?: Partial<Challenge> }>;
  scores: Array<{ id: string; application_id: string; evaluator_name?: string; evaluator_org?: string; technical_viability: number; innovation_quotient: number; total_score: number; rationale: string; conflict_declared: boolean; submitted_at: string }>;
  sandboxes: Array<{ id: string; department_name: string; scope: string; sites?: string; data_shared?: string; data_anonymised: boolean; data_localised_in_india: boolean; security_audit_status: string; security_auditor?: string; iso_27001_edition?: string; starts_on?: string; exit_on: string; ip_retained_by_startup: boolean; govt_licence_scope?: string; liability_cap_inr?: number; exit_strategy?: string; withdrawal_strategy?: string; status: string }>;
  milestones: Array<{ id: string; seq: number; label: string; trigger_type: string; trigger_detail?: string; pct: number; amount_inr?: number; status: string; verified_by?: string; verified_at?: string; released_at?: string; due_by?: string; note?: string; department_name?: string }>;
  kpis: Array<{ id: string; kpi_description: string; unit?: string; direction: 'increase' | 'decrease'; baseline_value: number; target_value: number; measured_value?: number; is_go_no_go: boolean; go_no_go_threshold?: number; measurement_frequency?: string; data_source?: string; responsible_org?: string; locked_at: string; validator_org?: string; validated_at?: string; validation_verdict?: 'met' | 'partially_met' | 'not_met'; validation_note?: string }>;
  endorsements: Array<{ id: string; department_name: string; verdict: 'satisfactory' | 'unsatisfactory'; pilot_ref?: string; note?: string; created_at: string }>;
  gate: { satisfactory_count: number; unsatisfactory_count?: number; gate_unlocked: boolean };
};

// ─── Palette (identical to the stage colours used across both hubs) ──────────
const C = {
  challenge: '#8b5cf6', screen: '#06b6d4', evaluate: '#a78bfa', sandbox: '#f59e0b',
  contract: '#f472b6', milestone: '#10b981', validate: '#22d3ee', scale: '#34d399',
  danger: '#f87171', dim: 'rgba(255,255,255,0.35)',
};
const SOL_STAGE_COLORS: Record<string, string> = {
  Applied: '#8b5cf6', Screened: '#06b6d4', 'In Pilot': '#f59e0b', Validated: '#10b981', Scaled: '#34d399',
};
const DOMAIN_COLORS: Record<string, string> = {
  Water: '#06b6d4', Mobility: '#f59e0b', Health: '#10b981', Agriculture: '#84cc16',
  'Urban Infra': '#8b5cf6', Energy: '#f472b6',
};
const fmtL = (n?: number | null) => n == null ? '—' : `₹${(Number(n) / 1e5).toFixed(Number(n) % 1e5 === 0 ? 0 : 1)}L`;
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const daysUntil = (d?: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

// ─── Tiny shared atoms ────────────────────────────────────────────────────────
function Pill({ text, color, solid = false }: { text: string; color: string; solid?: boolean }) {
  return <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, letterSpacing: '.05em', whiteSpace: 'nowrap', color: solid ? '#04040c' : color, background: solid ? color : `${color}1a`, border: `1px solid ${color}45` }}>{text}</span>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.09em', margin: '0 0 4px' }}>{children}</p>;
}
function Card({ color, children, style, holo, holoPos }: { color: string; children: React.ReactNode; style?: React.CSSProperties; holo?: HoloKind; holoPos?: 'tr' | 'br' }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${color}26`, background: `radial-gradient(circle at 88% -12%, ${color}16, transparent 55%), linear-gradient(145deg,${color}0d 0%, rgba(7,7,16,0.58) 100%)`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${color}60,transparent)` }} />
      {/* live WebGL object on the card corner (shared-renderer, cheap) */}
      {holo && <CardHolo kind={holo} color={color} pos={holoPos} />}
      {/* orbital ornament — a small ringed system sitting on the card corner */}
      <div aria-hidden style={{ position: 'absolute', top: -38, right: -38, width: 128, height: 128, pointerEvents: 'none', opacity: holo ? 0.35 : 0.6 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${color}30` }} />
        <div style={{ position: 'absolute', inset: 19, borderRadius: '50%', border: `1px dashed ${color}24` }} />
        <div style={{ position: 'absolute', inset: 38, borderRadius: '50%', border: `1px solid ${color}1a`, background: `radial-gradient(circle at 35% 35%, ${color}22, transparent 65%)` }} />
        <div style={{ position: 'absolute', top: 16, left: 24, width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
        <div style={{ position: 'absolute', bottom: 34, right: 6, width: 3.5, height: 3.5, borderRadius: '50%', background: `${color}99` }} />
        <div style={{ position: 'absolute', top: 58, left: 4, width: 2.5, height: 2.5, borderRadius: '50%', background: `${color}66` }} />
      </div>
      {children}
    </div>
  );
}

// Section identity: tinted icon tile + title + stage pill, shared by every card.
function SectionHead({ Icon, color, title, tag, note, right, mb = 10 }: { Icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string; title: string; tag?: string; note?: string; right?: React.ReactNode; mb?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: mb, position: 'relative', zIndex: 1 }}>
      <div style={{ width: 27, height: 27, borderRadius: 9, background: `${color}14`, border: `1px solid ${color}36`, boxShadow: `inset 0 0 12px ${color}14, 0 0 14px ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 13, height: 13, color }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '-.01em' }}>{title}</span>
      {tag && <span style={{ fontSize: 8.5, fontWeight: 800, color, background: `${color}12`, border: `1px solid ${color}30`, padding: '2.5px 9px', borderRadius: 999, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{tag}</span>}
      {note && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{note}</span>}
      {right}
    </div>
  );
}
function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <div style={{ gridColumn: span ? '1 / -1' : undefined }}><Label>{label}</Label>{children}</div>;
}
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: 'white', fontSize: 12.5, outline: 'none', fontFamily: 'inherit' };

function Modal({ title, color, onClose, children, wide }: { title: string; color: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(2,2,8,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div onClick={e => e.stopPropagation()} className="analytics-scroll pw-modal" style={{ width: '100%', maxWidth: wide ? 760 : 560, maxHeight: '88vh', overflowY: 'auto', borderRadius: 20, border: `1px solid ${color}35`, background: 'linear-gradient(160deg, rgba(14,12,28,0.98), rgba(5,5,12,0.99))', boxShadow: `0 24px 90px rgba(0,0,0,0.7), 0 0 60px ${color}12`, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-.01em' }}>{title}</h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.6)' }} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Banner({ kind, text }: { kind: 'error' | 'ok'; text: string }) {
  const c = kind === 'error' ? C.danger : C.milestone;
  return <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 12px', borderRadius: 10, background: `${c}12`, border: `1px solid ${c}35`, margin: '10px 0' }}>
    {kind === 'error' ? <AlertTriangle style={{ width: 13, height: 13, color: c, flexShrink: 0, marginTop: 1 }} /> : <CheckCircle2 style={{ width: 13, height: 13, color: c, flexShrink: 0, marginTop: 1 }} />}
    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{text}</span>
  </div>;
}
function Btn({ color, onClick, children, disabled, ghost }: { color: string; onClick?: () => void; children: React.ReactNode; disabled?: boolean; ghost?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 15px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, color: ghost ? color : 'white', background: ghost ? `${color}14` : `linear-gradient(90deg,${color}cc,${color}88)`, border: `1px solid ${color}55`, fontFamily: 'inherit' }}>{children}</button>;
}

// ─── Downloadable documents (the three PS-mandated templates + GeM export) ────
function download(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const TPL_PROBLEM = `# Sanyog — Problem Statement Template (Stage 1)

**Reference No.:** SNY/____/____/____        **Department:** ____________________
**Nodal Officer:** ____________________      **Domain:** ____________________

## 1. Operational pain point
Describe the problem as experienced, not the product imagined.

## 2. Outcome sought
What does "solved" look like, in the department's own operations?

## 3. Baseline vs target — MANDATORY
A challenge without a measured baseline can never be validated.

| Metric | Baseline (today) | Target | Unit | Direction | Window (days) |
|---|---|---|---|---|---|
| | | | | increase / decrease | |

## 4. Sandbox parameters (Stage 4 boundary conditions)
- Scope / sites: ____________________     - Max users exposed: ______
- Data shared: ____________________       - Anonymised: YES / NO
- Data localised in India: YES (default — CERT-In direction (iv): 180-day logs in India)
- Exit date (mandatory): __________       - One extension permitted: YES / NO

## 5. Security clearance checklist (gates pilot start)
- [ ] Audit by a CERT-In empanelled organisation BEFORE hosting
      (CERT-In Guidelines for Government Entities, Annexure 1 cl. 5.2 / 5.19)
- [ ] ISO/IEC 27001 — edition **:2022** only (:2013 expired 31 Oct 2025)
- [ ] Hosting on government DC or MeitY-empanelled cloud (cl. 5.1)
- [ ] 6-hour incident reporting path + named Point of Contact (CERT-In Directions 2022)
- [ ] DPDP: documented safeguards; processor contract per s.8(2)

## 6. Eligibility posture (defaults, not discretion)
- DPIIT/Startup India recognition required: YES / NO
- Prior turnover relaxed (GFR 2017 Rule 173(i)): **YES**
- Prior experience relaxed (GFR 2017 Rule 173(i)): **YES**
- EMD exempt (GFR 2017 Rule 170(i)): **YES**
- Quality & technical specifications: **NEVER relaxed**

## 7. Pilot budget & clocks
- Maximum pilot budget (₹): __________    - Pilot duration (days): ______
- Panel evaluation window: ____ days; if the panel misses it, the application
  is DEEMED to advance (Telangana G.O.Ms.No.08 model).
`;
const TPL_MOU = `# Sanyog — Pilot Agreement / MOU Template (Stage 5)

Between **[Department]** ("the Department") and **[Startup]** ("the Provider"),
for the pilot under challenge **[Reference No.]**.

## 1. Scope & duration
Bounded to the sandbox parameters in the challenge statement. Start: ____
Exit (mandatory): ____. One extension only, by written approval.

## 2. Intellectual property — default position
- Background IP remains with the party that brought it.
- **Arising/foreground IP vests in the Provider.**
- The Department receives a **perpetual, non-exclusive, royalty-free licence
  for its own internal use** (UK SBRI Condition 27 model).
- Non-exploitation march-in: if the Provider does not commercially exploit the
  arising IP within 5 years, the Department may require licensing to third parties.

## 3. Data governance & cybersecurity
- Personal data anonymised before entering the sandbox; DPDP Act 2023 s.8(5)
  safeguards apply; processor engagement under a valid contract (s.8(2)).
- ICT logs retained 180 days within Indian jurisdiction (CERT-In Directions 2022 (iv)).
- Security clearance from a CERT-In empanelled auditor precedes go-live.
- On exit or termination, participant personal data is erased (IRDAI Reg 11(5) model).

## 4. Milestone payments (Stage 6)
| # | Trigger | % | Type |
|---|---|---|---|
| 1 | Signature + bank guarantee | 30% | Mobilisation advance (GFR Rule 172 ceiling) |
| 2 | Mid-term KPI demonstration, verified | 40% | Performance milestone |
| 3 | Independent validation report | 30% | Performance milestone |

Payment within **45 days** of the appointed day (MSMED Act 2006 s.15 — an
absolute ceiling); default interest at 3× the RBI bank rate, compounded
monthly (s.16). No release without a recorded verification.

## 5. Liability & indemnity
- Aggregate liability capped at **the greater of the contract value ×2 or ₹__**
  (UK pre-commercial convention). Never capped: death/personal injury by
  negligence, fraud, IP indemnity.
- Regulatory penalty relief inside the sandbox does not limit civil liability
  to third parties (EU AI Act Art. 57(12) model).

## 6. Exit & withdrawal — filed BEFORE testing begins
- Exit strategy (success): handover, licence grant, transition plan.
- Withdrawal strategy (failure/termination): removal, data deletion,
  settlement of all obligations within 14 days.

## 7. Validation & scale-up
KPIs, baselines, targets and go/no-go thresholds are locked at signature and
cannot be amended after measurement begins. Scale-up follows the platform gate:
satisfactory reports from three or more government clients.
`;
function scorecardMd(p: Pathway | null): string {
  const s = computeScorecard(p);
  return `# Sanyog — Scale-Up Evaluation Scorecard (Stage 8)

**Solution:** ${p?.startup.name ?? '____________'}    **Date:** ${new Date().toLocaleDateString('en-IN')}

Normalised to 100. A solution below 60, or failing any go/no-go KPI, does not scale.

| Dimension | Weight | Score | Basis |
|---|---|---|---|
| Pilot success (validated KPIs) | 40 | ${s.pilot}/40 | go/no-go + verdicts vs locked targets |
| Cost–benefit | 20 | ${s.cost}/20 | measured impact against pilot spend |
| Security compliance | 20 | ${s.security}/20 | CERT-In clearance · ISO 27001:2022 · localisation |
| Scalability (multi-dept demand) | 20 | ${s.scale}/20 | departmental endorsements (gate: 3) |
| **TOTAL** | **100** | **${s.total}/100** | ${s.total >= 60 ? 'CLEARED FOR SCALE-UP' : 'NOT CLEARED'} |

**Procurement bridge:** on clearance, the validated solution proceeds to
compliant scale-up — GeM listing (Startup Runway) for direct purchase within
GFR Rule 149 thresholds (₹50,000 direct; ₹10 lakh L1-of-3; above that,
GeM bidding/RA), or rate-contract empanelment across districts — **without
restarting a multi-year tender** (precedent: 15 U.S.C. §638(r)(4); 10 U.S.C.
§4022(f): competitive entry + verified pilot = lawful non-competed follow-on).
`;
}
function computeScorecard(p: Pathway | null) {
  if (!p) return { pilot: 0, cost: 0, security: 0, scale: 0, total: 0 };
  const validated = p.kpis.filter(k => k.validation_verdict);
  const pilot = validated.length === 0 ? 0 : Math.round(40 * validated.reduce((a, k) => a + (k.validation_verdict === 'met' ? 1 : k.validation_verdict === 'partially_met' ? 0.6 : 0), 0) / validated.length);
  const released = p.milestones.filter(m => m.status === 'released').reduce((a, m) => a + (m.amount_inr ?? 0), 0);
  const cost = released === 0 ? 0 : Math.min(20, Math.round(20 * (validated.filter(k => k.validation_verdict !== 'not_met').length / Math.max(1, validated.length)) * (p.startup.funding_goal ? Math.min(1, released / p.startup.funding_goal) + 0.3 : 0.7)));
  const sb = p.sandboxes[0];
  const security = sb ? (sb.security_audit_status === 'cleared' ? 12 : 0) + (sb.iso_27001_edition === '2022' ? 4 : 0) + (sb.data_localised_in_india ? 4 : 0) : 0;
  const scale = Math.min(20, (p.gate.satisfactory_count ?? 0) * 6 + (p.gate.gate_unlocked ? 2 : 0));
  return { pilot, cost, security, scale, total: pilot + cost + security + scale };
}
function gemExportMd(p: Pathway): string {
  const app = p.applications.find(a => a.challenges) ?? p.applications[0];
  return `# GeM Listing Draft — ${p.startup.name}
Generated by Sanyog on ${new Date().toLocaleDateString('en-IN')} · basis: validated pilot + scale-up gate

**Route:** GeM Startup Runway (DPIIT-recognised; prior turnover, prior experience
and EMD exemptions apply at platform level).
**Category note:** GFR Rule 149 — up to ₹50,000 direct purchase; ₹50,000–₹10 lakh
lowest-price among ≥3 makers; above ₹10 lakh via GeM bidding/RA.

## Product / service
- Name: ${p.startup.name} — ${p.startup.tagline ?? ''}
- Domain: ${p.startup.industry ?? '—'} · Founder: ${p.startup.founder ?? '—'}
- DPIIT recognition: ${p.startup.dpiit_verified ? 'verified on record' : 'on record'}

## Evidence pack (attach)
- Challenge: ${app?.challenges?.reference_no ?? '—'} — ${app?.challenges?.title ?? '—'}
- Independent validation: ${p.kpis.filter(k => k.validation_verdict).map(k => `${k.kpi_description}: ${k.baseline_value} → ${k.measured_value} ${k.unit ?? ''} (${k.validation_verdict})`).join('; ') || 'pending'}
- Milestones released: ${p.milestones.filter(m => m.status === 'released').length}/${p.milestones.length}
- Departmental endorsements: ${p.endorsements.filter(e => e.verdict === 'satisfactory').map(e => e.department_name).join(', ') || 'none yet'} (gate ${p.gate.satisfactory_count}/3${p.gate.gate_unlocked ? ' — UNLOCKED' : ''})
- Security: ${p.sandboxes[0] ? `CERT-In empanelled audit ${p.sandboxes[0].security_audit_status}; ISO/IEC 27001:${p.sandboxes[0].iso_27001_edition ?? '—'}` : '—'}
`;
}

// ─── The stage stepper ────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, key: 'challenge', label: 'Challenge', color: C.challenge, Icon: Landmark },
  { n: 2, key: 'screen', label: 'Screened', color: C.screen, Icon: BadgeCheck },
  { n: 3, key: 'evaluate', label: 'Evaluated', color: C.evaluate, Icon: Scale },
  { n: 4, key: 'sandbox', label: 'Sandbox', color: C.sandbox, Icon: FlaskConical },
  { n: 5, key: 'contract', label: 'Contract', color: C.contract, Icon: FileText },
  { n: 6, key: 'milestone', label: 'Milestones', color: C.milestone, Icon: Wallet },
  { n: 7, key: 'validate', label: 'Validated', color: C.validate, Icon: ShieldCheck },
  { n: 8, key: 'scale', label: 'Scaled', color: C.scale, Icon: Rocket },
] as const;
function stepState(p: Pathway | null, key: string): 'done' | 'active' | 'todo' {
  if (!p) return 'todo';
  const app = p.applications[0]; const sb = p.sandboxes[0];
  const map: Record<string, [boolean, boolean]> = {
    challenge: [!!app, !!app],
    screen: [app?.eligibility_status === 'eligible', !!app],
    evaluate: [p.scores.length > 0, app?.eligibility_status === 'eligible'],
    sandbox: [sb?.security_audit_status === 'cleared', !!sb],
    contract: [!!sb && (sb.status === 'active' || sb.status === 'completed'), !!sb],
    milestone: [p.milestones.length > 0 && p.milestones.every(m => m.status === 'released'), p.milestones.some(m => m.status !== 'pending')],
    validate: [p.kpis.length > 0 && p.kpis.every(k => !!k.validation_verdict), p.kpis.some(k => !!k.validation_verdict)],
    scale: [p.gate.gate_unlocked, p.endorsements.length > 0],
  };
  const [done, active] = map[key] ?? [false, false];
  return done ? 'done' : active ? 'active' : 'todo';
}

// ═════════════════════════════════════════════════════════════════════════════
export function PathwayTab({ mode }: { mode: 'startup' | 'department' }) {
  const { user } = useAuth();
  const isDept = mode === 'department';
  const accent = isDept ? '#06b6d4' : '#8b5cf6';

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  // solution picker (custom dropdown — the native <select> popup cannot be
  // themed and breaks the interface, especially on phones)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const pickerBtnRef = useRef<HTMLButtonElement | null>(null);
  const pickerPanelRef = useRef<HTMLDivElement | null>(null);
  const openPicker = () => {
    const r = pickerBtnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(300, Math.max(r.width, 230), window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
    const top = Math.min(r.bottom + 6, Math.max(60, window.innerHeight - 300));
    setPickerPos({ top, left, width });
    setPickerOpen(true);
  };
  useEffect(() => {
    if (!pickerOpen) return;
    const close = () => setPickerOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (pickerPanelRef.current?.contains(t) || pickerBtnRef.current?.contains(t)) return;
      close();
    };
    const onScroll = (e: Event) => {
      if (pickerPanelRef.current && e.target instanceof Node && pickerPanelRef.current.contains(e.target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);
  const selectedSolution = solutions.find(s => s.id === selectedId);

  // modals
  const [newChallengeOpen, setNewChallengeOpen] = useState(false);
  const [applyFor, setApplyFor] = useState<Challenge | null>(null);
  const [scoreFor, setScoreFor] = useState<string | null>(null);   // application_id
  const [kpiFor, setKpiFor] = useState<Pathway['kpis'][number] | null>(null);
  const [endorseOpen, setEndorseOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState<null | 'problem' | 'mou' | 'scorecard'>(null);
  const [detail, setDetail] = useState<Challenge | null>(null);

  const flash = (kind: 'error' | 'ok', text: string) => { setNotice({ kind, text }); setTimeout(() => setNotice(n => (n?.text === text ? null : n)), 6000); };

  const loadBoard = useCallback(async () => {
    try {
      const [ch, so] = await Promise.all([
        fetch('/api/challenges').then(r => r.json()),
        fetch('/api/pathway/solutions').then(r => r.json()),
      ]);
      if (Array.isArray(ch)) setChallenges(ch);
      if (Array.isArray(so)) {
        // Furthest along the pathway first, so the drill-down opens on the
        // solution with the most story to tell.
        const rank: Record<string, number> = { Scaled: 5, Validated: 4, 'In Pilot': 3, Screened: 2, Applied: 1 };
        const sorted = [...so].sort((a, b) => (rank[b.stage] ?? 0) - (rank[a.stage] ?? 0) || b.pitch_score - a.pitch_score);
        setSolutions(sorted); setSelectedId(prev => prev || sorted[0]?.id || '');
      }
    } catch { flash('error', 'Could not reach the pathway API — is the server running and the sanyog migrations applied?'); }
    finally { setLoading(false); }
  }, []);
  const loadPathway = useCallback(async (id: string) => {
    if (!id) return;
    try { const r = await fetch(`/api/pathway?startup_id=${encodeURIComponent(id)}`); const d = await r.json(); if (r.ok) setPathway(d); }
    catch { /* board still renders */ }
  }, []);
  useEffect(() => { loadBoard(); }, [loadBoard]);
  useEffect(() => { loadPathway(selectedId); }, [selectedId, loadPathway]);

  const post = async (url: string, body: unknown, okMsg: string) => {
    setBusy(true);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { flash('error', d.error || `Request failed (${r.status}).`); return false; }
      flash('ok', okMsg);
      await Promise.all([loadBoard(), loadPathway(selectedId)]);
      return true;
    } catch { flash('error', 'Network error — the request did not reach the server.'); return false; }
    finally { setBusy(false); }
  };

  const gate = pathway?.gate ?? { satisfactory_count: 0, gate_unlocked: false };
  const releasedTotal = useMemo(() => (pathway?.milestones ?? []).filter(m => m.status === 'released').reduce((a, m) => a + (m.amount_inr ?? 0), 0), [pathway]);
  const scorecard = computeScorecard(pathway);
  const openChallenges = challenges.filter(c => c.status === 'published' || c.status === 'evaluating');

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', borderRadius: 18 }}>
      {/* the star-sea lives behind everything; content scrolls above it */}
      <PathwayCosmos accent={accent} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 10%, rgba(5,5,12,0) 45%, rgba(5,5,12,0.5) 100%)' }} />
      <div className="pathway-scroll" style={{ position: 'relative', zIndex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, flexShrink: 0 }}>
        {[
          { label: 'Open Challenges', val: String(openChallenges.length), sub: 'accepting applications', color: C.challenge, Icon: Landmark },
          { label: 'Solutions on Pathway', val: String(solutions.length), sub: 'verified & live', color: C.screen, Icon: GitBranch },
          { label: 'Released via Milestones', val: fmtL(solutions.reduce((a, s) => a + (s.raised || 0), 0)), sub: 'against verified gates', color: C.milestone, Icon: Wallet },
          { label: 'Scale-Up Gates Open', val: String(solutions.filter(s => s.stage === 'Scaled').length), sub: '3+ dept endorsements', color: C.scale, Icon: Rocket },
        ].map((k, i) => (
          <Card key={k.label} color={k.color} style={{ padding: '13px 16px' }} holo={(['poly4', 'poly8', 'poly12', 'poly20'] as const)[i]}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Label>{k.label}</Label>
                <p className="metric" style={{ fontSize: 21, fontWeight: 700, color: 'white', margin: '2px 0 2px' }}>{k.val}</p>
                <p style={{ fontSize: 10, color: k.color, margin: 0, opacity: .85 }}>{k.sub}</p>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `${k.color}16`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><k.Icon style={{ width: 14, height: 14, color: k.color }} /></div>
            </div>
          </Card>
        ))}
      </div>

      {notice && <div style={{ flexShrink: 0 }}><Banner kind={notice.kind} text={notice.text} /></div>}

      {/* ── Two-column body ── */}
      {/* rigid frame: the page never scrolls — each column scrolls inside a
          shared grid row, so both columns start and end on the same lines */}
      <div className="pathway-cols" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 14, flex: 1, minHeight: 0 }}>

        {/* ══ LEFT: challenge board + templates — its own scroll lane ══ */}
        <div className="analytics-scroll pathway-left" style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
          <Card color={C.challenge} style={{ padding: 16 }} holo="planet" holoPos="br">
            <SectionHead Icon={Landmark} color={C.challenge} title="Challenge Board" tag="STAGE 1" mb={12}
              right={isDept ? <button onClick={() => setNewChallengeOpen(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, color: 'white', background: `linear-gradient(90deg,${C.challenge},#6d28d9)`, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px ${C.challenge}44` }}><Plus style={{ width: 11, height: 11 }} />New Challenge</button> : undefined} />
            {loading && <p style={{ fontSize: 12, color: C.dim }}>Loading challenges…</p>}
            {!loading && challenges.length === 0 && (
              <div style={{ textAlign: 'center', padding: '22px 8px', opacity: .55 }}>
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', margin: '0 0 6px' }}>No challenges published yet.</p>
                <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{isDept ? 'Publish the first one from the Problem Statement Template.' : 'Departments publish outcome-based challenges here — check back soon.'}</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {challenges.map(ch => {
                const dc = DOMAIN_COLORS[ch.domain] ?? C.challenge;
                const dLeft = daysUntil(ch.closes_on);
                return (
                  <div key={ch.id} onClick={() => setDetail(ch)}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-2px)'; el.style.borderColor = `${dc}55`; el.style.boxShadow = `0 10px 28px rgba(0,0,0,.45), 0 0 20px ${dc}22`; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.borderColor = `${dc}24`; el.style.boxShadow = ''; }}
                    style={{ position: 'relative', overflow: 'hidden', borderRadius: 13, border: `1px solid ${dc}24`, background: `linear-gradient(135deg,${dc}0c, rgba(4,4,12,.6))`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '12px 13px 12px 16px', cursor: 'pointer', transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease' }}>
                    {/* each challenge carries its own constellation, seeded by its reference no. */}
                    <Constellation seed={ch.reference_no} color={dc} />
                    <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${dc}cc, ${dc}11)`, zIndex: 1 }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span className="metric" style={{ fontSize: 9, color: dc, fontWeight: 600 }}>{ch.reference_no}</span>
                      <Pill text={ch.domain} color={dc} />
                      <Pill text={ch.status.toUpperCase()} color={ch.status === 'published' ? C.milestone : ch.status === 'awarded' ? C.scale : C.sandbox} />
                    </div>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: 'white', margin: '0 0 4px', lineHeight: 1.35 }}>{ch.title}</p>
                    <p style={{ fontSize: 10.5, color: C.dim, margin: '0 0 7px' }}>{ch.department_name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className="metric" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.7)' }}>{ch.baseline_value} → <b style={{ color: dc }}>{ch.target_value}</b> {ch.metric_unit}</span>
                      <span className="metric" style={{ fontSize: 10.5, color: C.milestone }}>{fmtL(ch.pilot_budget_inr)}</span>
                      {dLeft != null && ch.status === 'published' && <span style={{ fontSize: 9.5, color: dLeft < 0 ? C.danger : C.dim }}>{dLeft < 0 ? 'closed' : `${dLeft}d left`}</span>}
                      <span style={{ fontSize: 9.5, color: C.dim, marginLeft: 'auto' }}>{ch.application_count} applicant{ch.application_count === 1 ? '' : 's'}</span>
                    </div>
                    {mode === 'startup' && (ch.status === 'published' || ch.status === 'evaluating') && (
                      <div style={{ marginTop: 8 }}>
                        <Btn color={dc} onClick={() => setApplyFor(ch)} ghost>Apply <ArrowRight style={{ width: 11, height: 11 }} /></Btn>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Templates library — the three documents the problem statement demands */}
          <Card color={C.contract} style={{ padding: 16 }} holo="crystal">
            <SectionHead Icon={FileText} color={C.contract} title="Standard Templates" tag="MANDATED · 3" />
            {[
              { key: 'problem' as const, name: 'Problem Statement Template', sub: 'Baseline–target matrix · sandbox parameters · security checklist', color: C.challenge },
              { key: 'mou' as const, name: 'Pilot Agreement (MOU)', sub: 'IP with startup · liability caps · data localisation · milestone triggers', color: C.contract },
              { key: 'scorecard' as const, name: 'Scale-Up Evaluation Scorecard', sub: '100-point: pilot success · cost-benefit · security · scalability', color: C.scale },
            ].map(t => (
              <div key={t.key} onClick={() => setTplOpen(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 11, background: `${t.color}0a`, border: `1px solid ${t.color}1e`, marginBottom: 7, cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${t.color}16`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText style={{ width: 13, height: 13, color: t.color }} /></div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: 'white', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 9.5, color: C.dim, margin: '2px 0 0', lineHeight: 1.4 }}>{t.sub}</p>
                </div>
                <Download style={{ width: 12, height: 12, color: C.dim, marginLeft: 'auto', flexShrink: 0 }} />
              </div>
            ))}
          </Card>
        </div>

        {/* ══ RIGHT: the pathway for one solution — its own scroll lane ══ */}
        <div className="analytics-scroll pathway-right" style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>

          {/* selector + stepper */}
          <Card color={accent} style={{ padding: 16 }} holo="gyro" holoPos="br">
            <SectionHead Icon={GitBranch} color={accent} title="Procurement Pathway" tag="ALL 8 STAGES" mb={13}
              right={
                <button ref={pickerBtnRef} className="pw-select" onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
                  style={{ ...inputStyle, width: 'auto', minWidth: 200, maxWidth: 280, padding: '7px 12px', fontSize: 12, marginLeft: 'auto', background: 'rgba(10,10,22,0.9)', border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'white' }}>
                  {selectedSolution && <span style={{ width: 7, height: 7, borderRadius: '50%', background: SOL_STAGE_COLORS[selectedSolution.stage] ?? accent, boxShadow: `0 0 8px ${SOL_STAGE_COLORS[selectedSolution.stage] ?? accent}`, flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {selectedSolution ? selectedSolution.name : 'No solutions yet'}
                  </span>
                  <ChevronDown style={{ width: 13, height: 13, color: accent, marginLeft: 'auto', flexShrink: 0, transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
              } />
            {pathway && (
              <p style={{ fontSize: 11, color: C.dim, margin: '0 0 12px', lineHeight: 1.5 }}>
                <b style={{ color: 'rgba(255,255,255,.75)' }}>{pathway.startup.name}</b> · {pathway.startup.tagline} — {pathway.startup.founder} · FitScore™ <span className="metric" style={{ color: accent }}>{pathway.startup.pitch_score}</span>
              </p>
            )}
            <div className="pathway-stepper" style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
              {STEPS.map((s, i) => {
                const st = stepState(pathway, s.key);
                const col = st === 'todo' ? 'rgba(255,255,255,0.18)' : s.color;
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 74 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
                      {/* a live 3D planet per stage: gray while pending, lit in the
                          stage colour once reached, check-badged when complete */}
                      <div style={{ position: 'relative', width: 34, height: 34 }}>
                        <MiniPlanet color={s.color} dim={st === 'todo'} glow={st !== 'todo'} />
                        {st === 'done' && (
                          <div style={{ position: 'absolute', bottom: -2, right: -4, width: 13, height: 13, borderRadius: '50%', background: s.color, border: '1.5px solid #05050c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 style={{ width: 9, height: 9, color: '#04040c' }} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: st === 'todo' ? C.dim : s.color, textAlign: 'center' }}>{s.n}. {s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div style={{ height: 1.5, flexShrink: 0, width: 12, marginTop: 17, background: st === 'done' ? s.color : 'rgba(255,255,255,0.1)' }} />}
                  </div>
                );
              })}
            </div>
          </Card>

          {pathway && (<>
            {/* ── Stage 2/3: application + panel ── */}
            <Card color={C.evaluate} style={{ padding: 16 }} holo="binary">
              <SectionHead Icon={Scale} color={C.evaluate} title="Application & Panel Evaluation" tag="STAGES 2–3" />
              {pathway.applications.length === 0 && <p style={{ fontSize: 11.5, color: C.dim, margin: 0 }}>No application yet — {mode === 'startup' ? 'apply to a challenge from the board on the left.' : 'this solution has not applied to any challenge.'}</p>}
              {pathway.applications.map(app => (
                <div key={app.id} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: `radial-gradient(circle at 92% -10%, ${C.evaluate}10, transparent 60%), rgba(255,255,255,0.02)`, padding: 12, marginBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span className="metric" style={{ fontSize: 10, color: C.challenge }}>{app.challenges?.reference_no}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{app.challenges?.title ?? 'Challenge'}</span>
                    <Pill text={app.eligibility_status.toUpperCase()} color={app.eligibility_status === 'eligible' ? C.milestone : app.eligibility_status === 'ineligible' ? C.danger : C.sandbox} />
                    {isDept && app.eligibility_status === 'eligible' && <span style={{ marginLeft: 'auto' }}><Btn color={C.evaluate} ghost onClick={() => setScoreFor(app.id)}>Score on rubric</Btn></span>}
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', margin: '0 0 8px', lineHeight: 1.55 }}>{app.proposal_summary}</p>
                  {app.eligibility_status === 'eligible' && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      <Pill text="TURNOVER WAIVED · GFR 173(i)" color={C.milestone} />
                      <Pill text="EXPERIENCE WAIVED · GFR 173(i)" color={C.milestone} />
                      <Pill text="EMD EXEMPT · GFR 170(i)" color={C.milestone} />
                      <Pill text="QUALITY CRITERIA APPLY IN FULL" color={C.sandbox} />
                    </div>
                  )}
                  {app.ineligible_reason && <Banner kind="error" text={app.ineligible_reason} />}
                  {(() => {
                    const sc = pathway.scores.filter(s => s.application_id === app.id);
                    if (!sc.length) return <p style={{ fontSize: 10.5, color: C.dim, margin: 0 }}>Awaiting panel scores — dual axis, 0–50 each: technical viability + innovation quotient.{app.challenges?.deemed_approval ? ` If the panel misses its ${app.challenges?.evaluation_days ?? 30}-day window, the application is deemed to advance.` : ''}</p>;
                    const avg = sc.reduce((a, x) => a + x.total_score, 0) / sc.length;
                    return (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
                          <span className="metric" style={{ fontSize: 17, fontWeight: 700, color: C.evaluate }}>{avg.toFixed(1)}</span>
                          <span style={{ fontSize: 10, color: C.dim }}>panel consensus / 100 · {sc.length} evaluator{sc.length > 1 ? 's' : ''}</span>
                        </div>
                        {sc.map(s => (
                          <div key={s.id} style={{ padding: '7px 10px', borderRadius: 9, background: `${C.evaluate}08`, border: `1px solid ${C.evaluate}18`, marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{s.evaluator_name}</span>
                              <span style={{ fontSize: 9.5, color: C.dim }}>{s.evaluator_org}</span>
                              {s.conflict_declared && <Pill text="CONFLICT DECLARED" color={C.danger} />}
                              <span className="metric" style={{ marginLeft: 'auto', fontSize: 11, color: C.evaluate }}>T {s.technical_viability} · I {s.innovation_quotient} = {s.total_score}</span>
                            </div>
                            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)', margin: '5px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>"{s.rationale}"</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </Card>

            {/* ── Stage 4/5: sandbox + contract ── */}
            <Card color={C.sandbox} style={{ padding: 16 }} holo="cage">
              <SectionHead Icon={FlaskConical} color={C.sandbox} title="Governed Sandbox & Contract" tag="STAGES 4–5" />
              {pathway.sandboxes.length === 0 && <p style={{ fontSize: 11.5, color: C.dim, margin: 0 }}>No sandbox agreement yet. One opens after evaluation — with a fixed exit date, security clearance, and IP retained by the startup.</p>}
              {pathway.sandboxes.map(sb => {
                const dLeft = daysUntil(sb.exit_on);
                return (
                  <div key={sb.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 11 }}>
                    <Field label="Department"><p style={{ fontSize: 11.5, color: 'white', margin: 0, fontWeight: 600 }}>{sb.department_name}</p></Field>
                    <Field label="Security Clearance">
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <Pill text={sb.security_audit_status.replace('_', ' ').toUpperCase()} color={sb.security_audit_status === 'cleared' ? C.milestone : sb.security_audit_status === 'failed' ? C.danger : C.sandbox} />
                        {sb.iso_27001_edition && <Pill text={`ISO 27001:${sb.iso_27001_edition}`} color={sb.iso_27001_edition === '2022' ? C.milestone : C.danger} />}
                      </div>
                      {sb.security_auditor && <p style={{ fontSize: 9.5, color: C.dim, margin: '4px 0 0' }}>{sb.security_auditor}</p>}
                    </Field>
                    <Field label="Window">
                      <p className="metric" style={{ fontSize: 11, color: 'white', margin: 0 }}>{fmtDate(sb.starts_on)} → {fmtDate(sb.exit_on)}</p>
                      <p style={{ fontSize: 9.5, color: sb.status === 'active' ? (dLeft != null && dLeft < 14 ? C.danger : C.sandbox) : C.dim, margin: '3px 0 0' }}>{sb.status === 'active' ? (dLeft != null && dLeft >= 0 ? `${dLeft} days to mandatory exit` : 'EXIT DATE PASSED') : sb.status.toUpperCase()}</p>
                    </Field>
                    <Field label="IP Position"><p style={{ fontSize: 10.5, color: sb.ip_retained_by_startup ? C.milestone : C.danger, margin: 0, fontWeight: 700 }}>{sb.ip_retained_by_startup ? 'RETAINED BY STARTUP' : 'ASSIGNED TO DEPT'}</p><p style={{ fontSize: 9.5, color: C.dim, margin: '3px 0 0', lineHeight: 1.4 }}>{sb.govt_licence_scope}</p></Field>
                    <Field label="Data Governance">
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {sb.data_anonymised && <Pill text="ANONYMISED" color={C.screen} />}
                        {sb.data_localised_in_india && <Pill text="DATA IN INDIA" color={C.screen} />}
                      </div>
                    </Field>
                    <Field label="Liability Cap"><p className="metric" style={{ fontSize: 11.5, color: 'white', margin: 0 }}>{fmtL(sb.liability_cap_inr)}</p></Field>
                    <Field span label="Scope"><p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', margin: 0, lineHeight: 1.5 }}>{sb.scope}{sb.sites ? ` · ${sb.sites}` : ''}</p></Field>
                    {(sb.exit_strategy || sb.withdrawal_strategy) && (
                      <Field span label="Exit & Withdrawal (filed before testing began)">
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,.42)', margin: 0, lineHeight: 1.5 }}>{sb.exit_strategy}{sb.withdrawal_strategy ? ` — On withdrawal: ${sb.withdrawal_strategy}` : ''}</p>
                      </Field>
                    )}
                  </div>
                );
              })}
            </Card>

            {/* ── Stage 6: milestones ── */}
            <Card color={C.milestone} style={{ padding: 16 }} holo="rings">
              <SectionHead Icon={Wallet} color={C.milestone} title="Milestone Payments" tag="STAGE 6" mb={4}
                right={<span className="metric" style={{ marginLeft: 'auto', fontSize: 12, color: C.milestone, background: `${C.milestone}10`, border: `1px solid ${C.milestone}2e`, padding: '3px 10px', borderRadius: 999 }}>{fmtL(releasedTotal)} released</span>} />
              <p style={{ fontSize: 10, color: C.dim, margin: '0 0 12px', lineHeight: 1.5 }}>30% mobilisation advance (GFR Rule 172 ceiling) → 40% mid-term KPI demo → 30% independent validation. MSMED s.15: release within 45 days of verification — the clock below is that rule made visible.</p>
              {pathway.milestones.length === 0 && <p style={{ fontSize: 11.5, color: C.dim, margin: 0 }}>Milestones are set when the sandbox agreement is signed.</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {pathway.milestones.map(m => {
                  const due = daysUntil(m.due_by);
                  const stCol = m.status === 'released' ? C.milestone : m.status === 'verified' ? C.screen : m.status === 'in_review' ? C.sandbox : m.status === 'rejected' ? C.danger : 'rgba(255,255,255,0.3)';
                  return (
                    <div key={m.id} style={{ borderRadius: 13, border: `1px solid ${stCol}30`, background: `radial-gradient(circle at 90% -8%, ${stCol}16, transparent 55%), linear-gradient(160deg,${stCol}0c, rgba(4,4,12,.8))`, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <span className="metric" style={{ fontSize: 15, fontWeight: 700, color: stCol }}>{m.pct}%</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'white' }}>{m.label}</span>
                      </div>
                      <Pill text={m.status.replace('_', ' ').toUpperCase()} color={stCol} solid={m.status === 'released'} />
                      <p className="metric" style={{ fontSize: 13, color: 'white', margin: '8px 0 3px' }}>{fmtL(m.amount_inr)}</p>
                      <p style={{ fontSize: 9.5, color: C.dim, margin: 0, lineHeight: 1.45 }}>{m.trigger_detail}</p>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {m.verified_at && <span style={{ fontSize: 9.5, color: C.screen }}>✓ verified {fmtDate(m.verified_at)} · {m.verified_by}</span>}
                        {m.released_at && <span style={{ fontSize: 9.5, color: C.milestone }}>₹ released {fmtDate(m.released_at)}</span>}
                        {!m.released_at && m.due_by && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: due != null && due < 0 ? C.danger : due != null && due <= 7 ? C.sandbox : C.dim }}>
                            <Clock4 style={{ width: 10, height: 10 }} />{due != null && due < 0 ? `OVERDUE ${-due}d — MSMED s.16 interest accruing (3× bank rate)` : `due by ${fmtDate(m.due_by)} (45-day clock)`}
                          </span>
                        )}
                      </div>
                      {isDept && m.status !== 'released' && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                          {m.status !== 'verified' && <Btn color={C.screen} disabled={busy} onClick={() => post('/api/milestones/verify', { milestone_id: m.id }, `Tranche ${m.seq} verified.`)}>Verify</Btn>}
                          <Btn color={C.milestone} disabled={busy || !m.verified_at} onClick={() => post('/api/milestones/release', { milestone_id: m.id }, `Tranche ${m.seq} released — ${fmtL(m.amount_inr)}.`)}>Release ₹</Btn>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ── Stage 7: validation ── */}
            <Card color={C.validate} style={{ padding: 16 }} holo="orbit">
              <SectionHead Icon={ShieldCheck} color={C.validate} title="Independent Validation" tag="STAGE 7" mb={4} />
              <p style={{ fontSize: 10, color: C.dim, margin: '0 0 12px', lineHeight: 1.5 }}>Targets are locked before measurement begins (pre-registration) — nobody moves the goalposts, in either direction. The validator supplies the measurement; the verdict is computed against the locked target.</p>
              {pathway.kpis.length === 0 && <p style={{ fontSize: 11.5, color: C.dim, margin: 0 }}>KPIs are locked in from the challenge's baseline–target matrix when the pilot starts.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {pathway.kpis.map(k => {
                  const vCol = k.validation_verdict === 'met' ? C.milestone : k.validation_verdict === 'partially_met' ? C.sandbox : k.validation_verdict === 'not_met' ? C.danger : 'rgba(255,255,255,0.3)';
                  return (
                    <div key={k.id} style={{ borderRadius: 12, border: `1px solid ${vCol}28`, background: `radial-gradient(circle at 92% -10%, ${vCol}12, transparent 60%), rgba(255,255,255,0.02)`, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'white' }}>{k.kpi_description}</span>
                        {k.is_go_no_go && <Pill text={`GO/NO-GO · gate ${k.go_no_go_threshold}${k.unit ? ' ' + k.unit : ''}`} color={C.danger} />}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: C.dim, marginLeft: 'auto' }}><Lock style={{ width: 9, height: 9 }} />locked {fmtDate(k.locked_at)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                        <div><Label>Baseline</Label><span className="metric" style={{ fontSize: 15, color: 'rgba(255,255,255,.65)' }}>{k.baseline_value}</span></div>
                        <ArrowRight style={{ width: 13, height: 13, color: C.dim, alignSelf: 'center' }} />
                        <div><Label>Target ({k.direction})</Label><span className="metric" style={{ fontSize: 15, color: C.validate }}>{k.target_value}</span></div>
                        <div><Label>Measured</Label><span className="metric" style={{ fontSize: 17, fontWeight: 700, color: k.measured_value != null ? vCol : C.dim }}>{k.measured_value ?? '—'}</span> <span style={{ fontSize: 9.5, color: C.dim }}>{k.unit}</span></div>
                        {k.validation_verdict && <Pill text={k.validation_verdict.replace('_', ' ').toUpperCase()} color={vCol} solid />}
                        {isDept && !k.validation_verdict && <span style={{ marginLeft: 'auto' }}><Btn color={C.validate} ghost onClick={() => setKpiFor(k)}>Record measurement</Btn></span>}
                      </div>
                      {(k.validator_org || k.data_source) && <p style={{ fontSize: 9.5, color: C.dim, margin: '7px 0 0' }}>{k.validator_org ? `Validated by ${k.validator_org} · ${fmtDate(k.validated_at)}` : `Source: ${k.data_source}`}{k.validation_note ? ` — ${k.validation_note}` : ''}</p>}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ── Stage 8: scale-up gate ── */}
            <Card color={C.scale} style={{ padding: 16 }} holo="halo" holoPos="br">
              <SectionHead Icon={Rocket} color={C.scale} title="Scale-Up Gate" tag="STAGE 8" note="unlocks on 3 satisfactory departmental reports (Odisha model)"
                right={isDept ? <span style={{ marginLeft: 'auto' }}><Btn color={C.scale} ghost onClick={() => setEndorseOpen(true)}>Endorse pilot</Btn></span> : undefined} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 7 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < gate.satisfactory_count ? C.scale : 'rgba(255,255,255,0.05)', border: `1.5px solid ${i < gate.satisfactory_count ? C.scale : 'rgba(255,255,255,0.14)'}` }}>
                      {i < gate.satisfactory_count ? <Building2 style={{ width: 15, height: 15, color: '#04040c' }} /> : <Building2 style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.22)' }} />}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="metric" style={{ fontSize: 15, fontWeight: 700, color: gate.gate_unlocked ? C.scale : 'white', margin: 0 }}>{gate.satisfactory_count} / 3 {gate.gate_unlocked && '· GATE UNLOCKED'}</p>
                  <p style={{ fontSize: 10, color: C.dim, margin: '2px 0 0' }}>{gate.gate_unlocked ? 'Cleared for compliant multi-department deployment — no fresh tender.' : 'Satisfactory endorsements from distinct departments.'}</p>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <Label>Scale-Up Scorecard</Label>
                  <p className="metric" style={{ fontSize: 19, fontWeight: 700, color: scorecard.total >= 60 ? C.scale : C.sandbox, margin: 0 }}>{scorecard.total}<span style={{ fontSize: 10, color: C.dim }}>/100</span></p>
                </div>
              </div>
              {pathway.endorsements.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 11px', borderRadius: 10, background: `${e.verdict === 'satisfactory' ? C.scale : C.danger}0a`, border: `1px solid ${e.verdict === 'satisfactory' ? C.scale : C.danger}20`, marginBottom: 6 }}>
                  {e.verdict === 'satisfactory' ? <CheckCircle2 style={{ width: 13, height: 13, color: C.scale, flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle style={{ width: 13, height: 13, color: C.danger, flexShrink: 0, marginTop: 1 }} />}
                  <div>
                    <p style={{ fontSize: 11.5, fontWeight: 700, color: 'white', margin: 0 }}>{e.department_name} <span style={{ fontWeight: 400, color: C.dim, fontSize: 9.5 }}>· {e.pilot_ref} · {fmtDate(e.created_at)}</span></p>
                    {e.note && <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', margin: '3px 0 0', lineHeight: 1.45 }}>{e.note}</p>}
                  </div>
                </div>
              ))}
              {gate.gate_unlocked && (
                <div style={{ marginTop: 10, padding: 13, borderRadius: 12, background: `linear-gradient(120deg,${C.scale}14, transparent)`, border: `1px solid ${C.scale}35` }}>
                  <p style={{ fontSize: 11.5, fontWeight: 800, color: C.scale, margin: '0 0 5px' }}>PROCUREMENT BRIDGE → GeM</p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)', margin: '0 0 10px', lineHeight: 1.55 }}>Validated and gate-cleared. Next compliant step: list on GeM (Startup Runway) with the evidence pack attached, for direct purchase within GFR Rule 149 thresholds — no fresh tender required.</p>
                  <Btn color={C.scale} onClick={() => { download(`GeM_listing_${pathway.startup.name.replace(/\s+/g, '_')}.md`, gemExportMd(pathway)); flash('ok', 'GeM listing draft downloaded with the full evidence pack.'); }}><Download style={{ width: 12, height: 12 }} />Export GeM listing draft</Btn>
                </div>
              )}
            </Card>
          </>)}
        </div>
      </div>

      {/* responsive rules: column collapse, modal + form behaviour on phones */}
      <style>{`
        @media (max-width: 900px){
          .pathway-cols{ grid-template-columns: 1fr !important; overflow-y: auto !important; }
          .pathway-left, .pathway-right{ overflow: visible !important; min-height: auto !important; }
        }
        .pathway-stepper{ scrollbar-width: none; }
        .pathway-stepper::-webkit-scrollbar{ display: none; }
        .pw-grid2{ display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px){
          .pw-grid2{ grid-template-columns: 1fr; }
          .pw-modal{ max-width: 100% !important; padding: 14px !important; max-height: 94vh !important; border-radius: 14px !important; }
          .pw-select{ width: 100% !important; margin-left: 0 !important; min-width: 0 !important; }
          .pathway-scroll{ gap: 10px !important; }
        }
      `}</style>

      {/* ════ MODALS ════ */}
      {detail && (
        <Modal title={detail.reference_no + ' — ' + detail.title} color={DOMAIN_COLORS[detail.domain] ?? C.challenge} onClose={() => setDetail(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
            <Field label="Department"><p style={{ fontSize: 12, color: 'white', margin: 0 }}>{detail.department_name}{detail.nodal_officer ? ` · ${detail.nodal_officer}` : ''}</p></Field>
            <Field label="Baseline → Target"><p className="metric" style={{ fontSize: 13, color: 'white', margin: 0 }}>{detail.baseline_value} → {detail.target_value} {detail.metric_unit} ({detail.metric_direction})</p></Field>
            <Field label="Pilot Budget · Duration"><p className="metric" style={{ fontSize: 13, color: C.milestone, margin: 0 }}>{fmtL(detail.pilot_budget_inr)} · {detail.pilot_duration_days}d</p></Field>
            <Field label="Window"><p style={{ fontSize: 11, color: 'white', margin: 0 }}>{fmtDate(detail.opens_on)} → {fmtDate(detail.closes_on)}</p></Field>
          </div>
          <Field span label="Problem"><p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6, margin: '0 0 10px' }}>{detail.problem_statement}</p></Field>
          <Field span label="Outcome Sought"><p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6, margin: '0 0 10px' }}>{detail.outcome_sought}</p></Field>
          {detail.operational_constraints && <Field span label="Operational Constraints"><p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', lineHeight: 1.6, margin: '0 0 10px' }}>{detail.operational_constraints}</p></Field>}
          {detail.data_available && <Field span label="Data the Department Shares"><p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', lineHeight: 1.6, margin: '0 0 10px' }}>{detail.data_available}</p></Field>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {detail.dpiit_required && <Pill text="DPIIT RECOGNITION REQUIRED" color={C.screen} />}
            {detail.turnover_relaxed && <Pill text="TURNOVER WAIVED · GFR 173(i)" color={C.milestone} />}
            {detail.experience_relaxed && <Pill text="EXPERIENCE WAIVED · GFR 173(i)" color={C.milestone} />}
            {detail.emd_exempt && <Pill text="EMD EXEMPT · GFR 170(i)" color={C.milestone} />}
            {detail.deemed_approval && <Pill text={`DEEMED APPROVAL AFTER ${detail.evaluation_days}D`} color={C.sandbox} />}
          </div>
          {mode === 'startup' && (detail.status === 'published' || detail.status === 'evaluating') && (
            <div style={{ marginTop: 14 }}><Btn color={DOMAIN_COLORS[detail.domain] ?? C.challenge} onClick={() => { setApplyFor(detail); setDetail(null); }}>Apply to this challenge <ArrowRight style={{ width: 12, height: 12 }} /></Btn></div>
          )}
        </Modal>
      )}

      {newChallengeOpen && <NewChallengeModal busy={busy} onClose={() => setNewChallengeOpen(false)} onSubmit={async b => { if (await post('/api/challenges/create', b, 'Challenge published to the board.')) setNewChallengeOpen(false); }} />}
      {applyFor && <ApplyModal challenge={applyFor} solutions={solutions} userEmail={user?.email ?? ''} busy={busy} onClose={() => setApplyFor(null)} onSubmit={async b => { if (await post('/api/challenges/apply', b, 'Application submitted — eligibility screened, GFR waivers recorded.')) setApplyFor(null); }} />}
      {scoreFor && <ScoreModal busy={busy} onClose={() => setScoreFor(null)} onSubmit={async b => { if (await post('/api/applications/score', { ...b, application_id: scoreFor }, 'Score recorded on the panel rubric.')) setScoreFor(null); }} />}
      {kpiFor && <KpiModal kpi={kpiFor} busy={busy} onClose={() => setKpiFor(null)} onSubmit={async b => { if (await post('/api/kpis/record', { ...b, kpi_id: kpiFor.id }, 'Measurement recorded — verdict computed against the locked target.')) setKpiFor(null); }} />}
      {/* solution picker panel — portaled to <body>, dark-glass, viewport-clamped */}
      {pickerOpen && pickerPos && createPortal(
        <div ref={pickerPanelRef} className="analytics-scroll" role="listbox"
          style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, width: pickerPos.width, maxHeight: 288, overflowY: 'auto', zIndex: 120, background: 'rgba(9,9,18,0.98)', border: `1px solid ${accent}33`, borderTop: `2px solid ${accent}88`, borderRadius: 12, boxShadow: `0 24px 70px rgba(0,0,0,.75), 0 0 40px ${accent}14`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: 6 }}>
          {solutions.map(s => {
            const sel = s.id === selectedId;
            const sc = SOL_STAGE_COLORS[s.stage] ?? accent;
            return (
              <button key={s.id} role="option" aria-selected={sel}
                onClick={() => { setSelectedId(s.id); setPickerOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: sel ? `${accent}1c` : 'transparent', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc, boxShadow: `0 0 8px ${sc}`, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? 'white' : 'rgba(255,255,255,0.78)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: sc, background: `${sc}14`, border: `1px solid ${sc}30`, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>{s.stage.toUpperCase()}</span>
                {sel && <Check style={{ width: 12, height: 12, color: accent, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}

      {endorseOpen && pathway && <EndorseModal startupName={pathway.startup.name} busy={busy} onClose={() => setEndorseOpen(false)} onSubmit={async b => { if (await post('/api/endorsements', { ...b, startup_id: pathway.startup.id }, 'Endorsement recorded.')) setEndorseOpen(false); }} />}

      {tplOpen && (
        <Modal title={tplOpen === 'problem' ? 'Problem Statement Template' : tplOpen === 'mou' ? 'Pilot Agreement (MOU) Template' : 'Scale-Up Evaluation Scorecard'} color={tplOpen === 'problem' ? C.challenge : tplOpen === 'mou' ? C.contract : C.scale} onClose={() => setTplOpen(null)} wide>
          <pre style={{ fontSize: 10.5, lineHeight: 1.6, color: 'rgba(255,255,255,.65)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, maxHeight: '52vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)' }} className="analytics-scroll">
            {tplOpen === 'problem' ? TPL_PROBLEM : tplOpen === 'mou' ? TPL_MOU : scorecardMd(pathway)}
          </pre>
          <div style={{ marginTop: 12 }}>
            <Btn color={C.contract} onClick={() => download(`Sanyog_${tplOpen}_template.md`, tplOpen === 'problem' ? TPL_PROBLEM : tplOpen === 'mou' ? TPL_MOU : scorecardMd(pathway))}><Download style={{ width: 12, height: 12 }} />Download</Btn>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}

// ─── New Challenge (the Problem Statement Template as a form) ─────────────────
function NewChallengeModal({ onClose, onSubmit, busy }: { onClose: () => void; onSubmit: (b: Record<string, unknown>) => void; busy: boolean }) {
  const [f, setF] = useState<Record<string, string | boolean>>({ metric_direction: 'decrease', pilot_duration_days: '180', dpiit_required: true, turnover_relaxed: true, experience_relaxed: true, emd_exempt: true });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title="Publish a Challenge — Problem Statement Template" color={C.challenge} onClose={onClose} wide>
      <div className="pw-grid2" style={{ gap: 11 }}>
        <Field span label="Title *"><input style={inputStyle} placeholder="e.g. Reduce non-revenue water in Zone 4" value={String(f.title ?? '')} onChange={set('title')} /></Field>
        <Field span label="Operational pain point *"><textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }} placeholder="Describe the problem as experienced — not the product imagined." value={String(f.problem_statement ?? '')} onChange={set('problem_statement')} /></Field>
        <Field span label="Outcome sought *"><textarea style={{ ...inputStyle, minHeight: 44, resize: 'vertical' }} placeholder="What does 'solved' look like in operations?" value={String(f.outcome_sought ?? '')} onChange={set('outcome_sought')} /></Field>
        <Field label="Domain *">
          <select style={inputStyle} value={String(f.domain ?? '')} onChange={set('domain')}>
            <option value="">Select…</option>
            {Object.keys(DOMAIN_COLORS).concat('Other').map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Nodal officer"><input style={inputStyle} value={String(f.nodal_officer ?? '')} onChange={set('nodal_officer')} /></Field>
        <Field label="Baseline metric *"><input style={inputStyle} placeholder="e.g. Non-revenue water" value={String(f.baseline_metric ?? '')} onChange={set('baseline_metric')} /></Field>
        <Field label="Unit *"><input style={inputStyle} placeholder="e.g. % of supply" value={String(f.metric_unit ?? '')} onChange={set('metric_unit')} /></Field>
        <Field label="Baseline value *"><input style={inputStyle} type="number" value={String(f.baseline_value ?? '')} onChange={set('baseline_value')} /></Field>
        <Field label="Target value *"><input style={inputStyle} type="number" value={String(f.target_value ?? '')} onChange={set('target_value')} /></Field>
        <Field label="Direction">
          <select style={inputStyle} value={String(f.metric_direction)} onChange={set('metric_direction')}>
            <option value="decrease">decrease (losses, delays…)</option>
            <option value="increase">increase (coverage, detection…)</option>
          </select>
        </Field>
        <Field label="Pilot budget ₹ * (≤ ₹25L per Policy 2025)"><input style={inputStyle} type="number" placeholder="2500000" value={String(f.pilot_budget_inr ?? '')} onChange={set('pilot_budget_inr')} /></Field>
        <Field label="Pilot duration (days)"><input style={inputStyle} type="number" value={String(f.pilot_duration_days)} onChange={set('pilot_duration_days')} /></Field>
        <Field label="Applications close on"><input style={inputStyle} type="date" value={String(f.closes_on ?? '')} onChange={set('closes_on')} /></Field>
        <Field span label="Operational constraints"><textarea style={{ ...inputStyle, minHeight: 40, resize: 'vertical' }} value={String(f.operational_constraints ?? '')} onChange={set('operational_constraints')} /></Field>
        <Field span label="Data the department will share"><textarea style={{ ...inputStyle, minHeight: 40, resize: 'vertical' }} value={String(f.data_available ?? '')} onChange={set('data_available')} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        <Pill text="TURNOVER WAIVED BY DEFAULT · GFR 173(i)" color={C.milestone} />
        <Pill text="EXPERIENCE WAIVED · GFR 173(i)" color={C.milestone} />
        <Pill text="EMD EXEMPT · GFR 170(i)" color={C.milestone} />
        <Pill text="QUALITY CRITERIA NEVER WAIVED" color={C.sandbox} />
      </div>
      <Btn color={C.challenge} disabled={busy} onClick={() => onSubmit(f)}><Send style={{ width: 12, height: 12 }} />Publish to the board</Btn>
    </Modal>
  );
}

// ─── Apply (Stage 2) ──────────────────────────────────────────────────────────
function ApplyModal({ challenge, solutions, busy, onClose, onSubmit }: { challenge: Challenge; solutions: Solution[]; userEmail: string; busy: boolean; onClose: () => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [startupId, setStartupId] = useState(solutions[0]?.id ?? '');
  const [summary, setSummary] = useState('');
  const [budget, setBudget] = useState('');
  const [days, setDays] = useState(String(challenge.pilot_duration_days ?? 180));
  return (
    <Modal title={`Apply — ${challenge.title}`} color={C.screen} onClose={onClose}>
      <Field label="Your solution *">
        <select style={inputStyle} value={startupId} onChange={e => setStartupId(e.target.value)}>
          {solutions.map(s => <option key={s.id} value={s.id}>{s.name} — {s.industry}</option>)}
        </select>
        <p style={{ fontSize: 9.5, color: C.dim, margin: '5px 0 0' }}>Ownership is verified server-side — you can only apply for a solution you registered.</p>
      </Field>
      <div style={{ height: 10 }} />
      <Field label="Proposal summary * (this is what the panel scores)">
        <textarea style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }} placeholder="What you will deploy, where, and how it reaches the target metric…" value={summary} onChange={e => setSummary(e.target.value)} />
      </Field>
      <div className="pw-grid2" style={{ gap: 10, marginTop: 10 }}>
        <Field label={`Proposed budget ₹ (cap ${fmtL(challenge.pilot_budget_inr)})`}><input style={inputStyle} type="number" value={budget} onChange={e => setBudget(e.target.value)} /></Field>
        <Field label="Proposed duration (days)"><input style={inputStyle} type="number" value={days} onChange={e => setDays(e.target.value)} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {challenge.turnover_relaxed && <Pill text="NO TURNOVER PROOF NEEDED" color={C.milestone} />}
        {challenge.experience_relaxed && <Pill text="NO PRIOR GOVT EXPERIENCE NEEDED" color={C.milestone} />}
        {challenge.emd_exempt && <Pill text="NO EMD" color={C.milestone} />}
        {challenge.dpiit_required && <Pill text="DPIIT RECOGNITION CHECKED ON SUBMIT" color={C.screen} />}
      </div>
      <Btn color={C.screen} disabled={busy || !startupId} onClick={() => onSubmit({ challenge_id: challenge.id, startup_id: startupId, proposal_summary: summary, proposed_budget_inr: budget ? Number(budget) : undefined, proposed_days: days ? Number(days) : undefined })}><Send style={{ width: 12, height: 12 }} />Submit & run eligibility screen</Btn>
    </Modal>
  );
}

// ─── Score (Stage 3) ──────────────────────────────────────────────────────────
function ScoreModal({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [tech, setTech] = useState('');
  const [innov, setInnov] = useState('');
  const [rationale, setRationale] = useState('');
  const [conflict, setConflict] = useState(false);
  return (
    <Modal title="Panel Score — dual-axis rubric" color={C.evaluate} onClose={onClose}>
      <p style={{ fontSize: 10.5, color: C.dim, margin: '0 0 12px', lineHeight: 1.55 }}>Score each axis 0–50 against the published rubric. Your score is stored attributably with your rationale — an averaged number with no author cannot be defended on audit.</p>
      <div className="pw-grid2" style={{ gap: 10 }}>
        <Field label="Technical viability (0–50)"><input style={inputStyle} type="number" min={0} max={50} value={tech} onChange={e => setTech(e.target.value)} /></Field>
        <Field label="Innovation quotient (0–50)"><input style={inputStyle} type="number" min={0} max={50} value={innov} onChange={e => setInnov(e.target.value)} /></Field>
      </div>
      <div style={{ height: 10 }} />
      <Field label="Written rationale * (mandatory)"><textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Why these scores — specific to this submission." /></Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '11px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={conflict} onChange={e => setConflict(e.target.checked)} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>I declare a conflict of interest with this applicant</span>
      </label>
      <Btn color={C.evaluate} disabled={busy} onClick={() => onSubmit({ technical_viability: Number(tech), innovation_quotient: Number(innov), rationale, conflict_declared: conflict })}><Send style={{ width: 12, height: 12 }} />Record score</Btn>
    </Modal>
  );
}

// ─── Record measurement (Stage 7) ─────────────────────────────────────────────
function KpiModal({ kpi, busy, onClose, onSubmit }: { kpi: Pathway['kpis'][number]; busy: boolean; onClose: () => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [measured, setMeasured] = useState('');
  const [org, setOrg] = useState('');
  const [vtype, setVtype] = useState('academic');
  const [note, setNote] = useState('');
  return (
    <Modal title={`Record measurement — ${kpi.kpi_description}`} color={C.validate} onClose={onClose}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
        <div><Label>Baseline</Label><span className="metric" style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{kpi.baseline_value} {kpi.unit}</span></div>
        <div><Label>Locked target</Label><span className="metric" style={{ fontSize: 14, color: C.validate }}>{kpi.target_value} {kpi.unit}</span></div>
        {kpi.go_no_go_threshold != null && <div><Label>Go/No-Go gate</Label><span className="metric" style={{ fontSize: 14, color: C.danger }}>{kpi.go_no_go_threshold} {kpi.unit}</span></div>}
      </div>
      <Banner kind="ok" text={`Target locked ${fmtDate(kpi.locked_at)} — before measurement began. The verdict is computed against it; the validator supplies only the number.`} />
      <Field label={`Measured value * (${kpi.unit ?? ''})`}><input style={inputStyle} type="number" step="any" value={measured} onChange={e => setMeasured(e.target.value)} /></Field>
      <div className="pw-grid2" style={{ gap: 10, marginTop: 10 }}>
        <Field label="Validating organisation *"><input style={inputStyle} placeholder="e.g. VJTI Assessment Cell" value={org} onChange={e => setOrg(e.target.value)} /></Field>
        <Field label="Validator type">
          <select style={inputStyle} value={vtype} onChange={e => setVtype(e.target.value)}>
            <option value="academic">Academic / technical institution</option>
            <option value="stqc_or_setl">STQC / SETL lab</option>
            <option value="nabl_lab">NABL-accredited lab</option>
            <option value="dmeo_empanelled">DMEO-empanelled evaluator</option>
            <option value="department_internal">Department internal</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>
      <div style={{ height: 10 }} />
      <Field label="Note"><textarea style={{ ...inputStyle, minHeight: 52, resize: 'vertical' }} value={note} onChange={e => setNote(e.target.value)} /></Field>
      <div style={{ height: 12 }} />
      <Btn color={C.validate} disabled={busy} onClick={() => onSubmit({ measured_value: Number(measured), validator_org: org, validator_type: vtype, validation_note: note })}><Send style={{ width: 12, height: 12 }} />Record & compute verdict</Btn>
    </Modal>
  );
}

// ─── Endorse (Stage 8) ────────────────────────────────────────────────────────
function EndorseModal({ startupName, busy, onClose, onSubmit }: { startupName: string; busy: boolean; onClose: () => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [verdict, setVerdict] = useState<'satisfactory' | 'unsatisfactory'>('satisfactory');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [deptName, setDeptName] = useState('');
  return (
    <Modal title={`Departmental endorsement — ${startupName}`} color={C.scale} onClose={onClose}>
      <p style={{ fontSize: 10.5, color: C.dim, margin: '0 0 12px', lineHeight: 1.55 }}>One endorsement per department. Three satisfactory reports unlock compliant multi-department scale-up (the Odisha graduation gate). An unsatisfactory verdict must state why.</p>
      <Field label="Verdict">
        <select style={inputStyle} value={verdict} onChange={e => setVerdict(e.target.value as 'satisfactory' | 'unsatisfactory')}>
          <option value="satisfactory">Satisfactory — performed as agreed</option>
          <option value="unsatisfactory">Unsatisfactory — reason required</option>
        </select>
      </Field>
      <div style={{ height: 10 }} />
      <Field label="Pilot / work-order reference"><input style={inputStyle} placeholder="e.g. SNY/WSS/2026/001" value={ref} onChange={e => setRef(e.target.value)} /></Field>
      <div style={{ height: 10 }} />
      <Field label="Acting as department (admin only — leave blank otherwise)"><input style={inputStyle} placeholder="e.g. Public Health Department" value={deptName} onChange={e => setDeptName(e.target.value)} /></Field>
      <div style={{ height: 10 }} />
      <Field label={verdict === 'unsatisfactory' ? 'Reason * (mandatory)' : 'Note'}><textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }} value={note} onChange={e => setNote(e.target.value)} /></Field>
      <div style={{ height: 12 }} />
      <Btn color={C.scale} disabled={busy} onClick={() => onSubmit({ verdict, pilot_ref: ref, note, department_name: deptName || undefined })}><Send style={{ width: 12, height: 12 }} />Record endorsement</Btn>
    </Modal>
  );
}
