export interface ChatContext {
  pathname?: string;
  tab?: string;
  section?: string;
}

// NOTE: This is fed to a PUBLIC-facing chatbot. Anything here can be extracted by
// any user (including anonymous visitors) simply by asking. So keep it strictly to
// public, user-facing product information. Do NOT add: internal architecture,
// security/ownership implementation, database/infra, admin-only operations, exact
// internal state/field names, notification/email plumbing, or anything about
// specific users, departments or their data.
export const WEBSITE_KNOWLEDGE = `
PLATFORM: Sanyog
WHAT IT IS: Sanyog is an INNOVATION PROCUREMENT PLATFORM. It is the bridge between
GOVERNMENT DEPARTMENTS that have operational problems and STARTUPS that can solve
them. Conventional public procurement is designed for standardised goods and
established vendors, so novel solutions rarely get in. Sanyog provides a
transparent, competitive and legally compliant pathway that takes a department all
the way from a vague pain point to a validated solution procured at scale.
It is NOT a fundraising platform and NOT an investor marketplace — no capital is
raised here. Departments buy outcomes; startups win pilots and contracts.

TAGLINE / POSITIONING: From public problem to proven pilot to procurement.

WHO IT IS FOR (and how it benefits them):
- GOVERNMENT DEPARTMENTS: Turn an operational pain point into an outcome-based
  challenge statement, discover verified startups, evaluate them against a
  published rubric with an independent expert panel, run a controlled sandbox
  pilot, pay against verified milestones, get results independently validated, and
  move to compliant scale-up. Benefit: access to innovation with far less risk, and
  a complete audit trail that stands up to scrutiny.
- STARTUPS: See real, live government demand; apply without prior-turnover or
  prior-experience barriers; be scored on a published rubric instead of on
  relationships; keep your intellectual property; and get paid on predictable,
  verified milestones. Benefit: a genuine, time-bound route into public procurement.
- EXPERT PANELS & VALIDATORS: Subject-matter experts score submissions; independent
  institutions audit pilot results against the agreed baseline.
- VISITORS: Browse public challenges and participating departments before signing up.

TWO WORKSPACES:
1. STARTUP HUB (for startups): Command Centre, Pilot Pipeline, Solution Vault,
   Expert Network, Event Arena, Analytics, and National Procurement Matrix.
2. DEPARTMENT HUB (for government departments): Procurement Cockpit, Challenge
   Pipeline, Evaluation Room, Startup Network, Department Network, Demo Days,
   Outcome Insights, and Deployment Tracker.

THE EIGHT-STAGE PATHWAY (the heart of Sanyog):
1. PROBLEM FORMULATION — the department converts an operational pain point into an
   outcome-based challenge statement using a standard template: current baseline,
   target metric, operational constraints, sandbox parameters and maximum pilot
   budget. Example shape: "detect distribution leaks above a defined flow rate
   within a defined time window".
2. STARTUP DISCOVERY & ELIGIBILITY — recognised startups are verified against the
   national startup registry. Prior-turnover and prior-experience conditions are
   relaxed for recognised startups; technical, quality and security criteria are
   NOT relaxed.
3. TRANSPARENT EVALUATION — a dual assessment of technical viability and innovation
   quotient, scored against a published rubric by an independent panel of
   subject-matter experts. Every score is recorded.
4. SANDBOX / PILOT DESIGN — a controlled live environment with agreed scope, data
   sharing and anonymisation protocols, security clearance prerequisites, defined
   timelines and clear exit criteria.
5. CONTRACTING & RISK MANAGEMENT — a standard pilot agreement covering IP ownership,
   data governance, cybersecurity obligations, indemnity limits and liability caps.
   By default the STARTUP RETAINS ITS IP and the department receives a perpetual,
   non-exclusive licence for its own internal use.
6. MILESTONE-BASED PAYMENTS — payment is released in tranches against verified
   performance rather than arbitrary administrative delay. The reference structure
   is 30% on onboarding and setup, 40% on a mid-term KPI demonstration, and 30% on
   successful independent validation.
7. THIRD-PARTY VALIDATION — an independent institution measures the pilot's results
   against the pre-agreed baseline and KPIs, so the decision rests on evidence
   rather than on the supplier's own claims.
8. SCALE-UP PATHWAY — a validated solution moves to a compliant route for wider
   purchase across departments and districts, without restarting a multi-year
   tender.

TARGET CYCLE TIME: challenge to running pilot in roughly 12 to 16 weeks, against
sales cycles that today can run for years.

CORE CONCEPTS:
- FitScore™: a score for how well a startup's proposed solution fits a specific
  challenge, combining technical viability and innovation quotient. It helps
  panels compare submissions consistently and shows startups where they are weak
  before they submit.
- Solution Vault: a startup's document space. A PUBLIC document is visible to
  everyone and helps the startup get discovered; a CONFIDENTIAL document is shared
  only with departments the startup approves.
- Sandbox: the bounded live environment a pilot runs in — agreed scope, anonymised
  data, security clearance and a fixed exit date, all settled before day one.
- Verification: startups are verified before appearing to departments, and
  departments are verified before publishing challenges. This keeps the pathway
  trustworthy on both sides.
- Audit trail: scores, approvals, document access and payment events are recorded,
  so a department can always show why a decision was made.
- IP and data: startups keep their IP; departments get a licence to use the
  solution. Confidential documents are released only to those the startup approves.

STANDARD TEMPLATES SANYOG PROVIDES:
- Problem Statement Template — baseline versus target KPI matrix, sandbox
  parameters and a security clearance checklist.
- Pilot Agreement / MOU — IP terms, indemnity limits, liability caps, data
  handling requirements and milestone payout triggers.
- Scale-Up Evaluation Scorecard — a normalised 100-point assessment of scalability,
  cost-benefit ratio, security compliance and pilot success.

GETTING STARTED:
- Departments: sign up, open the Department Hub, register your department, and
  publish your first challenge statement from the template.
- Startups: sign up, open the Startup Hub, register your startup for verification,
  then apply to live challenges and build your Solution Vault.

FAQ:
Q: What is Sanyog?
A: An innovation procurement platform connecting government departments with
   startups — from challenge statement, through a sandbox pilot, to compliant
   scale-up.
Q: Is this a funding or investment platform?
A: No. No capital is raised here. Departments procure solutions; startups win
   pilots and contracts and are paid on milestones.
Q: I'm a startup with no government experience and low turnover. Can I apply?
A: Yes — that is the point. Prior-turnover and prior-experience conditions are
   relaxed for recognised startups. You must still meet the technical, quality and
   security criteria in the challenge.
Q: Who owns the intellectual property?
A: By default the startup retains its IP. The department receives a perpetual,
   non-exclusive licence to use the solution internally. Exact terms are in the
   pilot agreement.
Q: When do startups get paid?
A: Against verified milestones — the reference structure is 30% on onboarding,
   40% on a mid-term KPI demonstration and 30% after independent validation.
Q: How long does it take?
A: The pathway targets roughly 12 to 16 weeks from published challenge to a
   running pilot.
Q: Who decides whether a pilot succeeded?
A: An independent third party measures results against the baseline and KPIs
   agreed before the pilot started — not the startup, and not the department alone.
Q: How does a department defend picking a young company?
A: Every step is templated and recorded — the published rubric, the panel's
   scores, the sandbox terms, the milestone verifications and the independent
   validation report form a complete audit trail.
Q: What happens after a successful pilot?
A: The validated solution moves onto a compliant scale-up route so it can be
   deployed more widely without restarting a full tender.
Q: Is it free?
A: Please check with the Sanyog team for current details.
`;

