# Sandbox Design Precedents (India)

How Indian regulators actually run live-testing sandboxes — used to design Sanyog's
**Stage 4 (Governed Sandbox)**. Same labelling convention as the evidence base:
✅ PRIMARY · 🟡 SECONDARY · ❌ UNCERTAIN.

---

## 1. The statutory definition to anchor on ✅ PRIMARY

**Telecommunications Act, 2023 (Act 44 of 2023), Section 27** — *verbatim*:

> "…a live testing environment where new products, services, processes and business models
> which may be deployed, on a limited set of users, for a specified period of time, with
> certain relaxations from the provisions of this Act."

Four defining properties, straight from statute: **live · limited users · fixed period ·
specified relaxations.** Sanyog's sandbox uses exactly this shape.

*(Also note: First Schedule entry 19 assigns spectrum for a sandbox **administratively, not by
auction** — precedent that sandbox inputs get a fast lane.)*

❌ Whether Section 27 is in force, and whether rules under s.56(2)(y) are notified, could
**not** be verified. Do not claim the telecom sandbox is operational.

---

## 2. 🔑 The single most important design rule — boundary conditions

**SEBI splits its rulebook into what may and may not be relaxed.** This is the model Sanyog
copies, because it is exactly the answer to a department's "but what about security?" objection.

Authoritative list, **SEBI circular 14.06.2021, Annexure 3** ✅ PRIMARY (read in full):

| ✅ May merit relaxation | ❌ Never relaxed |
|---|---|
| Net worth of applicant | Fit-and-proper criteria of applicant **and partner** |
| Financial soundness | Principles of **KYC** of clients |
| Track record | **AML / CFT** |
| **Registration fees** | Confidentiality of customer/user information |
| Technology-risk-management and outsourcing guidelines | Risk checks (price check, order value check) |
| | Handling of users' moneys and assets beyond existing regulations |

Para 24 states the overarching rule: *"no exemptions would be granted from the extant investor
protection framework, Know-Your-Customer (KYC) and Anti-Money Laundering (AML) rules."*

**In Sanyog's terms:** turnover, prior experience and EMD are waivable. **Data protection,
security clearance, and fitness to handle citizen data are not.** That single sentence is what
makes "waive the barriers" a responsible position rather than a reckless one.

*(IRDAI 2025 draws the same line differently — everything is relaxable **except** prudential
matters: capital, liquidity, investment, solvency, reserving.)*

---

## 3. ⭐ Intake clocks — the model Sanyog adopts

**TRAI's recommended telecom sandbox** (Recommendations 12.04.2024) ✅ PRIMARY — the cleanest
timeline of any Indian regulator:

| Step | Clock |
|---|---|
| Regulator flags shortcomings in the application | **7 working days** |
| Applicant cures them | **10 working days** |
| "Potential suitability" communicated (from complete application) | **30 working days** |
| Evaluation — exemptions, test parameters, control boundaries fixed | **45 days** |
| Cross-regulator exemptions coordinated | preferably **60 days** |

SEBI likewise targets **30 working days** to communicate suitability.

Pair these with **Telangana's deemed-approval rule** (see the India evidence base) and you get
the design that actually defeats bureaucratic drift: *a published clock, plus a default of
"yes" if the clock runs out.*

---

## 4. Duration, and the direction of travel

| Regime | Testing period |
|---|---|
| IRDAI 2019 | 6 months (+6 max) |
| **IRDAI 2022 amendment** | **up to 36 months**, and cohort → **continuous ("on tap")** |
| SEBI Regulatory Sandbox | 12 months; Stage-II only after 90 days in Stage-I |
| SEBI Innovation Sandbox | 12 months; Stage-II after 60 days |
| TRAI recommended → revised | 12 months → **up to 24 months** (DoT asked for longer) |

**Two consistent lessons:** every regulator that has revised its sandbox has (a) **lengthened**
the testing window and (b) **moved from cohort windows to continuous intake**. A 6-month
cohort model is the thing they all grew out of — Sanyog should launch continuous, not in
batches.

**Staged user exposure** (SEBI): Stage-I a small approved user set → Stage-II a larger one,
with user numbers **capped at both stages**. Good model for a district-then-state rollout.

---

## 5. Exit artefacts — required *upfront*, not at the end

- **SEBI:** both an **exit strategy** (on success) *and* a **withdrawal strategy** (how positions
  are unwound and dues refunded on failure) must be filed **before testing begins**.
