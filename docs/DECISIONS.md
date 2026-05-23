# Decision Log

Append-only. Newest at top. Format inspired by Architecture Decision Records (ADRs).

Each entry: what we decided, the context, what we considered instead, and the consequences (good and bad). When a decision is reversed, do not delete it — add a new entry referencing the prior one.

---

## ADR-008 — Session handoff convention: SESSION_HANDOFF.md

**Date:** 2026-05-23
**Status:** Accepted

**Context:** Each Claude session was re-deriving context from scratch. End-of-session prompts were written manually and sometimes lost.

**Decision:** Maintain `docs/SESSION_HANDOFF.md` as a machine-updated file. Every session reads it on startup and overwrites it on shutdown with the next prompt, recommended model, branch state, and any blockers. Added mandatory startup/shutdown sequences to `docs/CLAUDE.md`.

**Alternatives considered:** A Cron-scheduled remote agent — overkill for a single-user project where Alex manually starts each session.

**Consequences:** Sessions self-configure without Alex needing to remember context. The file becomes the source of truth for "where we left off."

---

## ADR-007 — OBI BI Payroll importer column assumptions

**Date:** 2026-05-23
**Status:** Provisional — awaiting Alex's confirmation against a real export

**Context:** The `docs/data-sources/obi.md` doc does not specify exact column names. OBI is also migrating to Snowflake.

**Decision:** Implemented the importer using these assumed column names: `Department Code`, `Department Name`, `Position Number`, `Empl ID`, `Employee Name`, `Job Code`, `Account Code`, `Fund`, `Authority`, `YTD Salary`, `YTD Benefits`, `YTD Total`, `Fiscal Year`, `Report Period`. Importer is header-driven (sniffs by lowercase match), so a column rename only requires updating the fingerprint and the `col()` lookup — not a rewrite.

**Consequences:** If real column names differ, Alex updates the fingerprint strings in `detect.ts` and the `col()` lookups in `obi-payroll.ts`. No structural change needed.

---

## ADR-006 — PS HCM P&P Data importer column assumptions

**Date:** 2026-05-23
**Status:** Provisional — awaiting Alex's confirmation against a real export

**Context:** The P&P report is described as "88 columns" in the data-source doc but exact names are not listed.

**Decision:** Implemented against this assumed column set (the fields KosPos actually uses): `Position Number`, `Job Code`, `Job Code Description`, `Department Code`, `Department Name`, `Position Status`, `Empl ID`, `Employee Name`, `Appointment Type`, `Salary Step`, `Salary Amount`, `Reports To Position`, `RTF Status`, `RTF Expected Fill Date`, `FTE`, `Union Code`. Remaining ~72 columns are ignored.

**Consequences:** Same as ADR-007 — header-driven, column renames are isolated changes.

---

## ADR-005 — BFM Non-Position eturn importer column assumptions

**Date:** 2026-05-23
**Status:** Provisional — awaiting Alex's confirmation against a real export

**Context:** `docs/data-sources/bfm.md` describes the non-position eturn as "all budget dollar data for all accounts including labor (as totals, no position detail)" but doesn't list columns.

**Decision:** Assumed columns: `Department Code`, `Department Name`, `Account Code`, `Account Description`, `Fund`, `Authority`, `Budget Amount`, `Fiscal Year`.

**Consequences:** Same as ADR-007.

---

## ADR-004 — BFM Position eturn importer column assumptions

**Date:** 2026-05-23
**Status:** Provisional — awaiting Alex's confirmation against a real export

**Context:** `docs/data-sources/bfm.md` describes the position eturn as "Position details only (FTE, job class)" but doesn't list column names.

**Decision:** Assumed columns: `Department Code`, `Department Name`, `Position Number`, `Job Code`, `Job Code Description`, `Position Status`, `FTE`, `Budgeted Salary`, `Fund`, `Authority`, `Fiscal Year`.

**Consequences:** Same as ADR-007.

---

## ADR-002-update — xlsx CDN swap deferred to Phase 2 completion

**Date:** 2026-05-23
**Status:** Deferred

**Context:** ADR-002 called for switching to the SheetJS CDN build when Phase 2 parsing began. The swap was attempted but blocked by the Claude Code auto-mode security classifier (installing from an external URL requires explicit user authorization).

**Decision:** Continue using the npm `xlsx@0.18.5` package for Phase 2. Alex should run `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` manually in `app/` when convenient, or authorize the action in the next session.

**Consequences:** `npm audit` will continue to report the two known advisories (prototype pollution, ReDoS). Acceptable for a local-only tool with no user-supplied untrusted Excel files. Revisit before any public deployment.

---

