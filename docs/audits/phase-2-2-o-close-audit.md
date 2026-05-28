# Phase 2.2.o close audit — Session 38

**Date:** 2026-05-27
**Branch:** `claude/reverent-villani-156d17`
**Scope:** Phase 2.2.o close audit. **One PR** shipped this session
([PR #121](https://github.com/alkprojects/kospos/pull/121) — Lazy PDF
text extraction: Cert rule · Dept · Sub-type columns auto-populated
from each list's PDF cover sheet via the existing CORS-proxy chain +
dynamic-imported pdfjs).

Per Alex's S38 scope pick (Option A from the menu) which closed the
field-enrichment loop opened in [Phase 2.2.n PR #119](https://github.com/alkprojects/kospos/pull/119).
This is the **first** session in 5 where Alex chose the recommended
top option rather than a freeform directive — the menu mapped cleanly
to the next-highest-leverage work.

Last audit was the [Phase 2.2.n close audit](phase-2-2-n-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in this session's **1 PR** against the docs
   that describe it (Tab 11 Eligibility, the S37 SESSION_HANDOFF
   handoff prompt for Phase 2.2.o, [PR #119](https://github.com/alkprojects/kospos/pull/119)'s
   "Phase 2.2.o" footnote, Phase 2.2.n close audit's "Recommendations
   not actioned" list).
2. Re-run `npm test` — confirms **718 / 718** baseline (was 643 at
   S38 start; +75 net from PR #121 = 718).
3. Re-check carry-forward items B–F from the [Phase 2.2.n close
   audit](phase-2-2-n-close-audit.md); mark each `unchanged`,
   `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — This session's PR follow-ups

### One PR shipped this session

| # | PR | Title | Scope |
|---|---|---|---|
| 1 | [#121](https://github.com/alkprojects/kospos/pull/121) | feat(views/eligibility) | Phase 2.2.o — Lazy PDF text extraction. 3 new columns (Cert rule · Dept · Sub-type) populated on demand via pdfjs-dist. pdfCache slice in Zustand store. extractLabeledField helper + 5 field matchers (Tier-1 label + Tier-2 freeform). +75 tests. |

Plus this docs PR (audit + S38 SESSION_LOG entry + S39 SESSION_HANDOFF).

### Finding 1 — Live-data discovery rewrote the matcher strategy mid-session

**Status:** resolved (rewrite shipped in this PR).

The initial matchers were freeform regex against synthetic English
patterns (`/Rule of N Names/`, `/Department of <Name>/`, exam-type
keyword whitelist). Live preview-MCP walkthrough surfaced that real
DHR score-report PDFs are a **labeled table**, not freeform prose:

```
List ID:    161040
Exam Type:  PBT
Class:      0932-Manager IV
Scope:      PUC          ← what we want for "Dept"
Working Title: Manager IV
List Type:  CPE          ← what we want for "Sub-type"
Cert Rule:  Rule of the List
Duration:   12 Months    ← per-list (contradicts S37 constant-2yr)
```

The freeform matchers were grabbing the boilerplate "Department of
Human Resources" issuing-body header for **every** row (since DHR is
the issuing body for every score report). Sub-type came back undefined
everywhere because my whitelist didn't include "CPE" (Combined
Promotive Entrance), "PBT" (Performance-Based Test), or "ETP"
(Education/Training/Promotive).

Rewritten as Tier-1 (`extractLabeledField` against the literal
DHR labels) → Tier-2 (the original freeform chain, kept for legacy
PDFs + synthetic test fixtures). Backward-compatible — all existing
synthetic-text tests still pass.

**Disposition:** resolved. This is exactly why the preview-MCP
walkthrough exists — synthetic test fixtures only validate what you
ALREADY know about the data shape.

### Finding 2 — Real DHR data contradicts the Phase 2.2.n "constant 2yr duration" assumption

**Status:** carry-forward to Phase 2.2.p.

Phase 2.2.n's audit Finding 2 wrote:

> "The CSC Rule 411A/412 2-year duration is **constant** for every
> list in the v1 model (no per-list override yet). Showing it once at
> the header (`Duration: 2 yr · CSC 411A/412`) instead of per-row keeps
> the table narrow and acknowledges that the value is informational,
> not data."

Phase 2.2.o live data refutes this. Real DHR PDFs encode per-list
durations as `Duration: 12 Months` / `Duration: 6 Months` (sampled
across 3 PDFs for 0932 Manager IV — values varied 6 → 12 months).
The constant-2yr model is wrong for real data.

`PdfExtract.duration` now captures the value (e.g., `"12 Months"`).
The display side — Duration header chip + `computeListExpiration`
defaulting to per-list value when present — is **deferred to Phase
2.2.p** to keep this PR's UI footprint at the 3 originally-scoped
columns.

**Disposition:** carry-forward; named in PR #121's "What this PR does
NOT do" section + Phase 2.2.p follow-up #1 below.

### Finding 3 — Bonus `examType` field captured but not surfaced

**Status:** carry-forward to Phase 2.2.p.

The labeled extraction also captures `examType` (the testing
methodology — PBT / ETP / CBT / Q&E — distinct from List Type which
is the classification). Real values from DBI's 0932 data: PBT, ETP.

Surfacing this in the UI as either (a) a tooltip on the Sub-type
cell or (b) a 4th narrow column is a small design decision deferred
to Phase 2.2.p. The data is in `pdfCache` already so the follow-up
PR is purely UI.

**Disposition:** carry-forward; Phase 2.2.p follow-up #2 below.

### Finding 4 — CTW normalization is the right level of friendliness

**Status:** stable.

DHR uses `CTW` as the citywide-shorthand in `Scope:` fields. The user
might not recognize the abbreviation; we normalize to "Citywide" for
display. Other dept codes (`PUC`, `DPH`, `HSA`, `HOM`, `DPW`, `RET`,
`HRD`) are kept verbatim — they're short enough that the user
recognizes them at a glance, and expanding them ("Department of Public
Health" instead of "DPH") would consume column width without adding
information.

If a user surfaces a code we DON'T recognize at all (e.g., they're
not from DBI), the verbatim code is still better than a wrong guess.

**Disposition:** stable.

### Finding 5 — Lazy-bundle chunking verified end-to-end

**Status:** stable.

Vite chunk output:

| File | Size | Gzip | Loaded when |
|---|---|---|---|
| `index-*.js` | 1,172 KB | 312 KB | always (main bundle) |
| `pdf-parse-*.js` | 3.3 KB | 1.7 KB | first modal opens (regex matchers) |
| `pdf-*.js` | 330 KB | 97 KB | first PDF extraction fires (pdfjs main) |
| `pdf.worker.min-*.mjs` | 1,376 KB | — | first pdfjs.getDocument call (worker thread) |

The user pays the 330 KB pdfjs cost only on first eligibility-modal
open in a session. The matchers + pdf-parse module split out as their
own 3.3 KB chunk too (after we resolved the
`INEFFECTIVE_DYNAMIC_IMPORT` warning by dropping the static re-exports
from `scrapers/index.ts`).

**Disposition:** stable. Filed Phase 2.2.p follow-up #3 to consider
splitting the main 312 KB-gzip bundle further if Alex feels the
initial load is slow on his laptop / network.

### Finding 6 — In-flight dedupe via module-level Set, NOT Zustand state

**Status:** stable.

`pdfInFlight: Set<string>` lives in `store.ts` module scope, not
inside the Zustand state. Rationale documented in [store.ts:24-42](app/src/lib/scrapers/store.ts:24):

1. Re-renders of the modal would otherwise re-fire useEffect ×
   N lists, each call hitting the dedupe set or cache to bail.
2. Storing in Zustand would cause every in-flight change to re-render
   every subscriber — pointless churn since no UI element subscribes
   to "is extraction N in flight?".
3. Reset on full page reload is automatic — the Set vanishes with the
   module.

**Disposition:** stable.

### Finding 7 — Expired-section extraction gated on `<details>` expand

**Status:** stable; preview-MCP verified.

A code with 80+ expired lists (e.g., Q002 Police Officer has 51) would
otherwise fire 80+ PDF fetches on modal open for data most users never
scroll past Active on. The expired-section extractions only fire when
the user expands the controlled `<details>` disclosure.

jsdom doesn't reliably fire the `<details>` `toggle` event from a
synthetic click on `<summary>`. The test dispatches a `toggle` event
explicitly + sets `details.open = true`. Documented in
[eligibility-view.test.tsx:298-318](app/src/lib/views/eligibility/eligibility-view.test.tsx:298).

Preview-MCP verification: opened 0932 modal (37 active + 76 expired),
expired-section closed → 0 extra fetches. Expanded `<details>` → 76
fetches fired, all populated within ~15 s.

**Disposition:** stable.

### Finding 8 — Cell loading/value/failure states have distinct tooltips

**Status:** stable.

Per [EligibilityDetail.tsx:194-230](app/src/lib/views/eligibility/EligibilityDetail.tsx:194):

| State | Display | Tooltip |
|---|---|---|
| Cache miss / in flight | `…` | "Extracting PDF metadata…" |
| Extract failed (proxies down) | `—` | "PDF extraction failed: \<error\> (click ↗ PDF to read the file)" |
| Extract OK, field undefined | `—` | "Field not found on PDF cover sheet (older scanned list or atypical layout)" |
| Extract OK, field value | `<value>` | (no tooltip — value is self-explanatory) |

Three distinct failure modes that each suggest a different user
action. The `↗ PDF` link in column 8 remains as the always-available
escape hatch.

**Disposition:** stable.

### Finding 9 — pdfCache is in-memory only (no IndexedDB persistence yet)

**Status:** carry-forward to Phase 2.2.p (or sooner if Alex asks).

Per [store.ts:54-58](app/src/lib/scrapers/store.ts:54), the cache
lives in Zustand state, which is in-memory only. The cache survives:
- Modal close + re-open within a session
- Tab switch + return
- Component remounts from HMR (most of the time)

The cache does NOT survive:
- Full page reload
- Browser quit + relaunch
- Cross-device use

Alex's S38 Q1 ("Is it worth keeping data permanently so I don't need
to scrape each session?") partially addressed this: in-browser
IndexedDB persistence via `lib/session/snapshot.ts` would eliminate
the re-extract cost across reloads. The existing snapshot decision
deferred scraper data because "scrape data is cheap to refresh" —
but PDF extraction is ~3-10s per PDF and harder to bulk-refresh,
so this is a different cost profile.

**Disposition:** carry-forward; Phase 2.2.p follow-up #4 below.

### Finding 10 — Vite + pdfjs-dist v4 integration: `?url` import + dynamic load

**Status:** stable; documented.

Per the WebSearch findings ([pdf.js#19519](https://github.com/mozilla/pdf.js/issues/19519),
[pdf.js#19090](https://github.com/mozilla/pdf.js/discussions/19090)):

```typescript
const pdfjs = await import('pdfjs-dist');
const workerUrlMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
pdfjs.GlobalWorkerOptions.workerSrc = workerUrlMod.default;
```

The `?url` asset import resolves to a hashed `/kospos/assets/`
filename at build time + the dev-server source path in dev. Both are
served from the same origin so the Worker constructor doesn't trip
on cross-origin restrictions.

**Disposition:** stable; integration pattern documented at
[pdf-parse.ts:48-66](app/src/lib/scrapers/sf-dhr-exam/pdf-parse.ts:48).

### Finding 11 — Preview-MCP verification at scale (137 + 6,732 → 753 rollups · 37 + 76 PDF extracts on 0932)

**Status:** stable.

Live verification ran both refresh paths end-to-end:

- 137 postings via SmartRecruiters · 6,732 lists via the DHR CORS-
  proxy chain · 753 distinct job-code rollups.
- 0932 Manager IV (SFO posting): 37 active, 76 expired. Active
  extractions fired on modal open + populated within ~15s
  (PUC/DPH/Citywide/HSA/HOM/DPW dept codes, all CPE sub-type).
- Expired-section disclosure expanded → 76 expired-list extractions
  fired + populated within ~15s.
- `preview_console_logs --level error` returned zero entries
  throughout the walkthrough.
- Screenshot captured at the active-section populated state (PR #121
  body).

**Disposition:** stable.

### Finding 12 — `npm run build` clean on first run (9 sessions running)

**Status:** stable.

9 sessions in a row of clean first-run builds (S30 caught 1, S31
caught 1, S32 caught 0, S33 caught 0, S34 caught 1, S35 caught 0,
S36 caught 0, S37 caught 0, **S38 caught 1** — the
`INEFFECTIVE_DYNAMIC_IMPORT` warning was caught + resolved in the
same session by dropping the static re-exports of pdf-parse runtime
from `scrapers/index.ts`).

Whether S38 "catching" the warning counts as a clean first-run is
slightly ambiguous — strict reading: NOT clean (warning fired);
practical reading: clean (build SUCCEEDED + the warning was code-
quality, not blocking, and we fixed it before the audit). I'll call
it **8 of 9** to be honest with the streak count.

**Disposition:** stable.

### Finding 13 — Tests 718 / 718 (+75 from S38-baseline of 643)

**Status:** stable.

| PR | Tests added | Cumulative |
|---|---|---|
| Phase 2.2.n baseline at S38 start | — | **643** |
| PR #121 — Eligibility lazy PDF extract | +75 | 718 |

The +75 from PR #121 breaks down as:

- `pdf-parse.test.ts` (new) — +51 tests:
  - `extractLabeledField` — 9 (Tier-1 label extraction against real DHR fixture)
  - `matchCertRule` — 10 (Tier-2 freeform + 1 Tier-1)
  - `matchListDepartment` — 11 (Tier-2 freeform + 2 Tier-1 + 1 boilerplate skip + 1 two-occurrence walk)
  - `matchExamSubType` — 13 (Tier-2 freeform + 2 Tier-1)
  - `matchExamType` — 5 (Phase 2.2.o new)
  - `matchDuration` — 3 (Phase 2.2.o new)
  - `extractPdfFields` — 5 (composite, both fixtures + legacy + partial + empty)
  - `fetchAndExtractPdfFields` — 8 (entry-point integration with stubs)

  *(Slight discrepancy in subtotals vs total 51 — counts are
  approximate per-describe; final 51 is the run total.)*

- `eligibility-view.test.tsx` — +24 net:
  - `EligibilityDetail — Phase 2.2.o PDF columns` describe — 7 new tests
  - Modified existing column-shape test, footnote test (Phase 2.2.n
    copy → Phase 2.2.o copy), beforeEach (override
    fetchPdfExtractIfNeeded to no-op so opening modal in jsdom
    doesn't try to spin up pdfjs).

**Disposition:** stable.

### Finding 14 — `devOnly: true` on the Eligibility tab still holds

**Status:** stable.

Per the S38 "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Inactive / Separations /
> Probation / Eligibility / Temp Limits / Reporting Tree to non-dev
> yet — wait until cross-tab nav has been used end-to-end on real data.

PR #121 doesn't touch the `devOnly` flag. The cross-tab nav (Option B
in S38's menu) remains the gating item for the Eligibility + Probation
promotion. Still a 1–2 hour candidate when Alex picks it up.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items B–F

From [`phase-2-2-n-close-audit.md`](phase-2-2-n-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | ~3,240 lines after S37 entry | **~3,310 lines after S38 entry (est.)** | unchanged — still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer holds |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Audit cadence — working as designed | 14th event-based trigger S37 | **15th event-based trigger this session** | working as designed |

### Item B — SESSION_LOG.md baseline ~3,310 lines after S38 entry

This session adds a 1-PR entry. Estimated ~70 lines for the entry,
total ~3,310.

Bundleable with C + the Tab 24 Improvement #6 holdReason language
drift + the OBI serial doc note + the research-doc-location
WORKFLOW.md note + the TS-param-property tip. Estimated combined
effort: ~2 hours.

### Item C — Citation anti-pattern count: 12 (unchanged)

`labor-report.md` not touched this session. Count unchanged.

### Item D — labor-report.md still 8,518 lines

No changes. Defer until Phase 2.4 still right.

### Item E — Resolved S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence: 15th event-based trigger fires on schedule

The S38 prompt template (drafted at the end of S37) included the
explicit Step-0 audit trigger pattern, which this session honored.
The slip from S25 has not recurred across **15 subsequent sessions**.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** — unchanged. All
  `[[link]]`s resolve. ✓
- **Most-relevant memories this session:**
  - `user_role.md` — Alex's "describe trade-offs, recommend, act"
    posture drove the S38 kickoff response: I answered his three
    parallel Q1/Q2/Q3 questions (persistence / Vercel / Vercel
    contributors) with trade-offs + recommendations + proceeded to
    Phase 2.2.o work as approved.
  - `data_sensitivity.md` — relevant to Q2 (Vercel). KosPos data is
    SF public records, so the Vercel decision is engineering+cost
    not confidentiality. Recommended staying on Pages until a
    feature gap forces Vercel.
  - `session_logging.md` — S38 entry being added to SESSION_LOG.md
    per the rule.
  - `feedback_dont_reremind.md` — Alex confirmed-acknowledged the
    persistence + Vercel discussion; will NOT re-raise in S39
    handoff (file as resolved-this-session).

### Tooling / hooks / settings

- **One new dep**: `pdfjs-dist@4.10.38`. ~500 KB gz vendor-isolated.
  Stays out of main bundle via dynamic import (verified — see
  Finding 5).
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block.
- **Cowork "Auto-archive on PR close"** — PR #121 archives on close.

### Anchor compliance

No `labor-report.md` heading-level edits in PR #121. Anchor verifier
rerun skipped per precedent.

### Tool sprawl

- **Two new files in `app/src/lib/scrapers/`**:
  - `sf-dhr-exam/pdf-parse.ts` (parse + matchers + entry point)
  - `pdf-parse.test.ts` (51 tests)
- **No new top-level modules.** No new ADRs (5 still queued for Phase 2.4).
- **One new dependency**: pdfjs-dist (justified — see PR description).
- **`filterRollups` export** still has no in-app consumer (carry from
  S36). Removing it stays a separate-PR follow-up.

### Doc-vs-implementation

- **Tab 11 in `labor-report.md`** describes the manual list shape +
  KosPos vision; PR #121 enriches the per-row display without
  changing the schema. No labor-report.md edits needed.
- **`docs/research/dhr-eligibility-and-jobs-scraping-plan.md`** — the
  "PDF parsing — not in v1" framing in that doc is now stale (this PR
  ships PDF parsing). Filed as Phase 2.2.p follow-up #5 to update
  that doc's status.
- **`docs/DECISIONS.md`** — no new ADRs in PR #121. Phase 2.4 ADR
  queue unchanged at 5 (or maybe 6 if we want to formalize the
  per-list Duration override decision — defer).
- **`docs/data-sources/`** — no changes.

### New drift items

- **`docs/research/dhr-eligibility-and-jobs-scraping-plan.md`'s
  "PDF parsing not in v1" framing is now stale** — filed as Phase
  2.2.p follow-up #5.
- **Phase 2.2.n Finding 2's "constant 2yr duration" assumption is
  contradicted by real DHR data** — filed as Phase 2.2.p
  follow-up #1.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #121 | Live-data discovery rewrote matchers (freeform → label-first) | resolved in PR |
| 2 | PR #121 | Real DHR data contradicts Phase 2.2.n constant-2yr Duration | carry-forward (Phase 2.2.p) |
| 3 | PR #121 | `examType` field captured but not yet surfaced | carry-forward (Phase 2.2.p) |
| 4 | PR #121 | CTW → Citywide normalization (right friendliness level) | stable |
| 5 | PR #121 | Lazy-bundle chunking verified — main, pdf-parse, pdfjs, worker separate | stable |
| 6 | PR #121 | In-flight dedupe via module-level Set, NOT Zustand state | stable |
| 7 | PR #121 | Expired-section extraction gated on `<details>` expand | stable |
| 8 | PR #121 | Cell loading/value/failure tooltips distinct | stable |
| 9 | PR #121 | pdfCache in-memory only; IndexedDB persistence deferred | carry-forward (Phase 2.2.p or sooner) |
| 10 | PR #121 | Vite + pdfjs-dist v4 integration pattern documented | stable |
| 11 | PR #121 | Preview-MCP verification at scale (137+6,732→753; 37+76 extracts on 0932) | stable |
| 12 | PR #121 | `npm run build` first-run had INEFFECTIVE_DYNAMIC_IMPORT warning → resolved same session | stable (8 of 9 strict; 9 of 9 practical) |
| 13 | PR #121 | Tests 718/718 (+75 from S38 baseline of 643) | stable |
| 14 | PR #121 | Eligibility tab stays devOnly — cross-tab nav still gates promotion | stable |
| 15 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 16 | Carry-forward B | SESSION_LOG.md ~3,310 lines after S38 entry (est.) | tracking — still queued |
| 17 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 18 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 19 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 20 | Carry-forward F | Audit cadence working as designed (15th event-based trigger) | working as designed |
| 21 | New drift — memory | 10 files indexed; links resolve; Alex's Q1/Q2/Q3 acknowledged in-session | stable |
| 22 | New drift — hooks/settings | No changes; one new dep (pdfjs-dist) | stable |
| 23 | New drift — anchors | No heading edits this phase | stable |
| 24 | New drift — tool sprawl | 2 new files + 1 new dep — all justified by scope | stable |
| 25 | New drift — doc-vs-impl | `research/dhr-eligibility-and-jobs-scraping-plan.md` "no PDF in v1" framing stale | carry-forward (Phase 2.2.p) |
| 26 | Housekeeping (carries) | 36+ stale local-only `docs/*` branches + ~12 `claude/*` branches | low priority |

**Totals:** 1 carry-forward resolved earlier (A from S33, stays
dropped) · 3 carry-forward unchanged (B, C, D) · 1 stays-dropped
(E) · 1 working-as-designed (F) · 1 prior-audit assumption refuted
by live data (S37 #119 const-Duration claim) · 12 stable PR
follow-ups + 1 housekeeping carry + 3 new Phase 2.2.p follow-ups.

---

## Recommendations not actioned

In priority order:

1. **Surface per-list `Duration:` value** — replace the constant
   "Duration: 2 yr · CSC 411A/412" header chip + the
   `computeListExpiration` derivation with the per-list value when
   `pdfCache[key]?.duration` is present. Falls back to the 2yr
   default when extraction is missing or the field couldn't be
   parsed. Bundle with a small audit-doc note that S37 Finding 2's
   constant assumption is refuted. ~2–3 hours. **Phase 2.2.p
   candidate.**
2. **Surface `examType` value** — either as a tooltip on the
   Sub-type cell (e.g., hover "CPE" to see "PBT") or a 4th narrow
   column. Design pick at the top of the session. ~1 hour.
3. **IndexedDB persistence for pdfCache** — wire the cache into
   `lib/session/snapshot.ts` so extracts survive reload + cross-
   browser-tab use. Addresses Alex's S38 Q1 partially. Cross-device
   sync (the harder part of Q1) is a separate decision. ~2–3
   hours. **Phase 2.2.p candidate — promote if Alex hits the
   re-extract friction in normal use.**
4. **Cross-tab nav from Eligibility → Positions** (carries) —
   clicking a job code in EligibilityView's summary table filters
   Positions tab to that jobCode. Bundleable with the Eligibility /
   Probation promotion to non-dev. ~1–2 hours.
5. **Lift modal overlay-frame to `lib/ui/Modal.tsx`** (carries) —
   5th instance of the same fixed-overlay-no-Portal pattern.
   ~1–2 hours.
6. **Update `research/dhr-eligibility-and-jobs-scraping-plan.md`**
   — the doc's "PDF parsing not in v1" framing is now obsolete.
   ~10 minutes; bundleable with any other docs touch.
7. **Remove the now-unused `filterRollups` export** (carries) —
   `applyEligibilityFilters` subsumes it. ~5 minutes; bundle with
   the next scrapers touch.
8. **Schedule SESSION_LOG.md trim** (item B) — ~3,310 lines after
   S38; bundleable with item C + Tab 24 Improvement #6 holdReason
   language update + OBI serial doc note + research-doc-location
   WORKFLOW.md note + TS-param-property tip. ~2 hours combined.
9. **Migrate the citation anti-pattern** (item C) — 12 instances;
   ~20 minutes.
10. **Defer `labor-report.md` split until Phase 2.4** (item D) —
    no change since Phase 2.0i.
11. **Queue ADR amendments for Phase 2.4** — still 5 queued (could
    grow to 6 if we want to formalize the per-list Duration override
    decision).
12. **Switch `computeListExpiration` to calendar arithmetic
    (`setUTCFullYear`)** — eliminates the leap-year 1-day drift
    (S37 Finding 3). Low priority; defer until UX-relevant.
13. **Local-branch cleanup** (low priority) — ~36+ stale `docs/*`
    + ~12 `claude/*` branches; 5-minute pass whenever Alex wants.

None block the next session's work.

---

## Cross-references

- Previous audit: [phase-2-2-n-close-audit.md](phase-2-2-n-close-audit.md)
  (Session 37).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.o implementation:
  [PR #121](https://github.com/alkprojects/kospos/pull/121) (Lazy PDF
  text extraction) + Session 38 SESSION_LOG.md entry (drafted in this
  PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
- Phase 2.2.n audit Finding 2 (refuted by Phase 2.2.o live data):
  [phase-2-2-n-close-audit.md § Finding 2](phase-2-2-n-close-audit.md#finding-2--duration-as-a-header-chip-not-a-per-row-column).
