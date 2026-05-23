# Data Sources

One file per upstream system. Each file documents:

- Where reports live (URL or query name)
- What columns / fields they contain
- How often they're refreshed
- Anything that's behind a login vs. public
- Anything that drifts (URLs that rotate yearly, column renames, etc.)

## Indexed sources

| Source | File | What it owns |
|---|---|---|
| Controller's Office | [`controller.md`](controller.md) | Accounting policies, AAO, Nine-Month Report, fiscal-monitoring guidance |
| DHR | [`dhr.md`](dhr.md) | Job classifications, salaries, MOUs, eligibility lists, pay calendar |
| Civil Service Commission | [`civil-service.md`](civil-service.md) | Civil Service Rules (Vol I–IV) |
| Mayor's Office | [`mayor.md`](mayor.md) | Budget instructions, ASO, Proposed Budget |
| PS HCM | [`ps-hcm.md`](ps-hcm.md) | Employees, positions, T&L, queries |
| PS Financials | [`ps-financials.md`](ps-financials.md) | Chartfields, appropriation control |
| BFM | [`bfm.md`](bfm.md) | Budget formulation, eturns |
| OBI / Snowflake | [`obi.md`](obi.md) | Current reporting platform (OBI), migrating to Snowflake |

## Local reference PDFs

Folder: `reference-pdfs/` (gitignored).

Drop SF-internal PDFs here for offline reference. Currently expected:

- `CON Accounting P&P - January 2026 v1.2.pdf` — Controller's Office Accounting Policies & Procedures
- (Add others as you find them)
