# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status

**Phase:** 4 — IN PROGRESS. RPO (RTPOM_E) complete. OVERM_E (Overtime) is next.
**Last main commit:** PR #20 (xlsx CDN swap) + this Session 9 handoff PR
**Tests:** 96/96 passing
**Branches in flight:** none — RPO arc fully merged; this doc PR is the only open work.

### What landed this session (PRs #14 → #20)

The full Phase 4 RPO arc + maintenance cleanup. See `SESSION_LOG.md` Session 9 entry for the per-PR table and prompt-by-prompt history.

**Special Class tab (live at https://alkprojects.github.io/kospos/):**
- FY26 (Current Year) section — real numbers ($249,998 budget vs $359,014 YTD/projected, "OVER BUDGET" flagged in red), three-function model: Functions 1 + 2 (actuals) and Function 3 (projection).
- FY27-28 Budget Cycle section — historical actuals table (9 years incl. FY26 projection tagged PROJ), COLA-adjusted column (2.5%/yr placeholder), two means side-by-side. Two side-by-side year cards (FY27 BY + FY28 BY+1), each with editable Less/Same/More sentiment + % adjustment + justification textarea.

**Code shape (the pattern future special classes should follow):**
- `app/src/lib/special-class/types.ts` — `SpecialClassCode` union (all 8), `SpecialClassRecord` (per chartfield × FY).
- `app/src/lib/special-class/rtpom.ts` — pure functions: `historicalActualsMean`, `allocateByLaborShare`, `colaAdjustToYear`, `applySentiment`, `ytdBudgetPace`, `projectRpoYearEnd`. Each cites the workbook cell it reproduces in its JSDoc.
- `app/src/lib/special-class/rtpom.test.ts` — 31 tests covering all of the above, with Alex's confirmed FY27 reference data + edge cases.
- `app/src/modules/special-class/SpecialClassView.tsx` — single view, sectioned by FY. Stateful (`useState`) for sentiment inputs; `FyCard` is a pure presentational subcomponent.

**Out-of-scope decisions** (Alex deferred — DO NOT pick up without a fresh ask):
- Per-employee scenario builder (PTO importer + COLA-aware payouts using `cost.ts`).
- State persistence for the sentiment inputs (page refresh resets them).
- Multi-dept overrides (today everything is DBI).

**Maintenance done this session:**
- Worktree cleanup — 9 stale sub-worktrees + 18 merged local branches removed. The "main is already used by worktree" warnings during `gh pr merge` are gone.
- `xlsx` swapped from npm 0.18.5 (high-severity audit) to SheetJS CDN 0.20.3 tarball (0 vulnerabilities).

### Domain docs added/updated this session

- `docs/domain/budget-process.md` § "Two-year budget cycle" — BY + BY+1 model, cycle progression, KosPos implications.
- `docs/domain/special-class.md` § RTPOM_E "Per-employee payout math — eligibility rules" — research findings from a background general-purpose agent. Two corrections to the original domain hypothesis:
  - **Comp time is MOU-dependent**, not universally excluded (SEIU 1021 pays, MEA doesn't).
  - **Vested sick / wellness pay** is a separate balance that pays out at retirement — almost certainly the "SP" in account 510210 "Ret Payout - SP & Vac - Misc". Confirm with the Controller's Payroll Division before any per-employee math.

## Blockers for Alex

1. **Merge this handoff PR** before starting the next session. The next-session prompt below references the Session 9 log entry and the new domain doc sections.
2. **(Optional) walk through OVERM_E with the next-session model.** The doc stub at `docs/domain/special-class.md` § OVERM_E has cell coordinates pre-traced but several TODOs Alex needs to answer. The next-session prompt below asks the model to elicit these before writing any code. If Alex prefers to drop the answers here in the handoff first, that's faster.

## Next session prompt

Paste this verbatim to start Phase 4 PR #8 (OVERM_E walkthrough → docs → math):

````
We're continuing Phase 4 — OVERM_E (Overtime) is next.

Read these files first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md
  docs/SESSION_LOG.md (Session 9 entry — covers the full RPO arc + maintenance)
  docs/domain/budget-process.md (three-function model + 2-year cycle + 1.0765 fringe + 15.15.002 reference)
  docs/domain/special-class.md (OVERM_E stub has cell coordinates pre-traced; RPO walkthrough sets the pattern)
  docs/domain/definitions.md (Pay Period 80-hour norm; Fire dept exception matters for OT)

Verify state on main:
  git log --oneline origin/main -5
should show PR #19 (RPO sentiment), PR #20 (xlsx CDN swap), and the Session 9 handoff PR all merged.

Current state:
- RPO is complete and deployed.  Pattern to mirror:
    - `app/src/lib/special-class/{types,rtpom,rtpom.test}.ts` — pure functions, JSDoc cites workbook cell.
    - `app/src/modules/special-class/SpecialClassView.tsx` — section per FY-or-cycle, `FyCard` pattern for editable inputs.
- 96/96 tests passing.  Branch from main.

CRITICAL — knowledge capture BEFORE math (Session 9 lesson):
The OVERM stub in `special-class.md` has TODOs.  Do NOT write OVERM math until Alex
answers all of these.  Open a docs PR with his answers first; the math PR follows.

Ask Alex (one block, copy-able):

  Walk me through OVERM_E the way you did RPO.  Specifically:

  1. BUDGET DEV — how do you pick the OT cushion per dept?  Same magnitude across
     all depts or variable?  Formula-driven (X% of prior actual) or judgment-based?

  2. FRINGE RATE — FY26 = 7.65% (confirmed).  Does this change for FY27/FY28?
     Source from `15.15.002` lookup (per your earlier instruction) or hardcode
     per-FY constants for now?

  3. CHARTFIELD ALLOCATION — OT budget is per-dept.  How does it split to
     individual chartfield strings?  Same labor-share spread as RPO, or different
     (e.g., by historical OT actuals per chartfield)?

  4. YTD SOURCE — does the `Overtime` tab include ALL "Overtime - Scheduled Misc"
     earnings, or only certain codes?  Any per-dept reconciliation gotchas?

  5. YEAR-END PROJECTION — the doc shows
       `BS6 = BR6 * $BN$8 / Calendar!$I$2 * Calendar!$J$2 / $BN$6`
     What is `$BN$8` and `$BN$6` doing?  Is this pay-period normalization for
     partial PPs?  How is the result different from straight-line annualization
     of the YTD balance?

  6. FIRE EXCEPTION — Fire's 80-hour-PP assumption breaks.  Does OT use a
     different denominator for Fire, or does Fire OT live outside OVERM
     entirely?  DBI doesn't have Fire so this may be parking-lot for Alex
     until a Fire dept loads.

  7. ANY GOTCHA — anything I should know that isn't in the doc stub?

Workflow this session:
1. Capture Alex's answers in `docs/domain/special-class.md` § OVERM_E (replace the
   stub; mirror the RPO section's structure).  Open as a docs-only PR.  Merge.
2. Build the OVERM math + UI as a second PR (one logical chunk).  Branch name
   `feat/overm-math`.  Same module layout as RPO (`overm.ts` + tests).  Same
   one-section-per-FY-or-cycle UI pattern.  Goal: outputs match the spreadsheet to
   the dollar for DBI FY26 + FY27-28 cycle.

Constraints (unchanged from RPO arc):
- Branch from main, single-purpose name
- No new npm packages
- Pure inline CSS
- Unit tests for ALL calculation functions
- npm test must stay green (96 + new OVERM tests)
- One PR per logical chunk — do NOT bundle PREMM or any other class
- Deploy via merge → Pages → Alex reviews on the live site (preview tool serves
  the main repo's app/ dir, not the worktree)
- If the spec is ambiguous or you can't see the formula verbatim, PAUSE and ask
  Alex — guessing is a blocker

Do not start any other special class.  Do not start Phase 5.
````

## Recommended model

`claude-opus-4-7` — same as Session 9. Phase 4 is dollar-precision math; opus for reasoning.

## Recommended effort

`high` — OVERM has the fringe-rate lookup wrinkle and a non-obvious projection formula (`BS6` normalization) that need careful tracing.

## Notes for the next-session model

- **Don't repeat the RPO mistake of inventing reference data.** PR #14 used a fabricated chartfield code (`17000`); PR #15 had to undo it. For OVERM, only render numbers you can cite to a workbook cell Alex confirmed.
- **The `15.15.002` benefits report is referenced everywhere but has no importer.** OVERM and TEMPM both need it. If Alex hasn't built/shared one by your session, ask whether to (a) hardcode FY26/FY27/FY28 constants in a `benefits.ts` table or (b) defer until the importer lands. Don't silently hardcode without flagging.
- **The `FyCard` pattern in `SpecialClassView.tsx` is reusable.** For OVERM, you may want a similar editable card per FY for the cushion magnitude. Don't duplicate the component — extract to a shared file in `app/src/modules/special-class/` if it'll have ≥2 callers.
- **Persistence + multi-dept are still out of scope** unless Alex re-opens them.
