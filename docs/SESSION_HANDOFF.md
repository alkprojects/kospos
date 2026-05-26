# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 25 — Phase 2.2.b obi-payroll full, 2026-05-26)

**Phase:** Phase 2.2.b — **obi-payroll full importer + lib/payroll/ rollup cube shipped.** Production `/kospos/` Positions tab now shows YTD actuals split into 5 special-class buckets (regular / overtime / retirement payout / premium / temp lump-sum) when BI Payroll is loaded.
**Last main commit:** `c91815c` ([PR #66](https://github.com/alkprojects/kospos/pull/66) — Phase 2.2.b obi-payroll full) → `be58105` ([PR #65](https://github.com/alkprojects/kospos/pull/65) — Session 24 handoff sync) → `61f69a0` ([PR #64](https://github.com/alkprojects/kospos/pull/64) — calculator fixes) → `c7e1e84` ([PR #62](https://github.com/alkprojects/kospos/pull/62) — Phase 2.2.a spine bundle) → `bb7b2e9` ([PR #61](https://github.com/alkprojects/kospos/pull/61) — Phase 2.1 close audit)
**Tests:** 202 / 202 passing (189 baseline + 5 obi-payroll importer additions + 8 payroll cube tests)
**Branches in flight:** none

### What landed this session — one PR

#### [PR #66](https://github.com/alkprojects/kospos/pull/66) — Phase 2.2.b obi-payroll full + lib/payroll/ rollup cube

Single-sub-phase PR per the "strict one-PR-per-sub-phase" rule established in the S24 handoff. 11 files changed (+874 / −102).

| What | Where |
|---|---|
| **Importer expansion (sub-phase 2.2.11)** — `ObiPayrollRow` now carries the full 39 columns of the real OBI export (was ~18). Critical additions: `Department Group Code`, `Account Description` (col V — drives the 5-bucket math), the fund / project / activity / authority hierarchies, `Roster Code`, `Earning Hours`, `Is FTE Hours`, `Assignment Number`. The `COMMN:` job-code prefix is split into `jobCode = "5380"` + `jobCodeSet = "COMMN"` per [labor-report.md § Tab 7 improvement #5](docs/domain/labor-report.md#tab-7--bi-payroll). | [app/src/lib/importers/types.ts](../app/src/lib/importers/types.ts) + [obi-payroll.ts](../app/src/lib/importers/obi-payroll.ts) |
| **`lib/payroll/` entity layer** — `PayrollSnapshot` keyed by `(fiscalYear, asOfDate)` with a per-position rollup cube splitting YTD actuals into the 5 special-class buckets that mirror the workbook's Step + Report Data exclusion SUMIFS literally. | [app/src/lib/payroll/](../app/src/lib/payroll/) |
| **Snapshot history (the minimum-viable shape)** — importer stamps `_asOfDate = MAX(earningPeriodEnd)` per import call so uploads from different OBI runs naturally split into separate snapshots without an explicit upload-batch tracker. Full idempotent re-import + diff UI is deferred to `2.2.33 snapshots/` with IndexedDB persistence. | [build.ts](../app/src/lib/payroll/build.ts) |
| **Position Detail wired** — new "YTD Payroll" section shows the 5-bucket breakdown + asOfDate when BI Payroll is loaded; falls back to a "Load a BI Payroll export…" hint otherwise. Existing BFM-chartfields panel untouched. The redundant `ytdActuals` row from the chartfields panel was removed (the breakdown supersedes it). | [PositionDetail.tsx](../app/src/lib/views/positions/PositionDetail.tsx) + [PositionsView.tsx](../app/src/lib/views/positions/PositionsView.tsx) |

**Verification:** 202/202 tests at merge; `npm run build` clean; preview-MCP walkthrough with synthetic data showed `$65k regular / $3.2k OT / $1.8k RPO / $950 premium → $70,950 total asOf 2026-05-08`. Empty-bucket rows (Temp LSP at $0) hidden as designed. Fallback hint renders cleanly when no BI Payroll is loaded. Sources line correctly shows `joined with hcm + obi` ↔ `hcm` based on what's loaded. No console errors.

### Pre-Session 25 status archived below — see § Session 24 closeout

---

### What landed in prior sessions (rolling)

Original Session 24 closeout content below for reference.

### What landed in Session 24 — four PRs

#### [PR #61](https://github.com/alkprojects/kospos/pull/61) — Phase 2.1 close audit (small)

Second phase-close audit under [WORKFLOW.md § Audit cadence](WORKFLOW.md). 3 files changed (+275 / -2 lines). In-PR docs sync: ROADMAP.md said `?budget=1`, implementation shipped `?dev=1` — reconciled. New audit doc at [`docs/audits/phase-2-1-close-audit.md`](audits/phase-2-1-close-audit.md). The audit confirmed Phase 2.1 was healthy (152/152 tests, no anchor regressions, no new hook/settings drift), updated the carry-forward A-F items (A worktrees and B SESSION_LOG.md drifted further; E pick scheduled for this session; rest stable), and flagged no new audit-worthy drift.

#### [PR #62](https://github.com/alkprojects/kospos/pull/62) — Phase 2.2.a Position spine bundle

Three sub-phases shipped as one cohesive PR per Alex's pick on audit item E (Option A — Position spine bundle).

| Sub-phase | What |
|---|---|
| **2.2.4** `lib/reference/dept-tree/` | Citywide dept lookup, versioned by effective date. `DeptTree` class + `DEFAULT_DEPT_TREE` singleton. Seeded with DBI + CPC depts from the 2026-05-20 snapshot. Full citywide CSV importer deferred to Phase 2.4 — schema stable, swap-in additive. |
| **2.2.12** `lib/importers/obi-pnp/` (full) | `PsHcmPpRow` expanded from ~20 → ~40 fields. Captures the **three department concepts** (effective / budgeted / combo), Cat 17/18 tracking (AV/AW/AX/AY), vice + previous employee, manager linkage, RTF, exempt category, merit increase, position division, max headcount, vacant date. File path preserved (`lib/importers/ps-hcm-pp.ts`) — pure rename was no-value churn. |
| **2.2.16** `lib/views/positions/` | The spine view. `Position` entity layer in `lib/positions/` joins P&P rows + dept tree + userNotes. List view (stats / filters / table); detail modal (three-dept breakdown + mismatch warning, incumbent, Cat 17/18 tracking with expiry alerts, reports-to, RTF, inline userNotes editor). Replaces the superseded `modules/positions/PositionsView.tsx`. |

**Tab promoted to non-dev:** Positions tab loses `devOnly` and reorders to position 2 (right after Calculator). Production `/kospos/` now shows 2 tabs; `?dev=1` adds Load Reports + Special Class. The dev gate from Phase 2.1 continues to gate those two tabs cleanly.

**Verification:** 181/181 tests at spine-bundle merge; `npm run build` clean; preview-MCP walkthrough of empty state, populated table, filters, detail modal (3-dept warning, Cat 18 tracking, reports-to), userNotes inline edit (saved note shows ● in Notes column), `?dev=0` production surface, `?dev=1` dev surface. No console errors.

#### [PR #63](https://github.com/alkprojects/kospos/pull/63) — Session 24 handoff (docs only)

Updated SESSION_HANDOFF.md + appended SESSION_LOG.md Session 24 entry. Mid-session iteration; this update supersedes it with PR #64 reflected.

#### [PR #64](https://github.com/alkprojects/kospos/pull/64) — Job Class Calculator bug fixes

Alex spot-checked the live calculator and surfaced three bugs. All three fixed in one PR:

1. **Autocomplete on "code — title"**. Input label now reads "Job Code — Title". Datalist has 1136 class entries with "code — title" labels (e.g. "922 — Manager I") extracted from `Hourly-Rates-of-Pay-by-Classification-and-Step-FY25-26 (2).xlsx`. Users can type either the code or any substring of the title to filter. Class title shows under the input once a known code is recognized. New file: `app/src/data/job-class-titles.json`. Refresh script: `.scratch/extract-job-titles.py` (gitignored dir; reproducible from the PR body).
2. **MCCP setId UX bug.** Range-based MCCP classes (which usually have one SetID = COMMN) highlighted the SetID button automatically, but Range A/B/C + Min/Max + Calculate stayed hidden / grey until the user clicked the already-highlighted SetID. Root cause: `availableSteps`/`availableRanges` memos referenced raw `setid` state instead of `effectiveSetid` (the auto-selected fallback). Fixed both memos.
3. **MCCP biweekly amounts off by 80×.** `dhr-ranges.json` values are *hourly* rates (same convention as `dhr-steps.json`), despite a misleading "biweekly" comment in the JSON. `cost.ts`'s `getBiweeklyRate` step branch multiplied by 80; the range branch returned values as-is. Verified against [careers.sf.gov/classifications/](https://careers.sf.gov/classifications/): class 0922 Manager I Range A post-COLA = "$136,604 annual" = $5,254 biweekly = $65.68 hourly × 80 × 26. Calculator now shows **$136,084 annual salary** for Alex's screenshotted test case (was $1,701.05). JSON comment updated to "HOURLY rates" with the verification note.

**Tests:** 181 → 189 (+8 in new `cost.test.ts` covering step + range branches and the MCCP regression).

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): the 4 items Alex acknowledged in S21 stay DROPPED (the 7 expired Cat 17/18 positions; Cat 17/18 Charter cite reminders; Guaiumi data bug; CPO=510210). The 6 items the [Phase 2.0i close audit](audits/phase-2-0i-close-audit.md) surfaced for Alex's decision are listed under "Audit-surfaced items" below.

Per Alex's "restate everything in plain English" preference, every carry-forward below is plain-English restated — no file pointers required.

#### Restated questions for Alex (5)

These were drafted as reasonable-default calls deferred for Alex's confirmation. Items 1-4 are repeated from prior sessions; **item 5 is new from Session 21** (TX rules — 4 TODOs in [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md)).

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules.** Session 21 surfaced the TX concept via Alex's Marco Jacobo worked example, but four follow-up rules need confirmation before the `lib/views/temp-limits/` sub-phase can model TX as a typed entity:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — restated in plain English per Alex's preference)

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?** (Most important: `Position =/= Budget` — does it mean "employee's effective job code differs from position's budgeted job code", or something else?)

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain. I haven't inspected the CI formula yet to confirm.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip with one-click jump-to-fix; annualized rows switched from pure-PP to COLA-aware per [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md). **Confirm both?**

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else? Belongs in `appointment-types.md`.

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)? Currently positioned as draft. What class set counts as "leadership/strategic" — MCCP + selected senior PCS, or broader?

