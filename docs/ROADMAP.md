# Roadmap

Phases are sized so each one is 1–3 Claude sessions and ends with something demoable.
**Do not start the next phase until the previous one is stable.**

## Roadmap pivot (2026-05-24)

Originally the roadmap ran Phases 0 → 10 with the org chart last and "the whole thing
comes together at the end." That order didn't work in practice: deciding what to work on
and in what order was too hard, and the edges of the project were too vague because every
phase had unresolved data and knowledge dependencies on every other phase.

**New strategy: build out one self-contained workspace at a time, starting with the
current year.** The first deliverable is a recreated-and-improved version of Alex's
`Labor Report 5.21.26.xlsx` — every tab, with the math, data flow, and improvements
documented. Once that workspace is solid, expand outward.

See [ADR-009](DECISIONS.md) for the full reasoning.

The budget-development work done in Sessions 9–11 (RPO + OVERM math + UI) is **kept in
code but hidden from the app** until we re-expose it in the budget-development phase.

---

## Phase 0 — Foundation ✓ (complete)

Repo, deploy pipeline, docs tree, placeholder landing page.

---

## Phase 1 — Job Class Calculator ✓ (complete, Sessions 1–8)

Pure-function math + parity tests + calculator UI module. See `app/src/lib/cost.ts` and
`app/src/modules/calc/`.

---

## Phase X — Special-class budget-dev math ✓ (complete, hidden, Sessions 9–11)

RPO + OVERM math, tests, and the `SpecialClassView` UI shipped under
`app/src/lib/special-class/` and `app/src/modules/special-class/`. **Code preserved;
UI hidden** per the roadmap pivot. Re-exposed in Phase 6 (Budget Development).

---

## Phase 2 — Current-Year Workspace (the Labor Report rebuild) — NEXT

The current focus. Rebuild and improve `Labor Report 5.21.26.xlsx` inside KosPos.

**Form:** Interactive React UI for analysis + Excel export for compatibility / sharing.
Each labor-report tab gets a corresponding KosPos page; users can also export an
improved `.xlsx` that the old workflow can consume.

**Sub-phases** (sized small, each shippable):

- **2.0 — Deep-dive doc.** Walk through every tab of the Labor Report with Alex. Produce
  `docs/domain/labor-report.md` documenting: what each tab does, why it exists, where the
  data comes from, how the formulas work, what's manual-and-fragile, and improvement
  ideas. Output: a structured doc + a backlog of importable data sources + a backlog of
  UI sub-phases. **No code in this sub-phase.**