## ADR-003 — Data quality + change tracking are cross-cutting, not their own phase

**Date:** 2026-05-22
**Status:** Accepted

**Context:** Labor data is always changing and often has errors. Two questions: where do anomaly checks live, and how does the app communicate fixes to upstream systems?

**Decisions:**

**Anomaly detection** lives in `app/src/lib/quality/`, one rule per file, with a common interface. Every imported dataset is run through the active rule set. Output goes into a global "Data Issues" panel and into per-module badges.

**Change tracking** lives in `app/src/lib/changes/`. When the user toggles **Change Mode** in any module, every edit produces a `ProposedChange` record rather than mutating data directly. The Change List is reviewable and discardable. "Generate Change Report" outputs Excel/PDF grouped by system-of-record (PS HCM, BFM, PS Financials), telling the appropriate clerical owner what to update.

**The app never writes back to source systems.** Write-back is reserved for Phase 11+, behind auth.

**Why both as cross-cutting:**

- A single "Phase 4 - data quality" attempt would mean other modules wait to flag issues until much later.
- Change Mode is the mechanism by which the org chart's drag-to-reorganize produces a `Reports To` update report. Building Change Mode in the org-chart-only phase would mean every other module misses out on the same idea.

**Consequences:**

- Every phase from 2 onward adds rules to `quality/` and Change Mode capabilities to its module.
- The lift in Phase 2 includes building the rule + change-tracking scaffolding even though only basic referential-integrity rules ship there.

---

## ADR-002 — `xlsx` from npm has an open audit warning; ship anyway in v1, revisit in Phase 2

**Date:** 2026-05-22
**Status:** Accepted

**Context:** `npm install xlsx` brings in a version with two open advisories (prototype pollution, ReDoS). SheetJS publishes fixes on their own CDN but not to npm. Phase 0 has no parsing yet, so the dependency is dead code on the production page right now.

**Decision:** Accept the warning for Phase 0–1. In Phase 2 (when we first parse Excel), switch to the CDN install:

```sh
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

…and record an ADR-update.

**Alternatives considered:**

- `exceljs` — actively maintained, but the API is more complex and the SF labor reports are simple enough that SheetJS suffices.
- `papaparse` — CSV-only; the canonical reports are `.xlsx`.

**Consequences:**

- `npm audit` will report 1 high-severity finding during Phase 0/1. This is known.
- Phase 2 must verify the CDN install and re-run `npm audit`.

---

## ADR-001 — Stack and structure for KosPos

**Date:** 2026-05-22
**Status:** Accepted

**Context:** Building a new position-management web app. Need to pick a stack, hosting, and persistence model that a beginner Claude user can maintain and that scales toward eventual citywide use.

**Decisions:**

| Concern | Choice |
|---|---|
| **Frontend** | Vite + React + TypeScript |
| **Diagramming (Phase 10)** | `@xyflow/react` (React Flow) + `dagre` for auto-layout |
| **Excel parsing** | `xlsx` (SheetJS) — see ADR-002 |
| **State** | `zustand` (small store, no Redux ceremony) |
| **Persistence (v1)** | IndexedDB via `idb` library (NOT localStorage — single labor report exceeds the 5 MB cap) |
| **Hosting** | GitHub Pages, static build, no backend |
| **Tests** | Vitest + Testing Library |
| **CI** | GitHub Actions — `deploy.yml` for Pages, `test.yml` for tests |
| **Persistence (v2 citywide)** | Cloudflare D1 or Supabase + `@sfgov.org` SSO, behind a swappable storage adapter |
| **App structure** | One unified app with tabbed modules (`app/src/modules/<feature>/`). Calculator math lifted into shared `lib/cost.ts`; orgchartbuilder folds in as `modules/orgchart/` in Phase 10. |

**Alternatives considered:**

| Choice | Rejected because |
|---|---|
| Vue / Svelte | Alex's other project uses React; consistency matters more than marginal DX gains. |
| Next.js | Server-side rendering is unnecessary for a static, single-user-per-browser tool. |
| Plain HTML/JS (like the calculator) | Doesn't scale to ten modules; no type safety for "AI invented a function" mistakes. |
| localStorage | 5 MB cap is too small; single labor report exceeds it. |
| Backend from day one | Adds auth, billing, IT-approval complexity before any value ships. |
| Separate apps per module | Forces context-switching for users; data sharing across modules is the whole point. |

**Consequences:**

- The app is bound to React Flow for the org chart phase. Acceptable — that's why v1 collapsed without it.
- IndexedDB is async-only, which means every storage call returns a Promise. The `idb` library makes this ergonomic.
- The storage adapter must be designed in Phase 2 so the eventual backend swap doesn't ripple through every module.