#### Open action items (1 — remaining after S21 acknowledgments)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null** — meaning the workbook claims no Request to Fill has ever been filed. **But** per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), you flagged that "no RTF" is not always accurate in practice — the position may have had an incumbent in the past (i.e., a "vice" history), which would mean an RTF *must* have been filed at some point. The action: for each of these 5 positions, look at the prior-incumbent history. If there's a "vice" (prior employee on the position), the "no RTF" is a data integrity issue (the RTF was filed but didn't get tracked here), not a real "we've never tried to fill this." If there's no vice history, "no RTF" is likely real and the position is truly an intentional hold or unfunded slot. **Disposition needed per position: data bug vs intentional hold.** Surfaced in [scenario-tests § Scenario 5](audits/labor-report-scenario-tests.md#scenario-5--vacant-but-no-rtf).

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.0i close audit](audits/phase-2-0i-close-audit.md) + [Phase 2.1 close audit](audits/phase-2-1-close-audit.md):

A. **Sweep 6 stale post-merge worktrees.** Grew from 3 → 5 → 6 across the last two audits. 30-second cleanup:

   ```powershell
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\funny-cannon-ff06d7"
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\nervous-noether-2e2f42"
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\nostalgic-chaplygin-08a313"
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\pensive-visvesvaraya-8d6c9e"
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\dazzling-mendel-e6e137"
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\hopeful-banzai-e172f7"
   git worktree prune
   ```

   Consider enabling the Cowork "Auto-archive on PR close" preference to stop the per-session accumulation (recommended in S19 + Phase 2.0i + Phase 2.1 audits).

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** File grew 1,977 → 2,295 lines in 2 sessions; **past the 2,000-line trim trigger** per Phase 2.1 audit. Sessions 1–16 are pre-Phase-2; their per-prompt detail isn't actively consulted. ~1,000 lines removed estimate. Single-purpose docs PR, ~1 hour. **Priority bumped** from "evaluate" to "schedule when capacity allows."

