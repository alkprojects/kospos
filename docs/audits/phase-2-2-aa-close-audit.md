# Phase 2.2.aa close audit — Session 51

**Date:** 2026-05-29
**Branch:** `refactor/idb-per-store-records` ([#174](https://github.com/alkprojects/kospos/pull/174)) — squash-merged to main — plus this docs PR (`docs/s51-close`).
**Scope:** Phase 2.2.aa close audit. A focused **persistence sub-phase**: Alex picked candidate **A — scaling Stage 0 / carry-forward O** (the per-store IDB record split). Single code change, shipped + verified; this audit closes it.

Last audit was the [Phase 2.2.z close audit](phase-2-2-z-close-audit.md) one session prior (S50).

## Methodology

1. Confirmed current state on main (`git log --oneline origin/main` topped at the S50 docs PR #173 / e4d8800 — matched the handoff exactly; **no stale-prompt drift this session**) and the **880**-test baseline after `npm install`.
2. Read the persistence path (`idb-persistence.ts`, `use-auto-persistence.ts`, `snapshot.ts`, `store.ts`) before designing — a data-loss-adjacent change.
3. Used `AskUserQuestion` for the 2.2.aa pick; the answer surfaced ambiguously ("You chose" with no option attached), so **asked for explicit confirmation rather than guessing** on a persistence change — Alex confirmed **A**.
4. Shipped 1 code PR, verified four ways (unit round-trip, real-IDB migration, before/after timing, live-app group isolation) + build.
5. Re-checked the S50 carry-forward items (B, C, D, F, I, L, N, O, D1/D2/D3, CH, SCALE).
6. Updated memory (`citywide_scaling.md` — Stage 0 shipped); refreshed the index.

---

## Part 1 — This session's PR

### Finding 1 — Per-store IDB record split (scaling Stage 0 / carry-forward O, #174)

**Status:** resolved — **carry-forward O closed.**

Auto-persistence wrote the entire `SessionFile` to one IDB record (`'current'`) on every change. Since the envelope is almost entirely `loadedRows` (~375 MB at DBI+CPC scale), editing one note structured-cloned all 375 MB to IndexedDB — the ~5 s post-refresh freeze and the monolithic-save wall (Stage 0 in [`s50-citywide-scaling.md`](../proposals/s50-citywide-scaling.md)). The change has three tightly-coupled parts, all one logical change ("make IDB persistence incremental"):

1. **Per-store split.** Four independently-written records — `meta` / `rows` / `scrapers` / `planning` — replace the single `'current'`. The hook tracks dirty store groups; `saveGroupsToIdb(file, dirty)` writes only those + the tiny always-written `meta`. A planning edit rewrites the small `planning` record and never touches the heavy `rows` record.
2. **Post-load re-save removed.** `loadCompleteRef` is now set **after** `restoreStoresFromPayload`, so restoring the just-read snapshot no longer marks every group dirty and rewrites `rows` on every page load — that redundant write was the load-time half of the freeze.
3. **Atomic migration.** On first load a legacy monolithic `'current'` record is split into the four per-group records and deleted in **one transaction** — no data-loss window. `splitSessionFile`/`mergeIdbRecords` are a lossless round-trip (unit-proven), so the migration preserves every byte.

`captureCurrentSnapshot` + the SessionFile envelope are unchanged, so the Cloudflare-publish + JSON-export paths keep working as-is.

**Verification (the proof, four ways):**
- **Unit:** +11 pure split/merge tests — lossless round-trip (= migration data-safety), field partitioning, sparse-read defaulting, fresh-browser → null. 880 → **891**; `npm run build` clean.
- **Real-IDB migration (preview-MCP):** seeded a legacy `'current'` (2 rows + a note) → reload → records became `['meta','planning','rows','scrapers']`, `'current'` deleted, **all data preserved** (rows, `lastBfmImportAt`, note, `savedAt`), app restored with no console errors ("Restored from this browser (saved 2026-05-15)").
- **Felt win (before/after timing):** at 100k rows (~92 MB) a planning edit's IDB write dropped **444 ms → 1.4 ms (~317×)**. At Alex's ~375 MB scale (~4×) the old path extrapolates to >1 s/edit — matching the reported freeze.
- **Live-app group isolation:** a real `rows`-group edit grew the `rows` record 2→3 while the `planning` record stayed **byte-identical**.

**Disposition:** resolved. Closes carry-forward **O**; advances **SCALE** (this is Stage 0; Stage 1 = move `loadedRows` to its own object store).

---

## Part 2 — Status check on carry-forward items

| # | Item | This audit | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md (now ~4,045 ln) | grew with S51 | deferred-with-reason (P6) |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | unchanged | deferred-with-reason (P6) |
| F | Audit cadence | **27th event-based trigger** | working as designed |
| I | Cloudflare SEC-2 + SEC-3 | unchanged | tracked for named-workspace v2 — == scaling Stage 3 |
| ~~O~~ | Post-refresh IDB freeze (~5s @ 375 MB) | **RESOLVED (#174)** — per-store split + post-load re-save removed | **retired** |
| L | dev-mode/permissions ADR | unchanged | optional — Alex's call |
| N | Deep-link Data sub-tabs | unchanged | minor UX, optional |
| D1/D2/D3 | C-series aesthetic tail | unchanged | need Alex's two answers; still a 2.2.ab candidate |
| CH | Safe-dedup menu | unchanged | batches 3/5/6/7/8/9 remain |
| **SCALE** | Citywide-scaling roadmap | **Stage 0 shipped (#174)** | Stage 1 (loadedRows → own IDB store) is the next scaling step |

---

## Part 3 — New drift scan

### Memory
- **One memory updated:** `citywide_scaling.md` — Stage 0 marked shipped (#174) with the measured win, and the "next step" repointed from Stage 0 to Stage 1. Index hook in `MEMORY.md` updated to match. No new memory (the change was code, not a new durable fact about Alex/the domain).

### Tooling / deps
- **No new dependencies.** Considered adding `fake-indexeddb` to unit-test the IDB layer, but kept the established idiom (pure helpers tested; real IDB browser-verified) since jsdom ships no IndexedDB — zero-dep, and a real browser is a more faithful check than any fake. One new test file (`idb-split.test.ts`); no new dirs.

### Doc-vs-implementation
- `idb-persistence.ts`'s header was rewritten to document the per-store layout, the dirty-group save contract, the atomic migration, and the single-deployment assumption. The `use-auto-persistence.ts` "single envelope" comment was corrected to the incremental per-group model (avoids a future stale-comment carry-forward, the L1 class).

### Process
- Serial-merge + re-branch-from-updated-main held again (#174 then this docs PR), conflict-free.
- `gh pr checks --watch` gated the merge; main worktree fast-forwarded; Pages deploy confirmed green.
- **No stale-prompt drift** this session — the pasted prompt matched origin/main; confirmed via `git log` before trusting it (the S49 lesson, now routine).
- One **pre-existing** ESLint `set-state-in-effect` finding (the `!enabled` branch of `use-auto-persistence.ts`) was left untouched — not introduced here, not in the CI gate (build + vitest). Noted in the PR, not folded in (the "don't bundle an unrelated fix" rule).

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | Persistence | Per-store IDB record split + atomic migration + post-load re-save removed (#174) | resolved; **O retired** |
| 2 | Scaling | Stage 0 shipped; the freeze fix and the first incremental-persistence step are the same work | SCALE advanced (Stage 1 next) |
| 3 | Tests | 880 → 891 (+11 split/merge) | stable |
| 4 | Memory | `citywide_scaling.md` updated (Stage 0 shipped) | indexed |

**Totals:** 1 code PR (#174) + this docs close PR · carry-forward O retired · SCALE advanced to post-Stage-0 · 1 memory updated · B/C/D/I/L/N/D1-D3/CH unchanged.

---

## Recommendations not actioned

In priority order (full menu in the S52 handoff):

1. **Phase 2.2.ab pick** — top candidates: **scaling Stage 1** (move `loadedRows` into its own IDB object store written only on import — the natural follow-on, removes the monolithic-save wall for the biggest term); **CH batches 3/5/6/7/8/9** (safe dedup); or **D1/D2** once Alex answers the two aesthetic questions (pill radius; `--danger-strong`).
2. **Deploy the Cloudflare Worker** (`dhrWorkerUrl` slot already in the UI) — durable proxy-rot fix; also the first toe into scaling Stage 3's shared-storage question. Needs Alex's Cloudflare action.

None block the next session.

---

## Cross-references

- Previous close audit: [phase-2-2-z-close-audit.md](phase-2-2-z-close-audit.md) (Session 50).
- This session's PR: [#174](https://github.com/alkprojects/kospos/pull/174).
- New/changed surfaces: `app/src/lib/session/idb-persistence.ts` (split/merge/migrate/`saveGroupsToIdb`), `app/src/lib/session/use-auto-persistence.ts` (dirty-group save + post-load flag), `app/src/lib/session/idb-split.test.ts` (new).
- Scaling roadmap: [s50-citywide-scaling.md](../proposals/s50-citywide-scaling.md) (Stage 0 now shipped).
- Updated memory: `memory/citywide_scaling.md`.
