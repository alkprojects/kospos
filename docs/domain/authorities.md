# Authorities

Who controls what in San Francisco position management. KosPos lives downstream of these
authorities — any rule it encodes ultimately traces back to one (or more) of them.

This file is the **authority map**. For the data products each authority publishes, see
[`../data-sources/`](../data-sources/README.md). For the rules themselves, follow the
citations into primary sources (Charter, Administrative Code, Civil Service Rules, MOUs).

## At a glance

| Authority | Acronym | Owns | Adopted via | KosPos data-source file |
|---|---|---|---|---|
| Board of Supervisors | BOS | Final budget adoption (AAO, ASO), Administrative Code amendments, Charter ballot referrals, MOU ratification | Ordinance / resolution | (see Mayor + Controller) |
| Mayor's Office | MYR | Budget Instructions, Proposed Budget (May 1 / June 1), ASO drafting | Mayor's transmittal | [`mayor.md`](../data-sources/mayor.md) |
| Controller | CON | Accounting policy, AAO administration, fiscal monitoring, payroll, pay calendar, source systems (PS HCM/FSCM, OBI, BFM) | Controller directive / accounting bulletin | [`controller.md`](../data-sources/controller.md) |
| Civil Service Commission | CSC | Civil Service Rules (Vol I–IV), classification appeals, eligibility-list certification, exam protests, disciplinary appeals | Commission resolution | [`civil-service.md`](../data-sources/civil-service.md) |
| Department of Human Resources | DHR | Classification plan, Compensation Manual, MOU negotiation/administration, exam administration, position-allocation actions | HR Director action (posted 7 days per Charter §10.103) | [`dhr.md`](../data-sources/dhr.md) |
| Department of Building Inspection (and every operating dept) | (dept) | Position fills, internal allocations within adopted budget, hiring decisions within delegated authority | Dept Head action | (dept-internal) |

## Authority detail

### Board of Supervisors (BOS)

**Scope.** Final adopted budget (AAO + ASO), Administrative Code amendments, Charter
amendment referrals to the ballot, MOU ratification, supplemental appropriations. Per
[Charter Article IX](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-2421),
the Board cannot increase the total budget above the Mayor's Proposed amount; it can only
re-allocate within it.

