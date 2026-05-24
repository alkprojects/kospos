# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status

**Phase:** 4 — IN PROGRESS. Knowledge capture done (PR #12 open); RPO math (PR #2) is next.
**Branches in flight:**
- [`claude/reverent-brown-36862b`](https://github.com/alkprojects/kospos/pull/12) → PR #12 — three Phase-4 docs (new: `budget-process.md`, `definitions.md`; overhaul: `special-class.md` 47 → 388 lines). `/ultrareview` ran (2 findings, both fixed in-PR — commit `a7434fd`).
- `docs/session-8-handoff` — this PR (SESSION_HANDOFF + SESSION_LOG update).
**Tests:** 65/65 (no code touched in Session 8)
**Last main commit:** `bf87aee` (Session 7 doc PR)

## What's in PR #12 (read before Phase 4 PR #2)

Knowledge capture from direct inspection of Alex's real workbooks:

- **Three-function model** — every special class must support budget development + YTD vs actuals + year-end projection.
- **Operating Report Summary formula table** (cell-coordinate level) for DBI rows 36–42 (PREMM/OVERM/RTPOM/STEPM/TEMPM/9993).
- **Full RPO walkthrough** — F14 historical mean, F15 user-chosen, K5 dept allocation by labor share, E38/D38/H38 YTD + projection.
- **Skeleton walkthroughs** for OVERM/PREMM/TEMPM/9995/9994/STEPM/9993 with cell coordinates pre-traced.
- Key non-obvious findings: 9993 is a residual (not a formula on GL data); RPO projection is `MAX(budget, YTD)` (conservative floor); TEMPM YTD filter (`COMMN:5380`) is DBI-specific and under-counts at other depts; OT fringe = 7.65% in FY26; 80-hour PP is the norm but Fire dept differs.

## Blockers for Alex

1. **Merge PR #12** (Phase 4 knowledge capture) and the session-handoff PR before starting the next session. Phase 4 PR #2 will branch from main and depends on the docs being on main so the next-session-start prompt can reference them.
2. **Optionally** review/skim `docs/domain/special-class.md` — flag anything you'd word differently before the math PR uses it as source-of-truth.

## Next session prompt

Paste this verbatim to start Phase 4 PR #2 (RTPOM_E math):

````
We're continuing Phase 4 — Retirement Payout (RTPOM_E) math, end-to-end.

Read these files first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md
  docs/SESSION_LOG.md (Session 8 entry — has the workbook inspection + lessons)
  docs/domain/budget-process.md (three-function model + conservative-bias philosophy)
  docs/domain/special-class.md (RPO walkthrough is the canonical spec)
  docs/domain/definitions.md (Pay Period 80-hour norm; "Temp" if you touch it)

Verify state on main before branching:
  git log --oneline origin/main -5
should show PR #12 (Phase 4 docs) and the session-8 handoff PR both merged.

Current state:
- Phase 4 docs are on main. The RPO formula spec lives at the RTPOM_E section of
  docs/domain/special-class.md (cell-by-cell trace from Alex's real Budget Master).
- Stack: Vite + React + TypeScript. Zustand v5. Pure inline CSS. No new npm packages.
- 65/65 tests passing.
- No special-class code exists yet — this is the first PR that introduces it.

What to build (Phase 4 PR #2, single logical chunk):

1. New module: app/src/lib/special-class/
   - types.ts — SpecialClassCode union, SpecialClassRecord type (per chartfield × FY:
     code, chartfieldString, fy, budget, ytdActual, projectedActual, ytdBudget, balance,
     projectedBalance, source: 'computed'|'manual', notes).
   - rtpom.ts — pure functions for the three RPO functions:
     a) BUDGET DEV: historicalActualsMean(actuals[]), allocateByLaborShare(chosenTotal,
        deptLaborShares). Cushion is user-input; expose recommended = chosenTotal as-is
        for now (Alex picks the cushion magnitude per cycle, see the RPO walkthrough).
     b) YTD vs ACTUAL: ytdBudgetPace(totalBudget, ppElapsed, ppTotal) = totalBudget *
        ppElapsed / ppTotal.
     c) PROJECTION: projectRpoYearEnd(totalBudget, ytdActual, ppRemaining) =
        ppRemaining === 0 ? ytdActual : Math.max(totalBudget, ytdActual).
        This is the conservative floor; matches Operating Report Summary H38.
   - rtpom.test.ts — unit tests. Required test data (from Alex's confirmed Budget Master
     screenshot, FY27 RPO):
       Historical actuals 2018–2025: 142944, 93857, 341022, 146645, 310700, 88219,
       181295, 299051. Mean must equal 200467 (rounded to whole dollar).
       Alex chose F15 = 300000 for FY27 (justified: "many retirements expected in IS").
     Plus edge cases: empty actuals → 0; ppElapsed > ppTotal → cap at total; YTD-exceeds-
     budget → projection = ytdActual; ppRemaining=0 + ytdActual<budget → projection =
     ytdActual (year is over).

2. Minimal UI tab: app/src/modules/special-class/SpecialClassView.tsx
   - New tab in App.tsx (4th tab) labeled "Special Class"
   - Renders just the RPO row(s) for now. Per chartfield-string row with: code, chartfield,
     total budget, YTD actual, YTD budget pace, balance, projected actual, projected balance.
   - No data yet — show with hardcoded mock values that match the test cases, plus a
     prominent "Phase 4 PR #2: RPO only. Other classes coming." note.
   - Pure inline CSS. No new components from npm.

3. DO NOT TOUCH the other 7 special classes. Each gets its own PR per Alex's
   walk-through-one-at-a-time preference. Order: RTPOM → OVERM → PREMM → TEMPM →
   9995 → 9994 → STEPM → 9993.

Constraints:
- Branch from main: feat/rtpom-math
- No new npm packages
- Pure inline CSS
- Unit tests for ALL calculation functions
- npm test must stay green (65/65 → 65 + new RPO tests)
- One PR per logical chunk — do NOT bundle other special classes
- If you discover the spec is ambiguous or wrong, PAUSE and ask Alex before guessing

After PR opens: optionally run /ultrareview on it before merge. 2 of 3 free runs remain.

Do not start any other special class. Do not start Phase 5.
````

## Recommended model

`claude-opus-4-7` — same as Session 8. Phase 4 is dollar-precision math; opus for reasoning.

## Recommended effort

`high` — RPO is the simplest of the 8 classes, but it's establishing the data shape that
the other 7 will reuse. Get it right; don't rush.

## Notes for the next-session model

- The RPO walkthrough in `docs/domain/special-class.md` includes Alex's improvement ideas
  (3/8-year trailing comparison, itemized retiree list). PR #2 doesn't need to implement
  those — get the baseline working first. Surface them as TODOs in `rtpom.ts`.
- Chartfield-string allocation pattern is shared with 9993 (attrition). Don't bake the
  allocation function into RPO specifically — put it in a shared `app/src/lib/special-class/
  allocate.ts` so 9993 can reuse it later.
- The `15.15.002` benefits report is referenced but no importer exists for it. RPO doesn't
  need benefits info, so this isn't a PR #2 blocker, but OVERM (PR #3) and TEMPM (PR #5)
  will need it. Note in handoff for future planning.
- Session 8's bug_001 lesson: when citing function behavior in tests/docs, re-read the
  function. Don't trust memorized state of post-fix code.
