# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status

**Phase:** fix/importer-column-names — COMPLETE ✓ (merged to main as PR #7)  
**Branch:** `main` (ready for Phase 3 branch)  
**Tests:** 37/37 passing  
**Last merged commit:** `b9f5f12` — fix: rewrite importers with verified column names from real DBI exports (#7)

### What was built / fixed (sessions 2–3)
- `app/src/lib/importers/` — four pure importers + `detect()` auto-detection
  - `bfm-position.ts` — reads `BY HCM Position#`, `Job Class`, `Dept ID Title`, `Ret Indicator`, `Emp Org`; dynamically selects best FTE/salary column by phase priority (Board > Mayor > Committee > Department > Base, latest FY)
  - `bfm-non-position.ts` — reads `GFS Type`, `Account`, `Account Lvl 5 Title`; same dynamic phase logic for budget amount
  - `ps-hcm-pp.ts` — reads `Position Job Code`, `Position Fill Status`, `Roster Code`, `Employee Hourly Rate`, `Budget Position Total FTE`, `Combo Code`, `Employee Job Code`
  - `obi-payroll.ts` — per-period rows (`Balance Amount`, `Position Identifier`, `Person Number`, `Earnings Code`, `Pay Period FTE`)
- `FilePicker.tsx` — scans ALL sheets in an XLSX workbook (fixes Eturns files with Pos + Nonpos sheets)
- `app/src/lib/quality/` — QualityRule interface + 5 starter rules (QR-001 through QR-005)
  - QR-003 sums per-period balance amounts by positionIdentifier
  - QR-005 uses `fillStatus === 'FILLED'` instead of legacy emplId check
- `app/src/lib/changes/` — ProposedChange type + Zustand stub store
- `app/src/lib/store.ts` — global Zustand store (loadedRows + computed issues)
- `app/src/modules/importer/` — FilePicker + ImporterView with drag-and-drop, accepts .xlsx/.xlsm/.csv
- `app/src/modules/issues/` — DataIssuesPanel (collapsible, severity-badged)
- `App.tsx` — two-tab nav with issue-count badge

### Open items (non-blocking for Phase 3)
1. **xlsx CDN swap** — still on npm `xlsx@0.18.5` with audit warnings (ADR-002-update). Run `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` in `app/` when ready.
2. **ADR-004 through ADR-007** — mark as Confirmed (no longer Provisional) in `docs/DECISIONS.md`.
3. **OBI payroll department column** — mapped from `Department` / `Department Description`. If real export uses different names, update `obi-payroll.ts` col lookups.

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
- PR #7 (fix/importer-column-names) is merged to main. Verify: `git log --oneline origin/main -5` should show `b9f5f12`.
- All four importers use real DBI column names (verified May 2026).
- app/src/lib/importers/, app/src/lib/quality/, app/src/lib/changes/ all exist.
- app/src/lib/store.ts has the global Zustand store with loadedRows + computed issues.
- Stack: Vite + React + TypeScript. Zustand v5. No Tailwind/MUI — pure inline CSS.
- 37/37 tests passing.

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
