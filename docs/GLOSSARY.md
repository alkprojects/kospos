# Glossary

SF-specific and project-specific terms. Add as you go.

## People & positions

- **Position** — A budgeted slot with a unique Position Number. Lives whether filled or vacant. Has a Job Code, Department, Reports-To pointer, FTE.
- **Employee** — A person who fills a position. May be acting (Vice) in a different position.
- **Vice 1 / Vice 2** — Acting assignment fields. When `Vice 1` is populated and ≠ the position's current employee, the employee is acting in that role.
- **FTE** — Full-Time Equivalent. 1.0 = a full-time slot. Some positions are budgeted at fractional FTE.
- **Reports-To** — A Position Number pointing to the supervising position. Always position-to-position, not person-to-person.

## Appointment types

Full taxonomy lives in [`domain/appointment-types.md`](domain/appointment-types.md).
Common abbreviations:

- **PCS** — Permanent Civil Service. Appointment from a certification off an eligible
  list (CS Rule 114.2). Charter A8.401 framework.
- **PEX** — Permanent Exempt. Charter §10.104, subs 1-15 and 19 (long-tenure exempts).
  Includes department heads, mayoral policy staff, named §10.104-14 professionals.
- **TEX** — Temporary Exempt. Charter §10.104, subs 16-18 (time-limited exempts).
- **Cat 16** — §10.104-16. Temporary / seasonal, ≤1,040 hrs (half-time) per fiscal year.
- **Cat 17** — §10.104-17. Backfill for leave, ≤2 years lifetime, non-renewable.
- **Cat 18** — §10.104-18. Special projects / limited-term funding, ≤3 years, non-renewable.
- **Cat 19** — §10.104-19. Severely disabled entry-level; converts to PCS after 1 year
  satisfactory service per CS Rule 115.
- **Provisional** — CS Rule 114.5. Fills vacancy when no eligible list exists. Hard cap
  3 years (BOS approval beyond).
- **MTA Exempt** — Charter §8A.104(i) (NOT §10.104). MTA managerial exempts; 2.75% cap
  of MTA workforce.
- **Personnel Requisition** — CS Rule 113 §113.8 term for what KosPos/SFDHR/PeopleSoft
  call an "RTF (Request to Fill)."

## Budget

- **BFM** — Budget Formulation Module. SF's budget system of record.
- **Eturns** — The main BFM report format. Comes in *Position* (FTE/class only) and *Non-position* (all dollars including labor as totals) flavors.
- **AAO** — Annual Appropriation Ordinance. Final adopted dollar appropriations per department.
- **ASO** — Annual Salary Ordinance. Position counts and classes per department.
- **Base / Department / Mayor / Committee / Technical / Board** — The phases of the SF budget cycle.
- **Special class** — Sub-account categories within labor. Eight of them, see `docs/domain/special-class.md`. Examples: 9993 (attrition), STEPM (step adjustments), PREMM (premium pay).
- **Appropriation control** — How PS Financials checks available budget. Three trees (Account, Project, Authority). Labor actuals always post and ignore controls.

## Chartfields

The dimensions on every accounting transaction. See `docs/domain/chartfields.md`.

- **Fund** — Where money comes from (e.g., General Fund, Enterprise funds).
- **Department** — The group of people the money is for.
- **Project** — The scope of work.
- **Activity** — Child of project. Ad hoc reporting need.
- **Authority** — Reflects budget owner. Hierarchy.
- **Account** — "What" — the kind of expense (5xxx = salaries, 6xxx = benefits, etc.).
- **TRIO** — Transfer in / out.
- **Agency Use** — Used only by select departments.
- **Combo Code** — A chartfield shortcut bundling Fund + Dept + Authority. Does NOT include Project/Activity.
- **Task Profile** — A chartfield shortcut bundling everything except Account.

## Hiring

- **RTF** — Request to Fill. Internal SFDHR/PeopleSoft workflow term for what CS Rule
  113 §113.8 calls a **Personnel Requisition**. Tracked through approval steps with an
  expected fill date.
