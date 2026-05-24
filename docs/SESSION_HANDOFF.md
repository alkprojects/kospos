# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Morning briefing — pending Alex review (Session 10, autonomous overnight)

Wake-up TL;DR: one docs PR **merged** (PR #23, the OVERM workbook extraction + COLA
table); this handoff update PR is **open and unmerged** awaiting your review. No code
changed. No OVERM math written. `npm test` unchanged at 96/96.

### a) What landed overnight

- **PR #23 (merged)** — `docs: OVERM_E workbook extraction + SF historical COLAs (FY18-FY27)`.
  Two files updated:
  - `docs/domain/special-class.md` § OVERM_E — verbal stub replaced with verbatim
    formulas + headers from the three workbooks.
  - `docs/domain/budget-process.md` — new "SF historical COLAs" section with per-FY rates
    cited verbatim from SEIU 1021 Misc MOU PDFs.
- **This PR (open, do not auto-merge)** — `docs: morning briefing for OVERM walkthrough`.
  Adds this very section to `SESSION_HANDOFF.md`. Read, edit as needed, then merge.

Current `main` head should be PR #23's squash commit (`1ea50fd` at the time of writing).

### b) The original 7 OVERM questions — answered / open

| # | Question | Status | Notes |
|---|---|---|---|
| 1 | Cushion magnitude — how do you pick the per-dept number? | **Still need you** | `Special Class!AX` column (FY27 Budget) is hand-entered with no formula trail. The workbook confirms it's judgment, not a formula. Need to know: is there a rule of thumb (e.g., "prior-year actual × 1.05") or pure dept-by-dept feel? |
| 2 | Fringe rate FY27/FY28 — lookup or hardcode? | **Answered by workbook** | Hardcode `1.0765` as a derived constant with a `// 7.65% = OASDI 6.20% + Medicare 1.45%` comment. `15.15.002 Benefit Rates` has no FY26 entry; FY27/FY28 rates are mechanically identical (only the OASDI **wage cap** moves: \$189,337 → \$199,265). The only reason to add a per-FY lookup is if Social Security or Medicare rates change in legislation, which is rare and forecastable. |
| 3 | Chartfield-string allocation method | **Still need you** | Operating Report rolls up by fund (`Fund Code = 10190`); the `Overtime` tab slices by dept. The per-chartfield-string breakdown isn't visible in the extracted ranges. RPO used "even spread by regular-labor share" — does OVERM do the same, or does it use historical OT actuals per chartfield string? |
| 4 | YTD source — all "Overtime - Scheduled Misc" or filtered codes? | **Partially answered** | `E37 = GETPIVOTDATA(..., Overtime!$A$3, "Fund Code", 10190)` — pulls every OT earnings code in the Overtime tab's pivot, filtered to DBI operating fund. Open question: does the Overtime tab pivot include **only** "Overtime - Scheduled Misc", or does it also pick up "Overtime - Holiday Premium", "Overtime - Standby", etc.? And do any DBI OT dollars post outside fund 10190 (other funds, capital projects, etc.)? |
| 5 | Projection formula meaning | **Mechanically answered, interpretation pending** | `BS6 = BR6 * $BN$8 / Calendar!$I$2 * Calendar!$J$2 / $BN$6`. Decoded: `YTD_dept × (DBI_total_budget / Board_adopted_citywide_total) × annualization_factor`. `BN8 = 380,000` (DBI's FY26 OT total, matches `G37`). `BN6 = 349,749` (literal, labeled "FY25-26 Board"). **Need your interpretation of the `BN8/BN6 ≈ 1.086` scale factor:** is "FY25-26 Board" the *original* citywide Board-adopted OT total (so the ratio inflates YTD by however much DBI's working budget grew vs. citywide-original), or something else (e.g., DBI's own prior-year Board total)? Either way, the constant is **hardcoded** and stale-prone — needs annual refresh. |
| 6 | Fire exception — different denominator? | **N/A for DBI** | `$BN$6` is the citywide Board-adopted total, so if Fire is ever in scope, the denominator is already citywide. The 80-hour-PP norm doesn't enter OVERM math directly (the projection scales by PP count, not hours). Will resurface when we extend KosPos to Fire — flag and defer. |
| 7 | Any gotcha? | **New gotchas surfaced** | See (c) below. |

### c) New questions surfaced by the workbook extraction

1. **`BN6 = 349,749` is a hardcoded literal labeled "FY25-26 Board".** Where does that
   number come from? The original Board-adopted OT salary appropriation citywide? DBI
   only? It will rot annually if not refreshed. KosPos needs to source this from
   somewhere stable (a "Board adopted" snapshot in the labor report? a CON publication?).
2. **`AW = AV/15.4*26.1` uses literal PP constants instead of `Calendar!I2/J2`.** The
   Budget Master was prepared March 3 (15.4 PPs); the Labor Report (May 21) snapshot
   would have a different YTD PP count. Two workbooks, two sources of truth for the same
   number. Confirm: should KosPos always use the Calendar tab values, or are the Budget
   Master's frozen literals intentional ("budget projection as of decision date")?
3. **The DBI `Special Class!AX` column doesn't equal `AU` (grossed-up prior actual).**
   E.g., row 5: AT=\$1,592, AU=\$1,714 grossed-up, but AX=\$2,000 (and BA/BB=\$2,000).
   That's a ~\$300 cushion on a \$1,700 baseline — much bigger than a "small cushion".
   Is the per-row pattern "round up to a nice number with headroom" rather than "% cushion"?
4. **No FY27 or FY28 OT projection in the Budget Master.** Only FY-prior, FY-current YTD,
   and FY-current projection. Future-year **budget** is a chosen number per dept. So
   OVERM has no native "two-year projection" — it's all decision-time pick. Want to add
   an itemized 3-year/8-year mean (like RPO) to inform the FY27 and FY28 picks?
5. **Operating Report `E37` filters to `Fund Code = 10190`.** Are there other DBI funds
   with OT? (Building Permits special revenue, etc.) If yes, this formula is
   under-reporting YTD actuals.

### d) COLA agent findings — per-FY confirmation needed

Agent A pulled SEIU 1021 Misc MOU rates verbatim. **HIGH-confidence** for FY18–FY27 from
the ratified MOU PDFs. The recommendation: replace the flat 2.5%/yr placeholder in
`COLA_PCT_PER_YEAR` with a per-FY map.

| FY | Within-FY effective dates | Recommended "modeling %" | Confidence |
|---|---|---|---|
| FY18 | Jul 1, 2017 (3.0%) | 3.0% | HIGH |
| FY19 | Jul 1, 2018 (3.0% scheduled) | 3.0% | HIGH |
| FY20 | Jul 1, 2019 (3.0%) + Dec 28, 2019 (1.0%) | 3.5% | HIGH |
| FY21 | Jul 1, 2020 (3.0%, COVID-deferred to ~Jan 2021) + Dec 26, 2020 (0.5%) | 3.5% scheduled | HIGH/MED |
| FY22 | Jul 1, 2021 (3.0%) + Jan 8, 2022 (0.5%) | 3.25% | HIGH |
| FY23 | Jul 1, 2022 (5.25%) | 5.25% | HIGH |
| FY24 | Jul 1, 2023 (2.50%) + Jan 6, 2024 (2.25%) | 3.6% | HIGH |
| FY25 | Jul 1, 2024 (1.5%) + Jan 4, 2025 (1.5%) + Jun 30, 2025 (1.0%) | 3.0% | HIGH |
| FY26 | Jul 1, 2025 (1.0%) + Jan 3, 2026 (1.5%) + Jun 30, 2026 (2.0%) | 2.5% | HIGH |
| FY27 | Jan 2, 2027 (2.0%) + Jun 30, 2027 (2.5%) | 2.0% | HIGH |
| FY28 | none ratified | placeholder 2.5% | UNRESOLVED |

**The "Modeling %" column is author judgment, not a published rate.** Heuristic: sum the
increases that take effect early enough to materially affect the FY (i.e., not the
late-June ones). For precision-critical work (per-position salary modeling) you'd want
the per-effective-date increments instead. **Two questions for you:**

(i) Are these rates acceptable as-is, or should I refresh them against the SF
salary-ordinance amendments before we use them?

(ii) For the historical-actuals inflation in RPO (the only current use site), the modeling
column is the right shape — but FY28 has no MOU and the placeholder remains. Acceptable?

Full table + verbatim MOU quotations are now in `docs/domain/budget-process.md` §
"SF historical COLAs" (merged in PR #23).

### e) Suggested next-step prompt for Alex

Paste this when you're ready to write OVERM math:

````
We're continuing Phase 4 — OVERM_E (Overtime), now equipped with the workbook
extraction and the original 7-question list from Session 10's morning briefing.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (the morning-briefing section — note which questions I answered)
  docs/domain/special-class.md § OVERM_E (the workbook-extracted version, post-PR #23)
  docs/domain/budget-process.md § "SF historical COLAs"
  app/src/lib/special-class/rtpom.ts (the pattern to mirror)
  app/src/modules/special-class/SpecialClassView.tsx (the FY-card pattern to mirror)

My answers to the open questions (fill in inline before pasting):

  Q1 cushion magnitude:           _____
  Q3 chartfield allocation:       _____  (RPO labor-share pattern? historical OT per CF?)
  Q4 OT earnings codes & funds:   _____
  Q5 BN8/BN6 interpretation:      _____
  Q5 BN6 refresh source:          _____  (do we hardcode or pull from somewhere?)
  Gotcha #2 PP constants:         _____  (Calendar tab or frozen Budget Master values?)
  Gotcha #5 other DBI funds:      _____  (any OT outside fund 10190?)

COLA table acceptance:
  Use per-FY rates from PR #23 table?     _____  (yes / refresh first / keep 2.5% flat)
  FY28 fallback:                          _____  (2.5% placeholder / 2.0% from FY27 / other)

Once I have these answers, write the OVERM math in
`app/src/lib/special-class/overm.ts` mirroring rtpom.ts: pure functions, JSDoc
cites the workbook cell, full unit-test coverage in `overm.test.ts`. Then
extend `SpecialClassView.tsx` with an OVERM section matching RPO's shape.

One PR per logical chunk. No code without my answers above.

Recommended model: claude-opus-4-7. Effort: high.
````

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