// Per-tab guides, scoped by portal ("hub" = Startup Hub, "scout" = Department Hub)
// so shared tab ids (e.g. "network") resolve to the right section.
const TAB_GUIDE: Record<string, { label: string; summary: string; whatItIs: string; whenToUse: string }> = {
  // ── STARTUP HUB ─────────────────────────────────────────────────────────
  'hub:overview': {
    label: 'Command Centre',
    summary: "The startup's home dashboard in the Startup Hub.",
    whatItIs: 'Command Centre gives a startup an at-a-glance view of its position on the platform — solutions registered, pilot value won, pilots completed and average FitScore™ — plus quick jumps into the Pilot Pipeline, Solution Vault and other sections.',
    whenToUse: 'Use it as your daily starting point to see where you stand and jump into the right workspace.'
  },
  'hub:challenges': {
    label: 'Challenge Board',
    summary: 'Live departmental challenges you can apply to, and your full 8-stage pathway.',
    whatItIs: 'Challenge Board lists every published departmental challenge with its baseline→target metric, pilot budget and GFR relaxations (turnover and experience waived under Rule 173(i), EMD exempt under Rule 170(i) — quality criteria never waived). Applying runs an instant eligibility screen against your DPIIT recognition. Below the board, the Procurement Pathway tracks a solution across all 8 stages: panel scores, the sandbox agreement with its security clearance and mandatory exit date, 30/40/30 milestone payments with the MSMED 45-day clock, independently validated KPIs against pre-registered targets, and the 3-department scale-up gate that ends in a GeM listing draft.',
    whenToUse: 'Use it to find challenges matched to your solution, apply with automatic waivers, and track your pilot from application to scale-up.'
  },
  'hub:pipeline': {
    label: 'Pilot Pipeline',
    summary: 'A board of your solutions across the procurement journey.',
    whatItIs: 'Pilot Pipeline tracks each of your solutions across its stages, from first registration through evaluation and sandbox pilot to validation and scale-up. A newly registered startup is verified before it becomes visible to departments. Cards show FitScore™, sector and traction.',
    whenToUse: 'Use it to register a solution, move it through stages, and track where every application stands.'
  },
  'hub:vault': {
    label: 'Solution Vault',
    summary: "The startup's document space.",
    whatItIs: 'Solution Vault holds a startup\'s materials — technical documentation, compliance and security evidence, and pilot proposals. A PUBLIC document is visible to everyone and aids discovery; a CONFIDENTIAL document is shared only with departments you approve. Uploading becomes available once your startup has been verified.',
    whenToUse: 'Use it to publish discoverable material and to store confidential documents you release selectively to departments.'
  },
  'hub:network': {
    label: 'Expert Network',
    summary: 'Subject-matter experts and mentors startups can connect with.',
    whatItIs: 'Expert Network is where startups find domain experts and mentors who can help them become pilot-ready — understanding compliance expectations, security requirements and how public evaluation rubrics work.',
    whenToUse: 'Use it when you need guidance on meeting a challenge\'s technical, security or compliance requirements.'
  },
  'hub:events': {
    label: 'Event Arena',
    summary: 'Ecosystem events and RSVPs.',
    whatItIs: 'Event Arena surfaces demo days, workshops, challenge briefings and office hours. Startups can RSVP and submit their own events, which are reviewed before appearing publicly.',
    whenToUse: 'Use it to find events to attend or to submit an event for the community.'
  },
  'hub:analytics': {
    label: 'Analytics',
    summary: 'Data-driven insight into your performance and the ecosystem.',
    whatItIs: 'Analytics shows sector breakdowns, FitScore™ trends and pilot/traction metrics so a startup understands how it is tracking and where it stands relative to live demand.',
    whenToUse: 'Use it to measure progress and spot what to fix before your next application.'
  },
  'hub:funding': {
    label: 'National Procurement Matrix',
    summary: 'Live cross-department demand and pilot activity.',
    whatItIs: 'National Procurement Matrix surfaces departments and the status of their engagements (Committed, In Pilot, In Discussion) and how pilot and procurement value is flowing toward startups — a live view of public demand across the ecosystem.',
    whenToUse: 'Use it to see which departments are active and where demand is moving.'
  },
  // (Internal admin tooling is intentionally NOT described here — the chatbot is
  //  public-facing and must not expose moderation/operations details.)

  // ── DEPARTMENT HUB ──────────────────────────────────────────────────────
  'scout:cockpit': {
    label: 'Procurement Cockpit',
    summary: "The department's command centre.",
    whatItIs: 'Procurement Cockpit surfaces the department\'s innovation budget, uncommitted budget, value already committed through Sanyog, shortlisted solutions and target outcomes, alongside a discovery radar, a live activity feed and pipeline health. It is framed around running challenges and pilots, not around finance-office accounting.',
    whenToUse: 'Use it for a strategic, at-a-glance overview of your challenges, pilots and remaining budget.'
  },
  'scout:challenges': {
    label: 'Challenge Desk',
    summary: 'Publish challenges and run the full 8-stage procurement pathway.',
    whatItIs: 'Challenge Desk is where a department operates the pathway end to end: publish a challenge from the Problem Statement Template (baseline and target are mandatory — a challenge without a baseline can never be validated), score applications on the dual-axis rubric with a written rationale, verify and release 30/40/30 milestone payments (release is blocked until verification is recorded; the MSMED 45-day clock is visible on every unpaid tranche), record independently validated KPI measurements whose verdict is computed against targets locked before measurement began, and endorse completed pilots — three satisfactory departmental reports unlock compliant multi-department scale-up and a GeM listing draft. The three standard templates (Problem Statement, Pilot MOU, Scale-Up Scorecard) are downloadable from the same tab.',
    whenToUse: 'Use it to publish demand, evaluate transparently, pay against verified milestones and endorse pilots toward scale-up.'
  },
  'scout:dealflow': {
    label: 'Challenge Pipeline',
    summary: 'A pipeline of applicants against your live challenges.',
    whatItIs: 'Challenge Pipeline tracks every startup applying to your challenges across stages — from first screening through expert evaluation into sandbox pilot — with sector filtering and rubric scores.',
    whenToUse: 'Use it to screen, compare and move promising startups through evaluation toward a pilot.'
  },
  'scout:diligence': {
    label: 'Evaluation Room',
    summary: 'A secure space to review confidential submissions.',
    whatItIs: 'Evaluation Room is an access-controlled space where verified departments review the confidential documents a startup has chosen to share with them, alongside security clearance status. A department can request access to a confidential document; the startup approves or declines, and anyone not approved cannot open it.',
    whenToUse: 'Use it to run technical and security due diligence on submitted materials before committing to a pilot.'
  },
  'scout:network': {
    label: 'Startup Network',
    summary: 'A directory of verified startups on the platform.',
    whatItIs: 'Startup Network lets departments discover verified startups and their solutions, and reach out to those that fit a challenge.',
    whenToUse: 'Use it to find startups matching your sector, problem area and pilot budget.'
  },
  'scout:vcnetwork': {
    label: 'Department Network',
    summary: 'The directory of participating departments.',
    whatItIs: 'Department Network is the directory of departments active on Sanyog, visible across the platform. A department registers itself here; it is verified before it appears and before it can publish challenges.',
    whenToUse: 'Use it to register your department or to see which other departments are running challenges — and reuse what has already worked for them.'
  },
  'scout:demodays': {
    label: 'Demo Days',
    summary: 'Curated events where departments meet startups presenting live.',
    whatItIs: 'Demo Days surfaces curated events where departments meet startups demonstrating solutions against live challenges — a direct discovery channel alongside the formal pipeline.',
    whenToUse: 'Use it to find live demonstration events and showcases to attend.'
  },
  'scout:insights': {
    label: 'Outcome Insights',
    summary: 'Ecosystem-level intelligence for departments.',
    whatItIs: 'Outcome Insights shows sector momentum, pilot success rates, the score distribution of applicants and challenge fit — how well available solutions align to a department\'s problem area, stage, budget and geography. It is about reading the market of available innovation, not internal accounting.',
    whenToUse: 'Use it to compare problem areas, judge where innovation is ready, and see which startups fit your challenge.'
  },
  'scout:deployment': {
    label: 'Deployment Tracker',
    summary: 'A record of pilots run and solutions scaled through Sanyog.',
    whatItIs: 'Deployment Tracker shows each pilot commissioned through the platform and its measured outcome, the mix of deployments, how much of the innovation budget is committed versus available, a capacity view of how many further pilots the remaining budget supports, and progress against target outcomes.',
    whenToUse: 'Use it to track what you have deployed, what it achieved, and how much capacity remains.'
  }
};

