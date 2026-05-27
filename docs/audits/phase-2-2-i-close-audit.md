# Phase 2.2.i close audit — Session 32

**Date:** 2026-05-27
**Branch:** `docs/phase-2-2-i-close-audit-and-handoff`
**Scope:** Phase 2.2.i close audit. Fires at the close of Phase 2.2.i per
[WORKFLOW.md § Audit cadence](../WORKFLOW.md). Phase 2.2.i shipped one PR
([PR #98](https://github.com/alkprojects/kospos/pull/98) —
`lib/separations/` + `lib/views/separations/`, completing the
vacancy-planning trio: Hiring Plan + Inactive + Separations).

Last audit was the [Phase 2.2.h close audit](phase-2-2-h-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in Phase 2.2.i's one PR
   ([PR #98](https://github.com/alkprojects/kospos/pull/98) — 14 files,
   +2,042 / −4) against the docs that describe them ([labor-report.md §
   Tab 14 — Separations](../domain/labor-report.md), the Phase 2.2.h
   close audit, the S32 prompt + SESSION_HANDOFF recommendations).
2. Re-run `npm test` — confirms the **413 / 413** baseline (was 374 at
   the start of Phase 2.2.i; +39 from PR #98).
3. Re-check the 6 carry-forward items A-F from the
   [Phase 2.2.h close audit](phase-2-2-h-close-audit.md); mark each
   `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches, anchor-graph integrity.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — Phase 2.2.i PR follow-ups

### Finding 1 — PR #98 ships Tab 14 Separations end-to-end

**Status:** stable.

The workbook's Tab 14 was a hand-maintained list with no employee ID
join, no status workflow, and no cross-link to Tab 24 § Separations.
[PR #98](https://github.com/alkprojects/kospos/pull/98) types it:

- **`PendingSeparation` entity** with required `employeeName` + optional
  `employeeId` / `positionId` / `jobCode` / `expectedSeparationDate` /
  `separationReason` / free-text `notes`.
- **Status workflow** — `rumored` → `confirmed` → `paperwork-filed` →
  `cleared` — gated by `isAllowedSeparationStatusTransition` (forward
  + same-state allowed; backward requires the override + reason flow).
- **Cross-link `linkedActionId`** — one-way pointer at `PlannedAction.id`.
  Hiring Plan side reads from the separations store to surface a
  reciprocal `🔗 Tracked in Separations` chip on Separation-type rows.

Three Tier-4 views now sit on the same no-upstream-source pattern:
`lib/staffing-plan/`, `lib/views/inactive/`, `lib/views/separations/`.
The new ADR queued for Phase 2.4 should fold all three into one
"derived / curated workspace, not importer-fed" note rather than three
separate ADRs.

**Disposition:** stable. Spot-check awaits Alex's first run on real data
+ a real PlannedAction cross-link.

### Finding 2 — Status / Confidence enum split rationale

**Status:** stable.

`PendingSeparation.status` is `'rumored' | 'confirmed' | 'paperwork-filed'
| 'cleared'` (4 values). The existing `PlannedAction.separationConfidence`
is `'rumored' | 'confirmed' | 'paperwork-filed'` (3 values, no terminal).
Same staging pipeline conceptually — different consumers, different
required granularity.

The new module uses `SeparationStatus` (for the 4-value workflow) +
`ConfidenceLevel` (low / medium / high — the new module's orthogonal
certainty axis). Keeps import-collision noise out of the staffing-plan
module while preserving the option to unify in a future cleanup PR if
it ever feels worth the churn. Decision documented in
[types.ts header](../../app/src/lib/separations/types.ts) so future
sessions don't try to "fix" it as an accidental duplication.

**Disposition:** stable. Future cleanup-PR candidate, not blocking.

### Finding 3 — Status guard + override-reason routing

**Status:** stable.

`isAllowedSeparationStatusTransition(from, to)` mirrors
[`lib/staffing-plan/build.ts:isAllowedStatusTransition`](../../app/src/lib/staffing-plan/build.ts)
from [PR #85](https://github.com/alkprojects/kospos/pull/85): forward
progress allowed, same-state idempotent, backward requires explicit
override. The SeparationDetail modal surfaces a "Force override
(logged)" checkbox + required reason text input when the guard rejects;
Save is gated until both the checkbox is ticked **and** the reason is
non-empty.

The override reason flows through `updateSeparation(id, patch,
overrideReason)` and is appended to the history audit entry — but
**only on the `status` field**. Other fields don't have a guard to
override, so attaching a reason there would be meaningless. Routing
logic lives in [store.ts:diffField](../../app/src/lib/separations/store.ts).

**Disposition:** stable.

### Finding 4 — History audit log pattern mirrors PR #90

**Status:** stable.

`SeparationHistoryEntry { at, field, before, after, overrideReason? }`
is structurally identical to `PlannedActionHistory` from
[PR #90](https://github.com/alkprojects/kospos/pull/90) +
`overrideReason`. The store's `updateSeparation` diffs each patched
field via JSON deep-equality and short-circuits no-op updates so React
references stay stable — also identical to PR #90's pattern.

**Disposition:** stable. Pattern is now used by 2 entity layers
(`staffing-plan` + `separations`); a `lib/audit-log/` extraction PR
could DRY them but isn't worth it at 2 consumers.

### Finding 5 — Cross-link is one-way pointer

**Status:** stable.

`PendingSeparation.linkedActionId` points at `PlannedAction.id`.
StaffingPlanView reads the separations store directly, computes a
`Map<actionId, count>` once per separationsMap change, and passes the
lookup through to `Section` → `ActionRow` for per-row indicator
rendering.

Why one-way:
- Bidirectional links would require maintenance on both sides on every
  edit (drop a PlannedAction → also clear `linkedActionId` on matching
  separations; rename an action id → cascade).
- The pointer side carries the policy (the user is asserting "this rumor
  → that planned action"); the pointed-at side is passive.
- The indicator chip is read-only on the Hiring Plan side — no edit
  affordance, so no symmetric model is needed.

A future "view tracked separations" affordance (click the Hiring Plan
chip → open the linked separation in the Separations tab) is a 1-hour
add when Alex asks for it; the data model already supports it.

**Disposition:** stable.

### Finding 6 — `npm run build` clean on first run

**Status:** stable.

Lesson from S30 / S31 (production build catches unused-import + type
errors that `vitest run` glosses over): the rule of "always run
`npm run build` before opening PR" caught zero issues this session —
production build was clean on first run. The rule has paid off
**three sessions in a row** (S30 caught 1 issue, S31 caught 1, S32
caught 0). Habit firmly internalized.

**Disposition:** stable.

### Finding 7 — Tests 413 / 413 (+39 from Phase 2.2.h baseline of 374)

**Status:** stable.

| Phase point | Tests | Delta |
|---|---|---|
| Start of Phase 2.2.e | 227 | baseline at S27 |
| Phase 2.2.e PR #79 + #80 | 263 | +36 entity + view-render |
| Phase 2.2.f PR #84 + #85 | 303 | +40 payroll-diagnostic + Bug 3 |
| Phase 2.2.g PR #89 + #90 | 328 | +25 importer serial + Detail editor |
| Phase 2.2.g tail PR #92 + #93 | 354 | +26 session export/import + needle search |
| Phase 2.2.h PR #96 | 374 | +20 inactive query + view-render |
| **Phase 2.2.i PR #98** | **413** | **+39 separations entity + view + session** |

The +39 in PR #98 breaks down:
- **23 entity cases** in [separations.test.ts](../../app/src/lib/separations/separations.test.ts) —
  `newSeparationId` uniqueness; canonical orderings;
  `isAllowedSeparationStatusTransition` (4 cases: same / forward steps /
  skip-forward / backward); `rollupByStatus` (empty + populated);
  `separationsForPosition` (normalized-key + empty); `separationsForAction`
  (happy + empty); store CRUD (10 cases: defaults, all-fields preservation,
  positionId normalization, field diffing, no-op, override-reason routing,
  positionId re-normalization, unknown-id, delete, restoreFromSession).
- **12 view cases** in [separations-view.test.tsx](../../app/src/lib/views/separations/separations-view.test.tsx) —
  empty-state copy; row render; summary stats; add-form blank rejection;
  add-form success; status-filter narrows; search narrows;
  count-hint "of N total"; row-click → modal; modal delete; linked
  indicator; status guard backward → override → reason → Save → history.
- **4 session cases** added to [session.test.ts](../../app/src/lib/session/session.test.ts) —
  pendingSeparations Map → array → Map roundtrip; back-compat (omit
  arg defaults to []); parser accepts a v1 file with the field missing
  entirely; parser rejects wrong-type field.

### Finding 8 — Session schema stays at v1 (backward-compatible)

**Status:** stable.

Adding `pendingSeparations?: Array<[string, PendingSeparation]>` as
**optional** to `SessionPayload` is the cleanest backward-compatible
path. The version stays at 1 because:
- v1 files saved before Phase 2.2.i don't carry the field. Parser
  treats it as optional; restore defaults to `[]`.
- New v1 files always include the field (the `buildSessionFile`
  callsite from `SessionExportImport.tsx` always passes the Map).
- Bumping to v2 would invalidate every existing session file Alex
  has saved during S30-S31 — and the strict-version check is the
  protection for *incompatible* shape changes, not additive ones.

Future incompatible changes (renaming a key, dropping a required field)
should bump the version. Optional additions can keep v1.

**Disposition:** stable. Decision documented in
[snapshot.ts](../../app/src/lib/session/snapshot.ts) header history
comment.

### Finding 9 — Separations tab stays appropriately devOnly

**Status:** stable.

Per the S32 prompt's "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Temp Limits / Inactive /
> Separations to non-dev yet — wait until cross-tab nav has been used
> end-to-end on real data.

[App.tsx](../../app/src/App.tsx) adds the Separations tab with
`devOnly: true`, between Hiring Plan and Inactive (the natural
vacancy-trio order).

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items A-F

From [`phase-2-2-h-close-audit.md`](phase-2-2-h-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | Sweep stale post-merge worktrees | back on carry-forward after 1 slip (PR #95) | **improved** — PR #96 auto-archived cleanly; PR #98 auto-archive pending (this docs PR is open from the session worktree) | monitor — 1 of 3 watch-PRs clean |
| B | Trim SESSION_LOG.md sessions 1–16 | 2,809 lines | **2,809 + S32 entry** (~+60 lines, this audit) | unchanged — bundleable cleanup PR still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes this session) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer still right |
| E | Phase 2.2 first sub-phase pick | resolved S24 — dropped | n/a | **stays dropped** |
| F | Continue audit cadence at every phase close | working as designed (8th event-based trigger) | **working as designed** (S32 audit fires on schedule — **9th event-based trigger**) | working as designed |

### Item A — Auto-archive monitoring update: 1 of 3 watch-PRs clean

PR #96's auto-archive worked at the S31 → S32 transition (clean
worktree at this session's open). That's the first datapoint after
PR #95's one-off slip. **Two more watch-PRs to confirm one-off vs
pattern.** PR #98's auto-archive can't be measured from inside the
session (the session worktree is still active); it'll show up at S33
open.

**Update for next session:** check `git worktree list` at S33 open;
if clean, item A drops back to "stays dropped" status (2 of 3 clean).
If the session worktree from S32 lingers post-merge, that's the
second slip and we have a pattern.

### Item B — SESSION_LOG.md baseline at 2,809 + S32 entry

After this PR's S32 entry lands, file size will be around 2,870 lines.
Still past the 2,000-line trim trigger; still bundleable with item C
+ the Tab 24 Improvement #6 holdReason language drift + the OBI
serial doc note. ~1.5 hours combined.

### Item C — Citation anti-pattern count: 12 (no change)

`labor-report.md` not touched this session. Count unchanged at 12.

### Item D — labor-report.md still 8,518 lines, defer holds

No changes since Phase 2.0i. Defer until Phase 2.4 still right.

### Item E — Resolved in S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence working as designed (9th event-based trigger)

This audit is the **ninth event-based trigger** to fire under the
[WORKFLOW.md § Audit cadence](../WORKFLOW.md) rule (after Phase 2.0i,
2.1, 2.2.b+c combined, 2.2.d, 2.2.e, 2.2.f, 2.2.g, 2.2.h). It fires
**on time** — the S32 prompt template (drafted at the end of S31's
handoff) included the explicit Step-0 audit trigger pattern, which
this session honored.

The slip from S25 has not recurred across **9 subsequent sessions**.
The pattern is self-reinforcing.

**Outcome:** working as designed. No item to carry forward.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** (no new memory files this
  session). All `[[link]]`s resolve. ✓
- The memory files referenced inline in PR #98 context:
  `staffing_plan_types.md` (the Type taxonomy + RTF caveats — Tab 24
  Separations rows live there too); `temporary_exchange_tx.md` (TX
  expiration unrelated to this PR but referenced in the S32 prompt as
  the Option B alternative path); `feedback_user_notes_per_position.md`
  (the `notes` field on PendingSeparation honors the same pattern).
  None are stale; none require updates.
- **`feedback_dont_reremind.md`** — followed for the Phase 2.2.i pick
  acknowledgment. S33 handoff drops the pick item.

### Tooling / hooks / settings

- **No hook / settings / Vite config changes** in PR #98. 14 files:
  9 new + 5 modified, all in `app/src/`. ✓
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged from prior sessions.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block. ✓
- **Cowork "Auto-archive on PR close"** — PR #96 cleanly auto-archived
  (per Item A). PR #98 + this docs PR pending — measured at S33 open.

### Anchor compliance

No `labor-report.md` heading-level edits in PR #98. The audit doc +
handoff updates this session touch only `docs/audits/`, `docs/SESSION_*`
— neither affects the anchor graph in labor-report.md. Anchor verifier
rerun skipped per precedent.

### Tool sprawl

- `app/src/lib/separations/` is a new directory — 5 files (`types.ts`,
  `build.ts`, `store.ts`, `index.ts`, `separations.test.ts`). Clean
  module layout matching `lib/staffing-plan/`. ✓
- `app/src/lib/views/separations/` is a new directory — 4 files
  (`SeparationsView.tsx`, `SeparationDetail.tsx`, `index.ts`,
  `separations-view.test.tsx`). Clean module layout matching
  `lib/views/inactive/` + `lib/views/staffing-plan/`. ✓
- No new dependencies. `package.json` unchanged. ✓
- `App.tsx` gained 4 lines for the new tab + `Tab` union member +
  switch arm. Additive only.
- `SessionExportImport.tsx` gained the `useSeparations` wiring +
  status counter. Additive.
- `StaffingPlanView.tsx` gained the `linkedSeparationCounts` Map
  computation + `linkedSeparationCount` prop through `Section` →
  `ActionRow`. Additive.

### Doc-vs-implementation

- **Tab 14 in labor-report.md** describes the manual list shape; the PR
  matches the spec + adds the status workflow + cross-link as KosPos
  improvements. No new doc drift; the spec doesn't need updating for
  the v1 implementation.
- **`docs/DECISIONS.md`** — no new ADRs in PR #98. The Phase 2.4 queue
  now has a 3-view no-upstream-source pattern to document
  (`lib/staffing-plan/`, `lib/views/inactive/`, `lib/views/separations/`).
  All three derived workspaces with the same "KosPos as system of
  record" framing. **Recommendation:** fold all three into one ADR
  rather than three when the Phase 2.4 amendments land.
- **`docs/data-sources/`** — no changes. OBI BI Payroll Excel-serial
  doc note still missing (Item #19 from Phase 2.2.g audit). Unchanged.
  Low priority.

### New drift items

None new this session. The 36 stale local-only `docs/*` branches noted
in the Phase 2.2.h audit are unchanged — they don't occupy worktrees;
flag still stands as a low-priority housekeeping note for whenever Alex
wants a 5-minute cleanup pass.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #98 | Separations ships Tab 14 entity + view + cross-link end-to-end | stable |
| 2 | PR #98 | Status / Confidence enum split rationale documented | stable |
| 3 | PR #98 | Status guard + override-reason routing (status field only) | stable |
| 4 | PR #98 | History audit log mirrors PR #90 pattern | stable |
| 5 | PR #98 | Cross-link is one-way pointer; bidirectional unnecessary for v1 | stable |
| 6 | PR #98 | `npm run build` clean on first run (third session running) | stable |
| 7 | PR #98 | `npm test` 413/413 (+39 from Phase 2.2.i start) holds | stable |
| 8 | PR #98 | Session schema stays at v1; backward-compatible optional field | stable |
| 9 | PR #98 | `Separations` tab remains devOnly | stable |
| 10 | Carry-forward A | PR #96 auto-archived cleanly; PR #98 pending S33 open | **improved** — 1 of 3 watch-PRs clean |
| 11 | Carry-forward B | SESSION_LOG.md ~2,870 lines after S32 entry | tracking — cleanup PR still queued |
| 12 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 13 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 14 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 15 | Carry-forward F | Audit cadence working as designed (9th event-based trigger on time) | working as designed |
| 16 | New drift — memory | 10 files indexed; links resolve | stable |
| 17 | New drift — hooks/settings | No changes | stable |
| 18 | New drift — anchors | No heading edits this phase; verifier skip safe | stable |
| 19 | New drift — tool sprawl | New `lib/separations/` + `lib/views/separations/` dirs mirror existing module layouts; no new deps | stable |
| 20 | New drift — doc-vs-impl | Phase 2.4 ADR queue updated: now 3-view no-upstream-source pattern (was 2) | folds into staffing-plan ADR; no separate action |
| 21 | Housekeeping (carries) | 36 stale local-only `docs/*` branches | low priority |

**Totals:** 0 applied this session · 1 carry-forward improving (A) ·
3 carry-forward unchanged (B, C, D) · 1 carry-forward stays-dropped
(E) · 1 carry-forward working-as-designed (F) · 4 new-drift stable
confirmations + 1 minor new-drift note (Phase 2.4 ADR queue update)
+ 1 carry low-priority housekeeping note (36 stale local branches).

---

## Recommendations not actioned

In priority order:

1. **Monitor auto-archive across the next 2 PRs** (item A) — PR #96
   landed cleanly; need 2 more clean PRs to declare the pattern
   resumed. PR #98 + this docs PR will be measured at S33 open.
2. **Schedule SESSION_LOG.md trim** (item B) — ~2,870 lines after S32
   entry; past the 2,000-line trim trigger; bundleable with item C +
   the Tab 24 Improvement #6 holdReason language update + the OBI
   serial doc note. ~1.5 hours combined.
3. **Migrate the citation anti-pattern** (item C) — 12 instances;
   ~20 minutes.
4. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
5. **Queue ADR amendments for Phase 2.4** — ADR-007 amendment for
   the 39-column OBI shape + `iso()` serial-converter note; new ADR
   for the 64-column BFM eturn shape; new ADR for the no-upstream-source
   pattern shared by `lib/staffing-plan/` + `lib/views/inactive/` +
   `lib/views/separations/`; `Position.cat1718` lift note. 4 queued
   together (down from 5 by folding the three derived-workspace cases
   into one ADR).
6. **Continue audit cadence at every phase close** (item F) — next
   audit fires when Phase 2.2.j ships. The S33 prompt template (in
   this PR's SESSION_HANDOFF.md update) preserves the Step-0 trigger.
7. **Local-branch cleanup** (low priority) — 36 stale `docs/*`
   branches; 5-minute pass whenever Alex wants.

None block the next session's work (Phase 2.2.j sub-phase pick).

---

## Cross-references

- Previous audit: [phase-2-2-h-close-audit.md](phase-2-2-h-close-audit.md)
  (Session 31).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.i implementation: [PR #98](https://github.com/alkprojects/kospos/pull/98)
  + Session 32 SESSION_LOG.md entry (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
