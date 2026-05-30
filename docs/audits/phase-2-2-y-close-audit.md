# Phase 2.2.y close audit — Session 49

**Date:** 2026-05-29
**Branches:** `fix/eligibility-refresh-proxy` ([#166](https://github.com/alkprojects/kospos/pull/166)), `refactor/lib-format` ([#167](https://github.com/alkprojects/kospos/pull/167)), `chore/refresh-stale-persistence-comments` ([#168](https://github.com/alkprojects/kospos/pull/168)) — all squash-merged to main — plus this docs PR (`docs/s49-close`).
**Scope:** Phase 2.2.y close audit. A **bug-fix + code-health away-session**: Alex was going to sleep and asked me to (1) front-load any blocking questions, (2) investigate a reported **eligibility-refresh slowdown**, and (3) use the sleep time productively.

Last audit was the [Phase 2.2.x close audit](phase-2-2-x-close-audit.md) one session prior (S48).

## Methodology

1. Confirmed current state on main (**this is where the session pivoted — see Finding 0**) and the **875**-test baseline after `npm install`.
2. Diagnosed the eligibility slowdown empirically (live `curl` of every proxy in the chain) before writing any code.
3. Shipped 3 single-purpose PRs, each verified (tests + build; live measurement for #166).
4. Re-checked the S48 carry-forward items (B, C, D, F, I, L, N, O, D1/D2/D3, CH).
5. Scanned for new drift; applied the safe code-health batches the S48 review agents had pre-vetted.

---

## Part 0 — The stale-prompt pivot (the defining event of this session)

**Status:** resolved; worth recording so it doesn't recur silently.

The prompt pasted to start the session was the **S46-era** block ("pick Phase 2.2.v"; menu H/P/M/E/F/G). A `git fetch` showed origin/main was actually at **end-of-S48 (#165)** — three sessions ahead. So **everything on that menu was already shipped**: H (modal lift, #156), the eligibility *concurrency* rework (#154), and the file-load scraper-parity fix (#157). Alex picked **H** via `AskUserQuestion` — but H existed.

I caught this only because I `git fetch`-ed and re-read the *current* `fetch.ts` before editing (my first reads were of the stale worktree branch). The correct response was to **discard the stale menu and act on Alex's real, current directives**: the eligibility slowdown (his explicit ask) + the handoff's pre-blessed away-session code-health. **Lesson:** always reconcile a pasted prompt against `git log --oneline origin/main -10` *before* trusting its menu; when they disagree, the repo wins.

**Disposition:** resolved — the S50 handoff now warns the next session explicitly.

## Part 1 — This session's PRs

### Finding 1 — Eligibility refresh slowdown was external proxy rot (#166)

**Status:** resolved.

Alex: the refresh "used to run fast, now seems very slow." A live S49 check of the CORS-proxy chain:

| Proxy (chain order *before*) | Live result | Time |
|---|---|---|
| corsproxy.io (1st) | HTTP 403 "Server-side requests are not allowed on your plan" (went paid) | ~0.1s |
| allorigins.win (2nd) | HTTP 500 — **observed ~12s to return it** | up to 12s |
| codetabs.com (3rd) | 200, full DHR page | ~0.5s |

#154 (S46) had already added bounded-concurrency waves **and** a 10s per-proxy timeout — but left `DEFAULT_PROXIES` ordered with the two now-dead proxies first. So every page burned the timeout on the hung allorigins before reaching the one working proxy; over the 6-wide waves that's ~2 minutes. **Fix:** reorder **codetabs-first** + switch codetabs to its trailing-slash URL (skips a 301: ~0.5s vs ~1.2s/page). Restores the ~5s scrape. The shared `DEFAULT_PROXIES` reorder also speeds `pdf-parse.ts`'s serial loop for free. +1 regression test (a healthy page is served by codetabs without touching the dead fallbacks). The diagnosis (not the fix) is the valuable part: this was code that *looked* fine and had even been "perf-fixed" once — the rot was downstream.

**Disposition:** resolved.

### Finding 2 — `lib/format.ts` (code-health batch 1, #167)

**Status:** resolved.

5 byte-identical `fmtMoney` + 3 byte-identical `fmtSignedMoney` copies → one module. The U+2212 signed minus is preserved (load-bearing). `StaffingPlanView` imports only `fmtSignedMoney` (it never called `fmtMoney` directly — `tsc -b` caught the over-broad import mid-development, a good argument for always building before the PR). `SpecialClassView`/`CalculatorView` (2-decimal) correctly excluded. 875 → 875 (pure refactor).

**Disposition:** resolved.

### Finding 3 — Stale "not persisted" claims (code-health batch L1, #168)

**Status:** resolved; **expanded beyond the doc's list**.

The S48 doc listed 5–6 stale comments. A grep turned up **more**, including **three user-facing banners** (StaffingPlan / Separations / Probation footers) telling the user data is "in-memory until Phase 2.2.33" — false since IDB auto-persistence shipped in 2.2.q, and actively misleading (a user might think planning data isn't saved). Fixed **7 comments + 3 banners**; verified each claim against `use-auto-persistence.ts` (auto-saves+restores all six stores). Correctly **left** `payroll/build.ts`'s "idempotent de-dup deferred to 2.2.33" (a different, still-unshipped feature). No test asserts the old text. Clears the 3-audit-old `pdfCache` carry-forward.

**Disposition:** resolved (the user-facing-banner half was the higher-value part the doc had missed).

### Finding 4 — Carry-forward O diagnosed: the ~5s post-refresh freeze (not fixed)

**Status:** diagnosed; remains an own-change.

While confirming the IDB-persistence claims for #168, I read `use-auto-persistence.ts` end-to-end. It serializes the **entire** snapshot (including `loadedRows` + `pdfCache`) to a JSON blob on a 500ms debounce after **every** store change; on ~375 MB that JSON+IDB write blocks the main thread ~5s (the load path already documents the same 375 MB "page unresponsive" issue). **This is almost certainly the second half of Alex's "refresh is slow" experience** — the fetch was the first half (now fixed), the save-after-refresh is the second. Not fixed here (persistence-perf, riskier, and a spawned task already tracks it); proposed fixes are in the S50 handoff.

**Disposition:** flagged with a concrete diagnosis; own change.

### Finding 5 — A UI/UX review agent was spawned then its output deleted

**Status:** resolved (self-corrected).

Early in the session — before I'd reconciled the repo state — I spawned a background UI/UX-review agent. It ran against the *stale* worktree and wrote `docs/proposals/ui-ux-review-s46.md`, which **duplicated** the repo's existing `s46-ui-ux-review.md` (+ the `s48-code-health-review.md` that already covered the same ground). I deleted the duplicate. **Lesson:** reconcile repo state *before* fanning out agents, or they do redundant work.

**Disposition:** resolved; no artifact left behind.

---

## Part 2 — Status check on carry-forward items

| # | Item | This audit | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md (now 3,979 ln) | grew with S49 | deferred-with-reason (P6) |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | unchanged | deferred-with-reason (P6) |
| F | Audit cadence | **25th event-based trigger** | working as designed |
| I | Cloudflare SEC-2 + SEC-3 | unchanged | tracked for named-workspace v2 |
| L | dev-mode/permissions ADR | unchanged | optional — Alex's call |
| N | Deep-link Data sub-tabs | unchanged | minor UX, optional |
| O | Post-refresh IDB freeze (~5s @ 375 MB) | **diagnosed** (Finding 4) | own change — spawned task stands |
| D1/D2/D3 | C-series aesthetic tail | unchanged | need Alex sign-off; 2.2.z candidate |
| CH | Safe-dedup menu | **batch 1 ✅ #167 · batch L1 ✅ #168** | 2/3/5/6/7/8/9 remain |
| PDF-TO | `pdf-parse.ts` lacks a per-proxy timeout | **new** (found this session) | new carry-forward — small fix |
| ~~pdfCache "lost on reload"~~ | — | **resolved #168** | retired |
| ~~eligibility slow~~ | — | **resolved #166** | retired |

---

## Part 3 — New drift scan

### Memory
- **One new memory written:** `proxy_rot.md` — the recurring pattern that free public CORS proxies rot, the durable fix (the Cloudflare-Worker `dhrWorkerUrl` slot already in the UI), and the "check proxy health first" diagnosis shortcut. Indexed in `MEMORY.md`.

### Tooling / deps
- **No new dependencies.** One new module (`lib/format.ts`). No new dirs.

### Doc-vs-implementation
- This session *reduced* doc drift materially (#168 fixed 10 stale persistence claims). `fetch.ts` + `ScrapeSourcesPanel.tsx` proxy comments now reflect the S49-verified proxy health.

### Process
- Serial-merge + re-branch-from-updated-main held again across 3 PRs.
- `gh pr checks --watch` used to gate every merge; main worktree fast-forwarded post-session.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 0 | Session shape | Stale S46 prompt vs end-of-S48 repo → pivoted to real directives | resolved (handoff warns S50) |
| 1 | Scrapers | Eligibility slowdown = proxy rot; codetabs-first reorder (#166) | resolved |
| 2 | Code-health | `lib/format.ts` batch 1 (#167) | resolved |
| 3 | Code-health / UX | Stale "not persisted" claims — 7 comments + 3 banners (#168) | resolved |
| 4 | Persistence | O diagnosed: 375 MB snapshot serialized on every debounce → ~5s freeze | own change |
| 5 | Process | Redundant UI/UX agent output deleted | resolved |
| 6 | Tests | 874 → 875 (+1 regression test) | stable |
| 7 | New carry-forward | `pdf-parse.ts` per-proxy timeout (PDF-TO) | small follow-up |

**Totals:** 1 user-reported regression fixed (#166) · 2 code-health batches shipped (#167 format, #168 stale-claims — the latter expanded to user-facing banners) · O diagnosed · 1 new carry-forward (PDF-TO) · 2 carry-forwards retired (pdfCache comment, eligibility-slow) · B/C/D/I/L/N/D1-D3 unchanged.

---

## Recommendations not actioned

In priority order (full menu in the S50 handoff):

1. **Phase 2.2.z pick** — `lib/ui/Stat.tsx` (CH batch 2, prepped + ready), other safe-dedup batches, the IDB-freeze fix (O — a perf win Alex will *feel*), the `pdf-parse.ts` timeout (PDF-TO), or D1/D2 once Alex answers the two aesthetic questions.
2. **Fix the IDB freeze (O)** — the second half of the "slow refresh" experience; pick (a)/(b)/(c) from the handoff.
3. **Deploy the Cloudflare Worker** (`dhrWorkerUrl` slot already in the UI) as the durable answer to proxy rot — see `memory/proxy_rot.md`. Needs Alex's Cloudflare action.

None block the next session.

---

## Cross-references

- Previous close audit: [phase-2-2-x-close-audit.md](phase-2-2-x-close-audit.md) (Session 48).
- This session's PRs: [#166](https://github.com/alkprojects/kospos/pull/166), [#167](https://github.com/alkprojects/kospos/pull/167), [#168](https://github.com/alkprojects/kospos/pull/168).
- New surfaces: `app/src/lib/format.ts`; reordered `app/src/lib/scrapers/sf-dhr-exam/fetch.ts` § DEFAULT_PROXIES.
- Code-health menu: [s48-code-health-review.md](../proposals/s48-code-health-review.md) (batches 1 + 4 now done).
- New memory: `memory/proxy_rot.md`.
