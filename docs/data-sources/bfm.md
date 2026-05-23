# BFM — Budget Formulation Module

SF's budget system. Runs on a vendor platform (nm.bfm.cloud, login-gated).

## Public references

- Vendor portal [nm.bfm.cloud](https://nm.bfm.cloud/bfmnm/default.aspx) — login-gated, not publicly fetchable.
- [Budget Instructions for FY25-26 / FY26-27](https://media.api.sf.gov/documents/Budget_Instructions_for_Fiscal_Years_2025-26_and_2026-27.pdf) — references BFM forms and submission workflow.
- Public-facing BFM user docs not posted by SF.

## Eturns reports

The main BFM report format. Two flavors:

- **Position eturn** — Position details only (FTE, job class). No dollar columns beyond what the position implies.
- **Non-position eturn** — All budget dollar data for all accounts including labor (as totals, no position detail).

KosPos imports both flavors and joins them. See Phase 2 (importers).

## Reference data BFM publishes

- **Benefit rates** for all job classes (past, current, future years).
- **COLA assumptions** for all job classes (past, current, future years).

These typically come embedded in budget instructions or as a downloadable spreadsheet. Add the canonical URL when you confirm it.

## Open uncertainties

- Whether BFM offers any read-only API or scheduled export. The standard path is download-via-portal.
- Whether Snowflake will replace BFM reporting as well as OBI.
