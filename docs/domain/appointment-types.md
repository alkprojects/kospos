# Appointment Types

Definitive enumeration of San Francisco appointment types — permanent civil service, the
Charter §10.104 exempt categories (19 of them), provisional, the various time-limited
temporary categories, and special tracks (transfer, reinstatement, MTA exempt manager,
disabled-conversion).

KosPos's [`hiring-process.md`](hiring-process.md) and [`GLOSSARY.md`](../GLOSSARY.md) list
a subset of types DBI uses regularly. This file is the **complete taxonomy** across all SF
departments — sourced from the Charter, Administrative Code, and Civil Service Rules.

## Core framing

San Francisco distinguishes two orthogonal concepts:

- **Appointment type** — the *mechanism* by which a position was filled. Determines tenure
  rights, examination requirement, time limits, layoff/bumping protections.
- **Class (job code)** — the *categorization* of the work itself. Determines pay schedule
  (MOU, step grid), classification authority chain.

A class can be a "typically exempt" class (e.g., the 092x MCCP managerial series, the
0931 Manager III, the special-assistant series), but the *appointment* attribute controls
tenure. An incumbent in an exempt class filled via a Cat 16/17/18 appointment can convert
to PCS in the same class after 2,080 hours via DHR's Exempt-to-Permanent Class-Based
Test pathway — the class doesn't change, only the appointment type does. KosPos's data
model should treat these as two distinct fields.