C. **Migrate the 25× memory-file citation anti-pattern in `labor-report.md`.** Pattern (shown in a fenced block to avoid this handoff triggering the verifier):

   ```text
   [`memory file.md` ...](#tab-24--staffing-plan)
   ```

   Should become:

   ```text
   [memory `file.md`](file:///C:/Users/ALK/.claude/projects/.../memory/file.md)
   ```

   Single-purpose cleanup PR; ~30 min. Bundleable with item B (combined ~1.5 hours).

D. **Defer the `labor-report.md` split until Phase 2.4.** File still 8,518 lines (unchanged); no action this cycle.

E. **Phase 2.2 first sub-phase pick — RESOLVED in S24.** Position spine bundle shipped in [PR #62](https://github.com/alkprojects/kospos/pull/62). No longer carry-forward.

F. **Audit cadence — Phase 2.2.b close audit owed.** Per [WORKFLOW.md § Audit cadence](WORKFLOW.md) ("event-based — every phase close"), Phase 2.2.b's close (this session) triggers an audit. **It was not run this session** — surfaced here for Session 26 to fire as Step 0 of next session. The Phase 2.1 close audit was a 270-line doc for a 3-file PR; Phase 2.2.b is larger (11 files) so expect a slightly larger doc. Items A (worktree sweep) and B (SESSION_LOG.md trim — now ~2,540 lines, further past trigger) almost certainly drifted further; the audit will quantify.

### Top 3 findings to surface for Alex this session

1. **The Positions tab is live in production.** Visit `/kospos/` and you'll see Job Class Calculator + Positions side by side. Empty until you load data via `/kospos/?dev=1` → Load Reports, then return to `/kospos/` → Positions to see the spine table. Detail modal shows the three-dept distinction (Effective / Budgeted / Combo) with a yellow warning when they disagree without a combo override — surfaces the "employee moved but no combo code added" issue [memory `feedback_user_notes_per_position.md` predicted](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_user_notes_per_position.md). Inline user-notes editor works (notes don't persist across reload yet — IndexedDB persistence is queued for a small follow-up).

