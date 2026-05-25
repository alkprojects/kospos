# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 13, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** `7d0d62f` — `docs(labor-report): Calendar tab deep-dive + walkthrough scaffolding (#33)`
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** none after the handoff PR merges

### What landed this session

- **[PR #33](https://github.com/alkprojects/kospos/pull/33)** — Phase 2.0a:
  - Scaffolded all 26 walkthrough tabs in `docs/domain/labor-report.md` matching the
    real workbook order; 2 ignored tabs (DBI/CPC merger planning) called out.
  - **Tab 5 (Calendar) walked end-to-end** against the real workbook — per-cell decode,
    cross-tab usage map (pure-PP cols I/J/K used by OT/Premium/RPO/Staffing Plan/Op
    Report Summary; COLA-weighted M/N/O used by Report Data and Step).
  - The "26.3 trick" decoded: `N2 = 26.295` is a synthetic COLA-equivalent PP count,
    distinct from the real `J2 = 26.1`.
  - **BU (bargaining unit) glossary** added to cross-cutting concerns.
  - **Access-control plan** captured (Cloudflare Access + Entra ID eventual; v1
    options for password gate).
  - **DBI-shortcut catalog** (Multi-dept generalization caveats table) seeded.
  - **Dynamic-tables pain point** documented as cross-cutting (KosPos's live-data
    model eliminates the workbook's pivot-vs-formula misalignment issues).
  - **Calendar improvements section expanded** — 8 detailed improvements with
    problem-statements, concrete designs, edge cases, and worked examples.

### Key principle anchored this session

**All KosPos projections are COLA-aware by default.** The workbook's straight-line
uses (`Calendar!J2/I2` for OT / Premium / Retirement Payout) are shortcuts Alex
takes for simplicity, not the right answer. KosPos's `project()` function defaults
to `cola-aware`; straight-line is offered only as a labeled "simplified view" for
quick reads and parity-checking against the existing workbook — never the emitted
figure. Per-labor-type projection method discussions (straight-line annualize vs
seasonality vs hire-plan-aware vs lump-sum vs residual) happen when each labor
type's tab is walked.

This principle is saved to Claude memory (`feedback_projections_always_cola_aware.md`)
so future sessions don't re-derive it incorrectly.

## Phase 2 sub-phases (revised)

| # | Sub-phase | Status |
|---|---|---|
| 2.0a | Deep-dive: scaffold + Calendar | ✓ this session (PR #33) |
| 2.0b | Deep-dive: BI Payroll | **NEXT** |
| 2.0c | Deep-dive: P&P Data | pending |
| 2.0d | Deep-dive: Report Data (the spine) | pending |
| 2.0e | Deep-dive: Operating Report Summary + Detail | pending |
| 2.0f | Deep-dive: per-special-class tabs (Premium, Overtime, Step, Retirement Payout) | pending |
| 2.0g | Deep-dive: Staffing Plan + Vacancies and TEMP + Budget Summary | pending |
| 2.0h | Deep-dive: reference + tracking tabs (Departments, Combo, BFM-FY26, Roster Approvers, EE Additional Pay, Probation, Eligibility Lists, TEMP Limits, Inactive, Separations, Succession, Pos by Dept, Reporting Tree, Data) | pending |
| 2.0i | Final: Data Sources Inventory complete + Phase 2.2 sub-phase enumeration in dependency order | pending |
| 2.1 | Hide budget-dev UI (route guard) | pending |
| 2.2 | Per-tab UI sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring | pending |

The deep-dive is sized to one or two tabs per session — sustainable pace, fresh
context per tab.

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Please
spot-check the new Calendar walkthrough when convenient:

- [docs/domain/labor-report.md](domain/labor-report.md) — Tab 5 (Calendar)
- [docs/domain/labor-report.md § Cross-cutting concerns](domain/labor-report.md) —
  BU glossary, access control, DBI-shortcut catalog

## Next session prompt — Phase 2.0b (BI Payroll deep-dive)

This is an **interactive walkthrough** like Session 13. The goal is to fill in the
**BI Payroll** tab section of `docs/domain/labor-report.md`. No app code in this
session. Output is the BI Payroll tab walkthrough + any new rows for the Data
Sources Inventory + any cross-cutting concerns that emerge.

Paste this verbatim to start the next session:

````
We're continuing Phase 2 — labor-report deep-dive. Tab 7 (BI Payroll) is next.

Session goal: walk through the BI Payroll tab of `Labor Report 5.21.26.xlsx` and
fill in its section in docs/domain/labor-report.md using the per-tab template.
NO app code this session.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file)
  docs/domain/labor-report.md — note the Calendar tab walkthrough (Tab 5) as a
    pattern reference; same template applies to BI Payroll
  docs/domain/special-class.md — RTPOM, OVERM, and PREMM math reference BI Payroll
    pivots; cross-reference when writing BI Payroll's role in those tabs
  docs/data-sources/obi.md — BI Payroll's source system

Confirm state on main:
  git log --oneline origin/main -5

Workflow:

  1. Open the workbook directly (Python + openpyxl, read-only) to read BI Payroll's
     columns, identify earnings codes, and trace how downstream tabs (Premium,
     Overtime, Retirement Payout, Step) pivot off it. Don't ask Alex for what the
     workbook can tell you.
  2. Walk the BI Payroll tab through the per-tab template:
       - Purpose
       - Data sources (OBI BI Payroll query — see obi.md and ADR-007 for column
         assumptions; confirm against the real export)
       - Formulas / structure (column inventory, what each is for, any derived
         columns that aren't from OBI directly)
       - What's manual / fragile (column-name dependencies, fund filters, hardcoded
         earnings codes)
       - KosPos improvements (importer design, per-earnings-code categorization,
         multi-fund handling, real-time vs snapshot)
       - KosPos UI sketch (likely internal staging + a payroll-detail drill-down)
       - Excel export notes
       - Open questions / TODO
  3. Build up the Data Sources Inventory table with BI Payroll entries.
  4. Cross-reference Premium / Overtime / Retirement Payout / Step tabs — list what
     each one needs from BI Payroll (earnings codes, columns) so future per-tab
     walkthroughs can lean on this section.
  5. Ship as ONE docs PR: `docs/labor-report-bi-payroll`. Merge per the CLAUDE.md
     shutdown rule. Update SESSION_HANDOFF.md with the next tab's prompt.

Rules:
  - Interactive walkthrough — wait for Alex's prose where the workbook can't
    answer (e.g., business rules, why certain earnings codes are filtered).
  - Cross-reference existing math docs (special-class.md) rather than restating.
  - All KosPos projections are COLA-aware by default — see memory entry
    `feedback_projections_always_cola_aware.md`.
  - BU = bargaining unit (defined in labor-report.md § cross-cutting).

Hard constraints:
  - Branch from main, single-purpose name.
  - No new npm packages.
  - npm test stays green (no app changes this session).
  - One PR per logical chunk; MERGE before ending session.

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — same synthesis-heavy work as Session 13.

## Recommended effort

`high` — deep-dive walkthroughs benefit from careful interpretation.

## Notes for the next-session model

- **Open the workbook directly.** Session 13 discovered this changed the walkthrough
  pace dramatically — many "ask Alex" questions can be resolved by inspecting the
  workbook in 30 seconds. Use Python + openpyxl read-only mode (data_only=False
  for formulas, data_only=True for computed values, both with read_only=True
  because the workbook has pivot caches that choke the non-read-only loader).
- **Workbook path:** `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor Report 5.21.26.xlsx`
  (`.xlsx` files are gitignored — never commit them).
- **BI Payroll unblocks several downstream tabs.** Premium, Overtime, Retirement
  Payout, and Step all pivot off BI Payroll. Even if those tabs aren't walked
  this session, capturing their needs in the BI Payroll section saves time later.
- **Wait for Alex's prose** on business-rule questions. Inventory the column
  structure from the workbook; ask only the "why" questions.
- **Bid an honest scope.** Session 13 was Calendar + scaffolding in one session.
  BI Payroll alone is fine for one session — don't pile in P&P Data too. P&P
  Data is 88+ columns and warrants its own session (Session 14b).

## What we are explicitly NOT doing next session

- No `app/src/` code changes.
- No PREMM / STEPM / TEMPM / 9994 / 9995 / 9993 math (deferred to Phase 6 Budget
  Development). The labor-report tabs for Premium / Overtime / Step / Retirement
  Payout are the YTD + projection view, not budget development.
- No budget-development UI changes (the route-guard is sub-phase 2.1, after the
  deep dive).
- No new web research.
- No other tabs beyond BI Payroll this session.