Source: [CSC Adviser 34 — Exempt Appointments, Know Your Status](https://www.sf.gov/reports--april-2018--exempt-appointments-know-your-status-civil-service-adviser-34).

## Quick reference

| Code (KosPos) | Verbatim Rule 114 name | Statutory source | Exam? | Layoff rights | Time limit |
|---|---|---|---|---|---|
| PCS | Permanent appointment | [Charter A8.401](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-1783) + CS Rule 114.2 | Yes (cert from eligible list) | Full (seniority, bump, holdover) | None |
| Probationary | Probationary appointment | CS Rule 117 | (already certified) | Limited until probation completes | Per MOU / class |
| Temp CS | Temporary appointment | Rule 114.4 | Yes (from list) | None on expiration | 1,040 hrs std / 2,080 hrs special-project |
| Provisional | Provisional appointment | Rule 114.5 | No (merit + EEO factors) | None | ≤3 yrs (BOS approval needed beyond) |
| PEX | Exempt appointment (long-tenure) | Charter §10.104, subs 1-15 + 19 | No | At-will | None (except §19 = 1-yr conversion) |
| TEX | Exempt appointment (time-limited) | Charter §10.104, subs 16-18 | No | None | Per category (see below) |
| Cat 16 | Charter §10.104-16 | [§10.104-16](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-1076) | No | None | ≤1,040 hrs (half-time) per fiscal year |
| Cat 17 | Charter §10.104-17 | §10.104-17 | No | None | ≤2 years, NON-RENEWABLE (typically four 6-mo increments) |
| Cat 18 | Charter §10.104-18 | §10.104-18 | No | None | ≤3 years, NON-RENEWABLE |
| Cat 19 | Charter §10.104-19 | §10.104-19 + CS Rule 115 | No | Converts to PCS after 1 yr | 1-year evaluation period |
| Reinstatement | Appointment by reinstatement | Rule 114 Art. II | No | Retains seniority | None |
| Reappointment | Reappointment | Rule 114.11.2 | No | Per ordinance | 4 yrs after resignation |
| Transfer | Appointment by transfer | Rule 114.13 | No | Maintains PCS rights | None (new probation required) |
| Limited-Term Transfer | Limited-term transfer | Rule 114.17 | No | Auto-reinstatement to original | ≤6 mo/calendar year (mandatory); voluntary extendable |
| MTA Exempt | MTA exempt manager | [Charter §8A.104(i)](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-682) | No | At-will | None; capped at 2.75% of MTA workforce |

## Charter §10.104 — Exempt employee categories (full enumeration)

The Charter enumerates 19 exempt categories at [§10.104](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-1076).
CSC groups them into four bands (Adviser 34):

- **Group I (subs 1-12)** — high-level policy/executive. Citywide cap of **2% of workforce**;
  requests above the cap require CSC approval.
- **Group II (subs 13-15)** — named professional positions (attorneys, physicians, etc.).
  No CSC role.
- **Group III (subs 16-19)** — temporary / seasonal / project / disabled-entry. The Cat
  16/17/18 reports go to CSC semiannually (DHR Report of Expired Exempt Appointments).
- **Group IV (Charter §8A.104(i))** — MTA exempt managers. Separate Charter section,
  separate cap (2.75% of MTA workforce). Not in §10.104 itself.

| Sub | Working title | Scope / typical use |
|---|---|---|
| 10.104-1 | Mayor / City Administrator policy positions | All supervisory and policy-level positions in the Mayor's office and the Office of the City Administrator |
| 10.104-2 | Elected officers + chief deputies | All elected officers and their chief deputies / chief assistants |
| 10.104-3 | Commission / board / advisory members | Members of commissions, boards, advisory committees |
| 10.104-4 | Commission secretaries | Not more than one commission secretary per commission/board |
| 10.104-5 | Department heads | All heads of agencies and departments (unless Charter says otherwise) |
| 10.104-6 | Deputy directors | Department deputy directors (within Group I 2% cap) |
| 10.104-7 | Executive assistants | Executive assistants to department heads / electeds |
| 10.104-8 | Confidential secretaries | Confidential secretaries to department heads / electeds |
| 10.104-9 | Legislative analysts / assistants | Board of Supervisors legislative analysts and assistants |
| 10.104-10 | Additional Mayor's staff | Mayor's designated additional staff (within Group I 2% cap) |
| 10.104-11 | Other policy-level positions | Other supervisory / policy positions (within 2% cap) |
| 10.104-12 | Out-of-City construction positions | Positions outside the City for construction work, exempted by CSC order |
| 10.104-13 | Attorneys / DA & CA investigators / hospital chief admins / physicians and dentists | Continuing 1932-Charter exemptions; includes attorney to the Sheriff and Tax Collector |
| 10.104-14 | Named professional positions | Law librarian, bookbinder, purchaser, museum curators, Assistant Sheriff, Deputy Port Director, Bureau of Maritime Affairs Chief, Director of Admin & Finance of Port, Port Sales/Traffic Managers, Chief Wharfinger, Port Commercial Property Manager, Retirement Actuary, Director of the Zoo, Chief Veterinarian, Director of Arboretum, Director of Employee Relations, Health Service Administrator, Executive Assistant to Human Services Director, **Inspector General in the Controller's Office** (added 2024 via Prop C) |
| 10.104-15 | Expert professional temporary services | "Persons in positions for expert professional temporary services" exempted by CSC order for a specified period |
| 10.104-16 | Temporary / seasonal (≤1,040 hrs/FY) | Half-time-or-less work in any fiscal year — the canonical "Cat 16" |
| 10.104-17 | Backfill for leave (≤2 yrs, non-renewable) | Substitute for a CS employee on authorized leave; typically four 6-month increments, ~4,150 hrs lifetime max |
| 10.104-18 | Special projects / limited-term funding (≤3 yrs, non-renewable) | Special projects, professional services with limited-term funding |
| 10.104-19 | Entry-level for severely disabled | Entry-level appointment of a severely disabled person; converts to PCS after 1 year satisfactory service per CS Rule 115 |

DHR files a semiannual report to CSC on **expired Cat 16/17/18 appointments**; see
[DHR Report 3/18/24](https://media.api.sf.gov/documents/3-18-24_Item_10_DHR_Report_of_Expired_Exempt_Appointments_Cat_16-17-18.pdf).
Positions past their category time limit are position-control violations.

## Full type-by-type detail

### Permanent Civil Service (PCS)

- **Statutory source:** Charter [A8.401](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-1783)
  (merit system framework) + CS Rule 114.2 (appointment from eligible list).
- **Typical use:** the default for nearly all positions citywide.
- **Exam required:** Yes — appointment must come from a certification off an eligible list
  (CS Rules 110–113).
- **Salary-step treatment:** Standard step grid per ASO + applicable MOU; auto-advance
  per MOU step rules.
- **Layoff rights:** Full — seniority-based order under Rule 121, citywide bumping in
  same class, holdover for ~5 years (KosPos: verify exact holdover duration against Rule
  121.14.6 — Agent C surfaced 5 years but the rule body wasn't fully extracted).
- **Time limits:** None.

### Probationary appointment

- **Statutory source:** CS Rule 117.
- **Duration:** **Per-class, set in the applicable MOU.** Rule 117 does *not* set a single
  default — typical lengths are 6 or 12 months depending on MOU. **KosPos should not
  hardcode a probation period.**
- **Extensions:** Up to 12 calendar months total for license/certificate acquisition
  (Rule 117.4).
- **Release:** Appointing officer may release at any time during probation with written
  notice (Rule 117.9.1); promotive probationers may revert within 30 days (Rule 117.9.3).
- **Excluded from Rule 117:** Police uniformed ranks (Rule 217), Fire uniformed ranks
  (Rule 317), MTA service-critical (Rule 417).

### Temporary Civil Service appointment

- **Statutory source:** CS Rule 114.4.
- **Time limits:** 130 working days / 1,040 hours standard; 260 working days / 2,080
  hours for special projects.
- Filled from the eligible list (same as PCS); appointee returns to list at expiration.

### Provisional appointment

- **Statutory source:** CS Rule 114.5.
- **Use case:** No eligible list exists for the class; emergency fill.
- **Cap:** 3 years. **Extension beyond 3 years requires Board of Supervisors approval.**
  Provisionals past 3 years are a frequent position-control violation per DHR's
  semiannual CSC reports — KosPos should surface time-to-cap warnings.

### Permanent Exempt (PEX)

- **Statutory source:** Charter §10.104, subsections 1-15 and 19 (long-tenure exempts).
- **Typical use:** Department heads, mayoral policy staff, named §10.104-14 professionals,
  severely-disabled appointees (§10.104-19).
- **Exam required:** No.
- **Tenure:** "At-will" — serves at the appointing officer's discretion (Adviser 34).
- **Layoff rights:** None — not subject to CS removal / bump procedures.
- **Time limits:** None (except §10.104-19, which converts to PCS after 1 year of
  satisfactory service).

### Temporary Exempt (TEX)

- **Statutory source:** Charter §10.104, subsections 15-18.
- **Typical use:** Time-limited exempt work — expert professional temporary services
  (§15), seasonal/half-time (§16, "Cat 16"), backfill (§17, "Cat 17"), special projects
  (§18, "Cat 18").
- **Time limits:** Per Charter subsection — see Cat 16/17/18 detail below.

### Cat 16 — Charter §10.104-16

- **Time limit:** ≤1,040 hours (≈half-time) per fiscal year. Resets each FY.
- **Use:** Temporary, seasonal, or intermittent work where no permanent position is
  warranted.

### Cat 17 — Charter §10.104-17

- **Time limit:** Up to 4 six-month increments, ~4,150 hours lifetime maximum. **Non-renewable**
  beyond that cap.
- **Use:** Backfill for a permanent civil-service employee on authorized leave.
- **Practical max:** ~2 years total.

### Cat 18 — Charter §10.104-18

- **Time limit:** Up to 3 years, **non-renewable**.
- **Use:** Special projects, professional services with limited-term (e.g., grant-funded)
  source.

### Cat 19 — Charter §10.104-19 / CS Rule 115

- **Use:** Entry-level appointment of a severely disabled person.
- **Conversion:** After 1 year of satisfactory service, **converts to PCS without
  probationary period and with full PCS rights.**
- **Significance for KosPos:** the class code does not change but the appointment-type
  field flips PEX(19) → PCS at the 1-year mark. Position tracking must support this
  in-place conversion.

### Reinstatement

- **Statutory source:** Rule 114, Article II.
- **Use:** Restoration of a former PCS employee (e.g., after promotion that didn't pan
  out, or after authorized leave).
- **Seniority:** Retained.

### Reappointment

- **Statutory source:** Rule 114.11.2.
- **Use:** Rehire of a former PCS within 4 years of resignation.
- **Prior service credit:** Per ordinance.

### Transfer

- **Statutory source:** Rule 114.13.
- **Use:** Move to the same class under a different appointing officer.
- **New probation:** Required.
- **PCS rights:** Maintained.

### Limited-Term Transfer (LTT)

- **Statutory source:** Rule 114.17.
- **Time limit:** ≤6 months per calendar year (mandatory case); voluntary case can extend.
- **Auto-reinstatement:** At expiration, returns to original position.

### MTA Exempt Manager (Group IV)

- **Statutory source:** Charter §8A.104(i) — **NOT** §10.104.
- **Cap:** 2.75% of MTA workforce.
- **Designated by:** Director of Transportation.
- **Tenure:** At-will.
- **KosPos significance:** If KosPos ever shows SFMTA data, this is a *different* Charter
  section with a *different* cap than the §10.104 Group I 2% cap. Conflating the two will
  miscalculate cap-utilization warnings.

### Director of Elections

- **Statutory source:** Charter §13.104 (via Rule 114 §9).
- **Use:** Single specific appointment.
- **Process:** Merit-based with ≥3 candidates.
- **Term:** 5 years, renewable.

## "RTF" terminology — a correction

KosPos's current docs treat **RTF (Request to Fill)** as a foundational SF concept. It is
not a Charter, Administrative Code, or Civil Service Rules term. Rule 113 §113.8 calls
these **"Personnel Requisitions,"** time-stamped in order of receipt.

"RTF" is **internal SFDHR / PeopleSoft process vocabulary** for the Personnel Requisition
workflow. KosPos should treat RTF as an operational workflow concept that maps to the
Rule 113 Personnel Requisition + Rule 114 appointment chain — not as a primary statutory
entity.

This rephrasing matters when KosPos extends beyond DBI: other departments may use different
internal naming for the same Rule 113 workflow.

## "Exempt class" vs "exempt appointment" — the distinction

Two distinct concepts SF practitioners often conflate:

1. **Exempt class** — a job code (e.g., the 092x MCCP managerial series, the 0931 Manager
   III, the 0900 series, the "special assistant" series) that is *typically* filled via an
   exempt mechanism. The class itself isn't "exempt"; it's just often used that way.
2. **Exempt appointment** — the mechanism by which a position was filled (any of the
   Charter §10.104 categories, or §8A.104(i) for MTA). The position's class code may or
   may not be one of the typically-exempt classes.

DHR runs **Exempt-to-Permanent Class-Based Tests** so that an exempt-class incumbent who
has logged ≥2,080 hours in Cat 16/17/18 can convert to PCS in the same class — the seat
stays, the class stays, only the appointment type changes.

**KosPos data-model implication:** appointment type and class must be modeled as
independent fields. A query like "how many exempt employees do we have?" requires the user
to pick which sense ("appointed exempt" vs. "in an exempt class") — KosPos should expose
both.

## Group I 2% workforce cap

Charter §10.104 caps Group I (subs 1-12) exempt appointments at **2% of citywide
workforce**. Requests exceeding the cap require CSC approval. KosPos's citywide rollout
should track per-department contributions to the citywide Group I count and surface
warnings when the cap approaches.

The MTA cap under §8A.104(i) is **2.75%** of MTA workforce — a different denominator and
a different cap. Don't aggregate.

## Cross-references in KosPos

- [`hiring-process.md`](hiring-process.md) — Cat 19, MTA Exempt, Provisional 3-yr cap
  added based on this taxonomy.
- [`positions.md`](positions.md) — `Employee Appointment Type` field maps to the codes
  in the Quick Reference table above. `EE Exempt Category Description` maps to the
  Charter §10.104 sub-section.
- [`definitions.md`](definitions.md) — "Temp" has four overlapping definitions; this file
  resolves the appointment-type definition (categories 16, 17, c2).
- [`authorities.md`](authorities.md) — which authority adjudicates each appointment type.
- [`../GLOSSARY.md`](../GLOSSARY.md) — abbreviation definitions.

## Conflicts to reconcile

KosPos's existing claims that should be reviewed against this taxonomy:

1. **GLOSSARY.md says:** "CAT 16 / 17 / 18 — Categories of temporary appointments with
   strict time limits. Cat 18 is the longest."
   **More precisely:** Cat 16 is hours-based (1,040 hrs/FY half-time), Cat 17 is 2-yr
   backfill non-renewable, Cat 18 is 3-yr special-project non-renewable. The three are
   not interchangeable in terms of use case. Cat 19 is missing entirely.

2. **GLOSSARY.md says:** "PCS — Permanent Civil Service. Requires exam + eligibility list."
   **Correct, but incomplete.** PCS requires appointment from a certification off an
   eligible list under Rules 110–114. Probationary period is per-MOU/per-class, not a
   global value.

3. **GLOSSARY.md says:** "PEX — Permanent Exempt. Exempt from civil service (Charter
   §10.104)."
   **More precisely:** PEX maps to §10.104 subs 1-15 + 19. TEX maps to subs 16-18. Cat
   19 is a unique 1-year-to-PCS conversion track.

4. **hiring-process.md** does not mention Cat 19, MTA exempt managers (§8A.104(i)),
   Provisional appointments, or the 3-year Provisional cap.

5. **hiring-process.md** treats "RTF" as canonical; see "RTF terminology" correction above.

6. **No KosPos doc currently mentions** the Group I 2% workforce cap, the MTA 2.75% cap,
   or DHR's semiannual Cat 16/17/18 expiration report to CSC.
