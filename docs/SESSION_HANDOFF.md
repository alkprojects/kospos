# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status

**Phase:** 2 — COMPLETE ✓  
**Branch:** `claude/nostalgic-zhukovsky-e400e0`  
**Tests:** 33/33 passing  
**Last commit:** `6947b78` — Phase 2: Report importers, quality scaffold, file picker, Data Issues panel

### What was built
- `app/src/lib/importers/` — four pure importers (BFM position, BFM non-position, PS HCM P&P, OBI Payroll) + `detect()` auto-detection
- `app/src/lib/quality/` — QualityRule interface + 5 starter rules (QR-001 through QR-005)
- `app/src/lib/changes/` — ProposedChange type + Zustand stub store
- `app/src/lib/store.ts` — global Zustand store (loadedRows + computed issues)
- `app/src/modules/importer/` — FilePicker + ImporterView with drag-and-drop
- `app/src/modules/issues/` — DataIssuesPanel (collapsible, severity-badged)
- `App.tsx` updated with two-tab nav + issue-count badge

### Open items before Phase 3
1. **Merge this branch to main** — PR needs to be created and merged
2. **xlsx CDN swap** — still on npm `xlsx@0.18.5` with audit warnings (ADR-002-update). Run `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` in `app/` when ready.
3. **Column name verification** — ADR-004 through ADR-007 are marked Provisional. Alex needs to compare importer fingerprints against real BFM/HCM/OBI exports and update `detect.ts` + importer files if column names differ.
4. **Importer module directory** — a stray file was created at `.claire/worktrees/.../app/src/lib/changes/types.ts` (typo during session). Check if it exists and delete it: `rm -rf "C:\Users\ALK\Desktop\Claude Projects\kospos\.claire"`.

## Blockers for Alex

1. **Merge Phase 2 branch to main** before starting Phase 3. Create a PR for `claude/nostalgic-zhukovsky-e400e0` → `main` and merge it.
2. Confirm or correct the column names in the four importers against real reports.

## Next session prompt

Paste this verbatim to start Phase 3:

---

We're starting Phase 3 — Chartfield model + position-to-actuals linkage.

Read these files first:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md
  docs/ROADMAP.md (Phase 3 section)
  docs/domain/chartfields.md
  docs/DECISIONS.md

Current state:
- Phase 2 is merged to main (verify with `git log --oneline -5` on main before branching).
- app/src/lib/importers/, app/src/lib/quality/, app/src/lib/changes/ all exist.
- app/src/lib/store.ts has the global Zustand store with loadedRows + issues.
- Stack: Vite + React + TypeScript. Zustand for state. No Tailwind/MUI — pure CSS.

## What to build (Phase 3)

Per ROADMAP.md Phase 3:
- Chartfield reference tree (Fund / Dept / Project / Activity / Authority / Account).
- Combo code and task profile lookup tables.
- For each position: show the default chartfield string and any overrides.
- Appropriation control logic (account / project / authority levels).

Constraints:
- No new npm packages beyond what's in app/package.json.
- Pure CSS / inline styles only.
- Unit tests for any lookup/derivation logic.
- npm test must stay green.
- Branch from main, single-purpose name.

Do not start Phase 4 (Special Class calculations).

---

## Recommended model

`claude-sonnet-4-6` — Phase 3 is structured data modeling, no heavy reasoning needed.
