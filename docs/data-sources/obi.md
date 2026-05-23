# OBI / Snowflake

Reporting platform layered over PS HCM and PS Financials. **Currently OBI; migrating to Snowflake.** Timeline not publicly announced; treat any Snowflake references as forward-looking.

## OBI (current state)

- Oracle Business Intelligence Enterprise Edition.
- Managed by [CON Systems Division](https://www.sf.gov/information--controllers-office-systems-division).
- No public dashboards — access via SF SSO.
- The main labor reports Alex uses today come from OBI:
  - **BI Payroll** — All paid amounts in the fiscal YTD.
  - Various ad-hoc queries on positions, employees, chartfields.

## Snowflake (future state)

- No SF.gov-published timeline located as of 2026-05-22.
- CON Systems Division page still lists OBI as current.
- KosPos should design importers to be **source-agnostic** — sniff column headers, not file names — so the OBI→Snowflake cutover doesn't require a rewrite.

## What KosPos imports

- **BI Payroll** report (Phase 2 importer).
- Any other OBI-built report Alex currently runs (capture each one as you confirm it).

## Open uncertainties

- Snowflake migration timeline. Authoritative source: CON Systems Division — confirm directly.
- Whether OBI/Snowflake output formats will be CSV, XLSX, or JSON post-migration.
