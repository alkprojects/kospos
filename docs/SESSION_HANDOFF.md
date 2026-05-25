# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 14, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** _(will be the BI Payroll PR merge — see below)_
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** none after the handoff PR merges

### What landed this session

- **Tab 7 (BI Payroll) walked end-to-end** against the real workbook —
  full 39-column inventory, earnings-code dictionary observed in this snapshot,
  per-downstream-tab consumption patterns (Calendar, Premium, Overtime, RPO,
  Step, Report Data, TEMP Limits, Inactive, Budget Summary), 8 detailed KosPos
  improvements, UI sketch, Excel export notes, 5 open questions.
- **Six downstream tab stubs cross-linked** (Premium, Overtime, Step, RPO,
  Inactive, TEMP Limits) with the pivot or SUMIFS shape decoded this session,
  so future per-tab walkthroughs lean on the BI Payroll section instead of
  re-deriving.
- **New cross-cutting concern** captured: Controller-side data masking of
  sick-leave TRCs (`XXX` = `***Unspecified***`, $3.51M / 4.2% of FYTD payroll).
  KosPos preserves the masking by default; admin-only unmask is a future
  permissioned upload.
- **DBI-shortcut catalog grew by 5 rows** — account-description literals,
  fund-10190 filter on Step, `COMMN:` job-code prefix, masked sick leave,
  central chart-of-accounts map.
- **Data Sources Inventory** now includes BI Payroll with full v1 mechanism
  + v2 Snowflake plan + KosPos importer path.
- **ADR-007 confirmed wrong about pre-aggregation** — open question to
  amend during Phase 2.4 importer build (real BI Payroll is transactional,
  not pre-aggregated `YTD Salary/Benefits/Total`).

### Key findings worth carrying forward

1. **BI Payroll is the spine of every actuals number in the workbook.**
   Six pivot caches sit on it; Step (32,670 cells) + Report Data (18,225 cells)
   reference it cell-by-cell. Renaming any column upstream breaks everything
   silently.
2. **Full FYTD re-pull every payday** is the right import model — incremental-append
   would miss retroactive prior-PP adjustments. KosPos preserves snapshot history
   so the "what changed since last run" view in Operating Report Detail has real
   diffs to show.
3. **CPC inclusion is in-progress merger prep.** Premium/Overtime/Step
   downstream consumers don't consistently distinguish DBI from CPC; KosPos
   importer should treat Department Group Code as a first-class dimension on
   every aggregation.
4. **Sick-leave masking is a privacy posture, not a data-quality issue.**
   Document explicitly; do not back-fill from unmasked sources without admin
   permission.

## Phase 2 sub-phases (revised)

