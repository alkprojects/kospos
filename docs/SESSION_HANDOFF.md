# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 11 + post-merge cleanup, 2026-05-24)

**Phase:** 4 — IN PROGRESS. RPO complete; OVERM math + UI merged and deployed.
**Last main commit:** `5167a64` (PR #28 — Session 11 handoff)
**Tests:** 146/146 passing (96 prior + 50 new OVERM)
**Branches in flight:** none — all 4 PRs from Session 11 merged.

**PRs merged this session (in order):**
- [PR #25](https://github.com/alkprojects/kospos/pull/25) — doc fix to PR #23 (BN8/BN6 reading)
- [PR #26](https://github.com/alkprojects/kospos/pull/26) — OVERM math + 50 unit tests
- [PR #27](https://github.com/alkprojects/kospos/pull/27) — OVERM UI section + chartfield allocator
- [PR #28](https://github.com/alkprojects/kospos/pull/28) — Session 11 handoff/log

**Repo cleanup performed:**
- 25 stale remote branches deleted (remote now only has `main`).
- 9 merged local branches deleted.
- 10 stale worktree directories removed from disk.
- 2 orphaned vite processes killed (ports 5173/5174 freed).
- Main worktree fast-forwarded.

## Blockers for Alex

None landing-related. Live page: https://alkprojects.github.io/kospos/ — please spot-check the OVERM section when convenient:
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

## Next session prompt — AUTONOMOUS WHILE ALEX IS AWAY (2.5 hours)

Alex will be away for ~2.5 hours. Use that time productively: research first (no walkthrough required), then queue findings for review on return. Hard rule: do NOT start the PREMM math arc autonomously — that requires Alex's walkthrough answers, same as OVERM. Anything that touches `app/src/` (other than tests / read-only inspection) needs his interactive confirmation.

Paste this verbatim to start the next session:

````
We're between special-class arcs. Alex is away for ~2.5 hours and wants
this session to be largely autonomous research.

============================================================================
OPERATING MODE: AUTONOMOUS (Alex away ~2.5h)
Don't wait on questions you'd normally ask. Make reasonable calls. Save
genuinely-blocking decisions for the morning briefing.
============================================================================

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file)
  docs/SESSION_LOG.md (Session 11 entry — OVERM full arc, the pattern)
  docs/GLOSSARY.md
  docs/domain/positions.md
  docs/domain/special-class.md (current state of all 8 classes)
  docs/data-sources/dhr.md  (or whatever exists)
  docs/data-sources/con.md  (or whatever exists)

Verify state on main:
  git log --oneline origin/main -5
should show PR #28 (Session 11 handoff) at the top, plus PRs #27/#26/#25.

----------------------------------------------------------------------------
PRIMARY TASK — SF position-management deep research
----------------------------------------------------------------------------

Goal: assemble a structured reference that KosPos can lean on when the next
phases (separation plans, hiring plans, audience-aware org chart) need to
encode SF-specific rules. Today the docs cover what Alex's workbooks say;
they don't yet cover what the *authoritative sources* say. Close that gap.

Sources to mine (in rough priority):

1. SF Department of Human Resources (sfdhr.org)
   - Civil Service Rules — full text. Especially rule sections covering
     appointment types, vacancy procedures, layoff/RIF, examination,
     probation, transfer, eligibility lists.
   - Job class specs and the citywide classification system.
   - MOU index — every active MOU PDF. Pull the COLA schedule, premium
     pay codes, OT rules, leave/payout entitlements for each.
   - Salary Ordinance amendments — schedule of pay changes per FY.

2. SF Controller's Office (sfcontroller.org)
   - Budget Book references for FY26 → FY28 (Mayor's, Board-adopted).
   - Payroll system documentation (PeopleSoft HCM, OBI, BFM).
   - Citywide policies on labor budgeting, attrition, special-class
     accounting.

3. Civil Service Commission (sf.gov/civilservice or equivalent)
   - Adopted rules, interpretive memos, recent decisions affecting
     appointment / vacancy / discipline.

4. SF Administrative Code + Charter
   - Especially sections on exempt appointment types (16, 17, c2, etc.),
     the difference between PCS / PEX / TEX / TPV, position authority,
     salary-step rules, and the budget cycle.
   - The "exempt employee" enumeration is the highest-priority bit —
     SFDBI doesn't have all exempt types but other departments do; KosPos
     needs a clean taxonomy.

5. Mayor's Budget Office (sf.gov/mayor-budget or equivalent)
   - Budget instructions to departments — what they have to submit,
     the position-eturn workflow, the salary-ordinance integration.

Deliverable — ONE docs PR that creates or extends:

  docs/domain/authorities.md (NEW)
    A reference for who controls what: DHR for classification, CSC for
    rules, Controller for accounting, Mayor for budget framework, BOS
    for final adoption. Each authority gets: scope, key documents
    (with URLs), update cadence, KosPos implications.

  docs/domain/appointment-types.md (NEW)
    Definitive enumeration of exempt and non-exempt appointment types
    with code, name, statutory source, typical use, salary-step
    treatment, examination requirement, layoff rights. Sourced verbatim
    from Civil Service Rules and the Administrative Code with citations.

  docs/domain/positions.md (EXTEND)
    Add a section "External authoritative rules" linking out to
    authorities.md and appointment-types.md. Reconcile any conflicts
    with the existing position model.

  docs/domain/special-class.md (EXTEND, modestly)
    Add citations from MOUs for any special-class behavior already
    documented (RPO eligibility from MOU; OT from MOU; etc.).

  docs/data-sources/ (EXTEND or CREATE per-source files)
    For each major source above (sfdhr.org, sfcontroller.org, civil
    service, admin code, mayor's budget), one file describing:
      - URL
      - What it's authoritative for
      - Update cadence
      - How it should feed KosPos (which docs/* files it informs)

  docs/domain/budget-process.md (EXTEND if relevant)
    Cross-reference the authoritative sources for the budget cycle
    we already document; add any rules KosPos isn't currently aware of.

Rules for research output:

  - Cite every claim. If you can't find a primary source, mark it
    "[needs verification]" and move on.
  - Quote sparingly (per the copyright-respect rules; <15 words per
    quote; single quote per response). For lists of codes/types,
    enumerate but rephrase in our own structure.
  - Where the existing KosPos docs conflict with a primary source,
    flag the conflict but DO NOT edit the existing claim — Alex needs
    to reconcile. Open a section "Conflicts to reconcile" at the
    bottom of each affected doc.
  - Cap at 4 parallel web research agents at once. Each agent should
    own a coherent scope (one site or one topic, not "everything").

Workflow:

  1. Read existing docs/* to baseline what KosPos already knows.
  2. Spawn 3-4 parallel general-purpose web research agents:
       Agent A: SFDHR (Civil Service Rules + MOU index + Salary Ord).
       Agent B: Controller's Office + PeopleSoft/OBI/BFM documentation.
       Agent C: Civil Service Commission rules + recent decisions.
       Agent D: SF Admin Code + Charter on exempt appointment types
                + Mayor's Budget Office instructions.
     Each agent reports in under 1500 words with citations.
  3. While agents work: outline `authorities.md` and `appointment-types.md`
     structure (no content yet).
  4. When agents return: synthesize into the new/extended docs.
  5. Open ONE docs PR: `docs/sf-authoritative-reference`.
     CI must be green. Do NOT merge — Alex reviews on return.

----------------------------------------------------------------------------
SECONDARY TASKS (only if time + context remain)
----------------------------------------------------------------------------

If primary task is fully shipped and you still have budget:

  - Audit `docs/GLOSSARY.md` against everything you found. Add missing
    terms, correct definitions, link to the new authoritative refs.
  - Spot-check the 8-year DBI RPO historical actuals in
    `SpecialClassView.tsx` against any Controller-published RPO data
    you find. If the numbers disagree, flag in the morning briefing
    — do NOT change the constants.
  - PREMM workbook extraction (Agent E pattern from Session 10): open
    a separate `docs/premm-extraction` PR with the verbatim cells, do
    NOT merge. This shortens the next interactive session.

What you absolutely MUST NOT do:

  - Write any new math (`premm.ts`, `stepm.ts`, etc.) — those need
    Alex's interactive walkthrough.
  - Modify `app/src/`, except possibly adding a test if you discover
    a missing-test gap in `overm.test.ts` or `rtpom.test.ts` (and
    only if the new test passes and changes nothing else).
  - Merge any PR. Docs research lands as one PR, open for review.
  - Touch `.claude/` settings.
  - Burn the whole 2.5 hours on web fetches — cap each agent at ~25
    min wall clock; if it isn't producing, move on.

----------------------------------------------------------------------------
MORNING BRIEFING (on Alex's return)
----------------------------------------------------------------------------

Append to `SESSION_HANDOFF.md` a section:

  ## Briefing — pending Alex review (Session 12)

with:
  a) What landed (which PR, what's open).
  b) Top 5 findings that change KosPos's understanding of SF rules.
  c) Conflicts between primary sources and the existing docs.
  d) Decisions Alex needs to make next session (with options).
  e) A suggested follow-on prompt for the next interactive session.

Then stop cleanly. Don't ping Alex.

Hard constraints (unchanged):
  - Branch from main, single-purpose names.
  - No new npm packages.
  - Pure inline CSS (n/a this session — docs only).
  - npm test stays green.
  - One PR per logical chunk.
  - Copyright: cite + paraphrase, never reproduce long passages.

Recommended model: claude-opus-4-7. Effort: high (research + synthesis).
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
