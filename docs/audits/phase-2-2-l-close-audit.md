# Phase 2.2.l close audit — Session 35

**Date:** 2026-05-27
**Branch:** `docs/phase-2-2-l-close-audit-and-handoff`
**Scope:** Phase 2.2.l close audit. Two PRs shipped this session, both
in response to Alex's S35 added directives that superseded the normal
"pick the next 2.2 sub-phase" framing:

1. **DHR exam-results manual paste was unacceptable** → ship a live
   fetch via a public CORS-proxy chain with a Cloudflare-Worker URL
   slot as Alex-configurable backup.
2. **Probation deputy field should auto-resolve from the reports-to
   tree** → make it a multi-person chip list pre-filled by walking
   the chain for "Deputy"-titled ancestor positions.

Last audit was the [Phase 2.2.k close audit](phase-2-2-k-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in this session's **2 PRs** against the
   docs that describe them (Tab 10 Probation, Tab 11 Eligibility,
   the S34 audit, the S33 DHR research doc, the S35 kickoff directives
   from Alex).
2. Re-run `npm test` — confirms the **589 / 589** baseline (was 549
   coming in; +23 from PR #113 + +17 from PR #114 = +40 net).
3. Re-check carry-forward items B-F from the [Phase 2.2.k close
   audit](phase-2-2-k-close-audit.md); mark each `unchanged`, `improved`,
   `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — This session's PR follow-ups

### Two PRs shipped this session

| # | PR | Title | Scope |
|---|---|---|---|
| 1 | [#113](https://github.com/alkprojects/kospos/pull/113) | feat(views/probation) | Deputy auto-resolves from reportsTo chain + multi-person chip field (Alex's S35 directive #2). +23 tests. |
| 2 | [#114](https://github.com/alkprojects/kospos/pull/114) | feat(scrapers) | DHR exam-results via CORS-proxy chain (primary path), manual paste demoted to fallback (Alex's S35 directive #1). +17 tests. |

Plus this docs PR (audit + S36 handoff + S35 SESSION_LOG entry).

### Finding 1 — DHR live-fetch ships end-to-end with real data

**Status:** stable.

[PR #114](https://github.com/alkprojects/kospos/pull/114) replaces the
S34 manual-paste workflow with a one-click live fetch through a public
CORS-proxy chain. Live verification at S35:

- **6,727 eligibility lists** parsed from 66+ pages of
  sfdhr.org/past-examination-results in **~90 seconds**.
- **738 distinct SF job codes** rolled up from those lists.
- **1,848 active lists** (within the 2-year CSC Rule 411A/412 window).
- **100% via corsproxy.io** — no fallback needed in the live run.

Proxy chain architecture (`lib/scrapers/sf-dhr-exam/fetch.ts`):

  1. corsproxy.io
  2. allorigins.win/raw
  3. codetabs.com/v1/proxy
  4. *(optional)* user-configured Cloudflare-Worker URL

Each page tries proxies in order, takes the first 200/HTML response.
Body-content sniff (`looksLikeHtml`) catches proxy error envelopes
regardless of HTTP status code. Dedupes across pages.

`useScrapers.dhrWorkerUrl` persists to localStorage (key
`kospos.scrapers.dhrWorkerUrl`) so Alex's backup-proxy URL survives
reloads. `clearAll` preserves the setting (it's user config, not
scrape data).

EligibilityView (Tab 11) gets the new `↻ Refresh eligibility lists`
button next to the SF Careers refresh, plus a collapsible
`<details>` for the Worker URL settings + the manual-paste fallback
(demoted to advanced-only).

**Disposition:** stable. The S33 research doc's `Cloudflare Worker
for DHR live fetch` recommendation is now KosPos's documented backup
path; the public-proxy default makes Worker setup unnecessary for
v1. PR #114's commit message includes a copy-paste-ready 10-line
worker for the unlikely case the public chain becomes flaky.

### Finding 2 — Probation deputy is now a multi-person chip field with chain-walk pre-fill

**Status:** stable.

[PR #113](https://github.com/alkprojects/kospos/pull/113) migrates
`Probation.deputy: string` to `Probation.deputies: string[]` and
adds the chain-walker:

- `lib/probation/deputy.ts:resolveDeputiesFromChain(positionId,
  positionsById)` — walks `reportsTo.positionNumber` up the tree,
  finds ancestor positions whose `jobCodeDescription` contains
  "Deputy" (case-insensitive, whole-word — won't match "Predeputy"
  or "Deputies Coordinator"), pulls the incumbent name from the
  child's denormalized `reportsTo` record. Cycle-safe via a `seen`
  set; dedupes by name; returns walk-order (closest deputy first).
- Auto-resolve trigger points: employee-name autocomplete pick
  (`applyPersonMatch`), position-input typing when it resolves to a
  known position, detail modal's "Use these" button when the draft
  is empty.
- Chip-list UI in both AddProbationForm + ProbationDetail: each chip
  has X-to-remove; Enter / blur / backspace-on-empty bindings; the
  "Add deputy" input commits the draft on Enter / blur.
- Notification email uses Oxford-comma greeting:
  `Hello {sup}, {dep1}, ..., and {depN},`. Whitespace-only entries
  dropped. Mailto: + copy-template both reflect the new shape.
- Session JSON back-compat: `restoreFromSession` runs
  `migrateLegacyDeputy` per row — promotes legacy `deputy: "Name"`
  on old saves to `deputies: ["Name"]`. Forward-shape wins if both
  fields are present.

**Disposition:** stable. The chain-walk implementation has a useful
fall-through property: if `Position.reportsTo` denormalizes the
parent's incumbent name (which build.ts:140-141 does), then the
walker can resolve names without needing to look up the parent's
appointment slot. Cleanly extensible to other "find ancestor by
title pattern" use cases (e.g., notification escalation to the
Director one level above the deputy).

### Finding 3 — DHR `parseDhrExamHtml` v2 — same parser, now used by live fetch

**Status:** stable.

The parser shipped in Phase 2.2.k against synthetic input. PR #114's
live verification ran it against the real DHR HTML at scale —
**6,727 rows parsed from 66+ pages with zero errors**. Row counts
per page were consistent (~100 rows/page, dropping near the end of
the pagination). Cross-validates the parser's robustness against
real-world variation.

The 3-pattern code extractor (4-digit civil-service codes,
letter-prefixed uniformed ranks, URL-derived fallbacks) caught
every link variant in the real data.

**Disposition:** stable. The S34 audit's open action item #20
("DHR real-data paste walkthrough") is implicitly **resolved** —
the real-data walkthrough happened, just via the new live fetch
rather than a manual paste. Drops from carry-forward.

### Finding 4 — `npm run build` clean on first run (6 sessions running)

**Status:** stable.

6 sessions in a row of clean first-run builds (S30 caught 1, S31
caught 1, S32 caught 0, S33 caught 0, S34 caught 1, **S35 caught 0**).
Habit confirmed firm.

**Disposition:** stable.

### Finding 5 — Tests 589 / 589 (+40 from S34's S35-baseline of 549)

**Status:** stable.

| PR | Tests added | Cumulative |
|---|---|---|
| Phase 2.2.k baseline at S35 start | — | **549** |
| PR #113 — Probation deputy multi-resolve | +23 | 572 |
| PR #114 — DHR CORS-proxy fetcher | +17 | 589 |

The +23 from PR #113 breaks down as:
- `deputy.test.ts` — 12 cases (chain walker + `isDeputyTitle` patterns
  + legacy-deputy migration shim).
- `probation.test.ts` — +3 (deputies field preserved, empty array
  drops, history audit logs the field name correctly).
- `probation-view.test.tsx` — +8 (chip add via Enter, remove via X,
  multi-deputy +N display, chain-resolve when known name picked,
  supervisor+deputies populate, email greeting Oxford-comma form for
  1/2+ deputies, whitespace stripping).

The +17 from PR #114 breaks down as:
- `fetch.test.ts` — 12 cases (happy path / proxy fallback HTTP 500 +
  network error + non-HTML body / Worker URL append / Worker URL with
  query strings / onProgress / dedupe / maxPages safety cap /
  FetchDhrError shape / DEFAULT_PROXIES ordering).
- `store.test.ts` — 5 cases (setter + localStorage persistence + trim
  + empty-clears-storage + clearAll preserves the URL setting).

**Disposition:** stable. The baseline reconciliation correction from
S34's audit (Finding 8) — running `npm test` from a fresh
`npm install` to get a stable count — was followed this session; the
549 starting number was confirmed before any code changes.

### Finding 6 — UI demotion of manual paste is structurally sound

**Status:** stable.

The Phase-2.2.k paste panel still works exactly as it did; it's just
wrapped in a `<details>` with the label
`Advanced fallback: paste DHR HTML manually`. This satisfies two
constraints simultaneously:

1. Alex's S35 directive — primary path is now one-click refresh.
2. The "what we are NOT doing" carry from S34 — no breaking changes
   to surfaces that real users have been exposed to.

When the public proxy chain fails for whatever reason (rate limit /
outage / Alex's network blocking corsproxy.io), the manual paste
still works as the last-resort escape hatch. The error message from
the live-fetch button explicitly steers users there:
`Try again, or use the manual-paste fallback below.`

**Disposition:** stable.

### Finding 7 — `dhrWorkerUrl` persistence: localStorage, not session JSON

**Status:** stable, advisory.

The Worker URL is a user setting, not scrape data, so it lives in
localStorage rather than the session-JSON envelope. This means:

- Survives reloads without saving a session
- Doesn't pollute exported session files with per-machine config
- `clearAll` (which Alex uses to reset scrape data) intentionally
  preserves the URL

The downside is that the URL is per-browser, not per-user-identity.
If Alex opens KosPos on a different machine (or after clearing
browser storage), he'll need to re-enter the URL. That's the right
trade — sessions are for portable state; settings are local.

**Disposition:** stable.

### Finding 8 — Eligibility tab stays appropriately devOnly

**Status:** stable.

Per the S35 "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Inactive / Separations /
> Probation / Eligibility / Temp Limits / Reporting Tree to non-dev
> yet — wait until cross-tab nav has been used end-to-end on real data.

Eligibility stays `devOnly: true` in App.tsx. Promotion follows the
cross-tab nav follow-up (filed at S34 — clicking a job code on
Eligibility → filter Positions to that jobCode).

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items B-F

From [`phase-2-2-k-close-audit.md`](phase-2-2-k-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | ~3,020 lines after S34 entry | **~3,100 lines after S35 entry** | unchanged — still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer holds |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Audit cadence — working as designed | 11th event-based trigger S34 | **working as designed (12th event-based trigger this session)** | working as designed |

### Item B — SESSION_LOG.md baseline ~3,100 lines after S35 entry

This session adds a shorter entry than S34's epic 6-PR run — 2 PRs +
this docs PR. Estimated ~60 lines for the entry, total ~3,100.

Bundleable with C + the Tab 24 Improvement #6 holdReason language
drift + the OBI serial doc note + the research-doc-location
WORKFLOW.md note (carry from S33) + the new TS-param-property tip
(from S34 audit). Estimated combined effort: ~2-2.5 hours.

### Item C — Citation anti-pattern count: 12 (unchanged)

`labor-report.md` not touched this session. Count unchanged.

### Item D — labor-report.md still 8,518 lines

No changes. Defer until Phase 2.4 still right.

### Item E — Resolved S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence: 12th event-based trigger fires on schedule

The S35 prompt template (drafted at the end of S34) included the
explicit Step-0 audit trigger pattern, which this session honored.
The slip from S25 has not recurred across **12 subsequent sessions**.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** — unchanged. All
  `[[link]]`s resolve. ✓
- **Most-relevant memories this session:**
  - `feedback_dont_reremind.md` — Alex's S35 added directives both
    resolved this session; drop from the next handoff's carry-forward.
  - `user_role.md` — Alex's "Deputy Director" role drove the
    `isDeputyTitle` predicate design (the chain-walk specifically
    surfaces Deputy ancestors above the immediate supervisor — which
    is Alex's actual role in DBI's org).

### Tooling / hooks / settings

- **No hook / settings changes** in either PR this session. All file
  changes were `app/src/` (entity layer + view + scrapers + tests).
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block.
- **Cowork "Auto-archive on PR close"** — PR #113 merged inside the
  session; archived cleanly. PR #114 pending merge at the time of
  writing.

### Anchor compliance

No `labor-report.md` heading-level edits in any PR this session.
Anchor verifier rerun skipped per precedent.

### Tool sprawl

- **`app/src/lib/scrapers/sf-dhr-exam/fetch.ts`** — new file (1 in
  the existing `sf-dhr-exam/` subdir). Companion `fetch.test.ts`.
  No new top-level modules.
- **`app/src/lib/scrapers/store.test.ts`** — new file (covers the
  store, which was previously untested directly — its scrape-data
  slices are covered transitively by `scrapers.test.ts` via the
  rollup builders).
- **`app/src/lib/probation/deputy.ts`** + **`deputy.test.ts`** — new
  files in the existing `probation/` subdir.
- **No new dependencies.** `package.json` unchanged in both PRs.
- **No new ADRs.** The Phase 2.4 ADR queue stays at 5 (the DHR-fetch
  layer is an extension of the no-upstream-source pattern, not a
  separate ADR).

### Doc-vs-implementation

- **Tab 11 in labor-report.md** describes the manual list shape +
  the KosPos vision; PR #114 matches both — the live fetcher writes
  to the same `EligibilityList` shape the parser produces, and the
  EligibilityView still renders the same per-jobCode rollup.
- **`docs/research/dhr-eligibility-and-jobs-scraping-plan.md`** —
  the S33 research doc's "moderately realistic for v1 with a CORS
  proxy" path is now built. The doc's "Cloudflare Worker if the
  scrape becomes a recurring need" recommendation is honored as the
  backup-proxy slot (configurable; the public chain handles 99% of
  the case). The doc can stay as archive-of-rationale.
- **`docs/DECISIONS.md`** — no new ADRs in either PR this session.
  Phase 2.4 ADR queue unchanged.
- **`docs/data-sources/`** — no changes. OBI BI Payroll Excel-serial
  doc note still missing (Item #19 from Phase 2.2.g audit).
  Unchanged.

### New drift items

**Zero noteworthy drift items this session.** Both PRs landed clean,
no test-count discrepancies, no unintended file changes.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #114 | DHR live-fetch ships end-to-end; 6,727 rows / 738 job codes / 1,848 active lists in ~90s via corsproxy.io | stable |
| 2 | PR #113 | Probation deputy: chain-walk auto-resolve + multi-person chip field + Oxford-comma greeting | stable |
| 3 | PR #114 | `parseDhrExamHtml` validated against real DHR data at scale (66+ pages, 0 errors) | stable — resolves S34 action item #20 |
| 4 | Both PRs | `npm run build` clean first-run (6 sessions running) | stable |
| 5 | Both PRs | Tests 589/589 (+40 from S35 baseline of 549) | stable |
| 6 | PR #114 | Manual paste demoted to `<details>` fallback; primary path is one-click refresh | stable |
| 7 | PR #114 | `dhrWorkerUrl` persists to localStorage (per-browser); `clearAll` preserves | stable |
| 8 | PR #114 | Eligibility tab stays devOnly | stable |
| 9 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 10 | Carry-forward B | SESSION_LOG.md ~3,100 lines after S35 entry | tracking — still queued |
| 11 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 12 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 13 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 14 | Carry-forward F | Audit cadence working as designed (12th event-based trigger) | working as designed |
| 15 | New drift — memory | 10 files indexed; links resolve | stable |
| 16 | New drift — hooks/settings | No changes | stable |
| 17 | New drift — anchors | No heading edits this phase | stable |
| 18 | New drift — tool sprawl | 4 new files in existing subdirs (fetch.ts, deputy.ts + 2 test files + 1 store-test); no new deps, no new ADRs | stable |
| 19 | New drift — doc-vs-impl | S33 research doc's recommendation is now built; backup-proxy slot matches the doc's CF Worker note | stable |
| 20 | S34 action item #20 | DHR real-data walkthrough — implicitly resolved by live fetch | drops from carry-forward |
| 21 | Housekeeping (carries) | 36+ stale local-only `docs/*` branches + ~12 `claude/*` branches | low priority |

**Totals:** 1 carry-forward resolved earlier (A from S33, stays
dropped) · 3 carry-forward unchanged (B, C, D) · 1 stays-dropped
(E) · 1 working-as-designed (F) · 8 stable PR follow-ups + 1
resolved action item (S34 #20) + 1 housekeeping carry.

---

## Recommendations not actioned

In priority order:

1. **Promote Eligibility to non-dev** — with the live fetcher
   working against real data, the gating reason (manual paste was
   too brittle for production) is gone. Cross-tab nav from
   Eligibility job code → filtered Positions is the remaining
   blocker; ~30 min when Alex picks it.
2. **Cross-tab nav from Eligibility → Positions** — same as Phase
   2.2.k's surface item; bundleable with the promotion above.
3. **Promote Probation to non-dev** — Alex's walkthrough of the
   end-to-end flow on real data is the only blocker.
4. **Schedule SESSION_LOG.md trim** (item B) — ~3,100 lines after
   S35; bundleable with item C + the Tab 24 Improvement #6
   holdReason language update + the OBI serial doc note + the
   research-doc-location WORKFLOW.md note + the new TS-param-
   property tip. ~2-2.5 hours combined.
5. **Migrate the citation anti-pattern** (item C) — 12 instances;
   ~20 minutes.
6. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
7. **Queue ADR amendments for Phase 2.4** — still 5 queued
   (no-upstream-source 4-view + scraper-layer derived-data
   extension, optionally consolidated).
8. **Lift `buildProbation*Email` to `lib/ui/notifications/`** —
   only if a 2nd consumer arrives.
9. **Local-branch cleanup** (low priority) — ~36+ stale `docs/*`
   + ~12 `claude/*` branches; 5-minute pass whenever Alex wants.

None block the next session's work.

---

## Cross-references

- Previous audit: [phase-2-2-k-close-audit.md](phase-2-2-k-close-audit.md)
  (Session 34).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.l implementation:
  [PR #113](https://github.com/alkprojects/kospos/pull/113) (Probation
  deputy) + [PR #114](https://github.com/alkprojects/kospos/pull/114)
  (DHR CORS proxy) + Session 35 SESSION_LOG.md entry (drafted in this
  PR).
- DHR scraping research: [docs/research/dhr-eligibility-and-jobs-scraping-plan.md](../research/dhr-eligibility-and-jobs-scraping-plan.md)
  (the S33 plan; PR #114's implementation matches it, plus the backup-
  proxy slot for the CF Worker path).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