- **Final report within 30 days** of completion — universal across IRDAI, SEBI and TRAI.
- **IRDAI Reg 11:** report + policyholder feedback + a **transition plan** into the normal
  regulatory framework; **Reg 11(5): erase all personal data of participants.**
- **TRAI:** final report must include *"details of wrapping up all activities and settling all
  obligations (contractual, financial and other) to all stakeholders including customers."*
  Test data and consent records retained **≥1 year** after exit.
- **SEBI:** records retained **3 years** from completion/exit (SOP Para 33 — *corrected: an
  earlier secondary source said 5 years, the primary circular says three*); sandbox users get
  **the same protection rights as live-market participants**; **monthly** progress reports
  during testing; mandatory liability insurance running from test start to **three months after
  exit**; on a failed test, user dues **refunded within 15 days**.
- **SEBI revocation is a due-process model worth copying:** 12 enumerated grounds, new-user
  trials suspended *immediately*, notice with grounds, opportunity to respond, and disposal
  **through a speaking order** — with reinstatement possible if the response satisfies. After
  revocation the applicant must dispose of all confidential and personal information and report
  back within 30 days.

**Revocation** — TRAI's four grounds, with **an opportunity of being heard mandatory** before
revocation. SEBI suspends new-user trials *immediately* but still gives notice and a hearing.

---

## 6. ⚠️ The cautionary statistic — why design matters

**SEBI's Regulatory Sandbox has received 13 applications and approved exactly ONE in four
years** (status 26 December 2024) ✅ PRIMARY — SEBI's own register:
https://www.sebi.gov.in/sebiweb/other/RegulatorySandbox.jsp

- 1 approved (AMFI's MF-distributor incubation plan, April 2021)
- 7 rejected · 5 withdrawn

**Use this in the pitch.** A sandbox that exists on paper but is gated behind registration
requirements and discretionary approval produces almost nothing. Contrast with **IRDAI's 173 +
185 applications** across its first two cohorts (🟡 secondary) once entry was genuinely open.

The lesson for Sanyog: **the constraint is never the absence of a sandbox — it is entry
friction and discretionary approval.** Hence continuous intake, published rubric, fixed
clocks, and deemed approval.

---

## 7. What Sanyog's sandbox takes

| Source | Adopted into Sanyog |
|---|---|
| Telecom Act s.27 | Sandbox = live · limited users · fixed period · specified relaxations |
| **SEBI boundary conditions** | ⭐ Explicit split: turnover/experience/EMD waivable; **data protection, security clearance, fitness never waivable** |
| **TRAI clocks** | ⭐ 7wd → 10wd → 30wd → 45d published timeline on every application |
| IRDAI 2022 | **Continuous intake**, not cohort windows |
| SEBI staging | Stage-I limited users → Stage-II wider, both capped |
| SEBI / IRDAI / TRAI exits | **Exit *and* withdrawal strategy filed upfront**; final report in 30 days; data erasure + retention rules |
| TRAI revocation | Four grounds, **hearing mandatory** before revocation |
| SEBI's 1-in-13 record | Justifies deemed approval + published rubric as anti-friction design |

---

## Primary sources
- Telecommunications Act 2023 gazette — https://egazette.gov.in/WriteReadData/2023/250880.pdf
- TRAI Recommendations 12.04.2024 — https://www.trai.gov.in/sites/default/files/2024-09/Recommendation_12042024_0.pdf
- TRAI Response to DoT back-reference 25.04.2025 — https://www.trai.gov.in/sites/default/files/2025-04/TRAIs%20Response.pdf
- SEBI Regulatory Sandbox register — https://www.sebi.gov.in/sebiweb/other/RegulatorySandbox.jsp
- SEBI Revised Framework 14.06.2021 — https://www.sebi.gov.in/legal/circulars/jun-2021/revised-framework-for-regulatory-sandbox_50521.html
- IRDAI Annual Report 2022-23 (§II.1.1, the cohort→continuous change) — https://irdai.gov.in/documents/37343/366637/Annual+Report+2022-23+English+Copy.pdf

## Do not assert
Gazette number of IRDAI 2019 Regs · exact in-force date of IRDAI 2025 Regs (1/3/9 Jan conflict) ·
whether IRDAI's master circular is issued · total IRDAI cohort count · whether Telecom Act s.27
is in force or its rules notified · DoT WiTe Zone fees/statistics · any Bharat 6G Alliance
sandbox (no evidence found).