**Key documents.** [Final AAO FY26 + FY27 (adopted 2025-07-29)](https://media.api.sf.gov/documents/FY2026__FY2027_-_FINAL_AAO.pdf);
[Final ASO FY26 + FY27 (adopted 2025-07-29)](https://www.sf.gov/documents/43115/FY2026__FY2027_-_FINAL_ASO.pdf);
[BOS Budget Hearing Calendar FY26-27 & FY27-28](https://sfbos.archive.sf.gov/sites/default/files/2026_Budget_Hearing_Calendar.pdf).

**Update cadence.** Annual budget adoption (~July 29 each year, two-year ordinances).
Administrative Code and Charter amendments rolling. Provisional appointments past 3 years
require explicit Board approval ([Civil Service Rule 114.5](https://www.sf.gov/reports--july-2024--rule-114-appointments-civil-service-commission)).

**KosPos implications.** The AAO + ASO are the authoritative final-budget snapshots. Any
KosPos "phase: Board" snapshot must reconcile to them line-by-line. Provisional appointments
approaching 3 years must surface — they are a known position-control violation source per
DHR's semiannual reports to CSC.

### Mayor's Office (MYR)

**Scope.** Issues Budget Instructions each December; drafts the Proposed Budget (May 1 /
June 1 transmittal per [Charter §9.101–9.103](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-2421));
drafts the ASO; sets the position-control framework for the Department phase.

**Key documents.** [Budget Instructions for FY26-27 & FY27-28 (Dec 2025 update)](https://www.sf.gov/documents/48491/Dec2025_Budget_Instructions_Update.pdf);
[January 8, 2026 Mayor's Budget Instructions update](https://sfhss.org/resource/january-8-2026-mayors-budget-instructions-fye-2027-2028-and-opportunity-public-input/download);
[Mayor's Proposed Budget Documents](https://sfmayor.org/budget-documents).

**Update cadence.** Annual (Dec instructions → March departmental submission deadline →
May 1 / June 1 Mayor's transmittal → late-July Board adoption).

**KosPos implications.** Department-phase users must follow Mayor's Instructions on what's
submittable (CODB, FTE/attrition targets, position-control rules, equipment unit-cost
threshold of $10,000 / 3-year life). KosPos's budget-development math should default to
instruction-conformant outputs and surface a warning when a user picks an out-of-band value.

### Controller (CON)

**Scope.** All citywide accounting policy (Accounting P&P Manual); administers the AAO;
publishes the Six-Month and Nine-Month fiscal-monitoring reports; runs the Payroll Division
and issues the citywide pay calendar; the Systems Division owns PeopleSoft HCM, FSCM, ELM,
Oracle Business Intelligence, plus Phire, Control-M, IAM, FreshWorks, and the (non-Oracle)
**Sherpa BFM** budget-formulation system. Per [2024 Proposition C](https://www.spur.org/voter-guide/2024-11/sf-prop-c-inspector-general),
the Controller's Office now also houses an **Inspector General**, appointed by the
Controller with Mayor's approval and 2/3 Board confirmation ([implementation status,
July 2025](https://media.api.sf.gov/documents/Inspector_General_Implementation_Status_Update_Report_07.17.25.pdf)).

**Divisions.** Accounting Operations & Suppliers · Administration & Finance · Audits ·
Budget & Analysis · City Performance · Economic Analysis · Office of the Refuse Rates
Administrator · Payroll · Public Finance · Systems · Inspector General (new, post-Prop C).
Source: [About the Controller's Office](https://www.sf.gov/departments--controllers-office--about).

**Key documents.** [Six-Month Report FY25-26](https://media.api.sf.gov/documents/Six-Month_Report_FY25-26_FINAL.pdf);
[Nine-Month Report FY25-26](https://media.api.sf.gov/documents/Nine-Month_Report_FY25-26_FINAL.pdf);
[Payroll P&P Manual (April 2018, current as of public web)](https://sfcontroller.org/sites/default/files/Documents/payroll/PPPMApril2018Edition.pdf);
[Accounting P&P (Aug 2021 v3, latest publicly indexed)](https://sfcontroller.org/sites/default/files/Documents/AOSD/CON%20Accounting%20P&P%20%E2%80%93%20August%202021%20v3.pdf);
[Citywide Payroll Calendar index](https://www.sf.gov/payroll-calendar) and [CAL2026](https://media.api.sf.gov/documents/CAL2026.pdf).

**Update cadence.** AAO + ASO biennial (adopted late July). Fiscal-monitoring reports
twice yearly (Six-Month ~Feb, Nine-Month ~May) plus a Year-End report. Accounting P&P
roughly annual reissue. Pay calendar annual.

**KosPos implications.** Every chartfield model, special-class definition, and projection
methodology must defer to CON guidance when KosPos's interpretation conflicts. The Controller
(not DHR) issues the pay calendar — KosPos's `calendar.json` is sourced from CON. The CON
Systems Division owns every source system KosPos imports from; importer schema changes
follow Systems Division release cycles.

### Civil Service Commission (CSC)

**Scope.** Adopts Civil Service Rules under [Charter §10.101](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-1057).
Hears appeals of HR Director classification actions, disciplinary actions, and
eligibility-list certifications. Receives DHR's semiannual report on expired Cat 16/17/18
appointments.

**Volumes.** Vol I (most City employees, Rules 101–122); Vol II (Police uniformed ranks,
2xx series); Vol III (Fire uniformed ranks, 3xx series); **Vol IV (MTA service-critical
employees, 4xx series, [confirmed URL](https://www.sf.gov/resource--2022--rules-mta-service-critical-employees-civil-service-commission-vol-iv))**.

**Key documents.** [Vol I index](https://www.sf.gov/resource--2022--rules-apply-most-city-employees-civil-service-commission-vol-i);
[Rule 114 — Appointments (July 2024 reissue)](https://www.sf.gov/reports--july-2024--rule-114-appointments-civil-service-commission);
[Rule 121 — Layoff (July 2024)](https://www.sf.gov/reports--july-2024--rule-121-layoff-civil-service-commission);
[Civil Service Advisers index](https://www.sf.gov/resource--2022--civil-service-advisers);
[Adviser 34 — Exempt Appointments](https://www.sf.gov/reports--april-2018--exempt-appointments-know-your-status-civil-service-adviser-34).

**Update cadence.** Rule amendments at Commission meetings (typically semi-monthly).
Substantial Vol I rules reissued July 2024 (Rules 102, 113, 114, 120, 121); Rule 117
(Probation) last revised July 2000.

**KosPos implications.** Hiring-process templates, probation tracking, eligibility-list
expirations, layoff/bumping logic all trace to CS Rules. KosPos should treat each rule
volume's number as a composite key (`<vol, rule>`) because Vol II/III/IV mirror Vol I's
numbering with a +100/+200/+300 offset (Rule 109 ↔ 209 ↔ 309 ↔ 409 for classification).

### Department of Human Resources (DHR)

**Scope.** Maintains the citywide classification plan; publishes the Compensation Manual
and Hourly Rates by Class & Step; negotiates and administers MOUs; runs exams and
publishes eligible lists; allocates each position to a job class per Charter §10.103.
HR Director's classification actions are posted 7 days before taking effect.

**Key documents.** [Compensation Manual FY 2024-25 (latest standalone)](https://www.sf.gov/sites/default/files/2024-12/Compensation-Manual-FY-2024-25.pdf);
[Labor Agreements / MOUs index](https://www.sf.gov/labor-agreements-city-and-county-san-francisco);
[Actions on Job Classifications](https://www.sf.gov/actions-job-classifications);
[Annual Salary Ordinance (DHR-hosted copy)](https://sfdhr.org/sites/default/files/documents/Forms-Documents/Annual-Salary-Ordinance.pdf).

**Update cadence.** Comp Manual annual (FY25-26 standalone not yet republished as of
2026-05; rates do appear in the FY24-25/FY25-26 combined ASO). MOUs negotiated on three-year
cycles (most miscellaneous units on the 2024-2027 cycle; public-safety units on a staggered
2023-2026 cycle). HR Director actions rolling.

**KosPos implications.** Step / range reference data, COLA schedules, premium-pay codes,
benefit applicability — all sourced from DHR products. KosPos should pull every MOU
relevant to any class it tracks; DBI in particular touches **SEIU 1021 (Misc), IFPTE
Local 21 (Professional/Technical), MEA (Misc Management), LiUNA Local 261 (Laborers),
and the Building Inspectors Association Local 856 (the 6248/6270 inspector classes —
KosPos's existing docs missed this one)**.

### Operating department (DBI is the reference dept)

**Scope.** Fills positions within ASO-authorized count; manages internal allocations
within AAO appropriations; executes hiring per CS Rules + DHR processes; submits annual
budget proposals per Mayor's Budget Instructions; tracks position-control violations
(provisional 3-year cap, Cat 16/17/18 expirations, Group I 2% cap).

**KosPos implications.** This is the primary user. KosPos is dept-centric in v1.

## Reading order for KosPos contributors

When researching a question that needs an authoritative answer:

1. **Is it a budget dollar?** Start CON (AAO) and MYR (Proposed Budget).
2. **Is it a position or appointment type?** Start [`appointment-types.md`](appointment-types.md).
3. **Is it a hiring step or eligibility-list rule?** Start CSC (Civil Service Rules Vol I,
   Rule 110–114).
4. **Is it a pay rate, step, COLA, or premium?** Start DHR (Comp Manual + relevant MOU).
5. **Is it an accounting chartfield rule?** Start CON (Accounting P&P).
6. **Is it about layoff, bumping, or holdover?** CSC Rule 121 (Vol I) + relevant MOU.
7. **Is it probation timing?** Per-MOU + Rule 117 — there is no universal default.
8. **Is it about exempt appointment types or §10.104 categories?** Charter §10.104 +
   [`appointment-types.md`](appointment-types.md).
9. **Is it a process the city does that doesn't fit above?** Charter / Admin Code first
   (codelibrary.amlegal.com).

## Authority interactions

Some decisions cross authorities:

- **Classification actions.** HRD allocates positions to classes under Charter §10.103.
  Appeal pathway goes to CSC (Rule 109).
- **MOU adoption.** Mayor negotiates → BOS ratifies → DHR administers. Pay-rate schedules
  flow into the ASO administratively without re-adoption.
- **Position adds beyond ASO.** Require either supplemental appropriation (BOS) or a
  same-cost class substitution (DHR/Controller routing, typically permitted).
- **Provisional appointments past 3 years.** Require BOS approval (Rule 114.5).
- **Group I exempt over 2%.** Requires CSC approval (Charter §10.104, Group I cap).

## See also

- [`appointment-types.md`](appointment-types.md) — full appointment-type taxonomy
- [`positions.md`](positions.md) — KosPos's position model + the authoritative fields
- [`budget-process.md`](budget-process.md) — the three-function budget framework
- [`hiring-process.md`](hiring-process.md) — KosPos's hiring template + Rule 114 mapping
- [`../data-sources/README.md`](../data-sources/README.md) — per-source data files
