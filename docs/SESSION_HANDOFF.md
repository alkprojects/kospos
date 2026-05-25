# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 16 + BVA interlude, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** _(will be the BVA interlude PR merge — see below)_
**Tests:** passing on CI (no app-code changes)
**Branches in flight:** none after the handoff PR merges

### What landed in the BVA interlude (post Session 16)

After the Tab 20 walkthrough merged, Alex dropped an example BVA export
(`BvA - All Fields - Version 10.20.25 (42).csv`) into
`example reports/Reports/`. The interlude:

- **Verified BVA shape** end-to-end against the labor workbook. DBI Fund 10190
  OT BVA `GL Actuals` = $438,678 vs OPS!E37 (BI Payroll YTD via Overtime
  pivot) = $438,786 → $108 delta (rounding + OBI 1-day lag). KK transfer of
  function visible: DBI Perm Salaries 501010 shows -$2.04M `Transfer & Other
  Budget`; CPC Perm Salaries shows +$1.98M.
- **Created [docs/data-sources/bva.md](data-sources/bva.md)** — full 68-col
  schema + refresh-order timing rule + verified reconciliation examples +
  KosPos importer design + open questions.
- **Captured the refresh-order timing rule** as a new cross-cutting concern
  in `labor-report.md`: payroll OBI runs before payroll posts to GL; OBI is
  1 business day behind live; payroll posts every other Tuesday; **BVA must
  be run Wednesday-or-later** after a payday Tuesday.
- **Filename caveat captured:** BVA filename carries the report-definition
  version date (`10.20.25`), **NOT the data snapshot date**. KosPos importer
  must source the snapshot date from file mtime (or a future header field).
- Trimmed the BVA section in `data-sources/bfm.md` to a brief pointer
  (BVA is PS Financials, not BFM). Added BVA to the "what KosPos uses" list
  in `data-sources/ps-financials.md`.
- Cross-cutting concerns table + Tab 20 KosPos improvements #2 updated with
  the verified reconciliation pattern and timing rule.

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
spot-check the new Report Data walkthrough + the BVA data-source doc when
convenient:

- [docs/domain/labor-report.md § Tab 20 (Report Data)](domain/labor-report.md) —
  the main walkthrough.
- [docs/domain/labor-report.md § Cross-cutting concerns — Refresh-order
  timing](domain/labor-report.md) — new section capturing the BVA
  Wednesday-or-later rule.
- [docs/domain/labor-report.md § Data sources inventory](domain/labor-report.md) —
  five new rows (BFM eturn, BVA, Inactive internal, Staffing Plan internal).
- [docs/data-sources/bva.md](data-sources/bva.md) — **NEW.** Full BVA
  schema (68 cols), refresh-order timing, reconciliation pattern with
  verified examples against the 10.20.25 sample, KosPos importer design,
  open questions.
- [docs/data-sources/bfm.md](data-sources/bfm.md) — BFM eturn AX-vs-AZ
  guidance + brief BVA pointer.
- [docs/data-sources/ps-financials.md](data-sources/ps-financials.md) — BVA
  added to the "what KosPos uses" list.

**BVA action item completed.** Alex provided an example BVA export
(`BvA - All Fields - Version 10.20.25 (42).csv` in `example reports/Reports/`);
its shape is verified against the labor workbook (DBI Fund 10190 OT
matches OPS!E37 within $108 of rounding + OBI 1-day lag) and documented
in `data-sources/bva.md`.

## Next session prompt — Phase 2.0e (OPS Summary + Detail) PLUS autonomous side-quests

**Mode shift: this session runs without Alex.** Alex is asleep. The next session
should do **as much non-blocking work as possible** without him: continue
Phase 2.0e (the OPS Summary + Detail walkthroughs) AND tackle four
autonomous side-quests that don't need interactive Q&A. Ship each as its own
small PR and merge before moving to the next. Aim for **4–7 merged PRs** over
the session, not one big bundle.

