# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 11, 2026-05-24)

**Phase:** 4 — IN PROGRESS. RPO complete; OVERM math + UI done, awaiting review.
**Last main commit:** `3702ef2` (PR #24 — morning briefing for OVERM walkthrough)
**Tests:** 146/146 passing (96 prior + 50 new OVERM)
**Branches in flight (3 open PRs)**:
- [PR #25](https://github.com/alkprojects/kospos/pull/25) — `docs/overm-bn8-bn6-fix` — doc fix only, independent
- [PR #26](https://github.com/alkprojects/kospos/pull/26) — `feat/overm-math` — math module + tests, independent
- [PR #27](https://github.com/alkprojects/kospos/pull/27) — `feat/overm-view` — UI section + chartfield allocation, **stacked on #26**

## Blockers for Alex

1. **Review and merge the three open PRs.** Suggested order:
   1. PR #25 (doc fix) — quick read; just corrects PR #23's prose about BN8/BN6.
   2. PR #26 (math) — confirms the projection reproduces `Overtime!BS15 = $555,485` from BFM inputs.
   3. PR #27 (UI, stacked on #26) — needs visual spot-check; see below.
2. **PR #27 visual verification was blocked this session.** Both port 5173 and 5174 were held by older vite dev servers in other worktrees, and the auto-mode classifier blocked editing `.claude/launch.json` to switch ports. The build is clean and all 146 tests pass. Please spot-check on first review:
   - FY26 OVERM table shows \$380k budgeted total, \$349,749 budgeted salary, \$438,786 YTD, ~\$555k projected, OVER BUDGET tag visible.
   - FY27/FY28 cards default to suggested budget; editing them updates the chartfield-allocator's "Allocating \$X" header.
   - Chartfield allocator: year toggle works; mode toggle works; `+ Add row` adds editable rows in manual mode; remainder bar turns green when allocations sum to the year's budget.

## What landed this session (PRs #25 → #27)

The full OVERM walkthrough → math → UI arc. See `SESSION_LOG.md` Session 11 entry for the prompt-by-prompt history and the full table of resolutions for the 7 OVERM questions.

**Code shape (mirrors the RPO pattern):**
- `app/src/lib/special-class/overm.ts` — pure functions: `grossUpFringe`, `roundUpToThousand`, `suggestOvermBudget`, `historicalActualsMean`, `colaAdjustToYear`, `applySentiment`, `ytdBudgetPace`, `salaryToTotalGrossUp`, `projectOvermYearEnd`. Each cites the workbook cell it reproduces in JSDoc.
- `app/src/lib/special-class/overm.test.ts` — 50 tests covering all of the above with DBI's FY26 reference data + defensive edges.
- `app/src/lib/special-class/index.ts` — adds `export * as overm from './overm'` (namespaced to avoid collisions with `rtpom`'s same-named utility exports).
- `app/src/modules/special-class/SpecialClassView.tsx` — appends OVERM section: FY26 current-year read-only table, FY27-28 cycle with `OvermFyCard` (direct dollar-amount edit, simpler than RPO's sentiment+pct since cushion is judgment), and `ChartfieldAllocator` (mode toggle existing/manual + row table with + Add row + live remainder bar).
- `docs/domain/special-class.md` § OVERM_E — BN8/BN6 prose corrected (salary→total gross-up, not "scale factor"); all 7 TODOs marked resolved.
- `docs/domain/definitions.md` § Pay Period — expanded with the 26/26.1/26.2 rule, weekday-vs-weekend PP contribution, PP1/PP27 anchors.

## Resolutions captured this session (the 7 OVERM questions)

| # | Resolution |
|---|---|
| Q1 cushion | Default = `roundUpToThousand(max(grossed-up prior, current projection))`; editable per row |
| Q2 fringe | Hardcoded 1.0765 (OASDI + Medicare); both unchanged in FY27/FY28 |
| Q3 chartfield | Two modes: "use existing chartfields" or "manually enter rows"; per-dept best practice |
| Q4 YTD source | Pivot is OT salary actuals only (no benefits); KosPos sums across **all funds** (workbook's 10190 filter is a DBI shortcut) |
| Q5 projection | `BN8/BN6` is a salary→total cost gross-up from the BFM-budgeted ratio. Both constants refresh once per FY (super-admin task). Future: derive OT benefits from T&L (TRC) data |
| Q6 Fire | N/A for DBI; defer until KosPos extends to Fire |
| Q7 gotchas | PP constants computed from Calendar tab, never hardcoded; per-FY PP count is 26/26.1/26.2 |

**Out-of-scope decisions** (Alex deferred — do not pick up without a fresh ask):
- T&L (TRC-based) OT-benefit derivation — needs a T&L importer.
- Per-FY COLA constants — Alex will source from `15.15.014` historical reports in a later session.
- Per-row OVERM table mirroring `Special Class!AR4:BD12` — single representative row only until the per-row importer lands.
- State persistence for OVERM sentiment/amount/chartfield inputs — same deferred decision as RPO.

## Next session prompt

Pick one of (a) review-and-merge first, or (b) start the next special class. The prompt below assumes (b) — pick the next class. If you prefer (a), no prompt needed; just merge in this order: #25 → #26 → #27.

The next special-class candidates, in suggested order of yield:

1. **PREMM_E (Premium Pay)** — Budget Master cells `U5:AN12`; per-(job class, earnings code) historical rate × next-FY salary budget. Cell coordinates pre-traced in `special-class.md` § PREMM_E; needs a workbook extraction + walkthrough.
2. **STEPM_C (Step Adjustments)** — Per-position math, `Budget Master!BH5:BV5` + `Labor Report → Step` tab. Cell coordinates pre-traced; walkthrough TODOs noted.
3. **TEMPM_E (Temporary)** — Definitional ambiguity is the heavy lift; see `definitions.md` § Temp.

Paste this verbatim to start the next session:

````
We're continuing Phase 4. The OVERM arc landed across PRs #25 (doc fix),
#26 (math), and #27 (UI). Next class: PREMM_E (Premium Pay) — same
walkthrough → math → UI pattern as OVERM.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md
  docs/SESSION_LOG.md (Session 11 entry — OVERM full arc)
  docs/domain/special-class.md § PREMM_E (cell coordinates pre-traced)
  docs/domain/special-class.md § OVERM_E (the resolved pattern to mirror)
  app/src/lib/special-class/overm.ts (the resolved code shape)
  app/src/modules/special-class/SpecialClassView.tsx § "OVERM_E"

Plan:
  1. Spawn a background workbook-extraction agent on PREMM cells
     (U5:AN12 in Budget Master + Premium tab in Labor Report).
     Follow the Session 10 lesson: openpyxl read_only + iter_rows.
  2. Walk through the open PREMM questions with me (cushion magnitude
     equivalent, projection formula details).
  3. Write the math (`premm.ts` + `premm.test.ts`) and UI section once
     I've answered.

Hard constraints (unchanged):
  - One PR per logical chunk: doc updates, math, UI separate.
  - No new npm packages.
  - Pure inline CSS.
  - Unit tests for every calculation function.
  - npm test must stay green.
  - No OVERM rework unless I explicitly ask.

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — Phase 4 is dollar-precision math; opus for reasoning.

## Recommended effort

`high` — PREMM has the per-(job class, earnings code) lookup pattern that will need careful workbook tracing.

## Notes for the next-session model

- **Each special class repeats the walkthrough → math → UI three-PR rhythm.** Don't skip the walkthrough — even when the workbook is extracted, the prose interpretation is often wrong (Session 11 had to fix PR #23's BN8/BN6 misreading).
- **Mirror, don't refactor.** Until a third class lands, keep `overm.ts` and `rtpom.ts` self-contained (some utility duplication is fine). When the third class arrives, extract shared utilities to `common.ts`.
- **Visual verification matters.** Try to start the dev server early in the session so port conflicts surface before they become end-of-session blockers. If `.claude/launch.json` needs editing, ask Alex explicitly — the auto-mode classifier will deny it otherwise.
- **Don't invent reference data.** All numbers in the view must cite a workbook cell Alex confirmed.
- **Persistence + multi-dept remain out of scope** unless Alex re-opens them.