2. **Three sub-phases bundled cleanly into one PR.** The mild "one change per branch" violation was justified per [labor-report.md § Recommended Phase 2.2 first sub-phase Option A](docs/domain/labor-report.md#recommended-phase-22-first-sub-phase-phase-20i-recommendation) — sub-phases share an end-user surface and no individual piece is testable alone. The next-bundle question (Phase 2.2.b) is whether to repeat that pattern or revert to strict one-sub-phase-per-PR; see Recommendations below.

3. **Position entity is now the spine — every Tier-4 view from here joins through it.** Per the dependency graph in `labor-report.md`, the spine unblocks `2.2.17 views/labor/`, `2.2.18 views/reporting-tree/`, `2.2.19 views/temp-limits/`, `2.2.20 views/inactive/`, `2.2.21 staffing-plan/`, `2.2.22 views/vacancies/`, `2.2.25 views/probation/`, `2.2.26 views/separations/`, `2.2.27 views/succession/`, `2.2.28 views/eligibility/`, `2.2.29 views/roster-approvers/`, `2.2.30 views/ee-additional-pay/`. Most-impactful next picks: `2.2.11 obi-payroll/ full` (unblocks 5 downstream incl. OPS) or `2.2.19 views/temp-limits/` (small, models TX, surfaces Cat 17/18 expiry — see Recommendation below).

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a | 5 Calendar | done 2026-05-24 |
| 2.0b | 7 BI Payroll | done 2026-05-25 |
| 2.0c | 6 P&P Data | done 2026-05-25 |
| 2.0d | 20 Report Data | done 2026-05-25 |
| 2.0e | 26 OPS Summary + 27 OPS Detail | done 2026-05-25 |
| 2.0f | 16 Premium + 17 Overtime + 18 Step + 19 Retirement Payout | done 2026-05-25 |
| 2.0g | 23 Vacancies and TEMP + 24 Staffing Plan + 25 Budget Summary | done 2026-05-25 |
| 2.0h | 14 tabs: 1 Data, 2 Departments, 3 Combo, 4 BFM, 8 Roster Approvers, 9 EE Additional Pay, 10 Probation, 11 Eligibility Lists, 12 TEMP Limits, 13 Inactive, 14 Separations, 15 Succession, 21 Reporting Tree, 22 Pos by Dept | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration final + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | Hide budget-dev UI (route guard) — `?dev=1` + localStorage + banner | done 2026-05-25 |
| 2.1 close audit | small audit per cadence; ROADMAP `?budget=1` → `?dev=1` reconciled | done 2026-05-25 |
| **2.2.a** | **Position spine bundle** — `2.2.4` `dept-tree/` + `2.2.12` `obi-pnp/` (full) + `2.2.16` `views/positions/` shipped together; Positions tab promoted to production | done 2026-05-25 |
| **2.2.b** | **`2.2.11` `obi-payroll/` full** — full 39-column importer + `lib/payroll/` rollup cube + Position Detail YTD breakdown | **done 2026-05-26** |
| **2.2.c** | **Next sub-phase** — Alex's pick. Recommended: `2.2.17` `views/labor/` (drill-down view on top of the cube, small win), `2.2.19` `views/temp-limits/` (Tab 12 TEMP Limits + TX entity), or `2.2.23` `views/ops/` (the headline projection page; bigger). | **NEXT** |
| 2.2.d-n | Remaining Tier-3/Tier-4 sub-phases per dependency graph | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR amendments per the 6 proposed ADRs — though 5 of 6 landed in PR #54 ADRs 010-015; only ADR-007 amendment for BVA-as-distinct-source remains) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **Production `/kospos/` Positions tab now shows YTD payroll actuals.** Load a P&P file + a BI Payroll export via `?dev=1` → Load Reports, then return to Positions. Click any row — Position Detail shows the "YTD Payroll" section with 5 buckets (regular / overtime / retirement payout / premium / temp lump-sum) + an `asOf <date>` based on `MAX(earningPeriodEnd)` from the loaded BI Payroll. Without BI Payroll loaded, the section shows a "Load a BI Payroll export…" hint.
- **The bucket math mirrors the workbook's Step + Report Data exclusion SUMIFS literally.** Regular labor = everything except the 4 special-class account-description literals; the 4 specials each get their own line. Total at the bottom sums all 5. Zero-buckets are hidden to keep the panel tight.
- **Inline user notes** still work as in 2.2.a (browser-session only; IndexedDB persistence queued).

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.c).** Three recommended options below; see Recommendations.

