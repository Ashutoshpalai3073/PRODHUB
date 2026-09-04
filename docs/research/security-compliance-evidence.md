# Security & Data Compliance Evidence (India)

What a government department can *actually* require of a startup before letting it touch
citizen data. Underpins Sanyog's **security clearance checklist** (Stage 4) and **data/IP
clauses** (Stage 5).

✅ PRIMARY · 🟡 SECONDARY · ❌ UNCERTAIN

---

## 1. 🔑 The verified negative that reframes the whole debate

**GFR 2017 (updated to 31.01.2026) contains NO information-security requirement of any kind.**
Full-text search of the official Department of Expenditure PDF ✅ PRIMARY:

| Search term | Occurrences in GFR 2017 |
|---|---|
| `ISO` | **0** |
| `27001` | **0** |
| `STQC` | **0** |
| `CERT-In` | **0** |
| `cyber` | **0** |
| `information security` | **0** |
| `security audit` | **0** |

> **Use this.** If anyone claims "GFR mandates ISO 27001", they are wrong, and it is a
> checkable negative. India's procurement rulebook is silent on cyber security — which means
> **security requirements today are invented per-tender by each officer.** That inconsistency
> is itself a problem Sanyog solves, by shipping one standard checklist.

The only relevant GFR provision is **Rule 160**: e-procurement is mandatory for all
Ministries/Departments.

---

## 2. What IS actually required before a government application goes live

**CERT-In, *Guidelines on Information Security Practices for Government Entities*, 23 June 2023**
✅ PRIMARY — this is the closest thing to a general pre-go-live mandate:

- **Annexure 1, cl. 5.2** — applications/websites must be *"audited by CERT-In empanelled
  auditing organisation **prior to hosting**, at-least once annually and also after any major
  changes."*
- **Annexure 1, cl. 5.19** — *"Websites and Applications are **deployed/hosted only after a
  security audit clearance** from an accredited CERT-In empanelled audit agency."*
- **Annexure 1, cl. 5.1** — hosting only at designated government data centres or
  **MeitY-empanelled** cloud providers. Never inside a department LAN segment.
- **Para 3.4** — internal audit **every 6 months**; third-party audit **at least annually**.

⚠️ Legal character: these are *guidelines* under s.70B(4)(e) of the IT Act, **not directions
under s.70B(6)** — so the s.70B(7) penalty does not automatically attach. Present as the
operative administrative standard, not as a statutory offence.

**CERT-In empanelled auditors:** **236 organisations** on the official list (counted from the
list PDF generated 2 September 2026) ✅. Empanelment lasts **3 years**; application window
1 July – 30 September annually; fee ₹5,000.

> ⚠️ Common error to avoid: several commercial blogs claim auditors are graded "Category A–D".
> **The primary list contains no such grading** — "category" there means self-declared audit
> capability types. Do not repeat the A–D claim.

**CERT-In *Comprehensive Cyber Security Audit Policy Guidelines* v1.0, 25.07.2025** ✅ PRIMARY:
- §8(ii): *"OWASP Top 10, SANS Top 25 and similar should **not** be considered as standards or
  references for audits"* — comprehensive frameworks required instead.
- §8(v): audits of Ministry/Department applications handling sensitive PII must verify against
  MeitY's checklist of **282 control points**, which *"shall form the default mandatory audit
  scope."* *(The 282 figure is verified **as quoted by CERT-In**; the MeitY source document
  itself was not retrieved.)*
- §16.2: findings categorised by **both CVSS (severity) and EPSS (exploitation likelihood)**;
  certificate signed by Lead Auditor **and** Head of the Auditing Organisation.

---

## 3. CERT-In Directions, 28 April 2022 — No. 20(3)/2022-CERT-In ✅ PRIMARY

Binding on *"service providers, intermediaries, data centres, body corporate and Government
organisations"* — so they bind a startup running a government pilot.

| Direction | Requirement |
|---|---|
| (i) | Clock sync to **NIC or NPL NTP** servers |
| (ii) | Report listed cyber incidents to CERT-In **within 6 hours** of noticing |
| (iii) | Designate a **Point of Contact**; provide info up to **near real-time** on demand |
| (iv) | Enable logs, retain **180 days rolling**, **maintained within Indian jurisdiction** |
| (v) | Data centres / VPS / cloud / VPN: subscriber records for **5 years** |
| (vi) | Virtual asset providers: KYC + transaction records **5 years** |

- **Annexure I lists exactly 20 reportable incident categories** (i–xx), including data breach,
  data leak, ransomware, supply-chain-relevant attacks on IoT, cloud, and **AI/ML systems**.
- **Penalty — s.70B(7) IT Act, verbatim:** *"imprisonment for a term which may extend to one
  year or with fine which may extend to one lakh rupees or with both."*
- Effective **60 days after issue** (≈ 27 June 2022; the instrument prints no calendar date).
  MSMEs got until **25 September 2022**.
- ⚠️ The May 2022 FAQ (Q.35) says logs *may* sit outside India if producible on demand — but
  the FAQ expressly *"is not a legal document"* and cannot amend the Directions.
  **Engineering posture for Sanyog: keep 180 days of logs in India.**

---

## 4. ISO/IEC 27001 — where it is and is not mandatory

**Not a general legal mandate.** It appears only as:

1. **A safe harbour, not an obligation** — IT (Reasonable Security Practices) Rules 2011,
   **Rule 8(2)**: ISO 27001 is *"**one such standard**"* (permissive). **Rule 8(4)** deems
   compliance if certified/audited annually by a government-approved independent auditor.
2. **A hard pre-qualification inside specific schemes** ✅ PRIMARY:
   - **MeitY cloud (MeghRaj) CSP empanelment** — criterion #5 requires ISO 27001 certification,
     plus ISO 20000-1, 27017, 27018, TIA-942/Uptime Tier III+, and **data centre within India**.
     Step 4 of empanelment is a **mandatory STQC audit**; MeitY issues the empanelment letter
     only on successful STQC audit; empanelled services are then sold via **GeM**.
   - **MeitY GCQE v2.1 (e-Procurement)** — hosting infrastructure *"should have certification
     as per ISO/IEC 27001"*.

### ⚠️ The version trap — highly usable detail
**ISO/IEC 27001:2013 certificates became invalid after 31 October 2025** (STQC transition
policy ✅ PRIMARY). Only **ISO/IEC 27001:2022** is valid.

> As of September 2026, **any vendor presenting an ISO 27001:2013 certificate is presenting an
> expired certificate.** Sanyog's checklist should validate the *edition*, not just the
> presence of a certificate. Note also that MeitY's own cloud empanelment document still asks
> for "ISO 27001: **2013**" — a live inconsistency in a government document.

---

## 5. DPDP Act 2023 — the obligation that actually bites

✅ PRIMARY (meity.gov.in full text):

- **The word "27001" appears ZERO times.** The Act names **no** security standard.
- **s.8(5):** a Data Fiduciary shall protect personal data *"by taking **reasonable security
  safeguards** to prevent personal data breach"* — including data processed **on its behalf by
  a Data Processor** (i.e. the department stays liable for its pilot startup).
- **Penalty (Schedule, s.33):** breach of s.8(5) — **up to ₹250 crore**. Breach of the
  notification duty (s.8(6)) — up to ₹200 crore.
- **s.44(2)** omits IT Act **s.43A** and **s.87(2)(ob)** — the foundations of the 2011 SPDI
  Rules. ❌ Whether s.44 is in force was **not verified** — do not claim the SPDI Rules are dead.

**DPDP Rules 2025 (G.S.R. 846(E), 13 November 2025)** — also names **no standard**; **Rule 6**
prescribes minimum controls: encryption/masking/tokenisation · access control · logs,
monitoring and review · backups · **retain logs and personal data one year** · contractual
flow-down to processors.
⚠️ Rule 6 sits in the **18-month tranche** — not in force until ≈ **mid-May 2027**.

---

## 6. What Sanyog's security checklist therefore requires

Derived from the above — every item is defensible against a primary source:

| Check | Basis |
|---|---|
| Security audit by a **CERT-In empanelled auditor** before the sandbox goes live | CERT-In Govt Entities Guidelines, Annexure 1 cl. 5.2 / 5.19 ✅ |
| Re-audit **annually** and after any major change | Same, cl. 5.2 · para 3.4 ✅ |
| Hosting only on government DCs or **MeitY-empanelled cloud** | Same, cl. 5.1 ✅ |
| **ISO/IEC 27001:2022** where the pilot handles sensitive data — *edition checked* | STQC transition policy ✅ |
| **6-hour** incident reporting path and a named Point of Contact | CERT-In Directions (ii), (iii) ✅ |
| **180 days of logs, held in India** | CERT-In Direction (iv) ✅ |
| Documented **"reasonable security safeguards"** + processor flow-down | DPDP s.8(5); Rules 2025 r.6 ✅ |
| Data minimisation / anonymisation in the sandbox; erase participant data on exit | IRDAI Reg 11(5); DPDP ✅ |

**And the line Sanyog does not cross:** turnover, prior experience and EMD are waivable —
**security clearance, data protection and fitness to handle citizen data are not.**

---

## Primary sources
- GFR 2017 (to 31.01.2026) — https://doe.gov.in/files/circulars_document/GFRupdatedupto31012026.pdf
- CERT-In Guidelines for Government Entities (23.06.2023) — https://www.cert-in.org.in/PDF/guidelinesgovtentities.pdf
- CERT-In Directions 28.04.2022 — https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf
- CERT-In Comprehensive Cyber Security Audit Policy Guidelines v1.0 (25.07.2025) — https://www.cert-in.org.in/PDF/Comprehensive_Cyber_Security_Audit_Policy_Guidelines.pdf
- CERT-In empanelled organisations list (236) — https://www.cert-in.org.in/PDF/Empanel_org.pdf
- STQC ISO/IEC 27001:2022 transition policy — https://www.stqc.gov.in/sites/default/files/tenders/STQC%20Policy.pdf
- MeitY cloud CSP empanelment stepwise guide — https://www.ambud.meity.gov.in/assets/web_assets/Includes/files/Stepwise%20guide%20on%20empanelment%20process.pdf
- DPDP Act 2023 — https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf

## Do not assert
CERT-In auditor "Category A–D" grading (unsupported) · that GeM's terms name ISO 27001 (not
retrieved) · that s.43A is already repealed (s.44 commencement unverified) · a UIDAI instrument
mandating STQC-certified devices (scheme verified, mandate not) · the MeitY 282-control
document itself (verified only as quoted by CERT-In) · a calendar commencement date printed in
the 2022 Directions (it prints none).
