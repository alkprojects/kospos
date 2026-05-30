# Phase 2.2.e close audit — Session 28

**Date:** 2026-05-26
**Branch:** `chore/phase-2-2-e-close-audit-and-handoff`
**Scope:** Phase 2.2.e close audit. Fires at the close of Phase 2.2.e per
[WORKFLOW.md § Audit cadence](../WORKFLOW.md). Phase 2.2.e shipped Option A
(`lib/staffing-plan/`) as two PRs per the prompt's 2-PR-split scope —
[PR #79](https://github.com/alkprojects/kospos/pull/79) (entity layer) +
[PR #80](https://github.com/alkprojects/kospos/pull/80) (Hiring Plan
workspace surface). A small UI-fix PR ([PR #78](https://github.com/alkprojects/kospos/pull/78)
— Labor → Payroll rename + always-show "View payroll →" button) landed
at the start of the session in response to two live-site issues Alex
flagged.

Last audit was the [Phase 2.2.d close audit](phase-2-2-d-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in Phase 2.2.e's three PRs ([PR #78](https://github.com/alkprojects/kospos/pull/78)
   — 2 files; [PR #79](https://github.com/alkprojects/kospos/pull/79) — 5
   files; [PR #80](https://github.com/alkprojects/kospos/pull/80) — 4
   files) against the docs that describe them ([labor-report.md § Tab 24
   Staffing Plan](../domain/labor-report-tabs.md#tab-24--staffing-plan),
   [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md),
   [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md),
   [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md)).
2. Re-run `npm test` — confirms the 263 / 263 baseline.
3. Re-check the 6 carry-forward items A-F from the
   [Phase 2.2.d close audit](phase-2-2-d-close-audit.md); mark each as
   `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — Phase 2.2.e PR follow-ups

### Finding 1 — UI-fix PR #78 resolves the Position Detail drill-in stranding

**Status:** stable.

Alex flagged at the start of the session: *"when clicking on positions,
only some have the show payroll button, even ones I know for certain
have posted payroll. Is it not searching hidden rows on the labor tab?"*

Root cause was the button gating: the `View payroll →` button lived
inside the `YtdPayrollCard` component, which itself only rendered when
`latestPayroll.byPosition.get(position.id)` returned non-null. Positions
with no matching OBI rows fell into the "no rows for this position"
hint branch with no drill-in affordance — leaving the user with no way
to confirm whether the absence was a real no-pay case, a hidden filter,
or a position-identifier mismatch between P&P and OBI.

[PR #78](https://github.com/alkprojects/kospos/pull/78) extracted a
`ViewPayrollButton` from `YtdPayrollCard` and reused it in the "no
rows" hint branch. The hint copy now mentions the drill-down
explicitly. Also renamed the tab from `Labor` to `Payroll` (the tab
drills into BI Payroll rows; "Labor" was misleading next to "Special
Class" / "Load Reports"). Pure label change in `App.tsx`; internal
symbol/directory names (`LaborView`, `lib/views/labor/`) stay as-is.

**Verification:** preview-MCP with synthetic 2-position data (one with
matching OBI rows, one without) confirms the button appears in both
states. Click on the without-row position → switches to Payroll tab,
scope banner reads `Scoped to: 50002 · 1234 Test Position B (no OBI)`,
table shows `No rows match the current filters` with stats `0 of 1 in
snapshot`. User can now visually confirm.

**Disposition:** stable. Bug Alex specifically flagged is resolved.

### Finding 2 — `lib/staffing-plan/` mirrors `lib/budget/` + `lib/payroll/` shape

**Status:** stable.

[PR #79](https://github.com/alkprojects/kospos/pull/79) added
`lib/staffing-plan/` with the same four-file shape used by the other
two entity layers shipped this Phase 2.2: `types.ts` + `build.ts` +
`index.ts` + `*.test.ts`. The Zustand store
(`staffing-plan/store.ts`) mirrors `positions/notes.ts`
(`usePositionNotes`) — Map-backed, in-memory v1, persistence deferred
to Phase 2.2.33 `snapshots/`.

The one structural difference: Staffing Plan has no upstream import
source. Where `lib/budget/` builds from BFM eturn rows and
`lib/payroll/` builds from OBI rows, `lib/staffing-plan/`'s
PlannedAction entity is created entirely in-app (KosPos's spec **is**
the workspace per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md)).
The store carries the canonical state; PR 2 supplies the form that
seeds it.

**Disposition:** no action; mirror is intentional and well executed.

### Finding 3 — Sign convention is encoded at the entity layer

**Status:** stable.

Per [Tab 24 § Per-section footers](../domain/labor-report-tabs.md#tab-24--staffing-plan):

> Active rows: positive (cost of hire); Separations: negative
> (savings).

The natural place for that sign convention is the entity layer, not
the surface. `computeExpectedCost(action)` wraps `calcEmployeeCost`
(which always returns positive totals) and applies the type-keyed
multiplier — separations negate, all others stay positive. Any
downstream consumer (rollup, surface, future export) gets the right
sign without re-implementing the rule.

Tested directly in [staffing-plan.test.ts](../../app/src/lib/staffing-plan/staffing-plan.test.ts)
("negates the annual for separation (savings convention)" — same
basis, opposite sign, magnitude equal within 0.01).

**Disposition:** stable. The sign-convention rule has a single point of
authority.

### Finding 4 — COLA-aware projection routes through `calcEmployeeCost`

**Status:** stable.

Per [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md):

> Every projection KosPos computes must be COLA-aware … Straight-line
> projections … are never the default.

`computeExpectedCost` routes through `calcEmployeeCost`, whose per-PP
loop already applies pre-/post-COLA snapshots (see
[`cost.ts`](../../app/src/lib/cost.ts) line ~610: `const isPostCOLA =
cal.pp >= cola.midYear.appliesAtPP; const biwBase = isPostCOLA ? rate.post : rate.pre;`).
No straight-line shortcut introduced anywhere in `lib/staffing-plan/`
— the prompt explicitly named the memory file as the gating rule.

The PR description ledger on PR 1 calls this out as a baked-in
decision so future maintainers can't lose the rule.

**Disposition:** stable.

### Finding 5 — Multi-action-per-position pattern handled cleanly

**Status:** stable.

PlannedAction is keyed by its own `id`, not by `positionId`. The
Marco Jacobo TX case (one position with Active + Separation + TEMP
all at once — per [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md))
is the normal case, not a special case. `actionsForPosition(actions,
positionId)` provides the position-scoped lens when a surface needs
it (Position Detail's "actions on this position" view eventually,
though that's deferred).

Verified end-to-end in the surface: the preview-MCP walkthrough added
3 actions on position 1115135 + 1 action on position 50001; the
header counts split correctly (Active 1 / Separations 1 / Pending 1 /
TEMP 1), and the `Multi-action positions` disclosure surfaces the
1115135 case explicitly: *"Position 1115135 · 3 actions: Active +
Separations + TEMP"*.

**Disposition:** stable.

### Finding 6 — Tests passing at 263 / 263 (+36)

**Status:** stable. Verified this session — `npm test` from a fresh
`npm install` in the worktree. Baseline math: 227 pre-Phase-2.2.e + 27
new entity-layer cases (id uniqueness; cost sign convention across all
5 types; CostCalcError → null; perPp × ppCount = annual; rollupByType
bucket math; multi-action Marco Jacobo pattern; pricing diagnostic;
net cost impact; full store CRUD + history audit) + 9 React-render
cases (empty position state; summary header counts; "X of Y priced ⚠"
diagnostic; unpriced cell rendering; add-form happy + error path;
delete; Marco Jacobo TX 3-section pattern) = 263. ✓

### Finding 7 — `Hiring Plan` tab is appropriately devOnly

**Status:** stable.

Per the prompt's "What we are NOT doing":

> No promotion of Labor / Staffing Plan / Temp Limits / Inactive to
> non-dev yet — wait until the cross-tab nav workflow has been used
> end-to-end on real data.

[PR #80](https://github.com/alkprojects/kospos/pull/80) added the tab
with `devOnly: true`. Visible only when `?dev=1` is in the URL or dev
mode has been toggled on for the session. Same gate as the other
in-progress tabs (`Payroll`, `Load Reports`, `Special Class`). The
"4 extra tabs visible" dev banner correctly reflects the new count.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items A-F

From [`phase-2-2-d-close-audit.md`](phase-2-2-d-close-audit.md) §
Recommendations not actioned, plus the carry-forward table:

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | Sweep stale post-merge worktrees | resolved & dropped (5 consecutive PRs auto-archived) | **0 stale** (PR #78 + #79 + #80 all auto-archived) — 8 consecutive PRs now | **stays dropped from carry-forward** |
| B | Trim SESSION_LOG.md sessions 1–16 | 2,510 lines | **2,572 lines** (+62 from S27 entry) | drifted further (slow + compounding — same rate) |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 15 instances | **17 instances** (regex methodology re-measured this session — content unchanged) | drifted as regex artifact; content unchanged |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer still right |
| E | Phase 2.2 first sub-phase pick | resolved S24 — dropped | n/a | **stays dropped** |
| F | Continue audit cadence at every phase close | working as designed (4th event-based trigger fired on time) | **working as designed** (S28 audit fires on schedule — 5th event-based trigger) | working as designed — no slip to carry forward |

### Item A — Worktree sweep result: still empirically RESOLVED

`git worktree list` shows 2 entries this audit:

| Worktree | Branch | Commit | Disposition |
|---|---|---|---|
| `kospos/` (main) | `main` | `23d8ed7` | in sync ✓ |
| `magical-hoover-2480f8/` | `claude/magical-hoover-2480f8` | `23d8ed7` | active (this session) ✓ |

**No stale worktrees.** The 3 worktrees from this session ([PR #78](https://github.com/alkprojects/kospos/pull/78)'s
`fix/payroll-rename-and-always-show-view-payroll`, [PR #79](https://github.com/alkprojects/kospos/pull/79)'s
`feat/staffing-plan-entity`, [PR #80](https://github.com/alkprojects/kospos/pull/80)'s
`feat/staffing-plan-view`) all auto-archived post-merge without manual
intervention. **8 consecutive PRs** now (#71, #73, #74, #75, #76, #78,
#79, #80) auto-archived cleanly. Item stays dropped from the
carry-forward.

### Item B — SESSION_LOG.md is now 2,572 lines

Numeric update. Was 2,510 at the previous audit; +62 lines from the
S27 entry. Same drift rate as the past three audits (~60-65 lines per
session). Past the 2,000-line trim trigger; bundleable with item C
into one ~1.5-hour docs cleanup PR. Priority unchanged.

### Item C — Citation anti-pattern count drifted 15 → 17

The 2-instance drift this session is a regex-methodology re-measure,
not a content change (no PR this session touched
`labor-report.md`). The actual underlying instances are stable;
matching them more precisely (`memory.*\]\(#`) catches a few more than
the previous run's regex did. Recommendation unchanged: batch cleanup
PR.

### Item D — labor-report.md still 8,518 lines, defer holds

Unchanged. Phase 2.4 split still right.

### Item E — Resolved in S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence working as designed (5th event-based trigger)

This audit is the **fifth event-based trigger** to fire under the
[WORKFLOW.md § Audit cadence](../WORKFLOW.md) rule (after Phase 2.0i,
Phase 2.1, Phase 2.2.b+c combined, and Phase 2.2.d). It fires **on
time** — the S28 prompt template (drafted at the end of S27's handoff)
included the explicit Step-0 audit trigger pattern, which this session
honored.

The slip from S25 has not recurred across **5 subsequent sessions**.
The pattern is self-reinforcing — every next-session prompt now
includes an explicit Step-0 audit-cadence check.

**Outcome:** working as designed. No item to carry forward.

---

## Part 3 — New drift scan

### Memory files

- **9 memory files indexed in MEMORY.md.** No new memory files this
  session; no removals. The `temporary_exchange_tx.md` file's TODO
  state remains unchanged (the prompt's Option A pick over Option B
  explicitly avoided opening those questions). ✓
- **`[[link]]` resolution** — `[[staffing-plan-types]]` and
  `[[temporary-exchange-tx]]` from `staffing_plan_types.md` +
  `temporary_exchange_tx.md` both resolve. The new
  `lib/staffing-plan/types.ts` JSDoc references both memory files by
  name and they exist. ✓
- **`feedback_projections_always_cola_aware.md`** — the COLA-aware
  rule is honored by `computeExpectedCost` per Finding 4 above; the
  memory's worked example ("$39 for a 26-PP year, COLA at PP13") would
  match calcEmployeeCost's output if asked. ✓

### Tooling / hooks / settings

- **No hook / settings / Vite config changes** in any of the 3 PRs.
  PR #78 was 2 source files; PR #79 was 5 source files; PR #80 was 4
  source files. ✓
- **`settings.local.json`** still well-formed; no new permissions
  needed.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block. ✓
- **Cowork "Auto-archive on PR close" working across 8 consecutive
  PRs** — see Item A above.

### Anchor compliance

No `labor-report.md` heading-level edits in Phase 2.2.e source PRs
(all 3 PRs were code-only). The audit doc + handoff updates this
session touch only `docs/audits/` and `docs/SESSION_*` — neither
affects the anchor graph in labor-report.md. Anchor verifier rerun
skipped per the precedent set in earlier non-heading-touching cycles.

### Tool sprawl

- `app/src/lib/` gained one new module: **`staffing-plan/`** (4 files:
  `types.ts`, `build.ts`, `index.ts`, `staffing-plan.test.ts`, +
  `store.ts`, ~860 lines total). Clean structure — mirrors
  `lib/budget/` shape and adds the store layer per the spec. No dead
  code. ✓
- `app/src/lib/views/` gained **`staffing-plan/`** (3 files:
  `StaffingPlanView.tsx`, `index.ts`, `staffing-plan-view.test.tsx`,
  ~610 lines total). Clean React surface. ✓
- `app/src/lib/views/positions/PositionDetail.tsx` got a small refactor
  in PR #78: extracted `ViewPayrollButton` as a reusable component;
  added it to the "no rows" hint branch alongside the existing copy.
  Net delta +35 / −23 lines — a refactor for reuse, not a feature
  spread. ✓
- `app/src/App.tsx` got the new `Hiring Plan` tab wired in. 3 lines
  added to the `Tab` union + 1 row to `ALL_TABS` + 1 branch to the
  main router. ✓
- No new dependencies. `package.json` unchanged. ✓

### Doc-vs-implementation

- [`labor-report.md § Tab 24 § PlannedAction model`](../domain/labor-report-tabs.md#tab-24--staffing-plan)
  describes the typed entity shape → matches the merged
  `PlannedAction` interface in [`types.ts`](../../app/src/lib/staffing-plan/types.ts).
  The 5 PlannedActionType variants, the HiringStatus enum, the
  multi-action-per-position pattern, and the sign convention all
  carry through. ✓
- [`labor-report.md § Tab 24 § Improvement #2 — Cost projection runs
  live`](../domain/labor-report-tabs.md#tab-24--staffing-plan) describes
  the live-from-calculator pattern → matches
  `computeExpectedCost(action)`. The cached-paste-once pattern from
  the workbook is replaced. ✓
- [`labor-report.md § Tab 24 § KosPos UI sketch`](../domain/labor-report-tabs.md#tab-24--staffing-plan)
  shows the workspace mock → the surface PR ships the **summary
  header + 5-section stack + inline Add form + per-section "X of Y
  priced ⚠" diagnostic chip + multi-action positions disclosure**
  exactly per the mock. The status-workflow transition UI from
  Improvement #4 + the per-action detail editor are intentionally
  deferred (called out in PR 2 description). ✓
- [`memory staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md)
  enumerates the 5 row types → exactly the 5 PlannedActionType values
  in `types.ts`. ✓
- The Phase 2.2 sub-phase enumeration row for `2.2.21` (`staffing-plan/`)
  describes the deliverable → matches the merged scope. ✓

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #78 | UI-fix: Labor → Payroll rename + always-show "View payroll →" button | stable (resolves Alex's flagged bug) |
| 2 | PR #79 | `lib/staffing-plan/` mirrors `lib/budget/` shape; +store layer for in-app entity | stable |
| 3 | PR #79 | Sign convention encoded at entity layer (separations negative; others positive) | stable |
| 4 | PR #79 | COLA-aware projection routes through `calcEmployeeCost`'s per-PP loop | stable |
| 5 | PR #79 | Multi-action-per-position pattern keyed by action id, not positionId | stable |
| 6 | PR #79 + #80 | `npm test` 263/263 (+36) holds | stable |
| 7 | PR #80 | `Hiring Plan` tab appropriately devOnly | stable |
| 8 | Carry-forward A | Stale worktrees: 0 — 8 consecutive PRs auto-archived | **stays dropped** |
| 9 | Carry-forward B | SESSION_LOG.md 2,510 → 2,572 lines (+62) | drifted (~62 lines/session — same rate) |
| 10 | Carry-forward C | Citation anti-pattern 15 → 17 (regex re-measure) | drifted (artifact, content unchanged) |
| 11 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 12 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 13 | Carry-forward F | Audit cadence working as designed (5th event-based trigger on time) | working as designed |
| 14 | New drift — memory | 9 files indexed; links resolve; TX TODOs untouched | stable |
| 15 | New drift — hooks/settings | No changes; auto-archive working | stable |
| 16 | New drift — anchors | No heading edits this phase; verifier skip safe | stable |
| 17 | New drift — tool sprawl | Two new clean modules (`staffing-plan/` entity + `views/staffing-plan/` surface); refactor for reuse in PositionDetail | stable |
| 18 | New drift — doc-vs-impl | labor-report.md § Tab 24 + 3 memory files + sub-phase enum all match | stable |

**Totals:** 0 applied this session · 1 carry-forward stays dropped (A)
· 1 carry-forward drifted (B) · 1 carry-forward drifted as artifact (C)
· 1 carry-forward unchanged-right-call (D) · 1 carry-forward
resolved-stays-dropped (E) · 1 carry-forward working-as-designed (F) ·
5 new-drift stable confirmations.

---

## Recommendations not actioned

In priority order:

1. **Schedule SESSION_LOG.md trim** (item B) — 2,572 lines, past the
   2,000-line trim trigger; bundleable with item C (~1.5 hours
   combined). Priority unchanged; same drift rate per session.
2. **Migrate the citation anti-pattern** (item C) — 17 instances now
   (re-measured); bundleable with B per above. ~30 minutes.
3. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
4. **Queue ADR amendments for Phase 2.4** — ADR-007 amendment for the
   39-column OBI shape (queued since 2.2.b) + new ADR for the
   64-column BFM eturn shape (queued from 2.2.d). PR #79 adds a third
   candidate: a new ADR documenting the `lib/staffing-plan/` entity's
   no-upstream-source pattern (KosPos's spec is the source). Three
   ADR moves could share one Phase 2.4 docs PR.
5. **Continue audit cadence at every phase close** (item F) — next
   audit fires when Phase 2.2.f merges. Next-session prompt template
   (in this PR's SESSION_HANDOFF.md update) preserves the Step-0
   trigger.

None block the next session's Phase 2.2.f work.

---

## Cross-references

- Previous audit: [phase-2-2-d-close-audit.md](phase-2-2-d-close-audit.md)
  (Session 27).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.e implementation: [PR #78](https://github.com/alkprojects/kospos/pull/78)
  (UI fix) + [PR #79](https://github.com/alkprojects/kospos/pull/79)
  (entity) + [PR #80](https://github.com/alkprojects/kospos/pull/80)
  (surface) + Session 28 SESSION_LOG.md entry (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
