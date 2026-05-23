# Decision Log

Append-only. Newest at top. Format inspired by Architecture Decision Records (ADRs).

Each entry: what we decided, the context, what we considered instead, and the consequences (good and bad). When a decision is reversed, do not delete it — add a new entry referencing the prior one.

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
