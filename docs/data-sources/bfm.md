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

- **Position eturn** — Position details only (FTE, job class). No dollar columns beyond what the position implies.
- **Non-position eturn** — All budget dollar data for all accounts including labor (as totals, no position detail).

KosPos imports both flavors and joins them. See Phase 2 (importers).

## Reference data BFM publishes

- **Benefit rates** for all job classes (past, current, future years).
- **COLA assumptions** for all job classes (past, current, future years).

These typically come embedded in budget instructions or as a downloadable spreadsheet. Add the canonical URL when you confirm it.

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