### Recommendation for Phase 2.2.c

Three options worth surfacing, with trade-offs:

**Option A (recommended) — `2.2.17` `lib/views/labor/`.** The Tab 7 BI Payroll drill-down view. The rollup cube exists; this sub-phase adds a per-position per-PP table (PPE × earnings code × account × balance) with filters + the quick-aggregates header from Tab 7 § KosPos UI sketch #2. **Pros:** small focused sub-phase (no new importer); immediately visible win — clicking "View payroll" from Position Detail opens a tab with the full per-PP picture; only Phase 2.2.b's cube is needed (no further upstream prerequisites); unblocks the "trace to source" affordance on every projection. **Cons:** doesn't unblock as many downstream sub-phases as `2.2.23 views/ops/`.

**Option B — `2.2.19` `lib/views/temp-limits/` (Tab 12).** Build the TEMP Limits view + the typed `TemporaryExchange` entity from S21. **Pros:** builds on the spine + cube (Cat 17/18 already modeled; the cube's `earningHours` field exposed in 2.2.b enables the 1040-hour gauge math); small focused sub-phase; surfaces the 4 TX TODOs from Restated Q #5 in a concrete UI; visible win — user sees "your Cat 17/18s are expiring on X" + "hours remaining" per temp. **Cons:** the 4 TX TODOs need Alex confirmation before the typed entity can ship; opening the modal and clicking through a per-PP drill-down (Option A) would let Alex see the cube he just built faster.

**Option C — `2.2.23` `lib/views/ops/` (Tabs 26 + 27).** The headline projection page — Operating Report Summary + Detail. **Pros:** biggest user-visible payoff; consumes the cube + the BFM eturn (already imported) directly. **Cons:** depends on `2.2.13 bfm-eturn/` full (the BFM Position eturn importer is stub-level; full version needed); also depends on `2.2.33 snapshots/` for the OPS Detail "what changed" feature; bigger sub-phase than 2.2.b was. Right answer eventually but probably 2.2.d or 2.2.e, not the immediate next pick.

**My pick: Option A** because Phase 2.2.b just shipped the rollup cube and the drill-down view is the most natural "make the cube visible" next step; small enough to ship without bundling, big enough to feel like progress. Option B is the strong second if Alex would rather close the TX TODOs first.

## Next session prompt — Phase 2.2.c (Alex picks A, B, or C)

Paste this verbatim to start Session 26:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.c),
then ships it. Phase 2.2.b landed in PR #66 — the BI Payroll importer
is now full + lib/payroll/ exposes a per-position rollup cube split
into the 5 special-class buckets; Position Detail shows YTD actuals.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — has the recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 25 entry — Phase 2.2.b obi-payroll full)
  memory/MEMORY.md + the 9 memory files
  docs/audits/phase-2-1-close-audit.md (still has the live carry-forward A-F;
    A and B drifted further this session — see "Audit-surfaced items" below)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph
  app/src/lib/payroll/ + app/src/lib/importers/obi-payroll.ts
    (the obi-payroll bundle that just landed)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.c
