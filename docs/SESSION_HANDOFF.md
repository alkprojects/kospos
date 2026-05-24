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

## Next session prompt — AUTONOMOUS OVERNIGHT MODE

**Alex is starting this session before going to bed and will not be available to answer questions until the next morning.** Paste this verbatim to start Phase 4 PR #8 (OVERM_E prep → docs → eventually math).

````
We're continuing Phase 4 — OVERM_E (Overtime) is next.

============================================================================
OPERATING MODE: AUTONOMOUS OVERNIGHT
Alex is asleep.  He will read your output in the morning, answer queued
questions, and decide what to merge.  Optimize for being useful to wake-up
Alex, not for moving as fast as possible.
============================================================================

Read these files first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md
  docs/SESSION_LOG.md (Session 9 entry — covers the full RPO arc + maintenance)
  docs/domain/budget-process.md (three-function model + 2-year cycle + 1.0765 fringe + 15.15.002 reference)
  docs/domain/special-class.md (OVERM_E stub has cell coordinates pre-traced; RPO walkthrough sets the pattern)
  docs/domain/definitions.md (Pay Period 80-hour norm; Fire dept exception matters for OT)

Verify state on main:
  git log --oneline origin/main -5
should show PR #19 (RPO sentiment), PR #20 (xlsx CDN swap), and the Session 9
handoff PR(s) all merged.

Current code state:
- RPO is complete and deployed.  Pattern to mirror:
    - `app/src/lib/special-class/{types,rtpom,rtpom.test}.ts` — pure functions,
      JSDoc cites workbook cell.
    - `app/src/modules/special-class/SpecialClassView.tsx` — section per
      FY-or-cycle, `FyCard` pattern for editable inputs.
- 96/96 tests passing.  Branch from main.

----------------------------------------------------------------------------
OVERNIGHT WORKFLOW (do these IN ORDER)
----------------------------------------------------------------------------

STEP 1 — Spawn TWO background research agents in parallel (single message
with both Agent tool uses).  Both run while you do Step 2.

  AGENT A — SF historical COLAs:
    subagent_type: general-purpose, run_in_background: true
    Mission: find published SF citywide misc-employee COLA percentages per
    fiscal year FY18 → FY28.  Replace the 2.5%/yr placeholder in
    `COLA_PCT_PER_YEAR` (special-class view) with a real per-FY map if found.
    Prefer authoritative sources only: sfcontroller.org, sf.gov/mayor-budget,
    sfdhr.org MOU PDFs, SF Charter / Admin Code.  Report per-FY rate, source,
    confidence (HIGH/MED/LOW), open FYs.  Format: under 500 words, sections
    Bottom-line → Per-FY breakdown → Open → Sources.

  AGENT B — OVERM workbook extraction:
    subagent_type: general-purpose, run_in_background: true
    Mission: open three files and return verbatim cell formulas + values.
    Files:
      1. `C:\Users\ALK\Desktop\Claude Projects\Position Management\DBI FY27-28 Budget Master - Department Phase - 3.3.26.xlsx`
      2. `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor Report 5.21.26.xlsx`
      3. `C:\Users\ALK\Desktop\Claude Projects\Position Management\example reports\Reports\15.15.002 Benefit Rates (1).xlsx`
    Extract:
      - Budget Master `Special Class` tab, cells AR4:BD12 (OVERM section).
        Headers from row 3 or 4.  Row 5 values AND formulas (AU5 should be
        `=AT5*1.0765`, AW5 or AW6 the FY26 projection).  Rows 6-12 if non-empty.
      - Labor Report `Operating Report Summary` tab, row 37 (OVERM): formulas
        D37:I37 verbatim + computed values.
      - Labor Report `Overtime` tab: row 5 headers for BN:BT; row 6 values +
        formulas; value of BN8 (the `$BN$8` constant); row 15 totals (BS15
        formula).
      - `15.15.002` benefit rates: sheet list, headers of most relevant sheet,
        FY26 rate(s) applicable to OT salaries.
    Critical performance lesson from Session 8: ALWAYS use
    `openpyxl.load_workbook(path, read_only=True, ...)` with
    `iter_rows(values_only=True)` — random-access `ws.cell()` on read_only
    workbooks is O(n²) and hangs.  For formulas + values you may need to open
    twice (data_only=False then data_only=True) on the SPECIFIC tabs only.
    Report: under 700 words, copy formulas verbatim in code blocks.