- **2.1 — Hide budget-dev UI.** Route-guard `SpecialClassView` so it doesn't show in
  the app shell. Keep the code + tests intact. Add a `?dev=1` query escape hatch for
  developer access (persists via `localStorage['kospos:dev-mode']`; `?dev=0` or the
  in-app "Disable dev mode" button clears it). Shipped in
  [PR #59](https://github.com/alkprojects/kospos/pull/59).
- **2.2 — Per-tab UI sub-phases.** One sub-phase per labor-report tab, in dependency
  order (calendar → BI Payroll → Operating Report Summary → per-class detail tabs).
  Each sub-phase ships with parity tests against the source workbook for the dept(s)
  Alex confirms.
- **2.3 — Excel export.** Generate an improved `.xlsx` mirroring the source-workbook
  structure plus KosPos's enhancements. Round-trips so a downstream consumer can keep
  using Excel.
- **2.4 — Importer wiring.** Build importers for the upstream data sources Alex
  identifies in 2.0. **Decision deferred to 2.0 walkthrough:** which sources are
  manual-upload (most, given Snowflake is "a ways off"), which need website scraping
  for enhancements.

**Data-source strategy.** SF is migrating to Snowflake but the timeline is long. For
the foreseeable v1, **every update is a user upload** of the relevant source files.
Some enhancements (e.g., DHR class-spec lookups) may need website scraping. Per-source
detail will be enumerated in 2.0.

**Done when:** Alex can drop in the labor-report inputs, KosPos reproduces the existing
Labor Report's outputs to the dollar for DBI's current fiscal year, the UI surfaces
everything the workbook does plus the improvements identified in 2.0, and an Excel
export round-trips.

---

## Phase 3 — Expansion off the current-year workspace

Order to be decided after Phase 2 lands and we see what naturally falls out of the data
foundation. Likely candidates, in no particular order:

- Hiring Plan (the "Staffing Plan" tab in the labor report — comes for free if it's
  already in Phase 2; standalone if not)
- Separations Plan (feeds projections)
- Cross-system reconciliation reports (T&L vs Payroll vs Financials)
- Multi-year reference data (versioned by effective date — needed once we go past
  current year)
- Data Issues panel (the global quality-rules surface) — may emerge naturally during
  Phase 2 importer work

---

## Phase 4 — Audience-aware reporting

Audience-aware report templates (Executive / Internal Mgmt / External). Excel + PDF
exports. Built on top of the Phase 2 + Phase 3 data layer.

---

## Phase 5 — Past-year support

Historical FY support: reference data versioned by effective date, year-over-year
comparisons, trend views. Comes after current-year because past-year audit is a smaller
audience than current-year operations.

---

## Phase 6 — Budget Development (re-expose + complete)

Re-expose the hidden Sessions 9–11 RPO + OVERM work in the main app. Complete the
remaining special-class math (PREMM, STEPM, 9994, 9995, TEMPM, 9993). Add the two-year
budget cycle UI (BY + BY+1). Build a BFM-compatible export.

| Code | Name | Type | Status |
|---|---|---|---|
| RTPOM_E | Retirement Payout | Expense | ✓ math + UI (hidden in Phase 2.1) |
| OVERM_E | Overtime | Expense | ✓ math + UI (hidden in Phase 2.1) |
| PREMM_E | Premium Pay | Expense | math + UI pending |
| STEPM_C | Step Adjustments | Credit | math + UI pending |
| 9994M_C | MCCP Offset | Credit | math + UI pending |
| 9995M_E | Positions Not Detailed | Expense | math + UI pending |
| TEMPM_E | Temporary | Expense | math + UI pending |
| 9993M_C | Attrition Savings | Credit | math + UI pending — residual, do last |

**Done when:** outputs match Alex's `DBI FY27-28 Budget Master` to the dollar and a
draft FY29-30 budget proposal can be exported in BFM-compatible format.

---

## Phase 7 — Org Chart

Folds `alkprojects/orgchartbuilder` code in as `app/src/modules/orgchart/`. Built on
the data layer from prior phases.

- **Total user control** — every visual aspect editable. See VISION.md.
- **Audience modes** — Executive / Internal Mgmt / Internal All Staff / External.
- **Change Mode** — drag-to-reorganize → produces a `Reports To` update entry for
  PS HCM. Move between depts → department-transfer entry. Change job code →
  reclassification entry. Generate Change Report = Excel grouped by system-of-record.
- **Anomaly badges** on flagged nodes.

**Done when:** Alex retires Lucidchart for SF org charts AND a real reorganization can
be drafted and exported as a Change Report.

---

## Phase 8+ — Citywide

- Backend (Cloudflare D1 or Supabase).
- `@sfgov.org` SSO.
- Multi-department tenancy.
- **Tiered user types + per-user permissions** (with audit log). The in-app
  dev-mode toggle introduced in Phase 2.x is the first, deliberately auth-free
  step toward this — a plain switch during development, gated by SSO above only
  once KosPos is shared with other users for testing. The eventual model:
  - **Regular users** — see the user-facing tabs only; read access plus their
    own edits (notes, planned actions) within their department.
  - **Dev users** — also see the dev-gated tabs and the in-tab controls (file
    imports, "clear all") for managing centrally-loaded source data.
  - **Super-dev users** — can edit *what regular and dev users see and what the
    site does*: configure which tabs and controls each tier gets, manage
    reference data, and adjust site-wide functionality. The control surface for
    the other tiers, rather than just another visibility level.
- Possibly: write-back to source systems (if IT permits).
- Snowflake direct integration (if/when the city's data platform lands and IT permits).

---

## What changed from the pre-pivot roadmap

| Old | New | Why |
|---|---|---|
| Phase 2 (Importers) → 3 (Chartfields) → 4 (Special Class) → 5 (Projections) → ... → 10 (Org Chart, last) | Phase 2 = Current-Year Workspace (the labor report). Subsequent phases expand off it. Org chart is now Phase 7. | Easier to scope (one workbook), faster to demo, every sub-phase ships something usable. |
| Special-class budget-dev math (RPO + OVERM) was Phase 4, would have been the visible app feature | Same code; hidden from UI until Phase 6 (Budget Development) | The work is solid — but showing it now distracts from current-year focus. |
| Importers as standalone Phase 2 | Importers wired *as part of* Phase 2 sub-phases, driven by what each labor-report tab needs | Importers were getting built without knowing what the consumer needed; backwards. |