==============================================================================
Use AskUserQuestion. Three recommended options with trade-offs are in
SESSION_HANDOFF.md § "Recommendation for Phase 2.2.c":

  A. (recommended) 2.2.17 lib/views/labor/
     — per-position per-PP drill-down view on top of the new cube.
     Small focused sub-phase; immediately visible win.

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — surfaces Cat 17/18 expiry alerts + 1040-hour gauges. The 4 TX
     TODOs (Restated Q #5) need Alex confirmation before the typed
     entity ships.

  C. 2.2.23 lib/views/ops/  (Tabs 26 + 27 — headline projection page)
     — bigger win but ALSO requires 2.2.13 bfm-eturn full + 2.2.33
     snapshots/. Better as 2.2.d or 2.2.e.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.c (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick.

If A — views/labor/:
  Branch: feat/views-labor
  Scope:
    - Add lib/views/labor/ — per-position per-PP table (PPE × earnings
      code × account × hours × balance) with filters (earnings code,
      account, PP range)
    - Quick-aggregates header per labor-report.md § Tab 7 § KosPos UI
      sketch #2 — YTD regular / OT / RPO / Premium / Temp LSP (already
      in the cube via PositionYtdActuals)
    - "Trace to source" affordance: row click highlights the original
      BI Payroll snapshot row
    - Add a "View payroll" button to Position Detail that opens the
      labor view scoped to that position
    - Add the tab to App.tsx (devOnly initially; promote when stable)
    - Tests: filter math, position-scoped view, empty state

If B — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5 in this file)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours, expiry
      alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready, then promoted)
    - Tests

