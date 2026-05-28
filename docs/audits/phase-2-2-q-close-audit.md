# Phase 2.2.q close audit — Session 40

**Date:** 2026-05-28
**Branch:** `claude/bold-nightingale-453ed5`
**Scope:** Phase 2.2.q close audit. **Two PRs** shipped this session — Alex's S40 pick was the recommended **A+B combo**, deliberately split so the IndexedDB half could verify fully overnight while the Cloudflare half landed as code-only awaiting Alex's account setup.

- [PR #125](https://github.com/alkprojects/kospos/pull/125) — Phase 2.2.q PR 1: IndexedDB auto-persistence + Welcome landing dashboard.
- [PR #126](https://github.com/alkprojects/kospos/pull/126) — Phase 2.2.q PR 2: Cloudflare Pages Worker + cross-device publish/fetch (code-only).

Plus this docs PR (audit + S40 SESSION_LOG entry + S41 SESSION_HANDOFF + the dhr-eligibility-and-jobs-scraping-plan.md stale-framing fix carried 2 sessions).

Alex's S40 directive layered three concrete design picks on top of the menu:

1. **A+B combo** (vs A alone): maximize throughput while sleeping — IndexedDB ships verified, Cloudflare ships as code-only.
2. **Auto-load silently + landing page** (vs prompt): richer than the menu's default "prompt with date"; explicitly asks for a data dashboard showing source-appropriate freshness signals (snapshot date / latest PP / refreshedAt).
3. **Redirect immediately** (vs parallel-run default): once Cloudflare is verified, GitHub Pages should redirect. (Documented in the runbook; the actual redirect-setup work files as a small follow-up PR.)

Last audit was the [Phase 2.2.p close audit](phase-2-2-p-close-audit.md) one session prior.

## Methodology

1. Read every file touched in this session's **2 PRs** against the docs that describe them (S40 SESSION_HANDOFF prompt, [persistence-architecture-options.md](../research/persistence-architecture-options.md), the in-PR design comments).
2. Re-run `npm test` — confirms **813 / 813** baseline (was 762 at S40 start; +51 net from PR #125 + PR #126).
3. Re-check carry-forward items B–F from the [Phase 2.2.p close audit](phase-2-2-p-close-audit.md); mark each `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — This session's PR follow-ups

### Two PRs shipped this session

| # | PR | Title | Scope |
|---|---|---|---|
| 1 | [#125](https://github.com/alkprojects/kospos/pull/125) | feat(session) | Phase 2.2.q PR 1 — IndexedDB auto-persistence + Welcome landing dashboard. +24 tests. |
| 2 | [#126](https://github.com/alkprojects/kospos/pull/126) | feat(session) | Phase 2.2.q PR 2 — Cloudflare Worker + cross-device publish/fetch (code-only). +27 tests. |

Plus this docs PR (audit + S40 SESSION_LOG entry + S41 SESSION_HANDOFF + dhr-eligibility-and-jobs-scraping-plan.md fix).

### Finding 1 — A+B combo throughput pattern is repeatable

**Status:** stable; first time used.

The "ship part 1 fully verified + part 2 as code-only" split is novel for this project. It worked because:
- Part 1 (IndexedDB) has zero external dependencies — fully verifiable in preview-MCP.
- Part 2 (Cloudflare) is gated on Alex's account creation but the *code* is verifiable via mocked HTTP + 13 Worker function unit tests against a fake KV namespace.
- The split kept each PR single-purpose despite both serving the same Phase 2.2.q architecture.

When a future session has a similar "needs external account setup" gate, this pattern (ship code + tests, defer external setup verification, runbook for the human side) is reusable. Filed as a workflow note.

**Disposition:** stable; consider promoting to WORKFLOW.md if the pattern recurs.

### Finding 2 — Auto-load silently + landing page is a meaningful UX upgrade

**Status:** stable; preview-MCP verified.

Alex's "auto load silently" instead of the menu's default "prompt" is a stronger UX. The landing page surfaces what loaded + when + from where (`'Restored from this browser'` vs `'Restored from shared (Cloudflare)'` for PR 2). No modal, no friction; the user immediately sees the data they had last session in the same tab they normally start in.

The landing page itself replaces Calculator as the default tab. For a fresh user with no data, it shows a clean empty-state CTA ("No data loaded yet — 📂 Load Reports →"). For a returning user, it shows the data dashboard.

Verified live: added synthetic data → reloaded → banner reads "Restored from this browser (saved HH:MM)" + dashboard reflects the count + source-appropriate freshness label ("snapshot 2026-05-15").

**Disposition:** stable.

### Finding 3 — `useSyncExternalStore` infinite loop caught mid-verification

**Status:** resolved (fix in PR #126).

Initial `useScrapers(s => ({ ... }))` selector in SessionExportImport returned a fresh object reference per render, which React's `useSyncExternalStore` interpreted as a state change → infinite re-render loop → `Maximum update depth exceeded` errors.

Fix: replace the single object-returning selector with per-field selectors — matches the pattern every other component in the codebase uses (e.g., the LandingView itself).

**Lesson learned:** the codebase doesn't currently use `zustand/shallow`. If a component needs to read multiple fields from the same store, the consistent pattern is per-field selectors — NOT object-returning selectors. Filed as an inline comment in the fixed file so future sessions don't repeat the mistake.

**Disposition:** resolved; pattern documented in the SessionExportImport.tsx code comment.

### Finding 4 — Schema additions stayed on v1 (back-compat precedent followed)

**Status:** stable.

Phase 2.2.q PR 1 added 5 new optional fields to `SessionPayload`:

- `jobPostings`
- `jobPostingsRefreshedAt`
- `eligibilityLists`
- `eligibilityListsRefreshedAt`
- `pdfCache`

All optional + back-compat: pre-Phase-2.2.q files load with each field undefined; the restore code defaults to `[]` / `''` / `{}`. Same pattern as `pendingSeparations` (Phase 2.2.i) + `probations` (Phase 2.2.j).

`SESSION_SCHEMA_VERSION` stays at `1`. The pattern continues to scale; we may want to revisit when a future addition needs a breaking change (e.g., reshaping `pdfCache` to a different key format), at which point bumping to v2 + writing a migration becomes the right call.

**Disposition:** stable.

### Finding 5 — Newer-wins envelope merge strategy (PR 2)

**Status:** stable; not yet exercised against real Cloudflare (deferred to Alex's setup).

The PR 2 auto-load reads BOTH IDB and Cloudflare in parallel. The winning envelope is the one with the newer `savedAt`. This covers both directions:

- "Saved locally → published from another browser → returned" → loads the published copy.
- "Published yesterday → auto-saved local edits today" → keeps the local copy.

Alternative would have been "Cloudflare always wins" or "IDB always wins" or "always prompt." Each has a clear failure mode:

- Cloudflare-always-wins → local edits silently lost if the user publishes from elsewhere.
- IDB-always-wins → published updates never appear unless the user manually clears IDB.
- Always-prompt → Alex's S40 directive explicitly said no prompt.

Newer-wins is the only strategy compatible with "auto-load silently" + "publish updates should appear." Tested in unit tests; live cross-device verification depends on Alex's setup.

**Disposition:** stable.

### Finding 6 — Worker function self-containment

**Status:** stable.

`app/functions/api/snapshot.ts` has zero imports from `app/src/`. The envelope-validation logic is inline (duplicated from `parseSessionFile` in `snapshot.ts`). Tradeoff:

- **Cost:** validation logic exists in two places; a future schema change needs both updated.
- **Benefit:** Cloudflare Pages bundler doesn't need to resolve cross-directory imports; the file can be dropped onto Cloudflare verbatim.

The Worker validation is intentionally LIGHTER than the client's `parseSessionFile` — just envelope shape (kind / schemaVersion / savedAt / payload exists). Payload-level validation runs on the client when restoring, so a corrupt server can't poison the client either. Two-layer defense.

**Disposition:** stable. Mitigation: 13 Worker unit tests cover the validation branches.

### Finding 7 — `tsconfig.app.json` extended to include `functions/`

**Status:** stable.

PR 2 adds `"functions"` to `tsconfig.app.json` include alongside `"src"`. This is necessary so:
- The Worker file `app/functions/api/snapshot.ts` is type-checked by the same `tsc -b` step that validates `src/`.
- The test in `app/src/lib/session/cloudflare-worker.test.ts` can `import` from `../../../functions/api/snapshot` cleanly.

`noEmit: true` is set, so the inclusion doesn't emit `functions/*.js` into `dist/`. Cloudflare Pages handles function bundling itself.

**Disposition:** stable.

### Finding 8 — `npm run build` clean first-run (11 of 11 practical)

**Status:** stable.

Both PRs built clean on first invocation. No `INEFFECTIVE_DYNAMIC_IMPORT` warnings, no TS errors after the test-fixture `jobCode/listId` unused-args fix early in PR 1.

The chunk-size warning (`>500 KB after minification`) is the long-running informational message; no change in magnitude this PR (main bundle grew 1,182 → 1,206 KB gzip from the landing page + persistence wiring + cloudflare client).

Streak: 10 of 11 strict-clean / 11 of 11 practical-clean (S38's one warning was caught + resolved in-session and counted only by the strict measure).

**Disposition:** stable.

### Finding 9 — Tests 813 / 813 (+51 from S40 baseline of 762)

**Status:** stable.

| PR | Tests added | Cumulative |
|---|---|---|
| Phase 2.2.p baseline at S40 start | — | **762** |
| PR #125 — Phase 2.2.q PR 1 (IndexedDB + landing) | +24 | 786 |
| PR #126 — Phase 2.2.q PR 2 (Cloudflare code) | +27 | 813 |

The +51 breaks down as:

- `session.test.ts` +4 — scraper-field round-trip · back-compat omission · wrong-type validation.
- `landing.test.ts` +12 — buildDataSummary across PP / OBI / BFM / scraper / workspace state + formatRefreshedAt branches.
- `auto-persistence.test.ts` +9 — captureCurrentSnapshot / restoreStoresFromPayload round-trip · tryRestoreSnapshot validation branches · dhrWorkerUrl preservation.
- `cloudflare-publish.test.ts` +14 — config read/write/trim, fetch branches (not-configured / 404 / 5xx / network / parse / 200), publish branches (not-configured / no-secret / 401 / network / 200 with header verification).
- `cloudflare-worker.test.ts` +13 — GET / POST / OPTIONS handlers across success + every documented failure mode, against a faked KV namespace.

Notably the cloudflare-worker tests verify the *deployed* code paths even though the actual Cloudflare deploy hasn't happened yet — when Alex completes the setup, these tests are the contract Cloudflare's runtime needs to honor.

**Disposition:** stable.

### Finding 10 — Setup runbook lives at `docs/runbooks/`

**Status:** new addition this session.

`docs/runbooks/cloudflare-pages-setup.md` is the first file in a new `docs/runbooks/` directory. The convention parallels `docs/research/` (multi-option comparisons) but is more procedural: step-by-step instructions for one-time setup tasks the human has to execute.

Other candidates for `docs/runbooks/` over time:
- "Clear IndexedDB across all browsers when schema bumps to v2"
- "Restore from a JSON backup file after IDB corruption"
- "Rotate the Cloudflare publish secret"

Filed as a docs convention note; if future sessions add another runbook, treat the pattern as established.

**Disposition:** stable; new convention.

### Finding 11 — Preview-MCP verification (PR 1: 5 synth rows · auto-restore confirmed)

**Status:** stable.

Smaller scale than Phase 2.2.o + 2.2.p (which exercised 6,732 lists) because the persistence layer's correctness doesn't depend on data volume — the same `addRows([...])` → save → reload → restore cycle that works with 5 rows works with 6,732. The 5-row test was enough to:
- Confirm the auto-save banner ("Last auto-save HH:MM") appears immediately after `addRows`.
- Confirm `window.location.reload()` → banner switches to "Restored from this browser (saved HH:MM)".
- Confirm the restored rows render correctly on the Positions tab (`5 rows · snapshot 2026-05-15`).
- Confirm zero console errors throughout (post-fix; pre-fix infinite loop documented in Finding 3).

PR 2's verification: settings panel renders + Save / Clear buttons work + Publish fails with "(network): Failed to fetch" against a fake URL (expected). Real Cloudflare verification deferred to Alex's setup.

**Disposition:** stable.

### Finding 12 — Worker function CORS allows-any-origin

**Status:** stable; acceptable for v1 given Alex's S40 cutover pick.

The Worker function sends `Access-Control-Allow-Origin: *` on all responses. This means any website could GET (read) the published snapshot — but the snapshot is SF public-employee public records (see [memory data_sensitivity.md]), so read-anywhere is consistent with the data sensitivity assessment.

For POST (publish), the secret gate ensures only the holder of `PUBLISH_SECRET` can write, regardless of origin.

Alex's S40 pick was "redirect immediately" once Cloudflare verifies — once the redirect lands, only `kospos.pages.dev` (or a custom domain) serves the app, and the `*` becomes effectively "anyone visiting the KosPos site." Tightening to a specific Origin would be a 1-line change in the Worker if the v2 named-workspaces feature wants to enforce origin isolation.

**Disposition:** stable; trade-off documented inline.

### Finding 13 — `landing` tab promoted as default (was Calculator)

**Status:** stable.

The `landing` tab is first in `ALL_TABS`, so `useState(visibleTabs[0].id)` picks it. Calculator drops to second. Existing users opening the app will see the Welcome tab first; the data dashboard is the natural place to land after a silent auto-restore.

For users who use Calculator daily and don't load reports, this adds a click ("Calculator" tab). The trade-off is in favor of the data-loading user (more numerous + the primary KosPos user persona).

**Disposition:** stable.

### Finding 14 — Multi-PR same-branch workflow worked but required a merge resolution

**Status:** stable; pattern worked.

Both PR 1 and PR 2 shipped from the same worktree branch (`claude/bold-nightingale-453ed5`). The flow was:
1. Commit PR 1 + push → PR #125 opens.
2. Wait for CI green; merge with squash.
3. Commit PR 2 + push (same branch) → PR #126 opens.
4. PR #126 shows DIRTY because PR 1's original commit is on the branch but main has the squashed version.
5. Merge `origin/main` into the branch; resolve 2 add/add conflicts on files PR 2 extended (`use-auto-persistence.ts` + `LandingView.tsx`) by keeping PR 2's version.
6. Push merge commit → PR #126 becomes MERGEABLE.

The conflicts were trivial (PR 2's version was a strict superset of PR 1's). The merge commit is harmless in the squash workflow (it'll itself get squashed when PR #126 merges).

If the project switches to non-squash merges, this pattern would need adjustment.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items B–F

From [`phase-2-2-p-close-audit.md`](phase-2-2-p-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | ~3,380 lines after S39 entry | **~3,450 lines after S40 entry (est.)** | unchanged — still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer holds |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Audit cadence — working as designed | 16th event-based trigger S39 | **17th event-based trigger this session** | working as designed |

### Item B — SESSION_LOG.md baseline ~3,450 lines after S40 entry

This session adds a 2-PR + 1-docs-PR entry. Estimated ~70 lines for the entry, total ~3,450.

Bundleable with C + the Tab 24 Improvement #6 holdReason language drift + the OBI serial doc note + the research-doc-location WORKFLOW.md note + the TS-param-property tip. Estimated combined effort: ~2 hours.

### Item C — Citation anti-pattern count: 12 (unchanged)

`labor-report.md` not touched this session. Count unchanged.

### Item D — labor-report.md still 8,518 lines

No changes. Defer until Phase 2.4 still right.

### Item E — Resolved S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence: 17th event-based trigger fires on schedule

The S40 prompt template (drafted at the end of S39) included the explicit Step-0 audit trigger pattern, which this session honored. The slip from S25 has not recurred across **17 subsequent sessions**.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** — unchanged. All `[[link]]`s resolve. ✓
- **Most-relevant memories this session:**
  - `user_role.md` — Alex's "describe trade-offs, recommend, act" posture drove the up-front AskUserQuestion (single batch, 4 questions covering option + 3 Cloudflare design picks) so he could sleep without further interruption.
  - `data_sensitivity.md` — directly relevant: the Cloudflare publish endpoint sends `Access-Control-Allow-Origin: *` for reads, which is acceptable because the data is SF public records.
  - `session_logging.md` — S40 entry being added to SESSION_LOG.md.
  - `feedback_session_end.md` — applies to this session's end; will be honored when the docs PR lands.

### Tooling / hooks / settings

- **One new dep: none directly.** The `idb` package was already in `package.json`; PR 1 is its first actual use (the comment in `snapshot.ts` mentioned it was queued).
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands with a next-session prompt block.
- **Cowork "Auto-archive on PR close"** — PR #125 auto-archived (after squash-merge).

### Anchor compliance

No `labor-report.md` heading-level edits in either PR. Anchor verifier rerun skipped per precedent.

### Tool sprawl

- **3 files edited in `app/src/lib/session/`** (PR 1: `snapshot.ts` extended; new `idb-persistence.ts` + `use-auto-persistence.ts` + `cloudflare-publish.ts`; PR 2: hook extended).
- **1 new directory `app/functions/api/`** containing the Worker function.
- **1 new directory `app/src/lib/views/landing/`** containing the landing page.
- **1 new directory `docs/runbooks/`** with the Cloudflare setup guide.
- **No new ADRs** — but the Cloudflare-Pages-+-KV decision warrants one when the deploy lands. Filed as carry-forward.
- **`filterRollups` export** still has no in-app consumer (carry from S36). Removing it stays a separate-PR follow-up — bundling with the next scrapers touch.

### Doc-vs-implementation

- **`docs/research/dhr-eligibility-and-jobs-scraping-plan.md`** "no PDF parsing required" framing — **resolved this session** in the docs PR. The doc now references Phase 2.2.o + 2.2.p and points at the actual implementation file.
- **`docs/research/persistence-architecture-options.md`** — still accurate; the implementation matches the recommended Option α.
- **`docs/DECISIONS.md`** — no new ADRs in either PR. Phase 2.4 ADR queue grew from 5 → 6 (the Cloudflare-Pages-+-KV ADR is now warranted; status changed from "would warrant" to "should ship next Phase 2.4 prep work").
- **`docs/data-sources/`** — no changes.

### New drift items

- **Cloudflare deploy verification gap** — code shipped; setup pending Alex. This is the "code-only PR" trade-off the A+B combo accepted explicitly. Once Alex completes the setup + cross-device test, file the result as a one-line note in the Phase 2.2.r SESSION_LOG entry (the runbook itself becomes the persistent record).
- **Landing tab as default** — minor UX shift; if Alex prefers Calculator-as-default, the change is 1 line in App.tsx.
- **Per-field-selector pattern** — documented in the SessionExportImport fix comment; could be promoted to a CLAUDE.md note if a future session hits the same trap.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | Workflow | A+B combo throughput pattern is repeatable | stable (new pattern) |
| 2 | UX | Auto-load silently + landing page (Alex's S40 design pick) | stable |
| 3 | Bug | useSyncExternalStore infinite loop caught mid-verification (per-field selector pattern documented) | resolved |
| 4 | Schema | Schema additions stayed on v1 (back-compat precedent followed) | stable |
| 5 | PR 2 | Newer-wins envelope merge strategy | stable (live verification pending Alex) |
| 6 | PR 2 | Worker function self-containment + two-layer validation | stable |
| 7 | Tooling | tsconfig.app.json extended to include functions/ | stable |
| 8 | Build | `npm run build` clean first-run (11 of 11 practical) | stable |
| 9 | Tests | 813/813 (+51 from S40 baseline of 762) | stable |
| 10 | Docs | Setup runbook at docs/runbooks/cloudflare-pages-setup.md (new convention) | stable (new) |
| 11 | PR 1 | Preview-MCP verification (5 synth rows · auto-restore confirmed) | stable |
| 12 | PR 2 | Worker function CORS: allows-any-origin acceptable for v1 | stable (documented) |
| 13 | App.tsx | landing tab promoted as default | stable |
| 14 | Workflow | Multi-PR same-branch workflow worked with one merge resolution | stable |
| 15 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 16 | Carry-forward B | SESSION_LOG.md ~3,450 lines after S40 entry (est.) | tracking — still queued |
| 17 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 18 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 19 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 20 | Carry-forward F | Audit cadence working as designed (17th event-based trigger) | working as designed |
| 21 | New drift — memory | 10 files indexed; links resolve | stable |
| 22 | New drift — hooks/settings | No changes; no new deps | stable |
| 23 | New drift — anchors | No heading edits this phase | stable |
| 24 | New drift — tool sprawl | 3 lib/session edits + 3 new dirs (functions/api, views/landing, docs/runbooks), all justified by scope | stable |
| 25 | New drift — doc-vs-impl | dhr-eligibility-and-jobs-scraping-plan.md "no PDF in v1" framing fixed this session | resolved |

**Totals:** 2 carry-forwards resolved this session (dhr-eligibility-and-jobs-scraping-plan.md stale framing + the infinite-loop bug) · 3 carry-forwards unchanged (B, C, D) · 1 stays-dropped (E) · 1 working-as-designed (F) · 14 stable findings · 1 housekeeping fix · 0 new follow-ups beyond the Cloudflare-deploy-verification gap (which is intrinsic to the A+B combo split).

---

## Recommendations not actioned

In priority order:

1. **Alex completes Cloudflare account + Pages + KV setup per the runbook.** ~15-20 minutes. Unlocks the cross-device verification of PR 2.
2. **Once Cloudflare verified, file the Phase 2.4 ADR** for cross-device persistence via Cloudflare Pages + KV. Queue grew from 5 → 6.
3. **Cross-tab nav from Eligibility → Positions** (carries from S39) — clicking a job code in EligibilityView's summary table filters Positions tab to that jobCode. Bundleable with the Eligibility / Probation promotion to non-dev. ~1–2 hours.
4. **Lift modal overlay-frame to `lib/ui/Modal.tsx`** (carries) — 5th instance of the same fixed-overlay-no-Portal pattern. ~1–2 hours.
5. **Remove the now-unused `filterRollups` export** (carries from S36) — `applyEligibilityFilters` subsumes it. ~5 minutes; bundle with the next scrapers touch.
6. **Schedule SESSION_LOG.md trim** (item B) — ~3,450 lines after S40; bundleable with item C + Tab 24 Improvement #6 holdReason language update + OBI serial doc note + research-doc-location WORKFLOW.md note + TS-param-property tip. ~2 hours combined.
7. **Migrate the citation anti-pattern** (item C) — 12 instances; ~20 minutes.
8. **Defer `labor-report.md` split until Phase 2.4** (item D) — no change.
9. **Switch `computeListExpiration` to calendar arithmetic** — eliminates the leap-year 1-day drift (carries from S37). Low priority; defer until UX-relevant.
10. **Named workspaces (`?workspace=`) for the Cloudflare publish endpoint** — Phase 2.2.r+ candidate; would key KV by workspace ID instead of singleton `current`. ~3-4 hours including the UI for naming + switching.
11. **Tighten Worker function CORS** to a specific origin once GitHub Pages redirect lands. ~5 minutes; bundle with the cutover PR.
12. **Local-branch cleanup** (low priority) — ~37+ stale `docs/*` + ~13 `claude/*` branches; 5-minute pass whenever Alex wants.

None block the next session's work.

---

## Cross-references

- Previous audit: [phase-2-2-p-close-audit.md](phase-2-2-p-close-audit.md) (Session 39).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.q implementation: [PR #125](https://github.com/alkprojects/kospos/pull/125) (IndexedDB + landing) + [PR #126](https://github.com/alkprojects/kospos/pull/126) (Cloudflare code).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2 sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
- Architecture decision: [persistence-architecture-options.md § Option α](../research/persistence-architecture-options.md#option-α--cloudflare-pages--workers-kv--recommended).
- Setup runbook: [cloudflare-pages-setup.md](../runbooks/cloudflare-pages-setup.md).
