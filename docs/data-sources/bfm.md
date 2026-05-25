# BFM — Budget Formulation Module

SF's budget system. **Vendor: Sherpa Government Solutions** (selected August 2020), a unit
of GTY Technology Holdings, acquired by GI Partners in April 2022. Runs on the vendor's
hosted platform (nm.bfm.cloud, login-gated). Brand internally: "SF Budget" under the
Controller's Systems Division.

Sources: [Sherpa selection announcement (BusinessWire 8/11/2020)](https://www.businesswire.com/news/home/20200811005050/en/GTY-Technologys-Sherpa-Government-Solutions-Selected-by-the-City-and-County-of-San-Francisco);
[Sherpa product page](https://store.sap.com/dcp/en/product/display-2001014049_live_v1/budget-formulation-and-management/);
[GTY → GI Partners acquisition (BusinessWire 4/29/2022)](https://www.businesswire.com/news/home/20220429005162/en/GTY-Technology-Holdings-Inc.-Enters-Agreement-to-be-Acquired-by-GI-Partners).

## Public references

- Vendor portal [nm.bfm.cloud](https://nm.bfm.cloud/bfmnm/default.aspx) — login-gated, not publicly fetchable.
- [Budget Instructions for FY25-26 / FY26-27](https://media.api.sf.gov/documents/Budget_Instructions_for_Fiscal_Years_2025-26_and_2026-27.pdf) — references BFM forms and submission workflow.
- Public-facing BFM user docs not posted by SF.

## Eturns reports

The main BFM report format. Two flavors:

- **Position eturn** (`15.10.006 Position and Calc'd Benefits Detail`) — Position details + per-position benefit detail. By Position# sheet (1,931 rows × 64 cols in the 5.14.26 sample) is the canonical labor-budget source. By Job Class sheet (3,923 rows × 60 cols) is the same data rolled to class × chartfield.
- **Non-position eturn** (`15.10.001 Chart of Account Query`) — All budget dollar data for all accounts (1,016 rows × 49 cols), including labor totals **without position attribution**, plus non-personnel-services (materials, contracts, etc.).

KosPos imports both flavors and joins them. See Phase 2 (importers).
The 5.14.26 sample of both eturns lives in
[`example reports/Reports/Eturns 5.14.26.xlsx`](reports-folder-inventory.md#eturns-51426xlsx);
a slightly older 5.7-ish version is embedded in the labor-report
workbook as the `BFM 15.10.006 FY26` tab.

## Reference data BFM publishes

Five distinct reports under the `15.*` prefix. Per Alex's own `reports.txt`
annotations:

| Report ID | Filename pattern | Sheets / rows | Role |
|---|---|---|---|
| **15.10.001** | `Chart of Account Query`.xlsx | 1 sheet × 1,016 rows × 49 cols | **Non-position eturn** (above) |
| **15.10.006** | `Position and Calc'd Benefits Detail`.xlsx | 2 sheets (By Position#, By Job Class) | **Position eturn** (above) — primary BFM input |
| **15.15.002** | `Benefit Rates`.xlsx | 2 sheets (Retirement 54 rows × 10; Health Dental 1,621 rows × 9) | Per-(class, account, benefit code) benefit rates **for FY26-27 and FY27-28** (not the current FY — that comes from live BI Payroll). Alex's caveat: "not 100% confident these rates are 100% accurate and complete." |
| **15.15.014** | `Job Class Rates and COLA`.xlsx | 3 sheets (Cross Tab 1,314 × 13; Emp Org COLA; Job Class Override 5 × 13) | Per-job-class hourly rate + COLA. Override sheet for class-specific MOU exceptions. **Currently empty (no overrides remaining late in the 3-year cycle).** |
| **15.15.016** | `FTE Cost Report - 9900 Form`.xlsx | 1 sheet × 1,174 rows × 13 cols | Per-job-class FTE cost calculator. **Being retired in BY28 / BY29 per Alex.** KosPos's Phase 4 RPO calculator (in `app/src/`) is the modern replacement. |

Concrete file shapes (incl. headers) live in
[`reports-folder-inventory.md` § BFM reports](reports-folder-inventory.md#bfm-reports-5-files).

## BVA report

BVA (Budget vs Actuals) is sourced from PS Financials and delivered via OBI —
not a BFM artifact, even though its `Original Budget` column reconciles to
the BFM eturn's `FY Board` column. Full schema, refresh-order timing rule,
and reconciliation pattern in [`bva.md`](bva.md).

The reconciliation relevant to BFM:

```
KK_adjustment(chartfield) = BVA.Revised_Budget_Pre_Close(chartfield)
                          − BFM_eturn.FY_Board(chartfield)
```

When that delta is non-zero, a mid-year KK budget journal (transfer,
supplemental, carryforward) moved budget into or out of the chartfield
relative to what was adopted. See `bva.md` § Reconciliation pattern.

## BFM eturn — Report Data dependency notes

The `BFM 15.10.006 FY26` eturn carries **per-position rows + per-special-class
summary rows** in the same file. Both shapes are consumed by the labor report:

- **Per-position rows** drive Report Data's `S Total Budget` via SUMIFS on
  `D BY HCM Position#`. The current workbook formula uses **column `AX FY
  2025-26 Technical Adjustment`** — confirmed-stale per Alex; should be **`AZ
  FY 2025-26 Board`** (the Board-adopted layer). KosPos defaults to `AZ`.
- **Per-special-class summary rows** at the bottom of the eturn drive
  Operating Report Summary's TEMPM E40 (`AZ1195 + AZ1197 + AZ1199 + AZ1201`)
  and the SPECIAL block in Report Data (100 hand-pasted cells per refresh).
  Same `AZ` vs `AX` consideration applies.

KosPos importer should preserve **all budget-layer columns** (Original, Base,
Department, Mayor, Committee, Technical Adjustment, Board) so variance views
can compare layers, and default queries should use Board-adopted.

## Open uncertainties

- Whether BFM offers any read-only API or scheduled export. The standard path is
  download-via-portal.
- **Snowflake scope:** Snowflake is a Department of Technology initiative used by some
  city departments (per Snowflake's CCSF case study); not publicly documented as
  touching BFM or PeopleSoft. KosPos should not assume Snowflake replaces BFM reporting
  on any committed timeline. See [`obi.md`](obi.md).

## What KosPos got wrong (and was corrected 2026-05-24)

- **Vendor identity** was previously left as a generic "vendor platform." Confirmed as
  Sherpa Government Solutions (Aug 2020 selection). KosPos should reference Sherpa by
  name when discussing BFM technical specifics.