// Landing-page section guides (route "/").
const LANDING_SECTIONS: Record<string, { label: string; summary: string; details: string }> = {
  home: {
    label: 'Home',
    summary: 'Hero and positioning for both sides.',
    details: 'The Home hero introduces Sanyog as the pathway from public problem to proven pilot to procurement, with a "For Startups" path (apply on merit, keep your IP, get paid on milestones) and a "For Departments" path ("Solve it in a quarter. Not a tender cycle.").'
  },
  features: {
    label: 'Features',
    summary: 'The eight-stage pathway.',
    details: 'Features covers the pathway end to end: Challenge Banking, Eligibility Screening, Transparent Evaluation, Governed Sandbox, Milestone Payments and Validated Scale-Up.'
  },
  founders: {
    label: 'Startups',
    summary: 'Startup-facing workflow and benefits.',
    details: 'The Startups view describes the Startup Hub: see live departmental demand, apply without turnover or prior-experience barriers, be scored on a published rubric, retain your IP, and receive milestone-based payments.'
  },
  investors: {
    label: 'Departments',
    summary: 'Department-facing workflow and benefits.',
    details: 'The Departments view describes the Department Hub: publish an outcome-based challenge, screen verified startups against a rubric, run a governed sandbox pilot, and carry the evidence into a compliant purchase — with every decision on record.'
  },
  testimonials: {
    label: 'Outcomes',
    summary: 'Experiences from both sides of the pathway.',
    details: 'Outcomes presents short accounts from startups and department officers about eligibility barriers removed, contracting time cut, payments arriving on schedule, and decisions defensible on audit.'
  },
  about: {
    label: 'About',
    summary: 'Mission and principles.',
    details: 'About explains why Sanyog exists: departments had problems they could not write a specification for, startups had answers they could not legally sell, and procurement rules built for standard goods sat in between.'
  },
  contact: {
    label: 'Contact',
    summary: 'Ways to reach the team.',
    details: 'Contact carries the enquiry form and details for departments, startups and validating institutions to reach the Sanyog team.'
  }
};

