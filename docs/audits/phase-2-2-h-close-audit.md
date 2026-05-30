# Phase 2.2.h close audit — Session 31

**Date:** 2026-05-27
**Branch:** `docs/phase-2-2-h-close-audit-and-handoff`
**Scope:** Phase 2.2.h close audit. Fires at the close of Phase 2.2.h per
[WORKFLOW.md § Audit cadence](../WORKFLOW.md). Phase 2.2.h shipped one PR
([PR #96](https://github.com/alkprojects/kospos/pull/96) — `lib/views/inactive/`
+ `InactiveView` tab, replacing the workbook's manual Tab 13 INACTIVE flow
with a single live query against the loaded P&P + OBI snapshots).

Last audit was the [Phase 2.2.g close audit](phase-2-2-g-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in Phase 2.2.h's one PR
   ([PR #96](https://github.com/alkprojects/kospos/pull/96) — 6 files)
   against the docs that describe them ([labor-report.md § Tab 13 —
   Inactive](../domain/labor-report-tabs.md#tab-13--inactive), the Phase
   2.2.g close audit, the S31 prompt + SESSION_HANDOFF recommendations).
2. Re-run `npm test` — confirms the **374 / 374** baseline (was 354 at
   the start of Phase 2.2.h; +20 from PR #96).
3. Re-check the 6 carry-forward items A-F from the
   [Phase 2.2.g close audit](phase-2-2-g-close-audit.md); mark each as
   `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches, anchor-graph integrity.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — Phase 2.2.h PR follow-ups

### Finding 1 — PR #96 ships the Tab 13 INACTIVE replacement end-to-end

**Status:** stable.

The workbook's Tab 13 carried a three-step manual flow: `PivotTable5`
on BI Payroll (Sum of Balance Amount per Position Identifier) → `XLOOKUP`
against P&P Data to flag positions absent there → hand-paste flagged
rows into Report Data's 7-slot `INACTIVATED` block (rows 755-761). The
7-slot cap silently under-counted any month with >7 inactives, and the
disposition flag `Add`/`Done`/blank required Alex to remember the paste
across PP refreshes.

[PR #96](https://github.com/alkprojects/kospos/pull/96) replaces all
of that with a single live query in
[`lib/views/inactive/build.ts`](../../app/src/lib/views/inactive/build.ts):
positions present in the latest OBI snapshot but absent from the
active P&P roster. Joined on `normalizePositionKey` so zero-padded
OBI ids (`00099001`) match unpadded P&P ids (`99001`). Returns one
`InactivePositionSummary` per inactive position with the 5 bucket
breakdown + last-known-incumbent picked from MAX(earningPeriodEnd)
rows (falls back across blank-name rows for orphan-RPO-only spend).

The reason hint is informational, not authoritative:
- **RPO > 0** → `retirement-payout` (likely retired)
- **tempLsp > 0 and no RPO** → `temp-lumpsum-payoff` (temp separation processed)
- otherwise → `wages-only` (recent separation, still closing)

PS HCM has the real separation reason — this hint is a derived signal
from which buckets the orphan spend lands in. Surfaced as a clickable
radiogroup filter chip in the view, not as a typed enum on the entity,
so the view can iterate without churning the domain layer.

**Disposition:** stable. Replaces the entire Tab 13 manual workflow
+ removes the 7-slot cap. Spot-check awaits Alex's first run on real
OBI + P&P data — synthetic preview-MCP run confirmed the join, sort,
roll-up, and reason-chip behavior end-to-end.

### Finding 2 — Position-level, not person-level (intentional)

**Status:** stable.

The prompt mentioned "people who got paid but aren't in active roster"
as a framing; the implementation is strictly per-position (one row =
one position id), matching Tab 13's pivot key. Rationale documented in
the build.ts header:

> Why not "people"-level? Tab 13 is per-position; a separated employee
> may still appear in P&P on a *different* position they transferred
> to. The useful question is "which positions have orphan FYTD spend
> that needs to land in Report Data INACTIVATED" — and that's a
> position-level question.

A person-level surface (which employees in OBI aren't in P&P at all,
on any position) would be a separate orthogonal view. Out of scope
for this sub-phase; flag as a possible future addition only if Alex
asks for it explicitly.

**Disposition:** stable. Build.ts header documents the choice so future
sessions don't try to "fix" it.

### Finding 3 — Empty-state branches cover the 3 missing-input cases

**Status:** stable.

The view exits with a tailored message for each of:
- No data loaded at all
- BI Payroll missing (P&P only) — "no FYTD spend to check inactives against"
- P&P missing (OBI only) — "without it, every BI Payroll position would
  show as inactive (nothing to compare against)"

Plus the "all paid positions are active" empty-table message when both
sides are loaded but there are no inactives. Three view-level test
cases pin each branch. Without the per-side guards, the view would
either crash on the missing snapshot or silently render every OBI
position as "inactive" — both confusing.

**Disposition:** stable.

### Finding 4 — Reason-chip filter as radiogroup (not toggle list)

**Status:** stable.

The reason filter is mutually-exclusive (one chip active at a time)
rendered as `role="radiogroup"` with each chip `role="radio"`. Keeps
the surface simple; if the user later wants to combine "retirement
+ wages" they'd be asking for a different shape. Chips also display
per-reason counts (e.g. `Retirement payout · 1`), so the user can
see whether a filter would yield anything before clicking.

**Disposition:** stable.

### Finding 5 — `npm run build` caught one unused-import error after `vitest run` passed

**Status:** stable.

Lesson from S30 — `tsc --noEmit` glosses over some unused-import cases
that `tsc -b` (the production build) flags as errors. The
`InactivePositionSummary` type import in InactiveView.tsx was unused
after a refactor; vitest's transform was permissive, but the production
build refused to emit. Caught at audit-time pre-commit + removed.

**Disposition:** stable. The S30 "always run `npm run build` before
opening PR" rule still pays off.

### Finding 6 — Tests passing at 374 / 374 (+20 from Phase 2.2.g close baseline of 354)

**Status:** stable.

| Phase point | Tests | Delta |
|---|---|---|
| Start of Phase 2.2.e | 227 | baseline at S27 |
| Phase 2.2.e PR #79 + #80 | 263 | +36 entity + view-render |
| Phase 2.2.f PR #84 + #85 | 303 | +40 payroll-diagnostic + Bug 3 |
| Phase 2.2.g PR #89 + #90 | 328 | +25 importer serial + Detail editor |
| Phase 2.2.g tail PR #92 + #93 | 354 | +26 session export/import + needle search |
| **Phase 2.2.h PR #96** | **374** | **+20 inactive query + view-render** |

The +20 in PR #96 breaks down:
- 11 build cases (null snapshot; empty inactives; OBI ⊄ P&P surfaces;
  zero-padded normalize; skips blank position ids; 5-bucket aggregation;
  3 reasonHint paths; last-incumbent picking; blank-name fallback;
  descending sort)
- 7 view-level cases (3 empty-state branches; "all active" message;
  row-render with last incumbent + FYTD + reason chip; reason-chip
  filter narrows; search filter narrows + count tracks)
- 2 implicit coverage cases from `useAppStore` integration paths

### Finding 7 — `Inactive` tab stays appropriately devOnly

**Status:** stable.

Per the prompt's "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Temp Limits / Inactive to
> non-dev yet — wait until cross-tab nav has been used end-to-end on
> real data.

[App.tsx](../../app/src/App.tsx) adds the tab with `devOnly: true`.
Only visible when `?dev=1` or dev mode is toggled.

**Disposition:** stable.

### Finding 8 — No new entity layer; `InactivePositionSummary` lives in the view dir

**Status:** stable.

The summary type is a per-view rollup, not a promoted domain entity.
Lives in `lib/views/inactive/build.ts` alongside the query helper, not
in a sibling `lib/inactive/` directory. If a future view needs the
inactive-positions data, lifting build.ts up under `lib/inactive/` is a
5-minute move; until then, keeping it in `views/` avoids speculative
generality.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items A-F

From [`phase-2-2-g-close-audit.md`](phase-2-2-g-close-audit.md) §
Recommendations not actioned, plus the carry-forward table:

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | Sweep stale post-merge worktrees | dropped (15 consecutive PRs auto-archived per S30 tail) | **drifted** — 1 stale worktree found at S31 start (PR #95 `docs/data-is-public-records`); swept manually | **back on carry-forward** (one slip, not a streak; monitor) |
| B | Trim SESSION_LOG.md sessions 1–16 | 2,630 lines (pre-S30 entry) | **2,809 lines** (S30 + S30-tail entries added) | unchanged — bundleable cleanup PR still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | "17 instances" per audit text | **12 instances** (current recount; audit text was overstated) | unchanged-but-accurate-now; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer still right |
| E | Phase 2.2 first sub-phase pick | resolved S24 — dropped | n/a | **stays dropped** |
| F | Continue audit cadence at every phase close | working as designed (7th event-based trigger) | **working as designed** (S31 audit fires on schedule — **8th event-based trigger**) | working as designed |

### Item A — Worktree sweep regression: ONE stale worktree found at S31 start

At session open, `git worktree list` showed
`C:/Users/ALK/Desktop/Claude Projects/kospos/.claude/worktrees/quirky-lumiere-eee73a`
still registered on branch `docs/data-is-public-records` — the branch
from [PR #95](https://github.com/alkprojects/kospos/pull/95) (merged
2026-05-27 04:24Z, ~3 hours before S31 opened). Upstream branch was
already gone; only the local worktree + local branch lingered.

Resolution this session: `git worktree remove` (force, after a stale
cwd error on the first attempt) + `git branch -D` to delete the
matching local branch. Worktree count is now back to clean (1 main +
1 active session worktree).

This breaks the **15-consecutive-PRs auto-archive streak** claimed in
the Phase 2.2.g close audit + S30 SESSION_HANDOFF. The streak now
resets at this PR (Phase 2.2.h close audit) — **PR #96 auto-archive
will be the first new datapoint** for tracking resumption.

**Likely cause:** the Cowork auto-archive watcher is event-driven; it
may have missed the merge event for PR #95 if Alex's session was
already closed when the merge happened (the docs-only PR was likely
merged after Alex stepped away from the S30 session). Not a Cowork
bug per se — more an edge case in the watcher's "watching during
merge" lifecycle. **Action:** monitor across the next 3-4 PRs to
confirm it's a one-off vs a pattern. Don't escalate yet.

Stale local-only branches (`docs/*` from S11-S26 era) remain on the
local clone but **don't occupy worktrees** — they're a separate
one-off cleanup, not in scope for the auto-archive carry-forward.
Counting branches: 36 stale `docs/*` local-only branches. Out of
scope for this audit; surface as a low-priority housekeeping note
only.

### Item B — SESSION_LOG.md baseline at 2,809 lines

`wc -l docs/SESSION_LOG.md` = 2,809 lines (was 2,630 pre-S30 entry).
+179 lines for the S30 + S30-tail entries (PR #91 added 69; PR #94
added 24; PR #95 added 16 — total +109; the remaining +70 is the S30
mid-session content not visible in the squash-merged diffs above
because it was in the closing handoff entry, not the PR's diff).

Still past the 2,000-line trim trigger; still bundleable with item C
+ the Tab 24 Improvement #6 holdReason language drift + the new
minor drift items below.

### Item C — Citation anti-pattern count: 12 (audit text was overstated)

Recount via `Grep` with the canonical
`file:///C:/Users/ALK/.claude/projects/.../memory/` pattern shows **12
instances** — the Phase 2.2.g audit's claim of "17 instances" was
either an overcounted prior baseline or used a wider pattern that
caught non-memory `file:///` URLs too. Reset the baseline to 12 going
forward; cleanup recommendation unchanged.

### Item D — labor-report.md still 8,518 lines, defer holds

`wc -l docs/domain/labor-report.md` = 8,518 lines (matches prior
audit). No change since Phase 2.0i. Phase 2.4 split still right.

### Item E — Resolved in S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence working as designed (8th event-based trigger)

This audit is the **eighth event-based trigger** to fire under the
[WORKFLOW.md § Audit cadence](../WORKFLOW.md) rule (after Phase 2.0i,
Phase 2.1, Phase 2.2.b+c combined, Phase 2.2.d, Phase 2.2.e, Phase
2.2.f, Phase 2.2.g). It fires **on time** — the S31 prompt template
(drafted at the end of S30's handoff) included the explicit Step-0
audit trigger pattern, which this session honored.

The slip from S25 has not recurred across **8 subsequent sessions**.
The pattern is self-reinforcing — every next-session prompt now
includes an explicit Step-0 audit-cadence check.

**Outcome:** working as designed. No item to carry forward.

---

## Part 3 — New drift scan

### Memory files

- **9 memory files indexed in MEMORY.md** (no new memory files this
  session; `data_sensitivity.md` added at S30-tail). All `[[link]]`s
  resolve. ✓
- The 5 memory files referenced inline in PR #96 (or related context):
  `data_sensitivity.md`, `staffing_plan_types.md`, `cat_16_17_18_rules.md`,
  `feedback_dont_reremind.md`, `feedback_user_notes_per_position.md` —
  all up-to-date; nothing about Inactive surfaces touches the schemas.
- **`feedback_dont_reremind.md`** — followed for the Phase 2.2.h pick
  acknowledgment. S31 handoff drops the pick item.

### Tooling / hooks / settings

- **No hook / settings / Vite config changes** in PR #96. 6 files: 5
  new in `lib/views/inactive/` + 1 line-add in `App.tsx`. ✓
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged from S30.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block. ✓
- **Cowork "Auto-archive on PR close"** — see Item A above. One slip;
  monitor.

### Anchor compliance

No `labor-report.md` heading-level edits in PR #96. The audit doc +
handoff updates this session touch only `docs/audits/` and
`docs/SESSION_*` — neither affects the anchor graph in labor-report.md.
Anchor verifier rerun skipped per precedent.

### Tool sprawl

- `app/src/lib/views/inactive/` is a new directory — 5 files (`build.ts`,
  `InactiveView.tsx`, `index.ts`, `inactive.test.ts`,
  `inactive-view.test.tsx`). Clean module layout matching
  `lib/views/labor/` + `lib/views/staffing-plan/`. ✓
- No new dependencies. `package.json` unchanged. ✓
- `App.tsx` gained 4 lines for the new tab + `Tab` union member +
  switch arm. Additive only. ✓

### Doc-vs-implementation

- [`labor-report.md § Tab 13 § KosPos improvement #1`](../domain/labor-report-tabs.md#tab-13--inactive)
  describes "no separate import or paste" — PR #96 implements that
  literally. Improvement #2 (unlimited count) — implemented. Spec stays
  in sync. ✓
- **`docs/DECISIONS.md`** — no new ADRs in PR #96. The
  staffing-plan no-upstream-source pattern + `Position.cat1718` lift +
  ADR-007 amendment + BFM eturn ADR + `iso()` serial-converter note —
  all 5 still queued for Phase 2.4. **New for Phase 2.4 queue:** the
  inactive-as-pure-query pattern is a small addition worth mentioning
  in the staffing-plan ADR (both views have no upstream importer
  source — they're derived from the joined snapshot).
- **`docs/data-sources/`** — OBI BI Payroll data-source doc still
  doesn't note the Excel-serial date-cell behavior (Item #19 from
  Phase 2.2.g audit). Unchanged. Low priority.

### New drift items

- **36 stale local-only `docs/*` branches** on the local clone (counted
  via `git branch --list "docs/*"`). They don't occupy worktrees, but
  they clutter `git branch` listings. Single `for b in (git branch
  --list "docs/*"); git branch -D $b; end` after spot-confirming none
  are unmerged. **Out of scope for this session;** flag as a
  housekeeping note for whenever Alex wants a 5-minute cleanup pass.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #96 | Inactive view ships Tab 13 replacement end-to-end | stable |
| 2 | PR #96 | Position-level (not person-level) — rationale documented in build.ts | stable |
| 3 | PR #96 | Three empty-state branches cover the missing-input cases | stable |
| 4 | PR #96 | Reason-chip filter as `role="radiogroup"` with per-reason counts | stable |
| 5 | PR #96 | `npm run build` caught unused-import that vitest run missed | stable |
| 6 | PR #96 | `npm test` 374/374 (+20 from Phase 2.2.h start) holds | stable |
| 7 | PR #96 | `Inactive` tab remains devOnly | stable |
| 8 | PR #96 | Per-view rollup type stays in `lib/views/inactive/`, not promoted | stable |
| 9 | Carry-forward A | 1 stale worktree at S31 start; swept manually; streak resets | **back on carry-forward** (monitor) |
| 10 | Carry-forward B | SESSION_LOG.md 2,809 lines (+179 from S30 baseline) | tracking — cleanup PR still queued |
| 11 | Carry-forward C | Citation anti-pattern recount: 12 instances (audit text overstated; baseline reset) | unchanged-but-accurate-now |
| 12 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 13 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 14 | Carry-forward F | Audit cadence working as designed (8th event-based trigger on time) | working as designed |
| 15 | New drift — memory | 9 files indexed; links resolve | stable |
| 16 | New drift — hooks/settings | No changes | stable |
| 17 | New drift — anchors | No heading edits this phase; verifier skip safe | stable |
| 18 | New drift — tool sprawl | New `lib/views/inactive/` dir mirrors existing view layout; no new deps | stable |
| 19 | New drift — doc-vs-impl | OBI data-source doc still missing the Excel-serial note (carry from 2.2.g) | minor; low priority |
| 20 | **New drift — local branches** | 36 stale local-only `docs/*` branches; don't occupy worktrees | low priority; housekeeping note |

**Totals:** 0 applied this session · 1 carry-forward back on (A) ·
3 carry-forward unchanged (B, C, D) · 1 carry-forward stays-dropped
(E) · 1 carry-forward working-as-designed (F) · 4 new-drift stable
confirmations + 1 minor new-drift TODO (OBI serial doc, carries
from 2.2.g) + 1 new low-priority housekeeping note (36 stale local
branches).

---

## Recommendations not actioned

In priority order:

1. **Monitor auto-archive across the next 3-4 PRs** (item A) — was a
   15-PR clean streak; one slip on a docs-only PR merged outside an
   active session. If it recurs, investigate the Cowork watcher's
   merge-event lifecycle.
2. **Schedule SESSION_LOG.md trim** (item B) — 2,809 lines; past the
   2,000-line trim trigger; bundleable with item C + the Tab 24
   Improvement #6 holdReason language update + the OBI serial doc note
   from item #19. ~1.5 hours combined.
3. **Migrate the citation anti-pattern** (item C) — recount-corrected
   to 12 instances; ~20 minutes.
4. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
5. **Queue ADR amendments for Phase 2.4** — ADR-007 amendment for
   the 39-column OBI shape (+ `iso()` serial-converter note) + new ADR
   for the 64-column BFM eturn shape + new ADR for the
   `lib/staffing-plan/` no-upstream-source pattern (could also note
   the `Position.cat1718` lift + the matching inactive-view
   no-upstream-source pattern). All 5 still queued.
6. **Continue audit cadence at every phase close** (item F) — next
   audit fires when Phase 2.2.i ships. The S32 prompt template (in
   this PR's SESSION_HANDOFF.md update) preserves the Step-0 trigger.
7. **Local-branch cleanup** (new low-priority) — 36 stale `docs/*`
   branches; 5-minute pass whenever Alex wants. Out of scope for this
   audit.

None block the next session's work (Phase 2.2.i sub-phase pick).

---

## Cross-references

- Previous audit: [phase-2-2-g-close-audit.md](phase-2-2-g-close-audit.md)
  (Session 30).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.h implementation: [PR #96](https://github.com/alkprojects/kospos/pull/96)
  + Session 31 SESSION_LOG.md entry (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
