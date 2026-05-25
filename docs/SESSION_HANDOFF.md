# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 16, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** _(will be the Report Data PR merge — see below)_
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** none after the handoff PR merges

### What landed this session

- **Tab 20 (Report Data) walked end-to-end** against the real workbook — full
  80-column inventory (A:CB), 798-row structure decomposed into **8 row
  archetypes** (604 per-position + 18 OVERTIME + 18 PAYOUT + 100 SPECIAL +
  2 NEWP + 1 MERGE + 6 INACTIVATED + 1 GL + 24 HIRING + 4 SEPARATING). Dual
  per-PP grid decoded (Y:AY operating funds `{10190, 10000}`; BB:CB
  continuing). COLA-aware two-mode projection formula decoded. 100-row SPECIAL
  budget reference block (rows 649–748) hand-paste source + downstream OPS
  consumption confirmed. 12 detailed KosPos improvements, 9 open questions.
- **New data source identified: BVA report** (Budget vs Actuals, PS Financials
  via OBI). KK budget journals + GL actuals journals carry only chartfield
  detail (no position attribution), so the position-aware Report Data misses
  them. KosPos workflow per Alex: upload BVA each PP; reconcile against
  BFM eturn (KK adjustments) and against BI Payroll (GL adjustments); exclude
  inactives. New row in Data Sources Inventory + TODO in `data-sources/bfm.md`.
  **Alex to provide an example BVA export.**
- **BFM AX vs AZ confirmed stale.** Report Data!S uses BFM column AX
  (Technical Adjustment); should use AZ (Board-adopted). Same hand-key error
  visible on NEWP rows. KosPos defaults to AZ. AX preserved as a variance
  layer.
- **DBI-only OVERTIME + PAYOUT catcher blocks confirmed-oversight.** 18 DBI
  dept rows + 0 CPC dept rows in each block. The current Report Data
  under-counts citywide OT and RPO. KosPos derives catcher rows per
  dept-group in scope.
- **Pool-position duplication explained.** 604 per-position rows / 568 distinct
  positions = 36 duplicate rows. Position 1094089 (a commissioner pool position)
  has 14 rows alone. Operationally reasonable for high-churn cohorts; KosPos
  surfaces as a Data Issue with a one-position-per-person recommendation but
  lets the user decide.
- **Dormant continuing-grid double-count bug** (`F<>10190` is the wrong
  complement of `F IN {10190, 10000}`) — activates as soon as CPC roll-in
  starts posting fund-10000 operating actuals; KosPos must derive the
  continuing filter as the complement of the operating-fund set.
- **Cross-cutting concerns table** grew by 6 new DBI-shortcut catalog rows
  (operating-fund `{10190, 10000}` filter, wrong continuing complement,
  AX-vs-AZ, DBI-only catcher blocks, 100 hand-pasted SPECIAL cells,
  hand-pasted INACTIVATED Us, MERGE/GL placeholders, pool-position
  duplicates).
- **Data Sources Inventory** grew by 5 rows (BFM eturn, BVA-planned, Inactive
  internal pivot, Staffing Plan internal).
- **`data-sources/bfm.md`** updated with the BVA TODO + BFM eturn shape + the
  AX vs AZ rule.

### Key findings worth carrying forward

1. **Report Data is 8 archetypes**, not one shape. Per-position is the spine
   (604 rows), but the dept-level OT + RPO catchers, the per-(dept × class)
   SPECIAL budget block, the hand-keyed NEWP / MERGE / INACTIVATED / GL rows,
   and the Staffing Plan-driven HIRING / SEPARATING rows each have their own
   identity-column and per-PP-cell shapes. KosPos must model each surface
   separately and stitch them at view time.
2. **Every Report Data projection is COLA-aware** with a two-mode switch at
   `Calendar!L2 = PP15's PPE` (the COLA effective threshold). Reinforces memory
   `feedback_projections_always_cola_aware.md`. The mode switch is one library
   function in KosPos; no per-row formula.
3. **KK / GL journals don't carry position detail — only chartfields.** This is
   the fundamental data-shape mismatch the workbook can't model. KosPos's
   answer: BVA upload + chartfield-level reconciliation, surfaced as
   adjustments at the dept rollup with a "cannot attribute to position" note.
4. **BFM!AX is stale; the right column is AZ.** A workbook-spanning correction
   that touches Report Data S (auto-SUMIFS) and the NEWP S values (hand-key).
   Same lesson Alex applied to TEMPM E40 in OPS but didn't propagate back to
   the per-position rows.
