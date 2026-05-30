# Phase 2.2.z close audit — Session 50

**Date:** 2026-05-29
**Branches:** `refactor/lib-ui-stat` ([#170](https://github.com/alkprojects/kospos/pull/170)), `fix/pdf-parse-timeout` ([#171](https://github.com/alkprojects/kospos/pull/171)), `docs/citywide-scaling` ([#172](https://github.com/alkprojects/kospos/pull/172)) — all squash-merged to main — plus this docs PR (`docs/s50-close`).
**Scope:** Phase 2.2.z close audit. A **code-health + strategy session**: Alex delegated the pick ("whichever you recommend — could you do all?") and added a strategic ask — **think about scaling from DBI+CPC (~1k) to citywide (~45k)**.

Last audit was the [Phase 2.2.y close audit](phase-2-2-y-close-audit.md) one session prior (S49).

## Methodology

1. Confirmed current state on main (`git log --oneline origin/main` topped at the S49 docs PR #169 / b3720f1 — matched the handoff exactly; **no stale-prompt drift this session**) and the **875**-test baseline after `npm install`.
2. Reframed the four-candidate menu against Alex's "do all + think about scaling" — traced the persistence + import data path *before* answering the scaling question.
3. Shipped 2 safe code-health PRs + 1 strategic docs PR, each verified (tests + build).
4. Re-checked the S49 carry-forward items (B, C, D, F, I, L, N, O, D1/D2/D3, CH, PDF-TO).
5. Wrote one new memory (`citywide_scaling.md`); updated the index.

---

## Part 1 — This session's PRs

### Finding 1 — `lib/ui/Stat.tsx` (code-health batch 2, #170)

**Status:** resolved.

8 byte-identical `function Stat({ label, value, hint? })` copies across the eight list views → one shared component. PositionsView was the hint-less subset; the canonical's optional `hint` renders nothing when omitted, so its output is byte-identical. Added `stat.test.tsx` locking the contract (label+value render, the conditional hint line, the 20px/700 type scale via computed `style` assertions). 875 → 879. `tsc -b` + `vite build` clean. Behavior-neutral: the only view changes are the deleted local definitions + the added `'../../ui'` import.

**Disposition:** resolved. Clears CH batch 2. Batches 3/5/6/7/8/9 remain.

### Finding 2 — Per-proxy timeout for the lazy PDF fetch (PDF-TO, #171)

**Status:** resolved.

`fetchPdfBinary` (the per-modal-open PDF cover-sheet fetch) walked the proxy chain with no timeout, so a hung proxy could block the extraction indefinitely — the same failure class as the S49 eligibility-scrape rot (#166). Exported `fetch.ts`'s existing `fetchWithTimeout` (AbortController-backed) and reused it in `fetchPdfBinary` rather than re-implementing. New `timeoutMs` option, default `PDF_PROXY_TIMEOUT_MS = 20s` — deliberately more generous than the 10s listing-page timeout, since a score-report PDF can be MBs of names and a working-but-slow proxy shouldn't be clipped (the goal is bounding a HUNG proxy, not a large download). +1 test (a hung proxy is aborted via the timeout and falls through to the next — it would hang forever without the abort, so a green run proves it). 879 → 880.

**Disposition:** resolved. Retires carry-forward PDF-TO.

### Finding 3 — Citywide scaling analysis + staged roadmap (#172)

**Status:** resolved (the strategic answer Alex asked for).

Alex asked whether KosPos can scale to ~45k citywide. Traced the data path to answer it grounded: the ~375 MB snapshot is almost entirely `loadedRows` (raw OBI payroll — *one row per position × earning code × pay period* per the importer header), held in one in-memory array and structured-cloned whole on every change. Both are O(total) → realistic ceiling ~a few thousand people. Documented three walls (in-memory hold / monolithic per-change save / JSON-string ceiling), the target architecture, and a staged roadmap whose **Stage 0 is carry-forward O done scaling-aligned** (per-store IDB record split) — so the freeze fix and the long-term direction are the same work. Recommendation: defer the full re-architecture (its own Phase), do Stage 0 next, record the chosen direction as an ADR when picked. → [`docs/proposals/s50-citywide-scaling.md`](../proposals/s50-citywide-scaling.md).

**Disposition:** resolved as analysis; the decision (when/whether to start the re-architecture) is Alex's.

### Finding 4 — Carry-forward O reframed, not just deferred

**Status:** reframed.

The S49 audit had O (the ~5s post-refresh freeze) as a standalone "own change." This session connected it to the scaling goal: the freeze and the citywide wall are the *same* monolithic-persistence problem. So O is now **Stage 0 of the scaling roadmap** — the per-store IDB record split — which relieves the freeze at current scale AND is the first incremental-persistence step. This is the disciplined alternative to a throwaway band-aid (Web Worker), and the recommended next sub-phase (2.2.aa). Not started this session — it's data-loss-adjacent and a sub-phase's worth of work; rushing it at the tail of a 3-deliverable session would violate the no-bundle / no-rush discipline.

**Disposition:** reframed as scaling Stage 0; designed in the s50 proposal; recommended for 2.2.aa.

---

## Part 2 — Status check on carry-forward items

| # | Item | This audit | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md (now ~4,080 ln) | grew with S50 | deferred-with-reason (P6) |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | unchanged | deferred-with-reason (P6) |
| F | Audit cadence | **26th event-based trigger** | working as designed |
| I | Cloudflare SEC-2 + SEC-3 | unchanged | tracked for named-workspace v2 — **now == scaling Stage 3** |
| L | dev-mode/permissions ADR | unchanged | optional — Alex's call |
| N | Deep-link Data sub-tabs | unchanged | minor UX, optional |
| **O** | Post-refresh IDB freeze (~5s @ 375 MB) | **reframed as scaling Stage 0** (Finding 4) | recommended next sub-phase (2.2.aa); designed in s50 proposal |
| D1/D2/D3 | C-series aesthetic tail | unchanged | need Alex's two answers; still a 2.2.z+ candidate |
| CH | Safe-dedup menu | **batch 2 ✅ #170** | batches 3/5/6/7/8/9 remain |
| ~~PDF-TO~~ | `pdf-parse.ts` per-proxy timeout | **resolved #171** | retired |
| **SCALE** | Citywide-scaling roadmap | **new** (#172) | strategic backdrop; O is its Stage 0 |

---

## Part 3 — New drift scan

### Memory
- **One new memory:** `citywide_scaling.md` — Alex's ~45k-citywide north-star, the in-memory + monolithic-save ceiling, and the staged roadmap (Stage 0 = O). Indexed in `MEMORY.md`. Links [[data_sensitivity]] + [[proxy_rot]] (both touch the "Alex provisions cloud" lever).

### Tooling / deps
- **No new dependencies.** One new module (`lib/ui/Stat.tsx`) + one new test (`stat.test.tsx`). No new dirs.

### Doc-vs-implementation
- The scaling doc cites exact code paths (`store.ts`, `obi-payroll.ts`, `use-auto-persistence.ts`, `idb-persistence.ts`) so the next session can act on Stage 0 directly. The PDF-TO change keeps `pdf-parse.ts`'s header comment about the shared proxy chain accurate.

### Process
- Serial-merge + re-branch-from-updated-main held again across 3 PRs (#170 → #171 → #172), all conflict-free.
- `gh pr checks --watch` gated every merge; main worktree fast-forwarded after each.
- **No stale-prompt drift** this session (S49's defining failure) — the pasted prompt matched origin/main; confirmed via `git log` before trusting it, per the S49 lesson.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | Code-health | `lib/ui/Stat.tsx` batch 2 (#170) | resolved |
| 2 | Scrapers | PDF fetch per-proxy timeout (#171) | resolved; PDF-TO retired |
| 3 | Architecture | Citywide scaling analysis + roadmap (#172) | resolved (decision is Alex's) |
| 4 | Persistence | O reframed as scaling Stage 0 (per-store split) | recommended for 2.2.aa |
| 5 | Tests | 875 → 880 (+4 Stat, +1 PDF timeout) | stable |
| 6 | Memory | `citywide_scaling.md` added | indexed |

**Totals:** 2 code-health/robustness PRs (#170 Stat, #171 PDF timeout) · 1 strategic docs PR (#172 scaling) · O reframed as Stage 0 · 1 carry-forward retired (PDF-TO) · 1 new memory · B/C/D/I/L/N/D1-D3 unchanged.

---

## Recommendations not actioned

In priority order (full menu in the S51 handoff):

1. **Phase 2.2.aa pick** — **scaling Stage 0 / carry-forward O** (the per-store IDB record split: kills the freeze + first incremental-persistence step; designed in the s50 proposal) is the strongest pick. Alternatives: CH batches 3/5/6/7/8/9 (safe dedup), or D1/D2 once Alex answers the two aesthetic questions.
2. **Deploy the Cloudflare Worker** (`dhrWorkerUrl` slot already in the UI) — durable proxy-rot fix; also the first toe into scaling Stage 3's shared-storage question. Needs Alex's Cloudflare action.

None block the next session.

---

## Cross-references

- Previous close audit: [phase-2-2-y-close-audit.md](phase-2-2-y-close-audit.md) (Session 49).
- This session's PRs: [#170](https://github.com/alkprojects/kospos/pull/170), [#171](https://github.com/alkprojects/kospos/pull/171), [#172](https://github.com/alkprojects/kospos/pull/172).
- New surfaces: `app/src/lib/ui/Stat.tsx` (+ `stat.test.tsx`); exported `fetchWithTimeout` from `sf-dhr-exam/fetch.ts`; `docs/proposals/s50-citywide-scaling.md`.
- Code-health menu: [s48-code-health-review.md](../proposals/s48-code-health-review.md) (batches 1, 2, 4 now done).
- New memory: `memory/citywide_scaling.md`.
