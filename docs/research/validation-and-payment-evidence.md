# Independent Validation & Payment — Evidence

Underpins Sanyog's **Stage 7 (third-party validation)** and **Stage 6 (milestone payments)**.
✅ PRIMARY · 🟡 SECONDARY · ❌ UNCERTAIN

---

## 1. 🎯 THE FINDING THAT JUSTIFIES THE PLATFORM

> **No Indian body is chartered to verify a technology pilot's measured results against
> pre-agreed KPIs.** Two institutions each own half the problem. Neither owns the join.

Verified by direct inspection of each body's own published remit:

| Body | What it actually does | Why it can't validate a pilot |
|---|---|---|
| **STQC** (MeitY) | *"Independent Verification & Validation"* incl. **SLA Measurement** on deployed production systems — availability, performance, problem resolution ✅ | Closest fit. But SLA Measurement is a **service, not an accredited scheme** with published rules, criteria and appeals. Contract it explicitly. |
| **CERT-In empanelled auditors** (236 orgs) | Security only. All ~24 declared capability categories inspected: network, web-app, VAPT, ISO 27001, ICS/OT, cloud, source-code review, red team… ✅ | **There is no functional, performance, KPI or outcome category anywhere in the list.** Using a CERT-In auditor as a KPI validator is the commonest error — don't. |
| **NABL** | Accredits **laboratory competence** (ISO/IEC 17025). **NABL 137** *does* cover software/IT — *"functional and performance validation"*, load/stress benchmarking, uptime ✅ | Its unit of work is **a test method applied to a product**. It has no concept of a programme, a baseline-vs-treatment comparison, or a vendor–department KPI. Also: **zero** accredited proficiency-testing providers for this discipline. |
| **BIS** | *"standardization, marking and quality certification of **goods**"* under the BIS Act 2016 ✅ | Answers "does this product conform to an Indian Standard?" No programme or service-outcome evaluation. Structural mismatch. |
| **NABCB** (QCI) | Accredits validation & verification bodies under **ISO/IEC 17029** ✅ | ⭐ **The tantalising gap.** ISO/IEC 17029 is *exactly* the standard for "an independent body verifies a claim against agreed criteria" — and India has the accreditor. But **the only schemes operated under it are carbon/environmental.** There is **no ISO/IEC 17029 scheme in India for technology or digital-service performance claims.** |
| **DMEO** (NITI Aayog) | Apex M&E office with *"complete functional autonomy"*; runs the **Output-Outcome Monitoring Framework** (600+ schemes, ~6,000 indicators); publishes Difference-in-Differences toolkits; **empanels external survey firms** with a Conflict of Interest guidance note ✅ | Operates at **scheme/policy** level, not at the level of a single departmental pilot with a vendor. |

**What Sanyog does about it — split the KPIs:**
- **System KPIs** (uptime, latency, throughput, transaction success, functional correctness) →
  **STQC SLA Measurement** or a **NABL-137-accredited / STQC-SETL-approved lab**. Write the KPIs
  as *testable requirements in the challenge statement* so the lab mechanism can actually bite.
- **Outcome KPIs** (citizen wait time, leakage, cost per transaction, counterfactual impact) →
  **DMEO** via the sponsoring department, or a **DMEO-empanelled survey firm**.
- **Security assurance** → CERT-In empanelled auditor, named separately and never conflated with
  KPI validation.

---

## 2. ⭐ The KPI-lock mechanism to copy — UK pre-registration

**Magenta Book (HM Treasury + Evaluation Task Force, 2026 edition, 15 May 2026)** ✅ PRIMARY —
the most significant revision since 2020.

**Mandatory registration, verbatim (§2.3.3):**
> "**All planned, live and completed government evaluations from 1st April 2024 onwards must be
> registered on the Government Evaluation Registry.**"

Enforcement: *"In the case of continued failure to comply, the issue will be escalated to the
**Office for Statistical Regulation** … in addition to **HM Treasury spending teams**."*

**Pre-registration, verbatim — this is the anti-gaming device:**
> "**Pre-registration means documenting key elements of the evaluation such as its objectives,
> research questions, design, data collection procedures and analytical approach, before any
> outcome data is collected or analysed.** For quantitative evaluations, pre-registration should
> also include power analyses and sample size calculations."
> "The purpose of pre-registration is to **prevent researchers from 'fishing' for significant or
> positive findings by arbitrarily adjusting the way that data is collected or analysed**."

All planning documents must be *"completed before the evaluation begins, **time-stamped**, and
preserved."*