| # | Sub-phase | Status |
|---|---|---|
| 2.0a | Deep-dive: scaffold + Calendar | ✓ Session 13 (PR #33) |
| 2.0b | Deep-dive: BI Payroll | **✓ this session** |
| 2.0c | Deep-dive: P&P Data | **NEXT** |
| 2.0d | Deep-dive: Report Data (the spine) | pending |
| 2.0e | Deep-dive: Operating Report Summary + Detail | pending |
| 2.0f | Deep-dive: per-special-class tabs (Premium, Overtime, Step, Retirement Payout) | pending |
| 2.0g | Deep-dive: Staffing Plan + Vacancies and TEMP + Budget Summary | pending |
| 2.0h | Deep-dive: reference + tracking tabs (Departments, Combo, BFM-FY26, Roster Approvers, EE Additional Pay, Probation, Eligibility Lists, TEMP Limits, Inactive, Separations, Succession, Pos by Dept, Reporting Tree, Data) | pending |
| 2.0i | Final: Data Sources Inventory complete + Phase 2.2 sub-phase enumeration in dependency order | pending |
| 2.1 | Hide budget-dev UI (route guard) | pending |
| 2.2 | Per-tab UI sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (includes ADR-007 amendment) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Please
spot-check the new BI Payroll walkthrough when convenient:

- [docs/domain/labor-report.md § Tab 7 (BI Payroll)](domain/labor-report.md) — the
  main walkthrough.
- [docs/domain/labor-report.md § Cross-cutting / Controller-side data masking](domain/labor-report.md) —
  the new sick-leave privacy posture section.
- [docs/domain/labor-report.md § Data sources inventory](domain/labor-report.md) —
  BI Payroll row added.

## Next session prompt — Phase 2.0c (P&P Data deep-dive)

This is an **interactive walkthrough** like Sessions 13–14. The goal is to fill in
the **P&P Data** tab section of `docs/domain/labor-report.md`. No app code in this
session. Output is the P&P Data tab walkthrough + any new rows for the Data Sources
Inventory + any cross-cutting concerns that emerge.

**Bid-an-honest-scope note:** P&P Data is the 88+ column position-and-personnel
report from OBI / PS HCM. It's the source of P&P-driven joins everywhere in the
workbook (Report Data uses it as its position spine; Inactive cross-references it
against BI Payroll; EE Additional Pay joins to it; etc.). Plan on the full session
being P&P Data alone — do not pile on Report Data (Session 14d).

Paste this verbatim to start the next session:

````
We're continuing Phase 2 — labor-report deep-dive. Tab 6 (P&P Data) is next.

Session goal: walk through the P&P Data tab of `Labor Report 5.21.26.xlsx` and
fill in its section in docs/domain/labor-report.md using the per-tab template.
NO app code this session.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file)
  docs/domain/labor-report.md — note the Calendar tab (Tab 5) and BI Payroll
    tab (Tab 7) walkthroughs as pattern references; same template applies to
    P&P Data. P&P Data is the position-spine that Report Data (Tab 20)
    pivots off of, similar to how BI Payroll is the actuals-spine.
  docs/domain/positions.md — domain model for Position vs Employee
  docs/domain/appointment-types.md — appointment-type taxonomy (PCS / PEX /
    TEX / ELC / TPV; the temp categories 16 / 17 / c2 vs 18 inconsistency
    noted in Tab 12 TEMP Limits)
  docs/data-sources/ps-hcm.md — primary system; P&P Data is an OBI report
    over PS HCM
  docs/data-sources/obi.md — query layer

Confirm state on main:
  git log --oneline origin/main -5

