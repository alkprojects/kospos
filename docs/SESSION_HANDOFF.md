# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status

**Phase:** 3 — COMPLETE ✓ (PR #9 merged); audit follow-up PR #10 open
**Branch (audit fixes):** `claude/infallible-rosalind-bb56e2` → PR [#10](https://github.com/alkprojects/kospos/pull/10)
**Tests:** 65/65 passing (was 54; +11 covering OBI orphans, key normalization, numeric sort, edge cases)
**Last main commit:** `ee09f36` — feat: Phase 3 — chartfield model + Positions view (#9)

### Audit + follow-up summary (this session)

Ran a hiring-screen-style audit of Phase 3 work. Found one real bug (speculative
appropriation-control branches in `categorizeAccount`), one data-loss edge case
(OBI-only positions silently dropped from `resolvePositionChartfields`), and
several smaller items. All fixed in PR #10:

- **A1** — Removed speculative `^4 → authority` and `^p\d → project` branches in `approp.ts`; non-labor accounts default to `'account'` until the appropriation-control reference table is loaded.
- **A2** — Included OBI keys in the join union; `dataSources` uses `obiActuals.has(key)` so zero-net reversals still flag OBI.
- **A3** — Added `normalizePositionKey()` (trim + strip leading zeros); display form preserves the original padded string; sort is numeric-aware.
- **B1** — Negative YTD actuals now render as dollar amounts (was `'—'`).
- **B2** — FTE rendered with `toFixed(2)` in detail modal.
- **D3** — `resolve.ts` JSDoc updated to document dept fallback + OBI orphan behavior.

**Deferred (roadmap items, not blockers for Phase 4):**
- Modal a11y (ESC handler, focus trap)
- Table virtualization (matters at citywide scale, not DBI ~300)
- Component extraction in `PositionsView.tsx` (360 lines, three components inline)
- Combo code expansion (still needs the reference-file importer — Phase 3.5)

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

1. **Merge PR #10** (audit follow-ups → `main`) before starting Phase 4. Optionally run `/ultrareview` on PR #10 first — the must-fix items A1/A2/A3 are already addressed, so `/ultrareview` will exercise the corrected code.
2. **Preview caveat** — the `preview_start` tool serves the main project's `app/` dir, not the worktree. To see Phase 3 UI in the browser before the PR merges, run `npm run dev` directly in the worktree: `cd "<worktree path>/app" && npm run dev`. Note: requires `npm install` in the worktree first (worktrees don't share `node_modules`).

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
- PR #9 (feat/chartfield-model) is merged to main. PR #10 (audit follow-ups) is merged to main. Verify: `git log --oneline origin/main -5` should show both.
- app/src/lib/chartfields/ exists with types, resolve, and approp modules. `resolve.ts` exports `normalizePositionKey`; OBI-only positions surface in results.
- `categorizeAccount` returns 'labor' | 'account' | 'none' in practice — project/authority will become real once the appropriation-control reference table is loaded (a Phase 5 dependency, not Phase 4).
- app/src/modules/positions/PositionsView.tsx exists (Positions tab).
- Stack: Vite + React + TypeScript. Zustand v5. No Tailwind/MUI — pure inline CSS.
- 65/65 tests passing.

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