**The rule for blocked items:** if you'd normally pause for Alex's prose
(business rules, presentation context, judgment calls on direction), make
the reasonable call yourself, document the call + reasoning in the PR
description, and flag the question in the relevant tab's `Open questions /
TODO` list. Use AskUserQuestion ONLY for genuinely unresolvable forks where
both options are equally plausible and the call carries irreversible
consequences — none of the in-scope work qualifies.

Paste this verbatim to start the next session:

````
This session runs autonomously — Alex is asleep. Continue Phase 2 (OPS
Summary + Detail walkthroughs) AND tackle four autonomous side-quests.
Ship each as its own small PR and merge before moving to the next. Aim for
4–7 merged PRs. NO app code in any of them.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — full context on what landed)
  docs/SESSION_LOG.md (Sessions 13–16 + the BVA interlude — gives you the
    walkthrough pattern and the prior decisions)
  docs/domain/labor-report.md (Tabs 5, 6, 7, 20 walkthroughs are the per-tab
    template; cross-cutting concerns includes the refresh-order timing rule)
  docs/domain/special-class.md (already documents OPS rows 36–42)
  docs/data-sources/bva.md (the new reconciliation reference + 68-col schema)

Confirm state on main:
  git log --oneline origin/main -5

Then work the queue below in order. Each task is its own PR (single-purpose
branch, merge via squash, delete branch). Mark a task done only after its
PR is merged on origin/main.

==============================================================================
TASK A — Phase 2.0e: Operating Report Summary + Detail walkthroughs
==============================================================================
Branch: docs/labor-report-ops-summary-detail
Scope: BOTH tabs in this one PR — they're rollup pages, not new datasets.

  1. Open `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor
     Report 5.21.26.xlsx` (gitignored; never commit). Use openpyxl
     read-only.
  2. OPS Summary (Tab 26): inventory every row label + the per-row formula
     across whatever columns the tab uses (YTD Budget / YTD Actuals /
     YTD Balance / Total Budget / Projected Actuals / Projected Balance).
     The special-class block (rows 36–42) is already in special-class.md —
     reference, don't restate. Fill in the non-special-class rows: regular
     labor, total labor, fringe, attrition %, totals/subtotals.
  3. OPS Detail (Tab 27): decode the drill-down structure. Likely either
     a longer row list (per-dept or per-position breakdown) or a per-PP
     time series. Capture what makes it differ from Summary.
  4. Walk both tabs through the per-tab template (Status / Purpose /
     Data sources / Formulas / Manual-fragile / KosPos improvements /
     UI sketch / Excel export / Open questions).
  5. For business-rule questions (snapshot-diff workflow today, how OPS is
     presented to CON / MYR, what's manual vs auto-computed): make the
     reasonable call from existing context (special-class.md, Tab 20),
     flag the question in Open questions / TODO, and keep going. Do NOT
     stop for Alex.
  6. Update Data Sources Inventory + tab-list status (pending → done).
  7. Update SESSION_HANDOFF.md to point at Phase 2.0f (per-special-class
     tabs) as next.

==============================================================================
TASK B — Reconciliation suite (extends the BVA verification)
==============================================================================
Branch: docs/bva-reconciliation-suite
Scope: write a `docs/audits/bva-reconciliation-suite.md` (NEW file). Run
Python (openpyxl + csv) reconciliations against the labor workbook + BVA +
BFM eturn. Document each finding with the actual numbers.

Suggested coverage (cherry-pick if any prove infeasible):

  - **Per-chartfield GL adjustments:** for every BVA row with non-zero
    GL Actuals in DBI or CPC, compute `BVA.GL_Actuals - BI_Payroll_YTD
    (matching chartfield, excluding inactives)`. List the top 10 largest
    positive + 10 largest negative deltas.
  - **Per-chartfield KK adjustments:** for every BVA row with non-zero
    `Transfer & Other Budget`, document where the budget moved
    from/to (mostly the DBI→CPC transfer of function but possibly other
    inter-dept moves).
  - **SPECIAL block hand-paste verification:** for each of the 100 rows
    in Report Data 649–748, find the corresponding BFM eturn cell. Confirm
    whether S was pasted from BFM!AX (Technical Adjustment) or BFM!AZ
    (Board-adopted). Report mismatches.
  - **MERGE row 753 lookup:** filter BVA for DBI ADM MIS (Dept Code 229346)
    Salaries. Does `Transfer & Other Budget` show the $2,310,727 from
    MERGE row 753? If not, where does that number live in BVA?
  - **Pool-position COUNTIF dedup check:** for the 36 duplicate position
    rows (608 rows / 568 distinct), confirm every duplicate has S=0 and
    Y:CB all zeros. Flag any leakage.
  - **Text-vs-numeric BFM join check:** of the 102 per-position S=0 rows,
    how many are genuinely-missing-from-BFM vs how many fail the join only
    because of the text-vs-int coercion mismatch?
  - **Dormant `<>10190` double-count bug check:** scan BI Payroll for
    rows where `F = 10000` and `Department Group Code = DBI` (or any
    operating posting that would land in 10000). Confirm the bug is still
    dormant in this snapshot.

For each: report what you found, what it means, what KosPos should surface.
This becomes the evidence base for KosPos's `lib/quality/` flags.

==============================================================================
TASK C — Inventory all files in example reports/Reports/
==============================================================================
Branch: docs/data-sources-reports-folder-inventory
Scope: `C:\Users\ALK\Desktop\Claude Projects\Position Management\example
reports\Reports\` contains ~26 files. `reports.txt` in that folder is
Alex's hand-written index — read it FIRST. For each file, document:

  - OBI report ID or originating system
  - Header shape (sample first row of cols)
  - Row count
  - What KosPos uses it for (cross-reference the existing data-sources
    docs; UPDATE those docs where this file fills a gap)

Specifically:

  - **5 BFM `15.10.xxx` / `15.15.xxx` xlsx files** — Chart of Accounts
    Query, Position+Calc'd Benefits Detail (the eturn we know),
    Benefit Rates, Job Class Rates + COLA, FTE Cost Report. Update
    `data-sources/bfm.md` with each report's role.
  - **11 `*Classification Structure*.csv` files** — chartfield trees Tab
    6 flagged as future work. Inventory each, document in
    `data-sources/ps-financials.md` or a new `data-sources/chartfields.md`.
  - **`Hourly-Rates-of-Pay-by-Classification-and-Step-FY25-26.xlsx`** —
    update `data-sources/dhr.md` with this as the DHR pay rates source.
  - **`MRG_HR_EE_ADDL_PAY` / `MRG_TL_TASK_PROFILE_BY_TASKGRP` /
    `MRG_COMBO_CD_DEPT` / `MTL0170_4531347`** — PS HCM exports. Cross-link
    from `data-sources/ps-hcm.md` and from the relevant tabs
    (EE Additional Pay = Tab 9; Combo = Tab 3; Roster Approvers = Tab 8).
  - **`Active Labor - Version 8.30.24.csv`** and **`Payroll Detail -
    Version 11.8.23.csv`** — older OBI labor reports. Compare against
    BI Payroll (Tab 7); are they precursors / variants / different scopes?
  - **`Eturns 5.14.26.xlsx`** — recent eturns workbook; sibling of the
    BFM eturn already in the labor report.

Update `data-sources/README.md` to list all the source files with one-line
descriptions. Update the labor-report Data Sources Inventory with any new
upstream sources discovered.

==============================================================================
TASK D — Audit prior walkthroughs (Tabs 5 / 6 / 7 / 20 + cross-cutting)
==============================================================================
Branch: docs/labor-report-walkthrough-audit
Scope: write a `docs/audits/labor-report-walkthrough-audit.md` (NEW file)
documenting findings. Then fix what can be fixed in the source docs in the
same PR (or a follow-up PR if the fixes are large enough to warrant
separation).

Checks:

  - **Anchor links resolve.** Every `[...](#anchor-id)` in labor-report.md
    points at a real generated anchor. Especially check the `-N` suffix
    convention (`#kospos-improvements-20`, `#whats-manual--fragile-20`,
    etc.) — confirm those resolve by counting heading-occurrence order.
  - **Cross-tab refs are consistent.** When Tab 7 mentions Report Data's
    formula shape, does Tab 20's actual decoded shape match what Tab 7
    described? Report any drift.
  - **Open questions / TODO triage.** For every "Open questions / TODO"
    bullet in Tabs 5, 6, 7, 20, check whether it's been answered elsewhere
    (later walkthroughs, the BVA interlude, this audit). Close out the
    ones that are now resolved.
  - **DBI-shortcut catalog completeness.** Every DBI-only assumption
    mentioned in any tab's "What's manual / fragile" section is also in
    the cross-cutting concerns table.
  - **Internal consistency of the Calendar reference cells.** Every tab
    that uses Calendar (M2 / N2 / I2 / J2 / K2 / L2 / O2 / H2) uses it
    the same way (no Tab claims I2 means PPs-remaining when it actually
    means PPs-elapsed, etc.).
  - **Stale assertions.** Anything that says "TODO: confirm with Alex" but
    was actually confirmed during a later session (the BVA timing rule,
    the AX→AZ migration, etc.) should be marked resolved.
  - **Memory entries.** Re-read the auto-memory files
    (`C:\Users\ALK\.claude\projects\C--Users-ALK-Desktop-Claude-Projects-kospos\memory\`)
    against the docs; flag any drift.

==============================================================================
TASK E — Test edge-case scenarios surfaced in the docs
==============================================================================
Branch: docs/labor-report-scenario-tests
Scope: write `docs/audits/labor-report-scenario-tests.md` (NEW file)
with one section per scenario. Each section: hypothesis (from the doc),
test (Python query against the workbook / BVA / BFM eturn), result,
implication for KosPos. Some overlap with Task B is OK — Task B is
chartfield-level; Task E is position-level / scenario-level.

Suggested scenarios (cherry-pick if any are infeasible):

  - **Reports-To chain integrity.** Walk every position's reports-to chain.
    Find: dangling refs (parent doesn't exist), cycles, depth > 11, empty
    reports-to on non-Commissioner/non-DeptHead positions. Generate the
    correction-list that Tab 6 § Improvement #6 envisions.
  - **Pool position census.** Every position where the same Position
    Number appears in 2+ Report Data rows. Tab 20 says 36 duplicates —
    enumerate them, classify (commissioner / temp pool / split-funded /
    other), and recommend per-position whether to split.
  - **Cat 17/18 expiry warning.** Every position with `CAT_17_18 Exempt
    TX Expired Date` within 90 days of today (2026-05-25).
  - **Cat 16 hours-approaching-cap.** Every Cat 16 temp with hours used
    > 80% of 1,040.
  - **Vacant-but-no-RTF.** Per Tab 6 § Improvement #10 — every position
    with Fill Status = VACANT and Latest RTF ID blank, non-pool.
  - **Appointment ↔ Exempt-Category mismatches.** Tab 6 noted 15
    PEX-on-Cat-18 rows; enumerate them with names so Alex can ask DHR.
  - **Sick-leave bucket size.** Per Tab 7 cross-cutting — confirm the
    XXX bucket is still ~4.2% of FYTD ($3.51M). Update the constant if
    it's drifted.
  - **Negative or zero Balance Amount rows.** Per Tab 7 § Improvement #8
    — top 20 negative-amount rows in BI Payroll (retroactive adjustments
    worth flagging).
  - **Earnings-code orphans.** Per Tab 7 § Improvement #8 — earnings
    codes appearing in BI Payroll that don't map to any documented
    routing rule.

Each scenario writeup ends with: "KosPos surfaces this as: [Data Issue
category]." That bridges the audit work to the importer's `lib/quality/`
design.

==============================================================================
Hard constraints (apply to every PR)
==============================================================================

  - Branch from main, single-purpose name (per CLAUDE.md non-negotiable #1).
  - **No app code.** Phase 2 is docs only.
  - **No new npm packages.**
  - **`npm test` stays green** — if it ever fails on main, stop and surface
    that to Alex in the handoff rather than trying to fix app code.
  - One PR per task. Squash-merge each, delete branch, fast-forward main
    worktree (`git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull
    --ff-only origin main`) before starting the next task. The local main
    worktree is at `C:\Users\ALK\Desktop\Claude Projects\kospos`; don't
    try to check it out into a worktree subdirectory (that triggers a
    "main is already used by worktree" error — harmless after merge but
    breaks `gh pr merge`'s post-merge sync, hence the manual ff-pull).
  - **MERGE before moving to the next task.** Don't pile up parallel PRs
    that touch the same files — they'll conflict.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing this session
==============================================================================

  - No `app/src/` code changes.
  - No PREMM / STEPM / TEMPM / 9994 / 9995 / 9993 math rewrite (Phase 6).
  - No budget-development UI changes (Phase 2.1 route guard).
  - No new web research.
  - No tabs beyond Tasks A–E. If you finish all five with time left, draft
    the Phase 2.0f prompt in SESSION_HANDOFF.md and stop — don't start
    Phase 2.0f without Alex.
  - No BVA importer build (Phase 2.4).
  - No ADR-006 / ADR-007 amendments (Phase 2.4).
  - No tool / setting / hook changes.
  - No memory consolidation runs (the consolidate-memory skill).

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Which of Tasks A–E completed (with PR numbers + merge commit shas).
  - What didn't get to (and why — context limit, blocker, complexity).
  - Top 3 findings from each completed task that Alex needs to know.
  - Next-session prompt: if Phase 2.0e (Task A) completed, the next
    walkthrough is Phase 2.0f (per-special-class tabs: Premium / Overtime /
    Step / Retirement Payout). Otherwise pick up where this session stopped.
  - Any AskUserQuestion you deferred — list each with the choice you made
    and why, so Alex can correct on the next session.

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — Tasks A–E are synthesis-heavy.

## Recommended effort

`high` — multi-task autonomous session; quality of judgment calls matters
more than throughput.

## Notes for the next-session model

- **The workbook path:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\Labor Report 5.21.26.xlsx` (gitignored — never commit).
  openpyxl read-only mode. The same file ALSO exists in `Position
  Management\example reports\Reports\` — both are identical; use the
  parent-dir path for consistency with prior sessions.
- **Example reports folder:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\example reports\Reports\` — 26 files including `reports.txt`
  (Alex's hand-written index — READ FIRST).
- **BVA file already present:** `BvA - All Fields - Version 10.20.25 (42).csv`
  in the same folder. 68 cols × 2,710 rows. Schema and reconciliation
  pattern in `docs/data-sources/bva.md`.
- **The local main worktree is at** `C:\Users\ALK\Desktop\Claude Projects\kospos`
  (separate from `.claude/worktrees/stupefied-herschel-a0bb3d` which is
  this session's worktree). After each merge: `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`.
- **Make the reasonable call, document it, keep going.** This is the
  autonomous-session rule. Don't stop for clarifications that aren't
  truly blocking. Alex reviews on next login.
