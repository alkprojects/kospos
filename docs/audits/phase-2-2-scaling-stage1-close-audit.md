# Scaling Stage 1 close audit — Session 54

**Date:** 2026-05-30
**Branch:** `feat/scaling-stage1-rows-store` ([#182](https://github.com/alkprojects/kospos/pull/182), squash `c486892`) — plus the docs-only `docs/labor-report-split` ([#181](https://github.com/alkprojects/kospos/pull/181), squash `c016109`) and this session-close docs PR.
**Scope:** S54 milestone close. Two teed-up tasks shipped as separate PRs: (1) the labor-report.md split — **docs-only, no audit, short SESSION_LOG entry** per [ADR-017](../DECISIONS.md); (2) **Scaling Stage 1** — an architectural/persistence change that **does** qualify for a full close audit. This audit covers Stage 1; the split is summarized for completeness.

Last close audit was [Phase 2.2.ab](phase-2-2-ab-close-audit.md) (S52, the Calendar sub-tab); S53 was a governance session (lightened cadence, logged in SESSION_LOG, no per-sub-phase audit). This is the first audit under the ADR-017 milestone-only regime — and Stage 1 is exactly the kind of change it reserves audits for.

## Methodology

1. Confirmed state on main BEFORE trusting the prompt: `git log --oneline origin/main` topped at the S53 close #180 / `9cab87a` — matched the handoff exactly (**no stale-prompt drift**). `npm install` then `npm test` → **896/896** baseline.
2. Read the full persistence path (`idb-persistence.ts`, `use-auto-persistence.ts`, `snapshot.ts`, `store.ts`) + the Stage-0 test (`idb-split.test.ts`) + the s50 proposal before touching code — a data-loss-adjacent change.
3. Shipped 1 docs PR (#181) + 1 code PR (#182), serial-merge + re-branch-from-updated-`origin/main` each time.
4. Verified Stage 1 three ways per Alex's explicit instruction — **tests + a real-IDB migration check + timing, NOT a UI preview**.
5. Updated memory (`citywide_scaling.md` — Stage 1 shipped, next = Stage 2) + index hook.

---

## Part 1 — This session's PRs

### Finding 1 — `loadedRows` moved to its own IndexedDB object store (Scaling Stage 1, #182)

**Status:** resolved — **SCALE advanced to post-Stage-1.**

Stage 0 (#174) split the monolithic snapshot into four per-group **records** in one `snapshots` object store. Stage 1 promotes the heavy `rows` payload (`loadedRows` + `lastBfmImportAt` — ~375 MB at DBI+CPC scale, the term that grows with headcount) from a *record* into its **own `imported-rows` object store**, written only when the rows group is dirty (i.e. on import).

Why an object store, not just a record (the Stage-0 → Stage-1 delta): a dedicated store lets a planning/scrapers save transact over `snapshots` **alone** — the rows store is never even opened, so there is zero store-level lock coupling with the heavy payload — and it is the **precondition for Stage 2** (you can add indexes to a store, not to a record). The public API (`saveGroupsToIdb` / `loadSnapshotFromIdb` / `clearSnapshotFromIdb` / `splitSessionFile` / `mergeIdbRecords` / `STORE_GROUPS`) is unchanged, so `use-auto-persistence.ts` and its tests needed **zero** edits.

- **`DB_VERSION` 1→2**; the upgrade callback only **creates** the `imported-rows` store. Data migration is lazy (load-path), kept in one place rather than split between the versionchange transaction and the load path.
- **Migration covers both prior layouts atomically across both stores:** a Stage-0 `rows` record → moved into `imported-rows` + old record deleted; a pre-Stage-0 `current` monolith → split, rows routed to `imported-rows`, light records to `snapshots`, `current` deleted. A failed migration leaves the old layout intact for the next load to retry — no data-loss window.

**Verification (the proof — tests + real-IDB migration + timing, per Alex's "NOT a UI preview"):**
- **Real-IDB tests:** +9 tests in `idb-rows-store.test.ts` driving the actual `idb` orchestration against **`fake-indexeddb`** (a real IDB implementation): round-trip; store placement (rows land in `imported-rows`, never in `snapshots`); **both migration paths** + idempotency; the incrementality guarantee (a planning save leaves the rows-store record **byte-identical**); clear. Suite **896 → 905**; `npm run build` (tsc -b + vite) clean.
- **Timing probe** against the real `saveGroupsToIdb` (fake-indexeddb, deleted before commit — not a flaky committed assertion): a planning save is **flat at ~0.3 ms** regardless of row count, while a rows save scales linearly — **73.6 ms @ 50k, 362.1 ms @ 200k, 976.9 ms @ 500k rows** (116× → 1,116× → 3,824×). Persistence cost is O(that edit), not O(all rows). (In-memory numbers; the flat-vs-linear *shape* is the faithful characteristic.)

**Disposition:** resolved. Closes carry-forward **SCALE / Stage 1**; next scaling step is **Stage 2** (index by department + lazy load + aggregate-on-import — its own Phase).

### Finding 2 — labor-report.md split (docs-only, #181)

**Status:** resolved — **carry-forward SPLIT closed.** Not a milestone; summarized here, no separate audit (ADR-017).

The 8,518-line `labor-report.md` was ~93% "Per-tab detail." Moved that block (lines 277–8160, Tabs 1–27) into a new sibling `docs/domain/labor-report-tabs.md`; `labor-report.md` stays the ~660-line index (how-to, cross-cutting, tab list, build-status scorecard, data-sources inventory, Phase 2.2 sub-phases, cross-references) with a pointer. Heading slugs preserved byte-for-byte (no duplicate base heading straddles the split boundary, so GitHub's `-N` suffix numbering is unchanged). **100 anchor links rewritten** (53 inbound across 14 files + 30 moved→retained back-links + 17 index→tabs), driven by a GitHub-accurate slugger so each resolves to the file its target now lives in; also fixed a pre-existing 3-dash `#tab-10---probation` typo. A post-split resolver pass confirmed **233/233 links resolve, 0 dangling.**

---

## Part 2 — Status check on carry-forward items

| # | Item | This session | Disposition |
|---|---|---|---|
| **SPLIT** | labor-report.md split + anchor fixes | **SHIPPED (#181)** | **retired** |
| **SCALE** | Scaling Stage 1 (`loadedRows` → own object store) | **SHIPPED (#182)** | **retired**; Stage 2 is next (own Phase) |
| CH | Code-health safe-dedup batches 3/5/6/7/8/9 | unchanged | open (away-session fodder) |
| D1/D2 | C-series aesthetic tail (pill radius; `#b91c1c`→`--danger-strong`) | unchanged | needs Alex's 2 answers |
| TX | `temporary_exchange_tx` memory — 4 unconfirmed questions | unchanged | ask Alex when relevant |
| F | Audit cadence | this audit fired (milestone) | governed by ADR-017, working as designed |

---

## Part 3 — Drift scan

### Memory
- **One memory updated:** `citywide_scaling.md` — Stage 1 marked shipped (#182) with the measured timing + the migration/test approach; "next step" repointed Stage 1 → Stage 2. `MEMORY.md` index hook unchanged (still accurate). No new memory (the change was code, not a new durable fact about Alex/the domain).

### Tooling / deps
- **Added `fake-indexeddb` (devDependency, test-only).** This **reverses the Stage-0 decision** (the aa-audit explicitly *declined* it, preferring preview-MCP since "jsdom ships no IndexedDB"). The reversal is deliberate and instruction-driven: Alex's S54 prompt required **"a real-IDB migration check via tests — NOT a UI preview,"** which is precisely what fake-indexeddb enables in vitest. Net: the IDB orchestration (version bump, cross-store migration, selective writes) is now regression-guarded in CI, not only manually browser-checked. A reasonable cost (one well-known test-only dep) for durable coverage of a data-loss-adjacent path.
- Two new test files this session (`idb-rows-store.test.ts`, plus the docs split's throwaway analysis scripts which lived in `%TEMP%`, never in the repo). No new app dirs.

### Doc-vs-implementation
- `idb-persistence.ts`'s header was rewritten for the Stage-1 layout (two object stores, the dirty-group save contract spanning the rows store only on import, both migration paths). Guards against a stale-comment carry-forward.

### Process
- Serial-merge + re-branch-from-updated-`origin/main` held twice (#181 docs, then #182 code), conflict-free; main worktree fast-forwarded after each.
- **CI gated the code merge** (`gh pr checks` until the `test` check passed — 905 tests green in 46s — + Cloudflare Pages preview green) before squash-merging #182. The docs PR (#181) merged without waiting (docs-only).
- A misfired root-level `package-lock.json` stub (from a first `npm install` that ran at the worktree root instead of `app/`) was identified and removed; never staged. **Tooling note for next session:** the background Bash shell's cwd is the worktree root, so `npm` needs `--prefix .../app` (the absolute-paths gotcha in CLAUDE.md, here biting `npm` not just Read/Glob).
- **No stale-prompt drift** — the pasted prompt matched `origin/main` #180; confirmed via `git log` before trusting it (now routine).

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | Persistence / Scaling | `loadedRows` → own `imported-rows` object store, written only on import; both prior layouts migrate atomically (#182) | resolved; **SCALE Stage 1 retired**, Stage 2 next |
| 2 | Docs | labor-report.md split into an index + `labor-report-tabs.md`; 100 anchors rewritten, 233/233 resolve (#181) | resolved; **SPLIT retired** |
| 3 | Tests | 896 → 905 (+9 real-IDB); first IDB-orchestration coverage in CI | stable |
| 4 | Deps | `fake-indexeddb` added (test-only) — deliberate reversal of Stage 0's choice, per Alex's "tests not preview" | recorded |
| 5 | Memory | `citywide_scaling.md` updated (Stage 1 shipped) | indexed |

**Totals:** 1 code PR (#182) + 1 docs PR (#181) + this close · carry-forwards **SPLIT + SCALE/Stage-1 retired** · +9 tests · 1 memory updated · 1 new devDep · CH / D1-D2 / TX unchanged.

---

## Recommendations not actioned

In priority order:

1. **Scaling Stage 2** — index `loadedRows` by department + lazy per-department load + resolve the aggregate-on-import question. The step that actually beats the renderer-OOM wall (#1 in the s50 proposal); largest design effort, **its own Phase**, not a sub-phase. Stages 0+1 have now proved the incremental browser-local model that Stage 2 builds on.
2. **CH batches 3/5/6/7/8/9** (safe dedup) — good away-session fodder.
3. **D1/D2** (pill radius; `#b91c1c`→`--danger-strong`) — once Alex answers the two aesthetic questions.
4. **Deploy the Cloudflare Worker** (`dhrWorkerUrl` slot already wired) — durable proxy-rot fix + the first toe into Stage 3's shared-storage question. Needs Alex's Cloudflare action.

None block the next session.

---

## Cross-references

- Previous close audit: [phase-2-2-ab-close-audit.md](phase-2-2-ab-close-audit.md) (S52); Stage-0 predecessor: [phase-2-2-aa-close-audit.md](phase-2-2-aa-close-audit.md) (S51).
- This session's PRs: [#181](https://github.com/alkprojects/kospos/pull/181) (docs split), [#182](https://github.com/alkprojects/kospos/pull/182) (Stage 1).
- New/changed surfaces: `app/src/lib/session/idb-persistence.ts` (own store + dual-layout migration), `app/src/lib/session/idb-rows-store.test.ts` (new, real-IDB), `docs/domain/labor-report-tabs.md` (new), `docs/domain/labor-report.md` (index).
- Scaling roadmap: [s50-citywide-scaling.md](../proposals/s50-citywide-scaling.md) (Stages 0+1 now shipped).
- Governance: [ADR-017](../DECISIONS.md) (milestone-only audit cadence — this is its first invocation).
- Updated memory: `memory/citywide_scaling.md`.