STEP 2 — While agents run, do small low-risk things:
  - Read the current OVERM_E and PREMM_E stubs in `special-class.md` carefully.
  - Sketch (in a scratch file, not committed) the OVERM module shape that
    would mirror rtpom: function signatures only, no implementation.
  - DO NOT create the actual `overm.ts` yet — wait until you have workbook
    values to ground the JSDoc cell citations.

STEP 3 — When both agents return, capture findings in a SINGLE docs-only PR:
  Branch: `docs/overm-prep-overnight`
  Update:
    - `docs/domain/special-class.md` § OVERM_E — replace the stub with what
      the workbook agent extracted.  Copy formulas verbatim.  For each TODO
      from the original stub, mark either "resolved by workbook" or
      "still needs Alex".
    - `docs/domain/budget-process.md` — add new § "SF historical COLAs" with
      the agent's table.  Keep the 2.5%/yr placeholder noted as fallback.
  Open the PR.  CI must be green.

  MERGE THE DOCS PR.  Docs-only updates are safe to land overnight — Alex
  will review on wake.

STEP 4 — Write a MORNING BRIEFING by appending to `SESSION_HANDOFF.md`:
  New top-level section "## Morning briefing — pending Alex review" with:
    a) What landed overnight (which PRs, what's on main now).
    b) The OVERM questions that still need Alex's judgment (from the original
       7-question list — mark each: "answered by workbook" / "still need you").
    c) Any new questions surfaced by the workbook extraction.
    d) The COLA agent's findings + any per-FY values that need Alex's confirm.
    e) Suggested next-step prompt for Alex to fire when he wakes.
  Open a SECOND docs PR for this handoff update.  Do NOT merge it — let Alex
  review.

STEP 5 — STOP HERE.  Do NOT:
  - write OVERM math (`overm.ts`) — needs Alex's interpretive answers
  - merge any code or non-docs PR
  - touch other special classes (PREMM, TEMPM, STEPM, etc.)
  - start Phase 5
  - extend cost.ts to FY27/FY28 COLAs (Alex deferred per-employee scenarios)
  - implement state persistence (also deferred)

If an agent fails or returns garbage:
  - Don't retry blindly.  Note the failure in the morning briefing and move on.
  - Workbook access can fail if Alex has the file open in Excel — note it,
    skip cleanly, the agent's notes still help.

Hard constraints (unchanged):
- Branch from main, single-purpose names
- No new npm packages
- Pure inline CSS
- Unit tests for ALL calculation functions you write (you shouldn't write any
  this session, but if you did)
- npm test must stay green
- One PR per logical chunk

If you finish all of Step 1–4 with time and context to spare:
  - You may run AGENT C: extract PREMM cells from the same Budget Master
    (cells U4:AN12 approximately) and Labor Report Premium tab.  Same
    extraction rules as Agent B.  Capture in a separate `docs/premm-prep`
    PR (open, do NOT merge — Alex hasn't asked for PREMM prep, this is just
    making the next-next class easier).
  - Otherwise: end the session cleanly.

What you absolutely MUST NOT do under any circumstances:
- Write OVERM math without Alex's answers to the 7 OVERM questions.
- Merge a code PR without Alex's review.
- Modify the live deployment in any way other than docs PRs.

Original OVERM question list (for the morning briefing — mark each "answered
by workbook" or "still need you"):

  1. BUDGET DEV — how do you pick the OT cushion per dept?  Same magnitude
     across all depts or variable?  Formula-driven or judgment?
  2. FRINGE RATE — FY26 = 7.65% confirmed.  Does it change for FY27/FY28?
     Source from 15.15.002 lookup or hardcode per-FY constants?
  3. CHARTFIELD ALLOCATION — OT budget is per-dept; how does it split to
     individual chartfield strings?  Same labor-share spread as RPO, or
     different (e.g., by historical OT actuals per chartfield)?
  4. YTD SOURCE — does the `Overtime` tab include ALL "Overtime - Scheduled
     Misc" earnings, or only certain codes?  Per-dept gotchas?
  5. YEAR-END PROJECTION — the doc shows
       `BS6 = BR6 * $BN$8 / Calendar!$I$2 * Calendar!$J$2 / $BN$6`.
     What is `$BN$8` / `$BN$6` doing?  PP normalization?
  6. FIRE EXCEPTION — Fire's 80-hour-PP assumption breaks.  Does OT use a
     different denominator for Fire, or does Fire OT live outside OVERM?
  7. ANY GOTCHA — anything not in the doc stub?

Recommended model for this session: `claude-opus-4-7`.
Recommended effort: `high` (research + careful capture, not coding).

End by ending — leave the morning briefing PR open for Alex.  Don't ping him.
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
