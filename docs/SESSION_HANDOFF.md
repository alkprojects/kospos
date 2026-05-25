# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 15, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** _(will be the P&P Data PR merge — see below)_
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** none after the handoff PR merges

### What landed this session

- **Tab 6 (P&P Data) walked end-to-end** against the real workbook — full
  138-column inventory (88 OBI + 50 derived), six-group breakdown of derived
  columns (cross-tab lookups / formatted IDs / 11-level hierarchy climb / array
  display formula / per-level naming / supervisory-pay differential), 10-pivot
  downstream-consumer reference (Step, Report Data, Pos by Dept, Vacancies and
  TEMP, TEMP Limits ×3, Reporting Tree, EE Additional Pay ×2), 10 detailed KosPos
  improvements, UI sketch (internal staging + Position Detail page), Excel
  export notes, 9 open questions.
- **Three-department model captured** as new domain content (budgeted vs
  effective vs combo) with the combo-code maintenance workflow that bridges
  mid-year moves between the annually-locked budgeted dept and the always-mutable
  effective dept.
- **TEMP-category 16/17/c2 vs 16/17/18 reconciled.** Both prior descriptions
  correct, measuring different things — AG covers 12 exempt categories citywide
  (incl. Cat 16 + C2); AW covers only the two date-bounded non-renewable cats
  (17, 18). Cat 16 is hours-tracked via BI Payroll; AW is date-tracked.
- **Six downstream tab stubs cross-linked** (EE Additional Pay, TEMP Limits,
  Inactive, Report Data, Reporting Tree, Staffing Plan) with the pivot or
  XLOOKUP shape decoded this session, so future walkthroughs lean on this
  section rather than re-deriving.
- **Reports-To error-vs-noise framework sketch** captured (hard errors vs
  likely-errors vs expected-noise; the Operational Approver model distinct from
  formal reports-to). Full ruleset deferred to its own session after Reporting
  Tree walkthrough.
- **DBI-shortcut catalog grew by 2 rows** — DBI-only manual lookup table in OBI
  for Effective Employee Division; 11-level hierarchy materialized in 44 columns.
- **Data Sources Inventory** grew by 3 rows — P&P Data, citywide dept tree CSV,
  placeholder for other chartfield trees in same OBI folder.
- **UX convention added:** every chartfield rendered in the app shows **code AND
  description** in the same control. Per Alex.

### Key findings worth carrying forward

1. **P&P Data is the position spine.** 10 pivot tables across 8 sheets are
   sourced from two pivot caches (cache 1: 137 fields; cache 4: 138 fields with
   `EH Rep To Pay Above`). Plus XLOOKUPs from Inactive (2,556), Staffing Plan
   (1,844), and Report Data (248). Renaming any P&P column upstream breaks
   everything silently — same blast radius as BI Payroll.
2. **Three departments must be modeled explicitly.** Budgeted (annual-locked) /
   Effective (PS HCM mutable) / Combo (chartfield mapping). Mid-year moves
   require a combo code to redirect payroll; KosPos surfaces the "no combo code
   added after move" failure mode as a Data Issue.
3. **The `Update Formula` placeholder** affects every CPC row (267 / 44%) —
   evidence the merger-driven CPC inclusion is still in progress. Citywide dept
   tree CSV (14k rows, 64 dept groups) fixes it; available in same OBI folder
   as the labor report.
4. **Reports-To validation is fuzzy at the top of the org.** Commissioners and
   dept heads report formally outside the dept; the timesheet approver
   ("Operational Approver") is a different relationship from formal reports-to.
   KosPos's correction-list feature is a major surface area.
5. **The 88-col OBI export framing was incomplete.** Real shape is 88 OBI cols
   + 50 derived cols = 138 total; derived cols are not all "formulas past CJ"
   but include cross-tab lookups into Report Data and Staffing Plan, plus a
   massive 44-col 11-level hierarchy climb. KosPos eliminates all 50 in favor
   of derived queries over the Position store.

