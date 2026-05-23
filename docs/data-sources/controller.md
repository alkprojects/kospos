# Controller's Office (CON)

Owns city accounting policies, fiscal monitoring, the AAO, and the source systems infrastructure (PeopleSoft HCM/FSCM, OBI, BFM).

## Key resources

- [Controller's Office hub](https://www.sf.gov/departments--controllers-office--about) — top-level entry. Legacy `sfcontroller.org` URLs redirect here.
- [Annual Appropriation Ordinance (AAO) FY26 & FY27](https://media.api.sf.gov/documents/FY2026__FY2027_-_FINAL_AAO.pdf) — adopted department-level appropriations (dollars by index/character/sub-object). Public. Annual, two-year cycle, final after Board adoption in July.
- [Nine-Month Budget Status Report FY25-26](https://media.api.sf.gov/documents/Nine-Month_Report_FY25-26_FINAL.pdf) — quarterly fiscal monitoring of revenue/expenditure vs. budget. Public. Cadence: quarterly (Six-Month, Nine-Month, year-end), issued by CON Budget & Analysis Division.
- [Budget Process Documents — FY27 & FY28 hub](https://www.sf.gov/budget-process-documents) — Mayor's Instructions, Five-Year/March Plans, Status Reports, Proposed Budget. Public; rolling updates through July.
- [Controller's Office Systems Division](https://www.sf.gov/information--controllers-office-systems-division) — owns PeopleSoft HCM/FSCM/ELM, OBI, BFM, Oracle IAM, Phire, Control-M. Public landing page.
- [Fiscal Monitoring Resources for City Departments](https://www.sf.gov/resource--2024--fiscal-monitoring-resources-city-departments) — quarterly monitoring templates and CON guidance. Public.

## Internal / local

- **`CON Accounting P&P - January 2026 v1.2.pdf`** — Controller's Accounting Policies & Procedures manual. Held locally; no current canonical sf.gov landing page surfaced. Reissued roughly annually with version bumps. Drop into `docs/data-sources/reference-pdfs/`.

## What lives where (for KosPos)

- Accounting rules (combo codes vs. task profiles, default chartfield posting) → CON P&P → modeled in `docs/domain/chartfields.md` and `docs/domain/special-class.md`.
- Special-class definitions (9993, 9994, 9995, OVERM, etc.) → CON budget policy + technical instructions → modeled in `docs/domain/special-class.md`.
- Year-end projection methodology → CON guidance + Nine-Month Report → modeled in `docs/domain/projections.md`.

## Open uncertainties

- No canonical sf.gov page for the Accounting P&P landing surfaced. The local PDF may be department-distributed only. Legacy copies historically lived on `sfcontroller.org`. **TODO:** confirm canonical location with CON.
- AAO / Nine-Month PDFs at `media.api.sf.gov` were fetched as binary; cadence/issue dates inferred from filename. Validate when reading.