- **Personnel Requisition** — CS Rule 113 §113.8 name for the formal request to fill a
  position. Time-stamped in order of receipt.
- **Eligibility list** — Ranked list of candidates who passed the exam for a class.
  Created/maintained by DHR per CS Rule 112. Min 6 months before HR Director cancellation;
  max 48 months with one 12-month extension.
- **Civil Service Rules** — Codified rules from the Civil Service Commission. Rule 109
  (Vol I) governs classification; Rule 114 governs appointments; Rule 121 governs layoff.
  Four volumes: Vol I most employees, Vol II Police uniformed, Vol III Fire uniformed,
  Vol IV MTA service-critical.
- **Civil Service Adviser** — CSC-published interpretive guidance, numbered #1–#36
  (gaps at #4, #9). Adviser #34 is the authoritative grouping of Charter §10.104
  categories into Groups I–IV.
- **Group I 2% cap** — Charter §10.104 subs 1-12 exempt appointments capped at 2% of
  citywide workforce. Exceeding requires CSC approval.

## Compensation

- **MOU** — Memorandum of Understanding. Union contract. Defines premium pay, step rules, COLA, etc.
- **Step** — Standard pay increments. Most positions auto-advance through regular steps on merit increase date.
- **Extended step** — Beyond the standard top step. Must be granted manually.
- **MCCP** — Management Classification and Compensation Plan. Range-based instead of step-based.
- **Range A / B / C** — MCCP ranges. Range A auto-advances; B and C are granted manually.
- **COLA** — Cost-of-Living Adjustment. Applied per MOU.
- **Premium pay** — Additional pay per MOU clauses (acting, bilingual, hazardous, etc.).

## Time & labor

- **T&L** — Time & Labor. The PeopleSoft HCM module for time entry.
- **PP** — Pay Period. SF has 26 full PPs + a partial PP27 per fiscal year.
- **PPE** — Pay Period End date.
- **Pay calendar** — Published by DHR annually. Lists all PPs, PPEs, paydays, holidays.

## Source systems

- **PS HCM** — PeopleSoft Human Capital Management. System of record for employees,
  positions, T&L.
- **PS Financials** — PeopleSoft Financials (FSCM). System of record for accounting,
  chartfields.
- **OBI** — Oracle Business Intelligence. Current Controller-owned reporting platform;
  internally branded "SF Reports and Analytics."
- **Snowflake** — Department-of-Technology data-warehouse platform; **not** confirmed
  as replacing OBI on any public timeline. Treat references as forward-looking.
- **BFM** — Budget Formulation Module. Vendor: **Sherpa Government Solutions** (selected
  August 2020); internally branded "SF Budget."
- **DHR** — Department of Human Resources. Owns job classifications, salaries (per ASO),
  MOUs. Pay calendar is Controller-issued, not DHR.
- **CON** — Controller's Office. Owns accounting policies, AAO administration, fiscal
  monitoring, payroll, pay calendar, source-system infrastructure.
- **CSC** — Civil Service Commission. Owns Civil Service Rules (Vols I–IV).
- **MYR** — Mayor's Office. Issues budget instructions and Proposed Budget.
- **BOS** — Board of Supervisors. Adopts AAO + ASO, ratifies MOUs, approves provisional
  appointments past 3 years.
- **IG** — Inspector General, Controller's Office. Created by 2024 Prop C.

## See also

- [`domain/authorities.md`](domain/authorities.md) — full map of who controls what
- [`domain/appointment-types.md`](domain/appointment-types.md) — full appointment-type taxonomy
- [`data-sources/`](data-sources/README.md) — per-source data files

## KosPos-specific

- **Change Mode** — App toggle that records edits as proposed-changes rather than mutating data.
- **Change Report** — Excel/PDF output of all proposed changes, grouped by system-of-record.
- **Data Issues panel** — Global panel listing anomalies detected by `lib/quality/` rules.
- **Audience mode** — Org chart visibility setting: Executive / Internal Mgmt / Internal All Staff / External.
