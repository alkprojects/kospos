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
| Controller's Office | [`controller.md`](controller.md) | Accounting policies, AAO, fiscal-monitoring reports, **pay calendar**, payroll, source-system infrastructure, Inspector General |
| DHR | [`dhr.md`](dhr.md) | Job classifications, salaries, MOUs, eligibility lists |
| Civil Service Commission | [`civil-service.md`](civil-service.md) | Civil Service Rules (Vol I–IV), Civil Service Advisers |
| Mayor's Office | [`mayor.md`](mayor.md) | Budget Instructions, ASO drafting, Proposed Budget |
| PS HCM | [`ps-hcm.md`](ps-hcm.md) | Employees, positions, T&L, queries |
| PS Financials | [`ps-financials.md`](ps-financials.md) | Chartfields, appropriation control |
| BFM | [`bfm.md`](bfm.md) | Budget formulation (Sherpa platform), eturns |
| OBI / Snowflake | [`obi.md`](obi.md) | Current Controller-owned reporting (OBI); Snowflake is a DT initiative |

For the authority chain (who issues / approves / hosts), see
[`../domain/authorities.md`](../domain/authorities.md). For the appointment-type taxonomy
that bridges DHR / CSC / Charter / Admin Code, see
[`../domain/appointment-types.md`](../domain/appointment-types.md).

## Local reference PDFs

Folder: `reference-pdfs/` (gitignored).

Drop SF-internal PDFs here for offline reference. Currently expected:

- `CON Accounting P&P - January 2026 v1.2.pdf` — Controller's Office Accounting Policies & Procedures
- (Add others as you find them)
