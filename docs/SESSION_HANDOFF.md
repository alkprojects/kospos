# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 17 — autonomous, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** `4b4aac7` (PR #46 — scenario-tests audit merge)
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** none after the handoff PR merges

### What landed this session — 5 PRs in 5 hours, all merged

All five Tasks A–E from the previous handoff prompt shipped as separate
single-purpose PRs, each squash-merged after CI passed:

| # | PR | Branch | Merge commit | Task |
|---|---|---|---|---|
| 1 | [#42](https://github.com/alkprojects/kospos/pull/42) | `docs/labor-report-ops-summary-detail` | `1deefae` | **TASK A — Phase 2.0e: Operating Report Summary + Detail walkthroughs** |
| 2 | [#43](https://github.com/alkprojects/kospos/pull/43) | `docs/bva-reconciliation-suite` | `55af649` | **TASK B — BVA reconciliation suite** |
| 3 | [#44](https://github.com/alkprojects/kospos/pull/44) | `docs/data-sources-reports-folder-inventory` | `e501cf1` | **TASK C — Inventory all files in example reports/Reports/** |
| 4 | [#45](https://github.com/alkprojects/kospos/pull/45) | `docs/labor-report-walkthrough-audit` | `7fe7815` | **TASK D — Audit prior walkthroughs (Tabs 5/6/7/20)** |
| 5 | [#46](https://github.com/alkprojects/kospos/pull/46) | `docs/labor-report-scenario-tests` | `4b4aac7` | **TASK E — Edge-case scenario tests** |

### Top 3 findings per task

**Task A — OPS Summary + Detail walkthroughs**

1. **OPS Summary is two views of one universe**: a 33-row per-dept
   live pivot (cache 935 on Report Data, 3 row × 8 data fields) AND a
   per-special-class block (DBI 6 classes / CPC 7 classes including
   extra MCCP Offset row). 9993 Attrition is the residual that
   guarantees reconciliation between both views.
2. **Three CPC/DBI asymmetries catalogued** that drive KosPos design:
   (a) extra MCCP Offset row for CPC, (b) CPC TEMP row 50
   undifferentiated (no YTD/projection formula — absorbed into 9993),
   (c) CPC prior-year attrition rate H53 entirely missing.
3. **OPS Detail = same pivot cache + 14 more row fields to position
   grain**. 813 rows; fragility inherited from Report Data. Alex's
   flagged "what changed since the last report" feature is the
   obvious KosPos win — a snapshot-diff side panel on the OPS Summary
   home page.

**Task B — BVA reconciliation suite (7 verified tests)**

1. **The DBI→CPC transfer of function is visible per chartfield**:
   DBI ADM MIS lost $2.05M Salaries + $680k Mandatory Fringe to CPC
   Admin ($2.06M) and CPC Current Planning ($1.08M). The $1.26M net
   imbalance shows budget moved also to/from non-DBI/CPC depts.
2. **Chartfield join is clean after leading-zero normalization** (961
   of 977 BI Payroll chartfields match BVA; 16 unmatched chartfields
   total only $14k). The "type-coercion failure" hypothesized by Tab
   20 does NOT exist in this snapshot.
3. **Two dormant concerns confirmed dormant**: (a) AX-vs-AZ migration
   (AX == AZ for all 673 BFM class-summary rows); (b) `<>10190`
   continuing-grid bug (0 BI Payroll rows for DBI fund 10000). Both
   need to be in place before the next CPC roll-in event.
   *Extra finding*: $3.31M aggregate BVA GL > BI Payroll Δ is
   dominated by retiree-and-administered-benefits accounts (Health
   Service-Retiree Subsidy $3.0M, Admin Cost $72k) that flow through
   GL but not BI Payroll. **KosPos must tag these accounts as
   `payroll_routed = false`**.

**Task C — Reports folder inventory**

1. **6 families of upstream files documented**: 5 BFM xlsx reports,
   11 PS Financials chartfield-tree CSVs (579k rows total!), 4 PS
   HCM exports, 3 OBI labor reports (Active Labor / Payroll Detail /
   BvA), 1 DHR pay-rate xlsx, plus Eturns 5.14.26 + the labor report
   workbook itself.
2. **Active Labor (88 cols × 604 rows) is the P&P Data OBI source**;
   Payroll Detail (38 cols × 42,949 rows) is the BI Payroll
   predecessor schema (38 vs current 39 cols). KosPos importer's
   header-driven fingerprint handles both.
3. **Fund Classification Structure CSV carries the `Annual/Continuing`
   flag** that drives the dept-group operating-fund-set derivation —
   the antidote to the hardcoded `fund 10190 / 10000` shortcut.

**Task D — Walkthrough audit**

1. **13 of 41 internal anchor links were broken**, all using the tab
   number as duplicate-suffix instead of github-slugger's
   occurrence-index. All 13 fixed in the same PR. **Going forward
   convention**: occurrence index, not tab number.
2. **7 of 40 open TODOs are now resolvable** in light of later
   walkthroughs / Tasks B + C: Tab 5 #2, Tab 6 #5, Tab 7 #4, Tab 20
   #1 / #2 / #5 / #7 / #8, Tab 26 #6. All 7 converted to `[x]` with
   resolution annotations linking the resolving source.
3. **No memory drift, no cross-tab inconsistencies, no DBI-shortcut
   catalog gaps.** The "18,225 cells" vs "133,164 SUMIFS clauses"
   discrepancy was cosmetic only — they measure different things;
   clarifying inline note added to Tab 7.

**Task E — Position-level scenario tests (9 scenarios)**

1. **7 already-expired Cat 17/18 positions** (oldest 728 days past
   expiry — Flores, Tamimi, Mccallum, Ng, Carrion, Mayer, Chen).
   **Single most actionable finding of the entire session.** Each
   row needs convert-to-PCS, terminate, or document override.
2. **Cat 16 hours: Person 187518 (Guaiumi, Jimmy) is at 172% of the
   1,040-hr cap.** Either the cap rule is misunderstood (e.g.,
   rolling-2-year basis), the appointment-type changed to TEX but
   the Cat 16 designation wasn't updated, or it's a real CSC Rule
   114.5 violation.
3. **11+ un-documented premium pay earnings codes** carrying $1M+
   total (253 Cert Prem 6%, 125 Cert 4%, 269 Struct Eng Prem 10.27%,
   113 / 335 / 318 / 117 / 332 / 600 / 601 etc.). **KosPos importer
   routing must enumerate all premium codes, not just L08 + 289**.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a | 5 Calendar | done 2026-05-24 |
| 2.0b | 7 BI Payroll | done 2026-05-25 |
| 2.0c | 6 P&P Data | done 2026-05-25 |
| 2.0d | 20 Report Data | done 2026-05-25 |
| **2.0e** | **26 OPS Summary + 27 OPS Detail** | **done 2026-05-25 (this session)** |
| 2.0f | 16 Premium + 17 Overtime + 18 Step + 19 Retirement Payout (per-special-class tabs) | **NEXT** |
| 2.0g | 23 Vacancies and TEMP + 24 Staffing Plan + 25 Budget Summary | pending |
| 2.0h | 1 Data, 2 Departments, 3 Combo, 4 BFM, 8 Roster Approvers, 9 EE Additional Pay, 10 Probation, 11 Eligibility Lists, 12 TEMP Limits, 13 Inactive, 14 Separations, 15 Succession, 21 Reporting Tree, 22 Pos by Dept | pending |
| 2.0i | Data Sources Inventory final + Phase 2.2 sub-phase enumeration | pending |
| 2.1 | Hide budget-dev UI (route guard) | pending |
| 2.2 | Per-tab UI sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-006/007 amendments, BVA importer, lib/quality flag set per Tasks B + E) | pending |

### AskUserQuestion calls deferred this session

Per the autonomous-mode rule, every clarification question got a
reasonable-default call documented in the relevant tab + flagged in
its Open Questions list. **No `AskUserQuestion` calls were made** this
session. The reasonable-default calls Alex can correct on the next
session are:

1. **OPS Summary D-column pacing math** — KosPos's design makes
   everything COLA-weighted; the workbook uses pure-PP in the
   special-class block. Reasonable default = COLA-weighted per memory
   `feedback_projections_always_cola_aware.md`. Flagged in [Tab 26
   Open Questions](domain/labor-report.md#open-questions--todo-3) #1.
2. **L23/L32 ratio vs G42/H42 attrition rate** — both display as %.
   Reasonable call: G42/H42 is the canonical "attrition rate"; L23/L32
   is "projected balance %" and gets a different label in KosPos.
   Flagged at Tab 26 Open Questions #2.
3. **CPC MCCP / TEMP rows have no E/H formulas** — reasonable call:
   they were skipped because the per-class tab structure (Step) doesn't
   break out MCCP cleanly. KosPos splits MCCP into its own tab. Flagged
   at Tab 26 Open Questions #4.
4. **"Department Group" pivot label preservation** — reasonable call:
   preserve for KosPos Excel export compatibility, otherwise every
   GETPIVOTDATA breaks. Flagged at Tab 26 Open Questions #5.
5. **Snapshot-diff granularity key** — `(Effective Dept, Position
   Number, Fill Status, Budget Job Code)` as the diff key, with
   SPECIAL rows diffed as `(Eff Dept, blank, SPECIAL, "<class>")`.
   Flagged at Tab 27 Open Questions #1.

### What didn't get done (and why)

**Nothing was blocked.** All 5 tasks shipped. The session-end checklist
items not done are out of scope per the original prompt:

- **Phase 2.0f (per-special-class tabs)** — out of scope per
  "If you finish all five with time left, draft the Phase 2.0f
  prompt in SESSION_HANDOFF.md and stop — don't start Phase 2.0f
  without Alex." The Phase 2.0f prompt is below.
- **No app code, no importer build, no ADR amendments** — per the
  session's hard constraints.

## Blockers for Alex

None landing-related. Live site:
<https://alkprojects.github.io/kospos/>. Spot-check on the live site
when convenient:

- [docs/domain/labor-report.md § Tab 26 (OPS Summary)](domain/labor-report.md#tab-26--operating-report-summary) — main walkthrough
- [docs/domain/labor-report.md § Tab 27 (OPS Detail)](domain/labor-report.md#tab-27--operating-report-detail) — drill-down walkthrough
- [docs/audits/bva-reconciliation-suite.md](audits/bva-reconciliation-suite.md) — chartfield-grain reconciliation evidence
- [docs/data-sources/reports-folder-inventory.md](data-sources/reports-folder-inventory.md) — every upstream file Alex uses
- [docs/audits/labor-report-walkthrough-audit.md](audits/labor-report-walkthrough-audit.md) — broken anchors fixed + 7 TODOs closed
- [docs/audits/labor-report-scenario-tests.md](audits/labor-report-scenario-tests.md) — **the 7 already-expired Cat 17/18 positions are the urgent finding to action with HR**

### Action items for Alex (off-site, when convenient)

1. **The 7 already-expired Cat 17/18 positions** ([scenario-tests § Scenario 3](audits/labor-report-scenario-tests.md#scenario-3--cat-1718-expiry-warning-already-expired-emphasized)) — review with HR; each row needs convert-to-PCS / terminate / document override.
2. **Person 187518 (Guaiumi, Jimmy)** at 172% of Cat 16 hours cap — either confirm the cap rule (rolling vs FY-only) or take action. ([scenario-tests § Scenario 4](audits/labor-report-scenario-tests.md#scenario-4--cat-16-hours-approaching-cap))
3. **The 5 vacant-no-RTF positions** ([scenario-tests § Scenario 5](audits/labor-report-scenario-tests.md#scenario-5--vacant-but-no-rtf)) — add RTF or document intentional hold.
4. **Tab 26 reasonable-default calls** (5 deferred AskUserQuestion items above) — review the calls; correct if any are wrong.

## Next session prompt — Phase 2.0f (per-special-class tabs)

Paste this verbatim to start the next session:

````
This session continues Phase 2 of the labor-report deep-dive. Phase 2.0f
covers the four per-special-class tabs: Premium (Tab 16), Overtime
(Tab 17), Step (Tab 18), Retirement Payout (Tab 19). Each tab is a
per-class YTD-and-projection surface that downstream OPS Summary reads.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — full context)
  docs/SESSION_LOG.md (Sessions 13–17 — gives walkthrough pattern + prior
    decisions; Session 17 in particular covers OPS Summary + Detail and
    the BVA reconciliation suite that drives KosPos's lib/quality design)
  docs/domain/labor-report.md (Tabs 5/6/7/20/26/27 are the per-tab
    template; cross-cutting concerns table is the DBI-shortcut catalog;
    each tab's Open Questions list captures pending items)
  docs/domain/special-class.md (RTPOM + OVERM already walked through;
    PREMM + STEPM + 9993 + 9994 + 9995 + TEMPM pending)
  docs/audits/bva-reconciliation-suite.md (chartfield-grain reconciliation
    evidence — the OPS Summary / per-special-class consumers can
    reference Test 1 / Test 2 / Test 3 findings)
  docs/audits/labor-report-scenario-tests.md (position-level Data Issue
    categories that the lib/quality work will surface)
  docs/audits/labor-report-walkthrough-audit.md (anchor + cross-tab
    cleanup; the convention for anchor suffixes is occurrence-index,
    NOT tab-number)

Confirm state on main:
  git log --oneline origin/main -5

Then walk the four per-special-class tabs through the per-tab template:

==============================================================================
TASK — Phase 2.0f: Per-special-class tab walkthroughs (Tabs 16-19)
==============================================================================
Branch: docs/labor-report-special-class-tabs
Scope: ALL FOUR tabs in this one PR — they share a structure (pivot from
BI Payroll + per-dept projection block + OPS Summary consumer).

  1. Open `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor
     Report 5.21.26.xlsx` (gitignored; never commit). Use openpyxl
     read-only.
  2. For each of Tabs 16 (Premium), 17 (Overtime), 18 (Step), 19
     (Retirement Payout):
       - Inventory every column + sample formula
       - Decode the pivot source (cache 6 = BI Payroll for most;
         confirm via xl/pivotTables/pivotTable*.xml)
       - Decode the per-dept projection block (the BN/BP/BR/BS columns
         that OVERM already documented in special-class.md)
       - Trace the consumer: OPS Summary rows 36-41 / 45-51 (already
         documented in Tab 26 walkthrough)
       - Note DBI fund 10190 vs CPC fund 10000 GETPIVOTDATA filters
         (already in cross-cutting concerns)
  3. Walk each tab through the per-tab template (Status / Purpose /
     Data sources / Formulas / Manual-fragile / KosPos improvements /
     UI sketch / Excel export / Open questions). Cross-link to
     special-class.md per-class walkthroughs where they already exist
     (RTPOM, OVERM done; PREMM, STEPM, TEMPM, MCCP, 9993, 9995 pending).
  4. For Step (Tab 18) specifically — Alex's flag is that **MCCP
     handling needs splitting out from STEPM**. The Step walkthrough
     should propose the split (STEPM for per-position step-class
     adjustments, MCCP Offset as a separate tab for MCCP positions).
  5. For Retirement Payout (Tab 19) — re-verify the projection rule
     `IF(K2=0, E38, MAX(G38, E38))` decoded in special-class.md against
     the live Tab 19 cells.
  6. Cross-cutting concerns updates: add per-tab DBI shortcuts (most
     should already be in the catalog from prior sessions). Anchor
     suffix convention: use occurrence-index, NOT tab number
     (per Task D audit finding).
  7. Update Data Sources Inventory + tab-list status (pending → done).
  8. Update SESSION_HANDOFF.md to point at Phase 2.0g (Staffing Plan +
     Vacancies and TEMP + Budget Summary) as next.

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - **No app code.** Phase 2 is docs only.
  - **No new npm packages.**
  - **`npm test` stays green.**
  - One PR; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit message ends with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - No app/src/ code changes.
  - No PREMM / STEPM / TEMPM / 9994 / 9995 / 9993 math rewrite (Phase 6).
  - No budget-development UI changes (Phase 2.1 route guard).
  - No new web research.
  - No tabs beyond 16-19.
  - No BVA importer build (Phase 2.4).
  - No ADR-006 / ADR-007 amendments (Phase 2.4).
  - No tool / setting / hook changes.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Which tabs walked (status updated).
  - What didn't get done (and why).
  - Top 3 findings the user needs to know.
  - Next-session prompt for Phase 2.0g (Staffing Plan + Vacancies + Budget Summary).
  - Any reasonable-default calls deferred (so Alex can correct).

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — Tab 16-19 walkthroughs are synthesis-heavy.

## Recommended effort

`high` — multi-tab walkthrough; each tab has its own pivot + projection
math + DBI shortcuts to catalog.

## Notes for the next-session model

- **The workbook path:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\Labor Report 5.21.26.xlsx` (gitignored — never commit).
  openpyxl read-only mode.
- **Example reports folder:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\example reports\Reports\` — full inventory in
  [`data-sources/reports-folder-inventory.md`](data-sources/reports-folder-inventory.md).
- **The local main worktree is at** `C:\Users\ALK\Desktop\Claude Projects\kospos`.
  After each merge: `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos"
  pull --ff-only origin main`.
- **Anchor-link convention** (per Task D audit): GitHub uses
  github-slugger. Duplicate-heading suffix = 0-indexed
  occurrence-count, NOT tab number. So the 5th `#### KosPos
  improvements` heading gets slug `#kospos-improvements-4`.
- **Make the reasonable call, document it, keep going** when
  Alex-level prose details aren't blocking. Flag in the relevant
  tab's Open Questions list.