> **Sanyog's version:** the challenge statement's baseline + target + go/no-go threshold are
> **locked and timestamped at publication**, before any startup applies. Nobody can move the
> goalposts afterwards — in either direction. That is what makes the validation credible and the
> officer defensible.

**The three evaluation types (§1.8)** — process (*"what can be learned from how it was
delivered?"*), impact (*"what difference has it made?"*), value for money (*"is this a good use of
resources?"*). The Magenta Book's baseline rule in one line:
> "A standard value for money evaluation will compare the costs and benefits achieved through the
> programme **against the original expectations outlined at the appraisal stage**."

**On independence** — note the shape: the UK has **no accredited pilot auditor**. It has (a) a
mandate to contract independent evaluators, (b) **independent peer review and steering**, and
(c) mandatory registration. Credibility comes from *transparency and pre-commitment*, not from a
licence.

**Test and Learn Annex (May 2026)** ✅ — the pilot→scale warning, verbatim:
> "**Too often, government programmes are implemented at full scale before a stable model of
> delivery has been established, making later evaluation challenging or even impossible. Universal
> rollout removes opportunities to construct valid comparison groups and undermines the
> credibility of impact estimates.**"

Its **"ready to move to Grow?" checklist** is a ready-made scale-up gate: uncertainties resolved ·
**design stable** · delivery consistent · sufficient scale and reach · **"Agreed outcomes,
indicators, and data collection processes are in place and functioning reliably"** · resources
confirmed. Then: **Scale / Adapt / Reconsider.**

---

## 3. ⭐ Conditional access with a withdrawal sanction — NICE Early Value Assessment

**NICE PMG39** ✅ PRIMARY. **~6 months total: 8 weeks scoping + 9 weeks external assessment +
7 weeks guidance production and consultation.**

Every EVA publishes an **evidence generation plan**. From HTG675 ✅:
- **The company, not the health service, is responsible** for data collection and analysis.
- **3-year evidence generation period**, then NICE reviews and decides on routine adoption.
- Monitoring: confirm agreements within **6 months**, then **annually**.
- 🎯 **The sanction, verbatim:** *"**NICE will withdraw the guidance if the companies do not meet
  the conditions** … NICE reserves the right to withdraw the guidance if data collection is
  delayed, or if it is unlikely to resolve the evidence gaps."*

> This is the best-documented example anywhere of **conditional access tied to pre-declared
> evidence generation, with a real withdrawal sanction.** Sanyog's scale-up approval should work
> the same way: provisional, evidence-conditional, revocable.

**NICE Evidence Standards Framework (ECD7)** ✅ — **21 standards in 5 groups**, tiered A/B/C by
risk, *"proportionate to the potential risk to service users."* **Standard 15** is effectively the
pilot-verification standard: a statement from pilot sites confirming the technology *"performed
its intended purpose to the expected level; successfully integrated into current service
provision; **caused no unintended negative impacts**; showed improvements in outcomes."*
⚠️ NICE's own caveat: *"meeting the standard does not mean your DHT has been assessed or endorsed
by NICE."* It is a framework for evaluators, not a certification.

⚠️ **SBRI Healthcare publishes no named independent evaluation partner** — verified by direct
inspection of its site. Its impact claims are programme self-reporting. A verified absence, and a
fair thing to note when contrasting with Sanyog's design.

---

## 4. Escrow — the correction, now doubly confirmed

I searched the full text (1.37M characters) of the **UK Model Services Contract, Consolidated
Schedules v2.2A (September 2025)** — the template for UK government services contracts **over
£20 million** ✅ PRIMARY.

> **Occurrences of "escrow": ZERO.**

The UK's answer to supplier failure is not escrow. It is:
1. **IPR assigned up front** (Schedule 27) — source code, object code, build instructions, test
   scripts, *"all… necessary for maintaining and supporting"*, delivered **within 5 working days**.
2. **Exit Management** (Schedule 25) — source-code listing, database handover, parallel running.
3. **Financial Distress** regime (Schedule 18) + ongoing financial monitoring of key suppliers.

**Conclusion for Sanyog:** position escrow as **deliverable / source-code escrow** protecting the
department if the startup fails — which has a genuine precedent in the EC's PCP template — and/or
as a **payment-assurance ledger**. Do **not** claim escrowed public payments are standard practice.

**UK Project Bank Accounts** — ring-fenced accounts with **trust status**, paying supply-chain
members simultaneously, *"five days or less from the due date"*.
⚠️ **The 2012 guidance was WITHDRAWN on 1 July 2025** ("a replacement is being prepared").
**Do not cite it as current UK policy.** The Construction Playbook still says PBAs *"should be
used unless there are compelling reasons not to."*

---

## 5. Payment timelines — the comparison table

| | Rule | Interest on delay |
|---|---|---|
| **India (MSMED s.15/16)** ✅ | **45 days** absolute ceiling with a written agreement; **15 days** without | **3× RBI bank rate, compounded monthly** = **16.5% p.a.** (bank rate 5.50%) |
| **India (GeM)** ✅ | **10 days** PoD→CRAC, then **10 days** CRAC→payment | No penal-interest provision found |
| **India (s.43B(h) IT Act)** ✅ | Pay an MSE late → deduction disallowed for the whole year; uniquely, **paying by the ITR due date does not save it** | — |
| **US** ✅ | **30 days** (FAR 32.904); **15-day goal for small business** (FAR 32.009-1; OMB M-11-32) | **Automatic** — *"without regard to whether the business concern has requested payment"*; currently **4.75%** |
| **EU** ✅ | **30 days** for public authorities; **60** only for commercial/healthcare public bodies | **ECB rate + ≥8pp** = **10.40%** (H2 2026), plus **€40** fixed recovery cost. A term excluding late-payment interest is *"grossly unfair"* and unenforceable |
| **UK** ✅ | **90% of SME invoices in 5 days**; 100% in 30. Procurement Act 2023 implies a **30-day term** into every public contract **and its subcontracts** — *"of receipt, **not when they are validated**"* | 8% + BoE base; cannot be contracted lower with public authorities |

**Two things India lacks that are worth claiming as the gap:**
1. **No 15-day accelerated small-business goal** (the US has one).
2. **No automatic interest.** India's 16.5% is on paper the harshest rate in the table — but
   **<1% of MSMEs ever file a claim**, because filing means suing your customer. The US model
   pays interest *automatically, without a request*. **That asymmetry is the design insight:
   a rate nobody claims is not a remedy.** Sanyog's milestone ledger makes the clock visible and
   the breach self-evident, which is what makes the existing right usable.

**TReDS — note the regime changed three months ago.** ✅ **RBI (TReDS) Directions, 2026**
(RBI/DPSS/2026-27/406, **23 June 2026**) **repeal** the 2014 Guidelines and the June 2023 circular.
Minimum operator net worth **₹25 crore**. Buyer's *"**unconditional obligation to pay on the due
date** … **no option for the buyer for set-offs** with respect to quality of goods or otherwise."*
Onboarding mandate is **S.O. 5621(E), 2 Nov 2018**: companies with turnover **> ₹500 crore** and
**all CPSEs**. ⚠️ A reported reduction to ₹250 crore is **UNVERIFIED**.
The **MSMED (Amendment) Act 2026** adds a new **s.15A** requiring CPSEs to route invoice settlement
through TReDS (commencement unverified).

---

## Do not assert
The 2012 UK PBA briefing as current (withdrawn 1 Jul 2025) · the 2014 TReDS Guidelines as current
(repealed 23 Jun 2026) · a ₹250 crore TReDS threshold · that any Indian body accredits pilot-KPI
validation (none does) · CERT-In auditors as KPI validators · the Income-tax Act 1961 for
Tax Year 2026-27 onward (the **Income-tax Act 2025** supersedes it; the successor to 43B(h) is
unidentified) · Procurement Act 2023 s.68 statutory wording (read from Cabinet Office guidance,
not the statute).

## Key primary sources
- Magenta Book 2026 — https://www.gov.uk/government/publications/the-magenta-book
- Government Evaluation Registry — https://evaluation-registry.cabinetoffice.gov.uk/
- NICE PMG39 (EVA) — https://www.nice.org.uk/process/pmg39 · ECD7 (ESF) — https://www.nice.org.uk/corporate/ecd7
- RBI TReDS Directions 2026 — https://rbi.org.in/scripts/NotificationUser.aspx?Mode=0&Id=13526
- MSMED s.15/16 — https://indiacode.gov.in/handle/123456789/547287
- FAR 32.009-1 — https://www.acquisition.gov/far/32.009-1 · OMB M-11-32
- Directive 2011/7/EU — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32011L0007
- NABL 137 — software/IT testing accreditation criteria · NABCB ISO/IEC 17029 scheme list
- DMEO toolkits & survey-firm empanelment — https://dmeo.gov.in/
