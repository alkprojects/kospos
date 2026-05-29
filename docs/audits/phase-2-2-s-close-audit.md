# Phase 2.2.s close audit — Session 43

**Date:** 2026-05-28
**Branch:** `feat/eligibility-positions-crosstabnav-and-promote` (squash-merged to main as [#142](https://github.com/alkprojects/kospos/pull/142)) + this docs PR.
**Scope:** Phase 2.2.s close audit. Alex's S43 pick (via AskUserQuestion) was **Option C — cross-tab nav Eligibility→Positions + promote Eligibility/Probation tabs**, the recommendation that had carried for four consecutive sessions (S40–S43), bumped each time by higher-priority work that is now all resolved. **1 feature PR** shipped (a deliberately tight, single-purpose change) plus this docs PR.

Last audit was the [Phase 2.2.r close audit](phase-2-2-r-close-audit.md) two sessions prior; S42 was a setup-only [Opus 4.8 capability review](internal-opus-4-8-setup-review.md) (out-of-band, no phase shipped → no close audit fired).

## Methodology

1. Read every file touched in [#142](https://github.com/alkprojects/kospos/pull/142) against the design pick (shared Zustand scope store vs URL routing) and the existing `useLaborScope` precedent it mirrors.
2. Re-run `npm test` — **839 / 839** (was 825 at S42 close; +14 from this session's three test files).
3. Re-check the carry-forward items from the [S42 handoff carry-forward audit](../SESSION_HANDOFF.md) (B, C, D, F, H, I; A/E/G/J retired/dropped); mark each `unchanged`, `improved`, `resolved`, or `stays-dropped`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — This session's PR

### Finding 1 — Cross-tab nav shipped via a shared Zustand scope store (the design pick)

**Status:** stable; the "top of session" design decision.

The S43 prompt framed the design as an explicit pick: a shared Zustand "active filter" slice **or** a URL hash route. The codebase made the call obvious — the app has **no router**, and the existing Positions→Payroll cross-tab nav already works via (a) a tiny dedicated scope store (`useLaborScope`) holding a position id, set by a button on Position Detail, plus (b) a parameterless `onViewPayroll` callback the App shell wires to `setTab('labor')`.

This session mirrored that pattern exactly:
- **`usePositionsScope`** (`lib/views/positions/scope-store.ts`) holds the scoped job code — a near-clone of `useLaborScope`, minus the unused `requestSeq` counter (verified unused via grep: it appears only in `scope-store.ts` itself, never read by App.tsx).
- **EligibilityView** gains an `onViewPositions` prop and a per-row **"Positions →"** pill that calls `setJobCode(rollup.jobCode)` then `onViewPositions?.()` — the precise shape of `setLaborScope(id) + onViewPayroll?.()`.
- **App.tsx** wires `onViewPositions={() => setTab('positions')}`.

**Trade-off (documented in the commit + ADR-less by design):** the filter isn't URL-bookmarkable. Accepted — KosPos is a single-snapshot local workspace; nothing else is URL-addressable, and URL routing would be net-new infrastructure entangled with the GitHub Pages `/kospos/` base path and the still-pending Cloudflare cutover. No ADR was added: this is a within-pattern extension of the already-decided cross-tab approach, not a new architectural direction.

**Disposition:** stable; pattern reused, not invented.

### Finding 2 — Eligibility + Probation promoted out of `devOnly` (the unlock resolves)

**Status:** **resolved** — closes the S34 carry-forward and recommendation #2 from the [Phase 2.2.r audit](phase-2-2-r-close-audit.md#recommendations-not-actioned).

The Eligibility tab carried a `devOnly` flag with an in-file comment: *"`devOnly` tab until cross-tab nav from Eligibility → Positions lands (Phase 2.2.k S34 carry-forward)."* With the nav landed, both Eligibility and Probation lost `devOnly` in `App.tsx`. Verified live: the non-dev nav now reads **Welcome · Job Class Calculator · Positions · Probation · Eligibility**, with the other dev tabs (Payroll, Hiring Plan, Separations, Inactive, Load Reports, Special Class) still correctly hidden. The dev-mode banner's "N extra tabs visible" count is computed (`ALL_TABS.filter(devOnly).length`), so it auto-decremented 8 → 6 with no extra edit.

This was the standing "Recommended Option C" across S40–S43; it is now done. No other tab is promoted (per the explicit "What we are NOT doing" guardrail — wait until cross-tab nav is exercised on real data, which Option C now enables for Eligibility + Probation specifically).

**Disposition:** resolved; carry-forward retired.

### Finding 3 — Agent-first visual verification: first feature-PR use of the S42 protocol

**Status:** stable; new technique worth reusing.

S42 documented the agent-first visual-verification protocol (preview tools; Claude verifies first, Alex does final aesthetic sign-off). S43 is the first **feature** PR to exercise it end-to-end. The notable wrinkle: the feature needs data in two independent stores (the in-memory `useScrapers` for Eligibility + `useAppStore` for P&P), and neither is exposed on `window` (only the dev hook's `useAppStore` is).

**Technique:** because the dev server is Vite, `preview_eval` can `import('/kospos/src/lib/.../store.ts')` to get the **same module-singleton store instances** the app uses, then call `.getState().setX(...)` to seed them live — no code change, no network, no `window` plumbing. Used to seed 2 eligibility rollups + 2 P&P positions sharing job codes, then drive the real pill click. Verified: devOnly lift, pill rendering (no overlap with the `›` chevron), end-to-end nav + scope banner + filtered list (Shown 1 of 2), Clear-filter restore, scope persistence across tab switches, zero console errors.

**Lesson learned:** for store-driven features, the Vite dynamic-`import()` seeding trick is the clean way to stage real UI state in the preview without exposing stores on `window` or adding test-only hooks. Worth remembering for future view sub-phases.

**Disposition:** stable; technique noted here for reuse.

### Finding 4 — Test discipline: 825 → 839 (+14), build clean

**Status:** stable.

Three test files, all mirroring existing patterns:
- `scope-store.test.ts` (+5) — set / replace / clear / `setJobCode(null)`.
- `positions-view.test.tsx` (+5) — filters to scope, banner shows the resolved class title, case/whitespace normalization (`  q002  ` matches `Q002`), Clear restores the full list, job-code-aware empty state.
- `eligibility-view.test.tsx` (+4) — pill renders when `onViewPositions` provided / hidden when omitted, click sets scope + fires the callback, no detail modal opens (stopPropagation).

`npm run build` (`tsc -b && vite build`) clean on first invocation — no TypeScript errors. The pre-existing chunk-size warning (pdf worker + index bundle) is unchanged, not introduced here. Practical clean-first-build streak continues.

**Disposition:** stable; +14 net.

### Finding 5 — One docs PR consolidating session-end docs work

**Status:** stable; reaffirmed convention.

Per project convention (Finding 11 of the 2.2.r audit), all session-end docs ship as ONE docs PR rather than threaded through the feature PR. This audit + the S43 SESSION_LOG entry + the S44 SESSION_HANDOFF are that PR. The feature PR [#142](https://github.com/alkprojects/kospos/pull/142) stayed tightly scoped to the code change.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items

From the [S42 handoff carry-forward audit](../SESSION_HANDOFF.md) (letters match that table):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim/summarize SESSION_LOG.md | ~3,860 ln after S42 | **~3,990 ln after S43 (est.)** | deferred-with-reason (P6); unchanged |
| C | Memory-citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (file untouched) | unchanged; bundleable with a future labor-report pass |
| D | `labor-report.md` split | 8,518 ln | 8,518 ln (untouched) | deferred-with-reason (P6); unchanged |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Audit cadence | 18th trigger (S41) | **19th event-based trigger this session** | working as designed |
| G | ~~Cloudflare deploy verification~~ | resolved S41 | n/a | **stays retired** |
| H | Lift modal overlay-frame → `lib/ui/Modal.tsx` | carries 4+ sessions | unchanged (not bundled into #142 per guardrail) | still queued |
| I | Cloudflare hardening SEC-2 (gzip-bomb size cap) + SEC-3 (POST rate-limit) | documented S42 | unchanged | tracked for named-workspace v2 |
| J | ~~launch.json dev-port collision~~ | resolved S42 (#139) | n/a | **stays retired** |
| — | **Cross-tab nav Eligibility→Positions** (was the standing "Recommended Option C" S40–S43; rec #2 in the 2.2.r audit) | open, carried 4 sessions | **shipped this session (#142)** | **resolved** |

### Notes
- **B / D** remain deferred-*with-reason* per the [S42 Opus 4.8 review](internal-opus-4-8-setup-review.md) P6 finding: both are human-skim-only, 1M context lowers the split's value, and summarizing the log would thin the per-prompt record Alex reviews. Not re-litigated this session.
- **H** was explicitly *not* bundled into #142 (the "What we are NOT doing" guardrail forbids lifting the modal overlay-frame in the same PR). Still a clean standalone refactor when Alex wants it.
- The audit-cadence guardrail held: S42 (setup-only) correctly fired **no** close audit; this session shipped a sub-phase, so the close audit fires here.

---

## Part 3 — New drift scan

### Memory files
- **10 memory files indexed in MEMORY.md** — unchanged. All `[[link]]`s resolve. ✓
- Most-relevant this session: `feedback_session_end.md` (this docs PR honors it), `session_logging.md` (S43 entry added), `user_role.md` (Alex guided through the design pick with a recommendation, then act — honored via the concise decision statement before implementing). No memory writes needed — nothing non-obvious surfaced that the repo doesn't already record.

### Tooling / hooks / settings
- **No new dependencies.** The feature is pure React + Zustand, both already in the stack.
- **`settings.local.json` / hooks** unchanged. The Stop hook (PR #51) fires as designed; this handoff lands with a next-session prompt block.
- **No new directories.** One new file (`scope-store.ts`) + two new test files, all under the existing `lib/views/positions/`.

### Anchor compliance
- No `labor-report.md` heading-level edits. Anchor verifier rerun skipped per precedent.

### Tool sprawl
- **3 source files edited** (`App.tsx`, `EligibilityView.tsx`, `PositionsView.tsx`) + **1 barrel** (`positions/index.ts`) + **1 new store** + **3 test files** (1 edited, 2 new). Tight, single-purpose. No churn outside the cross-tab nav surface.

### Doc-vs-implementation
- **`EligibilityView.tsx` header comment** updated in-PR: the stale *"devOnly tab until cross-tab nav lands"* note now describes the landed `onViewPositions` affordance + the promotion. No doc-vs-impl gap remains for that file.
- **`labor-report.md` sub-phase enumeration** needs no edit: cross-tab nav promotes existing ✅-shipped views (Eligibility 2.2.28, Probation 2.2.25) from `devOnly` to non-dev — an App-visibility change the sub-phase status legend doesn't track.
- **`docs/DECISIONS.md`** — no ADR added (within-pattern extension, see Finding 1).

### New drift items
- None. The change is small and self-contained; no new patterns, deps, or directories to track.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | Architecture | Cross-tab nav via shared Zustand scope store (mirrors `useLaborScope`); no router, no URL routing | stable (within-pattern; no ADR) |
| 2 | UX / visibility | Eligibility + Probation promoted out of `devOnly` | **resolved** (S34 carry-forward + 2.2.r rec #2) |
| 3 | Verification | Agent-first preview verification; Vite dynamic-`import()` store-seeding technique | stable (new technique noted) |
| 4 | Tests | 839/839 (+14 across 3 files) | stable |
| 5 | Build | `npm run build` clean first-run | stable |
| 6 | Workflow | One docs PR consolidating session-end docs | stable (reaffirmed) |
| 7 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 8 | Carry-forward B | SESSION_LOG ~3,990 ln (est.) — deferred-with-reason (P6) | tracking |
| 9 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 10 | Carry-forward D | labor-report.md 8,518 ln — deferred-with-reason (P6) | unchanged |
| 11 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 12 | Carry-forward F | Audit cadence — 19th event-based trigger on schedule | working as designed |
| 13 | Carry-forward G | Cloudflare deploy verification (resolved S41) | stays retired |
| 14 | Carry-forward H | Modal overlay-frame lift — not bundled per guardrail | still queued |
| 15 | Carry-forward I | Cloudflare SEC-2 + SEC-3 — tracked for named-workspace v2 | tracking |
| 16 | Carry-forward J | launch.json port (resolved S42) | stays retired |
| 17 | Carry-forward — cross-tab nav | Shipped this session (#142) | **resolved** |
| 18 | New drift — memory | 10 files indexed; links resolve; no writes needed | stable |
| 19 | New drift — hooks/deps | No new deps/dirs/settings | stable |
| 20 | New drift — anchors | No heading edits this phase | stable |
| 21 | New drift — doc-vs-impl | EligibilityView header comment refreshed; no gaps | resolved (this PR) |

**Totals:** 2 carry-forwards resolved this session (cross-tab nav + the EligibilityView header doc gap) · 1 working-as-designed (F) · B/C/D/H/I unchanged/tracking · A/E/G/J stays-retired/dropped · 5 stable findings · 0 follow-up PRs beyond the existing tracking items · 1 docs PR (this one).

---

## Recommendations not actioned

In priority order (the next-phase candidate menu lives in the S44 handoff):

1. **Phase 2.2.t pick** — the next sub-phase. Top remaining candidates from the dependency graph: **2.2.19 temp-limits** (prep done, low-risk), **2.2.22 vacancies**, **2.2.18 reporting-tree** (scope risk: `lib/changes/` lifts alongside), or the **GitHub Pages → Cloudflare cutover** (Step 10 of the runbook). Alex's freeform feedback has also driven the highest-value recent scope.
2. **Lift modal overlay-frame → `lib/ui/Modal.tsx`** (item H, carries 5+ sessions) — now 6+ instances of the same fixed-overlay-no-Portal pattern (Positions, Labor, Eligibility, Probation, Separations, PlannedAction). Clean standalone refactor; ~1-2 hours.
3. **Now that cross-tab nav exists, consider exercising it on real data** before promoting further tabs (Payroll / Hiring Plan / etc.) to non-dev — the guardrail's stated gate.
4. **SESSION_LOG.md trim / labor-report.md split** (items B, D) — both deferred-with-reason (P6); only revisit if Alex asks.
5. **Migrate the citation anti-pattern** (item C) — 12 instances; ~20 minutes; bundleable with any future labor-report pass.
6. **Cloudflare SEC-2 (read-path gzip-bomb size cap) + SEC-3 (POST rate-limit)** (item I) — tracked for the named-workspace v2.
7. **Local-branch cleanup** (low priority) — stale `feat/*` / `fix/*` / `docs/*` / `claude/*` branches; a 5-minute pass whenever Alex wants. (The merged `feat/eligibility-positions-crosstabnav-and-promote` remote branch was deleted this session.)

None block the next session's work.

---

## Cross-references

- Previous close audit: [phase-2-2-r-close-audit.md](phase-2-2-r-close-audit.md) (Session 41).
- Intervening setup review: [internal-opus-4-8-setup-review.md](internal-opus-4-8-setup-review.md) (Session 42, out-of-band).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.s implementation: [PR #142](https://github.com/alkprojects/kospos/pull/142).
- Cross-tab nav precedent: `app/src/lib/views/labor/scope-store.ts` (`useLaborScope`).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2 sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
