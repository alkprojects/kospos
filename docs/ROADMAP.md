# Roadmap

Phases are sized so each one is 1–3 Claude sessions and ends with something demoable. **Do not start the next phase until the previous one is stable.**

The org chart is intentionally LAST (Phase 10) — built on top of the data layer that prior phases produce.

---

## Phase 0 — Foundation ✓ (in progress)

Plumbing, no features.

- [x] `alkprojects/kospos` repo
- [x] Vite + React + TypeScript scaffold
- [x] GitHub Actions: `deploy.yml` (Pages) + `test.yml` (Vitest)
- [x] Full `docs/` tree with skeletons
- [x] Placeholder landing page
- [x] Strict `.gitignore` for `.xlsx`/PII
- [x] Legacy banners on `orgchartbuilder` and `CCSF-Job-Class-Calculator`

**Done when:** the placeholder page is live at <https://alkprojects.github.io/kospos/>, `docs/CLAUDE.md` exists, and the test workflow is green.

---

## Phase 1 — Job Class Calculator port

Three sub-steps; correctness over speed.

**1.a — Port the math.** Lift `CCSF-Job-Class-Calculator/index.html` math into `app/src/lib/cost.ts` as pure, typed functions. Lift reference data into `app/src/data/*.json`.

**1.b — Parity tests (before any UI).** Choose ~20 representative job classes (regular steps, extended steps, MCCP ranges, discretionary steps). Assert that the TypeScript module reproduces the standalone calculator's outputs to the penny. Tests run in CI.

**1.c — Build the calculator UI module.** Don't blindly copy the standalone UI flow. Reconsider: show reference data inline, support batch calculation, add print/copy export.

**Done when:** parity tests pass for the chosen job classes, the UI renders inside KosPos, and Alex has reviewed and approved the input layout.

---

## Phase 2 — Report importers + data quality scaffolding

- File picker with auto-detection by sniffing column headers.
- Importers: BFM eturns (Position + Non-position), PS HCM P&P Data, OBI BI Payroll, Combo Codes, Roster Approvers, EE Additional Pay.
- Each importer = its own ADR in `docs/DECISIONS.md`.
- Build `app/src/lib/quality/` with the rule interface and 3–5 baseline rules.
- Build `app/src/lib/changes/` with the proposed-change interface.
- Global *Data Issues* panel.

**Done when:** every data source from `docs/data-sources/` loads cleanly and the Data Issues panel surfaces real anomalies in Alex's DBI labor data.

---

## Phase 3 — Chartfield model + position-to-actuals linkage

- Chartfield reference tree (Fund / Dept / Project / Activity / Authority / Account).
- Combo code and task profile lookup tables.
- Appropriation control logic (account / project / authority levels).
- For each position: show the default chartfield string and any overrides.

**Done when:** picking any position shows where its labor will post.

---

## Phase 4 — Special Class calculations

Implement the special-class math from the `Special Class` tab in Alex's spreadsheet:

| Code | Name | Type |
|---|---|---|
| **9993M_C** | Attrition Savings (Misc) | Credit |
| **9994M_C** | MCCP Offset (Misc) | Credit |
| **9995M_E** | Positions Not Detailed (Misc) | Expense |
| **OVERM_E** | Overtime (Misc) | Expense |
| **PREMM_E** | Premium Pay (Misc) | Expense |
| **RTPOM_E** | Retirement Payout (Misc) | Expense |
| **STEPM_C** | Step Adjustments (Misc) | Credit |
| **TEMPM_E** | Temporary (Misc) | Expense |

**Done when:** outputs match Alex's spreadsheet for DBI FY27-28 to the dollar.

---

## Phase 5 — Projections engine

- Year-end projection per chartfield.
- Methods: straight-line / trailing-period / hiring-plan-aware.
- Attrition = budget − projected actuals.

**Done when:** the Operating Report Summary tab is reproducible.

---

## Phase 6 — Hiring Plan

- Per-position hiring tracker.
- Configurable hiring-process templates (PCS / PEX / TEX).
- Time-to-hire metrics.
- Eligibility-list lookup (initially manual links; later scraped).

**Done when:** every vacant position has a hiring-plan entry and the Staffing Plan tab is reproducible.

---

## Phase 7 — Separations Plan

- Per-position tracker for known + suspected separations.
- Feeds into Phase 5 projections.

**Done when:** separations flow into projections.

---

## Phase 8 — Budget edits / next-cycle planning

- Reassignments, substitutions, special-class edits for the next budget cycle.
- Proposed-vs-Current diff view.
- Export in BFM-compatible format.

**Done when:** a draft FY29-30 budget proposal can be exported.

---

## Phase 9 — Reports & exports

- Audience-aware report templates: Executive / Internal Mgmt / External.
- Excel + PDF exports.
- Cross-system reconciliation reports (T&L vs Payroll vs Financials).

**Done when:** Alex stops using the manual workbook for routine reports.

---

## Phase 10 — Org Chart (last — hardest)

Folds `alkprojects/orgchartbuilder` code in as `app/src/modules/orgchart/`. Built on the data layer from Phases 1–9.

- **Total user control** — every visual aspect editable. See VISION.md.
- **Audience modes** — Executive / Internal Mgmt / Internal All Staff / External.
- **Change Mode** — drag-to-reorganize → produces a `Reports To` update entry for PS HCM. Move between depts → department-transfer entry. Change job code → reclassification entry. Generate Change Report = Excel grouped by system-of-record.
- **Anomaly badges** on flagged nodes.

**Done when:** Alex retires Lucidchart for SF org charts AND a real reorganization can be drafted and exported as a Change Report.

---

## Phase 11+ — Citywide

- Backend (Cloudflare D1 or Supabase).
- `@sfgov.org` SSO.
- Multi-department tenancy.
- Per-user permissions and audit log.
- Possibly: write-back to source systems (if IT permits).