## Phase 2 sub-phases (revised)

| # | Sub-phase | Status |
|---|---|---|
| 2.0a | Deep-dive: scaffold + Calendar | ✓ Session 13 (PR #33) |
| 2.0b | Deep-dive: BI Payroll | ✓ Session 14 (PR #37) |
| 2.0c | Deep-dive: P&P Data | **✓ this session** |
| 2.0d | Deep-dive: Report Data (the spine) | **NEXT** |
| 2.0e | Deep-dive: Operating Report Summary + Detail | pending |
| 2.0f | Deep-dive: per-special-class tabs (Premium, Overtime, Step, Retirement Payout) | pending |
| 2.0g | Deep-dive: Staffing Plan + Vacancies and TEMP + Budget Summary | pending |
| 2.0h | Deep-dive: reference + tracking tabs (Departments, Combo, BFM-FY26, Roster Approvers, EE Additional Pay, Probation, Eligibility Lists, TEMP Limits, Inactive, Separations, Succession, Pos by Dept, Reporting Tree, Data) | pending |
| 2.0i | Final: Data Sources Inventory complete + Phase 2.2 sub-phase enumeration in dependency order | pending |
| 2.1 | Hide budget-dev UI (route guard) | pending |
| 2.2 | Per-tab UI sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (includes ADR-006/007 amendments) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Please
spot-check the new P&P Data walkthrough when convenient:

- [docs/domain/labor-report.md § Tab 6 (P&P Data)](domain/labor-report.md) — the
  main walkthrough.
- [docs/domain/labor-report.md § Companion reference dataset — citywide department
  tree](domain/labor-report.md) — the new reference-data section.
- [docs/domain/labor-report.md § Department-code semantics](domain/labor-report.md) —
  the three-department-concept distinction.
- [docs/domain/labor-report.md § Data sources inventory](domain/labor-report.md) —
  three new rows.

## Next session prompt — Phase 2.0d (Report Data deep-dive)

This is an **interactive walkthrough** like Sessions 13–15. The goal is to fill in
the **Report Data** tab section of `docs/domain/labor-report.md`. No app code in
this session. Output: the Report Data tab walkthrough + Data Sources Inventory
updates + any cross-cutting concerns that emerge.

**Bid-an-honest-scope note:** Report Data is the **single most important tab in
the workbook** (per `labor-report.md` Tab 20 stub) — the per-position dataset that
joins P&P Data + BI Payroll + Inactive + Staffing Plan + BFM. It powers the
projection rows in Operating Report Summary / Detail and is the spine the
special-class math hangs off (see `special-class.md` `'Report Data'!$S$649:$S$748`
references). Plan on the full session being Report Data alone — do not pile on
Operating Report Summary / Detail.

Paste this verbatim to start the next session:

````
We're continuing Phase 2 — labor-report deep-dive. Tab 20 (Report Data) is next.

Session goal: walk through the Report Data tab of `Labor Report 5.21.26.xlsx` and
fill in its section in docs/domain/labor-report.md using the per-tab template.
NO app code this session.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file)
  docs/domain/labor-report.md — note the Calendar (Tab 5), BI Payroll (Tab 7),
    and P&P Data (Tab 6) walkthroughs as pattern references. Report Data is
    the spine that joins those two. The Tab 6 § "How each downstream tab
    consumes P&P Data" table already lists Report Data's 248 XLOOKUPs +
    pivot 17; Tab 7 § "Report Data — per-position per-PP SUMIFS, multi-fund"
    already decodes the per-PP SUMIFS shape. Use those as starting points;
    do not re-derive.
  docs/domain/special-class.md — Report Data's `S` column is referenced from
    here (`'Report Data'!$S$649:$S$748`). Understand which special-class
    accounts read from Report Data vs. which read from BI Payroll directly.
  docs/domain/positions.md — Position entity model (now informed by P&P Data
    walkthrough)
  docs/data-sources/obi.md — query layer

Confirm state on main:
  git log --oneline origin/main -5

Workflow:

  1. Open the workbook directly (Python + openpyxl, read-only). Inventory
     Report Data's columns; sample several rows. Identify which columns
     come from P&P Data (via XLOOKUP), which come from BI Payroll (via
     per-PP SUMIFS already decoded in Tab 7), and which are *new* (manual
     additions, hand-keyed adjustments, BFM joins, Inactive cross-references,
     Staffing Plan joins).
  2. Decode the projection columns (the per-position annual projection logic
     that feeds Operating Report Summary). The Calendar `N2 / M2` ratio (or
     `J2 / I2` if a row is pure straight-line) is the multiplier; identify
     which positions use COLA-aware vs pure.
  3. Walk the tab through the per-tab template (same structure as Tabs 5, 6, 7).
  4. Build up the Data Sources Inventory table with Report Data's *upstream*
     joins (P&P Data row + BI Payroll row + BFM row + Inactive row + Staffing
     Plan row); add a Report Data row if it's also itself an input to another
     tab (Operating Report Summary, Operating Report Detail).
  5. Resolve open questions captured in Tab 6 / Tab 7 walkthroughs to the
     extent Report Data can answer them (e.g., what the `Split Funded` row
     duplication looks like in practice; how Inactive merges back in).
  6. Ship as ONE docs PR: `docs/labor-report-report-data`. Merge per the
     CLAUDE.md shutdown rule. Update SESSION_HANDOFF.md with the next tab's
     prompt (likely Operating Report Summary — Tab 26).

Rules:
  - Interactive walkthrough — wait for Alex's prose where the workbook can't
    answer (e.g., business rules; how the manual additions get authored; how
    "what changed since last run" gets investigated today).
  - Cross-reference existing math docs (special-class.md) rather than restating.
  - All KosPos projections are COLA-aware by default — see memory entry
    `feedback_projections_always_cola_aware.md`.
  - BU = bargaining unit (defined in labor-report.md § cross-cutting).
  - Treat OBI exports (BI Payroll, P&P Data) as transactional / full-snapshot;
    Report Data itself is workbook-internal (not directly imported).

Hard constraints:
  - Branch from main, single-purpose name.
  - No new npm packages.
  - npm test stays green (no app changes this session).
  - One PR per logical chunk; MERGE before ending session.

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — same synthesis-heavy work as Sessions 13–15.

## Recommended effort

`high` — Report Data is the spine; careful interpretation pays off.

## Notes for the next-session model

- **Open the workbook directly.** Workbook path:
  `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor Report 5.21.26.xlsx`
  (`.xlsx` files are gitignored — never commit them). Use openpyxl read-only mode.
- **Reading pivot definitions:** when openpyxl can't load the workbook read-write
  to introspect pivots, **unzip the `.xlsx`** and read
  `xl/pivotTables/pivotTable*.xml` + `xl/pivotCache/pivotCacheDefinition*.xml`
  directly. Pattern used in Sessions 14 and 15 worked well.
- **Lean on the existing walkthroughs.** Tab 6 (P&P Data) and Tab 7 (BI Payroll)
  already decoded a lot of Report Data's behavior — the XLOOKUP shapes and per-PP
  SUMIFS formula are documented there. Don't redo that work; reference it.
- **Wait for Alex's prose** on business rules (which manual adjustments get
  authored, how the spine gets sanity-checked against Operating Report Summary,
  how new positions added mid-FY get inserted).
- **Bid an honest scope.** Report Data is the spine — do not pile on Operating
  Report Summary / Detail this session.

## What we are explicitly NOT doing next session

- No `app/src/` code changes.
- No PREMM / STEPM / TEMPM / 9994 / 9995 / 9993 math (deferred to Phase 6 Budget
  Development).
- No budget-development UI changes (route-guard is sub-phase 2.1).
- No new web research.
- No other tabs beyond Report Data this session.
- No ADR-006 / ADR-007 amendments (deferred to Phase 2.4 importer build).