5. **The DBI-only catcher blocks + the dormant `<>10190` filter bug** are the
   two CPC-roll-in surfaces that will break silently as Alex extends the
   workbook. KosPos's "all dept-groups in scope" + "complement-of-operating
   filter" approaches eliminate both.

## Phase 2 sub-phases (revised)

| # | Sub-phase | Status |
|---|---|---|
| 2.0a | Deep-dive: scaffold + Calendar | ✓ Session 13 (PR #33) |
| 2.0b | Deep-dive: BI Payroll | ✓ Session 14 (PR #37) |
| 2.0c | Deep-dive: P&P Data | ✓ Session 15 (PR #38) |
| 2.0d | Deep-dive: Report Data (the spine) | **✓ this session** |
| 2.0e | Deep-dive: Operating Report Summary + Detail | **NEXT** |
| 2.0f | Deep-dive: per-special-class tabs (Premium, Overtime, Step, Retirement Payout) | pending |
| 2.0g | Deep-dive: Staffing Plan + Vacancies and TEMP + Budget Summary | pending |
| 2.0h | Deep-dive: reference + tracking tabs (Departments, Combo, BFM-FY26, Roster Approvers, EE Additional Pay, Probation, Eligibility Lists, TEMP Limits, Inactive, Separations, Succession, Pos by Dept, Reporting Tree, Data) | pending |
| 2.0i | Final: Data Sources Inventory complete + Phase 2.2 sub-phase enumeration in dependency order | pending |
| 2.1 | Hide budget-dev UI (route guard) | pending |
| 2.2 | Per-tab UI sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (includes ADR-006/007 amendments + BVA importer) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Please
spot-check the new Report Data walkthrough when convenient:

- [docs/domain/labor-report.md § Tab 20 (Report Data)](domain/labor-report.md) —
  the main walkthrough.
- [docs/domain/labor-report.md § Data sources inventory](domain/labor-report.md) —
  five new rows (BFM eturn, BVA planned, Inactive internal, Staffing Plan
  internal).
- [docs/data-sources/bfm.md](data-sources/bfm.md) — BVA TODO section + BFM
  eturn AX-vs-AZ guidance.

**ACTION ITEM for next session.** Alex agreed to provide an **example BVA
export** so its column shape can be documented in `data-sources/bfm.md` (or a
new `bva.md`) before the Phase 2.4 importer is built. Please drop the BVA
example into `C:\Users\ALK\Desktop\Claude Projects\Position Management\` (or
the `example reports` subfolder) before the next session.

## Next session prompt — Phase 2.0e (Operating Report Summary + Detail deep-dive)

This is an **interactive walkthrough** like Sessions 13–16. Goal: fill in the
**Operating Report Summary** (Tab 26) **and Operating Report Detail** (Tab 27)
sections of `docs/domain/labor-report.md`. No app code this session. Output: both
tabs' walkthroughs + Data Sources Inventory updates + any cross-cutting concerns
that emerge.

**Bid-an-honest-scope note.** OPS Summary is **the headline labor projection
page** — the number that feeds the 6-month and 9-month reports to CON / MYR. OPS
Detail is the drill-down used to investigate "what changed between two report
runs," which is the snapshot-diff feature KosPos plans to build. The two tabs
are tightly coupled; walking them in one session makes sense. **Both together
should fit in one session — they're rollup pages, not new datasets.** The
special-class block of OPS is already documented in
[`special-class.md`](domain/special-class.md) § "Operating Report Summary —
DBI section reference" (rows 36–42); the walkthrough should fill in the
non-special-class rows + the OPS Detail tab.

Paste this verbatim to start the next session:

````
We're continuing Phase 2 — labor-report deep-dive. Tabs 26 + 27 (Operating
Report Summary + Operating Report Detail) are next.

Session goal: walk through both tabs of `Labor Report 5.21.26.xlsx` and fill in
their sections in docs/domain/labor-report.md using the per-tab template.
NO app code this session. Both tabs in one session — they're rollup pages, not
new datasets.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file)
  docs/domain/labor-report.md — note the Calendar (Tab 5), P&P Data (Tab 6),
    BI Payroll (Tab 7), and Report Data (Tab 20) walkthroughs as pattern
    references. The OPS rollup pulls from Report Data; the Report Data
    walkthrough already decoded the per-dept catcher blocks (OVERTIME,
    PAYOUT) and the 100-row SPECIAL budget reference block (rows 649–748)
    that OPS reads. Use those as starting points; do not re-derive.
  docs/domain/special-class.md — § "Operating Report Summary — DBI section
    reference" rows 36–42 already document the special-class block. Fill in
    the non-special-class rows (regular labor, RPO/Premium/etc. headers,
    total, percent-attrition) + OPS Detail.
  docs/domain/budget-process.md — three-function framework; OPS covers
    functions 2 and 3 (current-year YTD and projection).

Confirm state on main:
  git log --oneline origin/main -5

Workflow:

  1. Open the workbook directly (Python + openpyxl, read-only). Inventory
     OPS Summary's row labels (A or B column) and each per-row formula
     across columns C / D / E / F / G / H / I (YTD Budget / YTD Actuals /
     YTD Balance / Total Budget / Projected Actuals / Projected Balance).
     Identify the non-special-class rows (regular labor, total labor,
     fringe, etc.).
  2. Decode the OPS Detail tab — it's a drill-down view. Likely a similar
     row structure but joined to dept-level or position-level slices.
     Capture what makes it different from Summary (column count, filter
     context, etc.).
  3. Walk both tabs through the per-tab template (Status / Purpose / Data
     sources / Formulas / Manual-fragile / KosPos improvements / UI
     sketch / Excel export / Open questions).
  4. Update the Data Sources Inventory with OPS-specific reads if any
     (Report Data, special-class.md cross-refs).
  5. Capture the snapshot-diff workflow for OPS Detail: how does Alex
     investigate "what changed since the last run" today, and what
     does KosPos need to surface for the equivalent feature?
  6. Ship as ONE docs PR: `docs/labor-report-ops-summary-detail`. Merge per
     the CLAUDE.md shutdown rule. Update SESSION_HANDOFF.md with the
     next tab's prompt (likely Phase 2.0f — per-special-class tabs).

Rules:
  - Interactive walkthrough — wait for Alex's prose where the workbook can't
    answer (e.g., how the snapshot diff is investigated today; how OPS
    Summary is presented to CON / MYR; what's manual vs auto-computed).
  - Cross-reference existing math docs (special-class.md, budget-process.md)
    rather than restating.
  - All KosPos projections are COLA-aware by default — see memory entry
    `feedback_projections_always_cola_aware.md`.
  - BU = bargaining unit (defined in labor-report.md § cross-cutting).
  - Treat Report Data as the spine OPS Summary pulls from (per Tab 20
    walkthrough); OPS Detail likely drill-downs into Report Data per-position
    rows.

Hard constraints:
  - Branch from main, single-purpose name.
  - No new npm packages.
  - npm test stays green (no app changes this session).
  - One PR per logical chunk; MERGE before ending session.

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — same synthesis-heavy work as Sessions 13–16.

## Recommended effort

`high` — OPS is the headline page; precision matters.

## Notes for the next-session model

- **Open the workbook directly.** Workbook path:
  `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor Report 5.21.26.xlsx`
  (`.xlsx` files are gitignored — never commit them). Use openpyxl read-only mode.
- **Lean on the existing walkthroughs.** Tab 20 (Report Data) already decoded
  the SPECIAL block (rows 649–748) and the per-dept catcher blocks that OPS
  reads. Tab 7 (BI Payroll) already decoded the Premium / Overtime / RPO
  pivots that OPS GETPIVOTDATA cells pull from. Don't redo any of that;
  reference it.
- **`special-class.md` already documents OPS rows 36–42** (PREMM, OVERM,
  RTPOM, STEPM, TEMPM, 9993, 9994) in detail. The new walkthrough fills in
  the non-special-class rows + the OPS Detail tab.
- **Wait for Alex's prose** on snapshot-diff workflow ("what changed since
  the last report") — this is the KosPos snapshot-diff feature's design
  source.
- **BVA-import question from Session 16 stays open** — Alex agreed to
  provide an example BVA export; if it's available, briefly look at its
  shape and add the column-list to `data-sources/bfm.md` (or `bva.md`) as
  a side-task before drafting OPS.
- **Bid an honest scope.** Both OPS tabs together should fit one session.
  They're rollup pages, not new datasets.

## What we are explicitly NOT doing next session

- No `app/src/` code changes.
- No PREMM / STEPM / TEMPM / 9994 / 9995 / 9993 math rewrite (deferred to
  Phase 6 Budget Development).
- No budget-development UI changes (route-guard is sub-phase 2.1).
- No new web research.
- No tabs beyond OPS Summary + OPS Detail this session.
- No BVA importer build (deferred to Phase 2.4); read the BVA example only,
  don't write code.
- No ADR-006 / ADR-007 amendments (deferred to Phase 2.4 importer build).
