# Phase 2.2.v close audit — Session 46

**Date:** 2026-05-28
**Branch:** `perf/dhr-scrape-concurrency` ([#154](https://github.com/alkprojects/kospos/pull/154)) — squash-merged to main — plus this docs PR.
**Scope:** Phase 2.2.v close audit. Alex's S46 input was a **freeform bug report** — "something has changed with refreshing eligibility lists. it used to run pretty fast but now seems very slow" — which he then picked (via `AskUserQuestion`) as the headline 2.2.v over the menu candidates (H modal-lift / P source-tables / M file-load parity). Resolved in **1 perf PR** (#154), with a diagnosis grounded in live measurement.

Last audit was the [Phase 2.2.u close audit](phase-2-2-u-close-audit.md) one session prior (S45).

## Methodology

1. Traced the full "Refresh eligibility lists" path: button → `fetchDhrExamResults` → proxy chain → `setEligibilityLists` → the Phase 2.2.q auto-persistence subscription → IDB write. Used an Explore agent for the fan-out, then read the ground-truth files directly (the agent over-claimed an "O(N²)"; the refresh does a single store update, so the post-refresh save is O(snapshot) **once**).
2. **Measured, didn't guess** (preview `eval` against the real proxy + real timers):
   - `corsproxy.io` health: 200 + valid HTML in **273ms** → the proxy is NOT rotted.
   - **8 concurrent** page fetches → 8/8 → 200 in **429ms**, zero rate-limiting → concurrency is safe.
   - `structuredClone` (= the IDB-put cost) ≈ **13 ms/MB**, linear → ~5s freeze at the documented 375 MB envelope.
3. Re-ran `npm test` — **861 / 861** (was 857 at S45 close; +4 from the new concurrency tests).
4. Verified the fix **end-to-end against the live site**: 6,727 eligibility lists (~66 pages) loaded in **676ms** warm (vs ~50s before), no console errors.
5. Re-checked the S45 carry-forwards (B, C, D, F, H, I, L, M, N) + scanned for new drift.
6. Launched 3 read-only UI/UX review agents (Alex's explicit "use my sleep time / review the UI/UX / propose" directive) → a separate proposals doc.

---

## Part 1 — This session's PR

### Finding 1 — Root cause was the sequential fetch design, not proxy rot or the auto-save

**Status:** resolved (#154).

The DHR scrape fetched ~66 Drupal pages **strictly one-at-a-time with a 500ms "polite throttle"** — a hard **~33s floor from the throttle alone**, ~50s total. `fetch.ts` hadn't changed since [#114](https://github.com/alkprojects/kospos/pull/114) (S35), so the slowness is the *design*, confirmed by measurement: the proxy is healthy and tolerates 8-way concurrency without rate-limiting. The fix fetches pages in **bounded-concurrency waves (default 6)**, each page still walking the full proxy fallback chain independently, results processed in ascending page order so end-of-data detection / `onProgress` / output stay deterministic. Added a **per-proxy `AbortController` timeout (default 10s)** so a hung proxy fails over instead of stalling its wave (the *other* way a scrape could "hang"). Live result: **~50s → 676ms** (warm); cold is a few seconds, still ~10x and the ~33s throttle floor is gone.

**Disposition:** resolved.

### Finding 2 — Test strategy preserved coverage without contorting the concurrent path

**Status:** stable.

The existing behavioral tests assumed sequential, call-order-based mocking (`mockResolvedValueOnce` chains, exact call counts, "stops at page N"). Rather than weaken them, they were pinned to `concurrency: 1` (which reproduces the old sequential semantics exactly), and a new block added for the concurrent path: wave batching, **bounded over-fetch** (stops after the first empty page, no extra wave), ascending-order progress, and per-proxy-timeout failover (a URL-aware mock makes these order-independent). Net **+4 tests** (857 → 861).

**Disposition:** stable.

### Finding 3 — New regression surfaced + isolated (NOT bundled): the post-refresh IDB freeze

**Status:** new carry-forward (O); filed as a spawnable task, not fixed here.

The Phase 2.2.q auto-persistence ([#125](https://github.com/alkprojects/kospos/pull/125), 2026-05-28) subscribes every store to a 500ms-debounced save that **structured-clones the entire session envelope on the main thread** (`idb-persistence.ts` `db.put`). Measured at ~13 ms/MB → **~5s freeze at the 375 MB** real-world envelope the code already documents (S41) — after *every* store change, including a scrape refresh. At department scale (a few MB) it's negligible (~30-100ms); it bites only at citywide scale. Per working-agreement #8 this was **not folded** into the scrape PR; it's a distinct subsystem (persistence, not fetch) with a bigger/riskier fix (per-slice IDB writes or a worker). Surfaced as carry-forward **O** + a spawned follow-up task with the measured evidence + fix directions.

**Disposition:** flagged; O.

### Finding 4 — Agent-first verification; `preview_eval` carried the proof

**Status:** stable.

The diagnosis and the fix were both proven in the browser: `preview_eval` measured the proxy, the concurrency tolerance, and the clone cost up front, then drove the real shipped UI ("Refresh eligibility lists") to a 676ms / 6,727-list completion with progress sampling (12 pages by 236ms, 54 by 559ms) and a clean console. `preview_screenshot` captured the "Loaded 6,727 eligibility lists" state. This is the strongest verification chain to date — the fix decision was *evidence-led* rather than reasoned-then-hoped.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items

From the [S45 handoff carry-forward audit](phase-2-2-u-close-audit.md) (letters match that table):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md | grows each session | grows with the S46 entry | **deferred-with-reason (P6)** — unchanged |
| C | Memory-citation anti-pattern in `labor-report.md` | 12 instances | unchanged (file untouched) | bundleable with a future labor-report pass |
| D | `labor-report.md` split | 8,518 ln | unchanged | **deferred-with-reason (P6)** — unchanged |
| F | Audit cadence | 21st trigger (S45) | **22nd event-based trigger this session** | working as designed |
| H | Lift modal overlay-frame → `lib/ui/Modal.tsx` | carries 6+ sessions | unchanged; **inventoried this session** by the UI/UX review (instance list in the proposals doc) | **still the cleanest standalone — leading 2.2.w candidate** |
| I | Cloudflare hardening SEC-2 + SEC-3 | documented S42 | unchanged | tracked for named-workspace v2 |
| L | ADR for the evolved dev-mode/permissions model | optional, "now stronger" (S45) | unchanged; **the IA review gives a concrete recommendation** (proposals doc) | optional — Alex's call |
| M | Session file-load doesn't restore scraper data | new S45, flagged | unchanged; **re-confirmed by the Data-tab UX review** | own change (small) |
| N | Deep-link Data sub-tabs from the landing dashboard | new S45, optional | unchanged; **re-confirmed by the Data-tab UX review** | optional UX |
| O | **Post-refresh IDB auto-save main-thread freeze (~5s at 375 MB)** | **new this session** | measured + filed as a spawnable task | **new carry-forward — own change (persistence)** |
| — | Alex S46 freeform: eligibility-refresh slowness | new | **shipped (#154)** | **resolved** |
| — | A / E / G / J | retired / on-menu | n/a | E/G remain on the menu; A/J stay retired |

### Notes
- **B / D** remain deferred-with-reason per the S42 Opus 4.8 review P6 finding. Not re-litigated.
- **H / M / N / L** were all re-examined this session by the UI/UX review agents (not just carried) — the proposals doc gives each a concrete, file-referenced next step.
- The audit-cadence guardrail held: a sub-phase shipped, so the close audit fires here.

---

## Part 3 — New drift scan

### Memory files
- **10 memory files indexed in MEMORY.md** — unchanged. All `[[link]]`s resolve. ✓
- No memory writes needed: the scrape-concurrency direction + the IDB-freeze finding live in code + this audit + SESSION_LOG + the spawned task. Don't duplicate repo-recorded facts in memory.

### Tooling / hooks / settings / deps
- **No new dependencies.** Change is confined to `lib/scrapers/sf-dhr-exam/fetch.ts` (+ its test) and a comment in `modules/importer/ScrapeSourcesPanel.tsx`. No new dirs, no new tools.

### Doc-vs-implementation
- `fetch.ts` module docstring + the `ScrapeSourcesPanel` comment updated in-PR to describe the wave-based fetch (no longer "~500ms apart, ~30s"). The `FetchDhrOptions` doc covers the new `concurrency` / `timeoutMs` options + the repurposed `pageDelayMs` (now inter-wave).
- The `scrapers/store.ts` header `pdfCache` comment still says "In-memory only (lost on reload)" — but `pdfCache` IS persisted via the snapshot since #125 (the same comment block above it says so). Minor stale fragment; noted for a future comment pass (low priority, not a behavior issue).

### Anchor compliance
- No `labor-report.md` heading-level edits. Anchor verifier rerun skipped per precedent.

### Tool/dir sprawl
- #154: 3 files (1 rewrite + 1 test + 1 comment). Tight and on-theme.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | Scrapers/perf | DHR scrape made concurrent (~50s → ~5s); root cause was the sequential 500ms-throttle design, not proxy rot (#154) | resolved |
| 2 | Resilience | Per-proxy `AbortController` timeout — a hung proxy now fails over instead of stalling | resolved |
| 3 | Tests | Legacy tests pinned to `concurrency:1`; +4 new for the concurrent path; 857 → 861 | stable |
| 4 | Persistence | New: post-refresh full-snapshot IDB clone freeze (~5s at 375 MB) | flagged (O) + spawned task |
| 5 | Verification | Evidence-led: proxy health, concurrency tolerance, clone cost all measured; live end-to-end 676ms / 6,727 lists | stable |
| 6 | Build | `npm run build` clean | stable |
| 7 | Carry-forward H | Modal overlay-frame lift — inventoried by the UI/UX review | leading 2.2.w candidate |
| 8 | Carry-forward B/C/D | SESSION_LOG / labor-report.md — deferred-with-reason / unchanged | tracking |
| 9 | Carry-forward F | Audit cadence — 22nd event-based trigger | working as designed |
| 10 | Carry-forward I | Cloudflare SEC-2 + SEC-3 | tracking (named-workspace v2) |
| 11 | Carry-forward L | dev-mode/permissions ADR — IA review gives a recommendation | optional — Alex's call |
| 12 | Carry-forward M/N | File-load scraper parity / sub-tab deep-link — re-confirmed | own change / optional |
| 13 | UI/UX | 3 read-only review agents → a proposals doc (Alex's directive) | new artifact |
| 14 | New drift — memory/hooks/deps | None (one minor stale comment fragment noted) | stable |

**Totals:** 1 freeform directive resolved (#154, evidence-led) · 1 working-as-designed (F) · B/C/D/H/I/L/M/N unchanged/tracking (H/L/M/N re-examined by the review) · 1 new carry-forward (O, IDB freeze) + spawned task · A/E/G/J stay retired/on-menu · 1 UI/UX proposals doc · 1 docs PR (this).

---

## Recommendations not actioned

In priority order (the next-phase candidate menu lives in the S47 handoff):

1. **Phase 2.2.w pick** — strongest standalone is now **H, the modal overlay-frame lift** (`lib/ui/Modal.tsx`); the UI/UX review inventoried every instance, so the refactor is fully scoped. Other near-term: **O** (the IDB auto-save freeze — already a spawnable task), **M** (file-load scraper parity, small), **N** (sub-tab deep-link, small), plus the standing menu (P source-tables, 2.2.19 temp-limits, 2.2.22 vacancies, Cloudflare cutover).
2. **Triage the UI/UX proposals doc** — Alex picks what graduates to a sub-phase.
3. **The IDB auto-save freeze (O)** — spawned task ready; the per-slice-IDB-write direction is the likely high-value fix.
4. **Exercise the now-fast scrape + Data tab on real data** before promoting further view tabs (standing guardrail gate).
5. **dev-mode/permissions ADR (L)** — see the IA review's recommendation.
6. **SESSION_LOG trim / labor-report split (B, D)** — deferred-with-reason (P6); only if Alex asks.

None block the next session's work.

---

## Cross-references

- Previous close audit: [phase-2-2-u-close-audit.md](phase-2-2-u-close-audit.md) (Session 45).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- This session's PR: [#154](https://github.com/alkprojects/kospos/pull/154).
- UI/UX proposals: [s46-ui-ux-review.md](../proposals/s46-ui-ux-review.md).
- Changed surface: `app/src/lib/scrapers/sf-dhr-exam/fetch.ts` (+ `fetch.test.ts`), `app/src/modules/importer/ScrapeSourcesPanel.tsx`.
