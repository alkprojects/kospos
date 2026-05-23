# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status

**Phase:** 3 — COMPLETE ✓ (PR #9 open, awaiting merge)
**Branch:** `feat/chartfield-model`
**Tests:** 54/54 passing
**Last commit:** `61e4727` — feat: Phase 3 — chartfield model + Positions view

### What was built

- `app/src/lib/chartfields/types.ts` — `ChartfieldString`, `ComboCode`, `TaskProfile`, `AppropriationLevel`, `ResolvedChartfields`
- `app/src/lib/chartfields/resolve.ts` — `resolvePositionChartfields()` joins BFM Position + HCM P&P + OBI rows by position number; detects combo code overrides; sums YTD actuals
- `app/src/lib/chartfields/approp.ts` — `categorizeAccount()` maps account codes to appropriation control level (labor / account / project / authority / none)
- `app/src/lib/chartfields/chartfields.test.ts` — 17 new unit tests (54 total)
- `app/src/modules/positions/PositionsView.tsx` — searchable/filterable positions table with posting string, fill status badges, combo override flag, YTD actuals, and click-to-expand detail panel
- `app/src/App.tsx` — added Positions tab (3 tabs total)

### Open items / Phase 3.5 stubs

1. **Combo code expansion** — The override is detected and the combo code string is surfaced, but resolving it to Fund/Dept/Authority requires a Combo Codes reference file import. Types (`ComboCode`) are defined; add an importer + pass it into `resolvePositionChartfields()`.
2. **Appropriation control UI** — `categorizeAccount()` is tested but not yet shown in the UI. Phase 4/5 will use it for budget availability visualization.
3. **ADR-004 through ADR-007** — still marked Provisional; Alex should confirm column names and mark Confirmed.
4. **xlsx CDN swap** — still on npm `xlsx@0.18.5` (audit warnings). Run `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` in `app/` when ready.

## Blockers for Alex

1. **Merge PR #9** (`feat/chartfield-model` → `main`) before starting Phase 4.
2. **Preview caveat** — the `preview_start` tool serves the main project's `app/` dir, not the worktree. To see Phase 3 UI in the browser before the PR merges, run `npm run dev` directly in the worktree: `cd "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\great-mahavira-a88068\app" && npm run dev`

## Next session prompt

Paste this verbatim to start Phase 4:

---

We're starting Phase 4 — Special Class calculations.

Read these files first:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md
  docs/ROADMAP.md (Phase 4 section)
  docs/domain/special-class.md
  docs/DECISIONS.md

Current state:
- PR #9 (feat/chartfield-model) is merged to main. Verify: `git log --oneline origin/main -5` should show the Phase 3 commit.
- app/src/lib/chartfields/ exists with types, resolve, and approp modules.
- app/src/modules/positions/PositionsView.tsx exists (Positions tab).
- Stack: Vite + React + TypeScript. Zustand v5. No Tailwind/MUI — pure inline CSS.
- 54/54 tests passing.

What to build (Phase 4) per ROADMAP.md:
- Implement the special-class math from the Special Class tab in Alex's spreadsheet.
- Special class codes: 9993M_C (Attrition Savings), 9994M_C (MCCP Offset), 9995M_E (Positions Not Detailed), OVERM_E (Overtime), PREMM_E (Premium Pay), RTPOM_E (Retirement Payout), STEPM_C (Step Adjustments), TEMPM_E (Temporary).
- Done when: outputs match Alex's spreadsheet for DBI FY27-28 to the dollar.

Constraints:
- No new npm packages beyond what's in app/package.json.
- Pure CSS / inline styles only.
- Unit tests for any calculation logic.
- npm test must stay green.
- Branch from main, single-purpose name.

Do not start Phase 5 (Projections engine).

---

## Recommended model

`claude-opus-4-7` — Phase 4 involves replicating exact spreadsheet math with dollar-level precision; heavier reasoning is warranted.
