# Vision

## The problem

San Francisco city departments spend significant staff time piecing together position-management data from multiple systems — BFM (budget), PeopleSoft HCM (employees, time & labor), PeopleSoft Financials (chartfields, appropriation control), OBI (current reporting; being replaced by Snowflake), DHR (job classes, salaries, calendar, MOUs), and the Civil Service Commission (rules). Most of this assembly happens by hand in Excel workbooks that are department-specific, fragile, and out of date the moment they're published.

Almost all the underlying data already exists in those source systems. What's missing is a tool that turns the standard reports into a maintained workspace instead of a redrawing exercise — and that flags data inconsistencies so they get fixed upstream.

## What we're building

A web app that:

1. **Imports the standard SF labor and budget reports** (BFM eturns, PS HCM P&P Data, OBI BI Payroll, Combo Code / Roster Approver / EE Additional Pay queries, DHR reference data).
2. **Calculates** position costs, special-class budgets, and year-end projections that match Alex's existing spreadsheets to the dollar — and shows the math, not a black box.
3. **Tracks the hiring plan** for vacant positions — current process step, expected fill date, time-to-hire metrics, eligibility-list links, hiring-process templates per appointment type.
4. **Tracks the separation plan** for known and suspected departures and folds them into projections.
5. **Renders an audience-aware org chart** with Lucidchart-style total user control — every visual aspect editable, with photos, free-form annotations, multiple connector types, swim lanes, audience modes (Executive / Internal Mgmt / Internal All Staff / External).
6. **Flags data inconsistencies** in every module (the *Data Issues* panel) — referential integrity, expired temp assignments, budget/actual mismatches, etc.
7. **Records edits as proposed changes** in **Change Mode**. Drag an employee under a new supervisor in the org chart → that's recorded as a proposed `Reports To` update for PS HCM. At any point, "Generate Change Report" produces an Excel/PDF grouped by system-of-record, ready to hand to the appropriate clerical owner. The app **never writes back** to source systems.
8. **Supports multiple fiscal years** via versioned reference data and a global FY selector — past (audit), current (operations), future (budget cycle).

## Who it's for

**Primary user (v1):** department administrators — the people who today maintain hand-built workbooks like `Labor Report 5.21.26.xlsx`.

**Secondary users (v2 citywide):** citywide administrators in the Controller's Office, DHR, and Mayor's Budget Office who need cross-department views.

**Other consumers:** executives (audience-aware reports), clerical staff (the Change Report tells them exactly what to update), other agencies and the public (the External audience mode produces sanitized org charts).

## Why it's hard

- **The data is messy.** Manager pointers are sometimes wrong, departments are misspelled, temp assignments outlive their dates. The tool's value is partly in *surfacing* this, not hiding it.
- **The math has shortcuts.** The existing spreadsheet's STEP tab takes shortcuts; attrition is "the remainder"; benefit calculations are FY-hardcoded. KosPos must do them properly, with parity tests.
- **The org chart is genuinely hard.** Rendering, edge routing, label collision, and free-form editing all interact. v1 of orgchartbuilder collapsed trying to build this from scratch. v2 uses React Flow as a real library. KosPos waits until last (Phase 10) so the underlying data layer is solid first.
- **SF rules are real and specific.** MOUs, exempt categories, RTFs, vice assignments, Civil Service Rules — generic position-management tools don't model them. We do.

## Scope — in (v1)

- Excel/CSV import for the standard reports listed in `docs/data-sources/`
- Calculator, projections, hiring plan, separation plan, special-class math, audience-aware org chart
- Data quality flags and Change Mode in every module
- Versioned reference data (DHR steps, ranges, COLAs, benefit rates) by effective date
- Local-only storage (IndexedDB) — no backend
- Hosted on GitHub Pages, free, no install
- WCAG 2.1 AA accessibility target

## Scope — out (for now)

- Multi-user / real-time editing (Phase 11+; needs a backend)
- Authentication and per-user permissions (Phase 11+; needs `@sfgov.org` SSO)
- Live integration with PeopleSoft / BFM / OBI / Snowflake (Phase 11+; requires IT involvement)
- Writing changes back to source systems (probably never — the Change Report is the human-mediated alternative)
- Mobile editing (view-only on mobile is fine in v1; editing is a desktop workflow)

## Success criteria

- A department administrator can drop in the standard reports and reproduce the work currently done in `Labor Report 5.21.26.xlsx` in **under 15 minutes** — and the outputs match to the dollar for DBI FY27-28.
- Audience-mode org chart switching takes **one click**.
- Real data inconsistencies surfaced by the tool result in measurable corrections to the source systems.
- At least one department beyond DBI adopts it for a real budget cycle in v1.
- Phase 11+ — adoption beyond department admins to the Controller's Office and DHR.