function normalizeTab(tab?: string) {
  return (tab || '').trim().toLowerCase();
}

// Which portal is the user in, based on the route.
function hubKeyFor(pathname: string): 'scout' | 'hub' | null {
  if (pathname.includes('/scout')) return 'scout';
  if (pathname.includes('/hub')) return 'hub';
  return null;
}

// Resolve the tab guide, preferring the portal-scoped key ("hub:pipeline") and
// falling back to a bare tab id for safety.
function resolveTabGuide(hub: 'scout' | 'hub' | null, tab: string) {
  if (!tab) return undefined;
  if (hub && TAB_GUIDE[`${hub}:${tab}`]) return TAB_GUIDE[`${hub}:${tab}`];
  return TAB_GUIDE[tab] ?? TAB_GUIDE[`scout:${tab}`] ?? TAB_GUIDE[`hub:${tab}`];
}

export function getContextualKnowledge(context: ChatContext = {}) {
  const pathname = context.pathname || '';
  const tab = normalizeTab(context.tab);
  const section = context.section?.trim();
  const hub = hubKeyFor(pathname);

  const routeLabel = hub === 'scout'
    ? 'Department Hub (government department workspace)'
    : hub === 'hub'
      ? 'Startup Hub (startup workspace)'
      : 'Landing page / general platform experience';

  const guide = resolveTabGuide(hub, tab);

  const contextLines = [
    `CURRENT VIEW: ${routeLabel}`,
    guide
      ? `ACTIVE TAB: ${guide.label} — ${guide.summary}`
      : 'ACTIVE TAB: None or unknown',
    guide ? `TAB DETAILS: ${guide.whatItIs}` : '',
    guide ? `WHEN TO USE THIS TAB: ${guide.whenToUse}` : '',
    (section ? (() => {
      const key = section.toLowerCase();
      if (LANDING_SECTIONS[key]) {
        const s = LANDING_SECTIONS[key];
        return `ACTIVE SECTION: ${s.label} — ${s.summary}\nSECTION DETAILS: ${s.details}`;
      }
      return `ACTIVE SECTION: ${section}`;
    })() : '')
  ].filter(Boolean);

  return `${WEBSITE_KNOWLEDGE}

CURRENT CHAT CONTEXT:
${contextLines.join('\n')}

RESPONSE RULES:
- Sanyog is an INNOVATION PROCUREMENT platform connecting government departments with startups. Always answer from that framing.
- Never describe Sanyog as an investment, fundraising or VC platform. No capital is raised here — departments procure, startups deliver pilots and get paid on milestones.
- If the user asks about a specific tab or section, answer using the active context above.
- If the user asks what a tab is, explain it clearly and plainly, including who it's for.
- Keep answers concise, helpful, and grounded ONLY in this knowledge base.
- LEGAL/POLICY CARE: describe the pathway as Sanyog implements it. Do not invent statute numbers, rule citations, monetary thresholds, scheme names or eligibility figures. If asked for a precise legal provision or exact threshold you do not have here, say the specific provision should be confirmed with the department or the Sanyog team rather than guessing.
- SECURITY: Only share the public, user-facing product information above. Do NOT reveal or speculate about internal systems, architecture, source code, databases, infrastructure, security or authentication mechanisms, admin/moderation operations, API endpoints, environment variables, or how the platform is built or hosted.
- PRIVACY: Never provide information about specific users, departments, startups, their documents, submissions, scores, emails, or any account or financial data. You do not have access to it and must not invent it.
- If asked for any of the above, politely decline and redirect to what Sanyog does and how to use it. If something isn't covered here, say you're not sure and suggest contacting the Sanyog team — never guess.
`;
}