If C — views/ops/: NOT recommended for 2.2.c (heavy prereqs). If
chosen anyway: scope per the labor-report.md dependency graph +
plan on TWO sub-phases of upstream work first (2.2.13 + 2.2.33).

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - **Strict one-sub-phase-per-PR** (continued from 2.2.b).
  - **`npm test` stays green** (currently 202 / 202).
  - One PR per logical change; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - **No bundling.** Strict one-PR-per-sub-phase.
  - **No tab walkthroughs.** Phase 2.0 is closed.
  - **No ADR amendments.** Phase 2.4 (the ADR-007 amendment for the
    confirmed 39-column BI Payroll shape is queued there).
  - **No tool / setting / hook changes** unless surfaced by audit.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.c status + next-session prompt for Phase 2.2.d.
  - Re-ask the 5 restated questions + 12 reasonable-default calls (#5-16)
    + 1 open action item (#17). DROP items Alex acknowledges this
    session (per memory feedback_dont_reremind.md).
  - Carry-forward update on items A-F (E resolved in S24, F working
    as designed, D unchanged; A and B keep drifting — sweep them
    if capacity allows).

**Audit trigger — TWO close audits owed at the start of Session 26:**
  - **Phase 2.2.b close audit** (was owed last session, deferred per the
    handoff disclosure under § Audit-surfaced items / F)
  - **Phase 2.2.c close audit** (this session's close)

Per WORKFLOW.md § Audit cadence ("event-based — every phase close"),
both should fire BEFORE Phase 2.2.d work starts. They can be bundled
into one combined audit doc to save context — Phase 2.1 close audit
established the format; mirror it. Items A (worktree sweep), B
(SESSION_LOG.md trim — now >2,540 lines), and C (memory citation
anti-pattern in labor-report.md) all carry forward unchanged.

If a Phase 2.2 sub-phase reveals an architectural question that needs
ADR treatment, elevate during the session rather than carrying forward
(per CLAUDE.md non-negotiable #7).

Recommended model: claude-sonnet-4-6 — Phase 2.2.c is one focused
sub-phase regardless of A or B pick. Use claude-opus-4-7 if Alex
picks C (cross-source-heavy).
Effort: medium.
````

### Recommended model (Phase 2.2.c)

`claude-sonnet-4-6` — Phase 2.2.c is one focused sub-phase (smaller
than 2.2.b's importer-plus-entity-layer). Opus only if Alex picks
Option C (heavy prereqs).

### Recommended effort (Phase 2.2.c)

`medium` — one view + one wire-in to Position Detail (Option A) OR
one view + one typed entity + 4 TODOs to resolve (Option B).

---

## Notes for the next-session model

- **The workbook path:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\Labor Report 5.21.26.xlsx` (gitignored — never commit).
  openpyxl `read_only=True` mode if needed (read_only=False chokes on
  pivot caches under Python 3.14 + openpyxl 3.1.5).
- **Example reports folder:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\example reports\Reports\` — full inventory in
  [`data-sources/reports-folder-inventory.md`](data-sources/reports-folder-inventory.md).
- **The local main worktree is at** `C:\Users\ALK\Desktop\Claude Projects\kospos`.
  After each merge: `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos"
  pull --ff-only origin main`.
- **Anchor-link convention** (per [ADR-014](DECISIONS.md) +
  [Session 19 audit](audits/internal-claude-setup-audit.md) +
  Phase 2.0h migration + [Phase 2.0i close audit](audits/phase-2-0i-close-audit.md)):
  github-slugger uses lowercase + strip-non-(word|space|hyphen|underscore)
  + per-space-replaced-with-hyphen (NOT collapse multi-space runs) +
  0-indexed occurrence-count suffix on dupes. Phase 2.0i added the
  Phase 2.2 tier rename — direct refs to old `#1-cross-cutting-infrastructure`
  / `#2-per-tab-modules` were migrated to the parent section
  `#phase-22-sub-phases-dependency-order` for stability against future
  tier renumbering.
- **Memory-file citation convention** — use the file:// URL pattern.
  AVOID the `(#tab-24--staffing-plan)` anti-pattern (semantically
  misleading even when it "works" inside labor-report.md). The audit's
  item C surfaces this for batch cleanup.
- **Make the reasonable call, document it, keep going** when
  Alex-level prose details aren't blocking. Flag in the relevant
  tab's Open Questions list. **But: don't re-ask items Alex
  already acknowledged** per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md).
- **`gh pr merge --squash` fails from a worktree** when local main is
  checked out elsewhere. Use `gh api -X PUT repos/alkprojects/kospos/pulls/N/merge
  -f merge_method=squash` instead — pure server-side merge, no local
  branch switch.
- **Audit cadence** (per [WORKFLOW.md § Audit cadence](WORKFLOW.md)):
  Phase 2.0i close + Phase 2.1 close audits have both fired correctly.
  Next audit fires at Phase 2.2.b close (or every-10-session backstop —
  whichever comes first).
- **Anchor verifier** is at `.scratch/verify_anchors.py` (intra-file)
  + `.scratch/verify_anchors_full.py` (intra + cross-doc). `.scratch/`
  is gitignored. Run with `python .scratch/verify_anchors_full.py`
  from the worktree root after any heading-level edit.

---

## Pre-Session 24 status archived below

Original content from end-of-Session-21 handoff retained for reference.

---

## Current status (end of Session 21 — Phase 2.0h Reference + tracking tabs, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **COMPLETE — all 27 walkable tabs walked.**
**Last main commit (pre-merge):** `b523ad4` (PR #56 — Phase 2.0g) → `17b4fad` (PR #57 — Session 21 Phase 2.0h)
**Tests:** 146 / 146 passing (no app-code changes this session)
**Branches in flight:** none after this PR merges

### What landed in Session 21 — Phase 2.0h

[**PR #57**](https://github.com/alkprojects/kospos/pull/57) — Phase 2.0h shipped 14 walkthroughs (Tabs 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 21, 22) + 14 KosPos improvement headings + 16 new Data Issue flag categories + 9 new Phase 2.2 sub-phases + 2 new memory files (TX entity, don't-re-remind). ~1,700 lines added to `labor-report.md`. 23 anchor migrations clean (Tab 26: -10 → -24; Tab 27: -11 → -25).

### Top findings (S21)

1. **Phase 2.0 walkthrough COMPLETE** — every tab in the workbook now has a walkthrough.
2. **TX (Temporary Exchange) modeled provisionally** — typed entity with `(original_position, original_employee, temp_employee, start_date, expired_date, source_appointment_type)` schema; 4 TODOs for Alex confirmation (now surfaced as Restated Question #5 above).
3. **Reporting Tree change-proposal columns are the Change Mode precursor** — Tab 21 has 13 user-input change-proposal columns that map 1:1 to KosPos's `ProposedChange` entity per ADR-003.

(See full Session 21 closeout in `docs/SESSION_LOG.md` § Session 21.)