Workflow:

  1. Open the workbook directly (Python + openpyxl, read-only) to inventory
     P&P Data's columns (described as 88+ — A:CJ from OBI plus formula columns
     past CJ). Sample several rows. Read the column headers; identify which
     columns drive downstream joins (Position Identifier, Job Code, Reports-To,
     RTF Status, etc.). Trace formula columns past CJ — are they per-row
     derived (XLOOKUPs into Steps / Combo / BFM) or per-position rollups?
     Don't ask Alex for what the workbook can tell you.
  2. Find every reference to 'P&P Data' across all sheet formulas to map
     downstream consumers (Report Data primarily; Inactive's F2 / G2 lookups;
     EE Additional Pay; Reporting Tree; Pos by Dept; Vacancies and TEMP;
     Staffing Plan; TEMP Limits).
  3. Walk the P&P Data tab through the per-tab template:
       - Purpose
       - Data sources (OBI/PS HCM query — confirm against the real export;
         note the ADR-006 column assumptions and amend later if needed)
       - Formulas / structure (column inventory; group OBI columns vs derived
         formula columns; note any derived columns that should move into
         KosPos's per-position model rather than a flat sheet)
       - What's manual / fragile (column-name dependencies, hardcoded ranges,
         appointment-type inconsistencies, RTF status conventions)
       - KosPos improvements (importer design — snapshot vs delta? — position
         model, Reports-To validation, RTF tracking, vacancy projection
         interplay)
       - KosPos UI sketch (likely subsumed by the Position Detail page +
         internal staging, parallel to BI Payroll's drill-down)
       - Excel export notes
       - Open questions / TODO
  4. Build up the Data Sources Inventory table with P&P Data entries.
  5. Cross-reference Report Data, Inactive, EE Additional Pay, Reporting Tree,
     Pos by Dept, Vacancies and TEMP, Staffing Plan, TEMP Limits — list what
     each one needs from P&P Data so future per-tab walkthroughs can lean on
     this section.
  6. Resolve the TEMP-category inconsistency surfaced during Calendar walkthrough
     (definitions.md says 16 / 17 / c2; Tab 12 description says 16 / 17 / 18).
     P&P Data is where the appointment-type column lives — confirm what values
     appear in the real data and reconcile.
  7. Ship as ONE docs PR: `docs/labor-report-pnp-data`. Merge per the
     CLAUDE.md shutdown rule. Update SESSION_HANDOFF.md with the next tab's
     prompt (likely Report Data — Tab 20, the spine).

Rules:
  - Interactive walkthrough — wait for Alex's prose where the workbook can't
    answer (e.g., business rules, why certain columns are present, how RTF
    Status values map to KosPos's vacancy projection logic).
  - Cross-reference existing math docs (special-class.md) rather than restating.
  - All KosPos projections are COLA-aware by default — see memory entry
    `feedback_projections_always_cola_aware.md`.
  - BU = bargaining unit (defined in labor-report.md § cross-cutting).
  - Treat OBI export as transactional / full-snapshot per the BI Payroll
    discovery — likely the same import model applies here (full-replace per
    snapshot, header-driven fingerprint).

Hard constraints:
  - Branch from main, single-purpose name.
  - No new npm packages.
  - npm test stays green (no app changes this session).
  - One PR per logical chunk; MERGE before ending session.

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — same synthesis-heavy work as Sessions 13–14.

## Recommended effort

`high` — deep-dive walkthroughs benefit from careful interpretation.

## Notes for the next-session model

- **Open the workbook directly.** Workbook path:
  `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor Report 5.21.26.xlsx`
  (`.xlsx` files are gitignored — never commit them). Use Python + openpyxl
  read-only mode (`data_only=False` for formulas, `data_only=True` for computed
  values, both with `read_only=True` because the workbook has pivot caches that
  choke the non-read-only loader).
- **Reading pivot definitions:** when openpyxl can't load the workbook
  read-write to introspect pivots, **unzip the `.xlsx`** and read
  `xl/pivotTables/pivotTable*.xml` + `xl/pivotCache/pivotCacheDefinition*.xml`
  directly (XML). Pattern used in Session 14 worked well.
- **P&P Data unblocks several downstream tabs.** Report Data (the spine) pivots
  off P&P Data; Inactive cross-references it; EE Additional Pay, Reporting Tree,
  Pos by Dept, Vacancies and TEMP, Staffing Plan, TEMP Limits all need it.
  Capturing their needs in the P&P Data section saves time later.
- **Wait for Alex's prose** on business-rule questions (RTF Status semantics,
  Reports-To-position-not-position-name convention, vacancy-fill-date input
  process). Inventory the column structure from the workbook; ask only the
  "why" questions.
- **Bid an honest scope.** P&P Data is large (88+ columns); do not pile on
  Report Data this session. P&P Data alone is fine for one session.

## What we are explicitly NOT doing next session

- No `app/src/` code changes.
- No PREMM / STEPM / TEMPM / 9994 / 9995 / 9993 math (deferred to Phase 6 Budget
  Development). The labor-report tabs for Premium / Overtime / Step / Retirement
  Payout are the YTD + projection view, not budget development.
- No budget-development UI changes (the route-guard is sub-phase 2.1, after the
  deep dive).
- No new web research.
- No other tabs beyond P&P Data this session.
- No ADR-006 / ADR-007 amendments (deferred to Phase 2.4 importer build —
  capture corrections in the walkthrough docs for now).
