# Glossary

SF-specific and project-specific terms. Add as you go.

## People & positions

- **Position** — A budgeted slot with a unique Position Number. Lives whether filled or vacant. Has a Job Code, Department, Reports-To pointer, FTE.
- **Employee** — A person who fills a position. May be acting (Vice) in a different position.
- **Vice 1 / Vice 2** — Acting assignment fields. When `Vice 1` is populated and ≠ the position's current employee, the employee is acting in that role.
- **FTE** — Full-Time Equivalent. 1.0 = a full-time slot. Some positions are budgeted at fractional FTE.
- **Reports-To** — A Position Number pointing to the supervising position. Always position-to-position, not person-to-person.

## Appointment types

- **PCS** — Permanent Civil Service. Requires exam + eligibility list.
- **PEX** — Permanent Exempt. Exempt from civil service (Charter §10.104).
- **TEX** — Temporary Exempt.
- **CAT 16 / 17 / 18** — Categories of temporary appointments with strict time limits. Cat 18 is the longest.

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

- **RTF** — Request to Fill. The SF process for filling a vacant position. Tracked through approval steps with an expected fill date.
- **Eligibility list** — Ranked list of candidates who passed the exam for a class. Published by DHR.
- **Civil Service Rules** — Codified rules from the Civil Service Commission. Rule 109 (Vol I) governs classification.

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

- **PS HCM** — PeopleSoft Human Capital Management. System of record for employees, positions, T&L.
- **PS Financials** — PeopleSoft Financials. System of record for accounting, chartfields.
- **OBI** — Oracle Business Intelligence. Current reporting platform. Being replaced by Snowflake.
- **Snowflake** — The data warehouse OBI is migrating to. Timeline unclear; treat any references as forward-looking.
- **DHR** — Department of Human Resources. Owns job classifications, salaries, calendar, MOUs.
- **CON** — Controller's Office. Owns policies, procedures, budget instructions.
- **CSC** — Civil Service Commission. Owns Civil Service Rules.
- **MYR** — Mayor's Office. Issues budget instructions and proposed budget.

## KosPos-specific

- **Change Mode** — App toggle that records edits as proposed-changes rather than mutating data.
- **Change Report** — Excel/PDF output of all proposed changes, grouped by system-of-record.
- **Data Issues panel** — Global panel listing anomalies detected by `lib/quality/` rules.
- **Audience mode** — Org chart visibility setting: Executive / Internal Mgmt / Internal All Staff / External.
