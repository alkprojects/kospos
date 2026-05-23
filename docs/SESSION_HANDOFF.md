# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status

**Phase:** 2 — Report importers + data quality scaffolding  
**Branch:** `claude/nostalgic-zhukovsky-e400e0` (pre-created worktree, based on main post Phase-1 merge)  
**Phase 1 merge:** Complete (PR #4 merged to main 2026-05-23)  
**Phase 2 work started:** No — this session was used to set up session handoff tooling

## Blockers for Alex

None currently. Phase 1 is merged. Phase 2 branch is ready.

## Next session prompt

Paste this verbatim to start Phase 2:

---

We're resuming Phase 2 — Report importers + data quality scaffolding.

Read these files first:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md
  docs/ROADMAP.md (Phase 2 section)
  docs/data-sources/bfm.md
  docs/data-sources/ps-hcm.md
  docs/data-sources/obi.md
  docs/DECISIONS.md

Current state:
- Phase 1 is merged to main (PR #4).
- Working branch: `claude/nostalgic-zhukovsky-e400e0`. Rebase it onto main before starting.
- app/src/lib/cost.ts, app/src/data/*.json, and app/src/modules/calculator/CalculatorView.tsx exist from Phase 1.
- Stack: Vite + React + TypeScript. xlsx (SheetJS) is in package.json. ADR-002 says to switch to the CDN version of xlsx now that we're actually parsing — do that first.

## What to build (Phase 2)

### 1. Switch xlsx to CDN install (ADR-002)
  npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
  Then re-run npm audit and add an ADR-002 update to docs/DECISIONS.md.

### 2. File picker with auto-detection
A file upload component that accepts .xlsx/.xlsm files and sniffs the column
headers to identify which report type it is. Each report type has a known
set of required column names — use those as fingerprints.

### 3. Importers — one module each
Build importers for these report types (reference the data-sources/ docs
for column names and shapes):
  - BFM eturns — Position rows (the main labor budget export)
  - BFM eturns — Non-position rows
  - PS HCM P&P Data (Position & Personnel)
  - OBI BI Payroll

Each importer = a pure function: (worksheet) → typed records[]. No DOM, no
side effects. Add an ADR entry in docs/DECISIONS.md for each one.

### 4. lib/quality/ scaffold
  - Define the QualityRule interface: { id, description, check(records) → Issue[] }
  - Implement 3–5 starter rules (e.g., position in budget but not in HCM,
    salary in payroll exceeds DHR step-max, vacant position with no RTF date)

### 5. lib/changes/ scaffold
  - Define the ProposedChange interface: { field, from, to, positionNumber, source }
  - No UI needed yet — just the type and a stub store

### 6. Global Data Issues panel
A collapsible panel accessible from the app header that lists all active
quality issues across loaded data.

## Constraints
- No new npm packages beyond what's already in app/package.json (xlsx CDN swap is allowed per ADR-002).
- Pure CSS / inline styles only — no Tailwind/MUI.
- Each importer must have at least one unit test with a synthetic example row.
- npm test must stay green.

## Done when
- The file picker loads a BFM eturns .xlsx and auto-identifies it.
- At least one quality rule fires on synthetic data in a test.
- npm test green.
- No console errors in the browser.
- Committed on this branch.

Do not start Phase 3 (chartfield model).

---

## Recommended model

`claude-sonnet-4-6` — sufficient for this structured implementation work.  
Use `claude-opus-4-7` if you hit a complex design decision (e.g., how to handle ambiguous BFM column schemas).

## Notes for next session

- The BFM and PS HCM data-source docs (docs/data-sources/bfm.md, ps-hcm.md) have open uncertainties about exact column names — Alex will need to confirm these against a real export. Build the importers against the best-documented column set and note any assumptions in the ADR.
- ADR-002 requires the xlsx CDN swap on first parse usage — do this before writing any importer code.
