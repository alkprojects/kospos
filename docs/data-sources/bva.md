# BVA — Budget vs Actuals report

**The source of truth for budget AND actuals at the chartfield grain.** Generated
from PeopleSoft Financials (see [`ps-financials.md`](ps-financials.md)) and
delivered via OBI (see [`obi.md`](obi.md)) until SF's Snowflake migration
lands. Identified as a required KosPos import during the
[Tab 20 (Report Data) walkthrough](../domain/labor-report.md#tab-20--report-data) —
because **KK budget journals and GL actuals journals carry only chartfield-string
detail (no position attribution)**, the position-aware BI Payroll feed misses
them. BVA captures both at full chartfield granularity.

## Refresh-order timing rule (critical)

A BVA snapshot is **only as fresh as the most recent payroll GL posting** it
reflects. Three coupled constraints:

1. **Payroll reports can be run BEFORE payroll actually posts to GL.** A
   BI Payroll OBI report run on a Tuesday morning might miss that day's
   payroll posting; it shows what's posted *so far*, not what's about to post.
2. **OBI data is 1 business day behind live.** Whatever posted today won't be
   in OBI until tomorrow.
3. **Payroll posts every other Tuesday.**

**Practical rule:** **BVA must be run Wednesday or later** (after a payday
Tuesday) to reflect the full PP. A Tuesday-morning BVA pull is one PP
behind. KosPos UX must surface the BVA snapshot's effective PP alongside
the BI Payroll snapshot's effective PP so users see when the two are out of
sync.

This same rule applies to **any chartfield-vs-payroll reconciliation** —
running BVA Tuesday morning and BI Payroll Tuesday morning will show a
"GL adjustment" of one full PP that's actually just a timing artifact, not
a real journal entry.

## v1 vs v2 mechanism

- **v1 (current):** Manual OBI re-pull every PP, aligned with the BI Payroll
  refresh (so both are Wednesday-or-later, against the same payday Tuesday).
  Drop the CSV into the same `example reports/Reports/` folder; KosPos
  importer treats it as **full-replace per `(fiscal_year, snapshot_date)`**
  with snapshot history retained.
- **v2 (Snowflake):** Direct query when SF's data platform exposes the BVA
  view. Preserves the full-replace + snapshot history model.

## File-naming caveat

Filename like `BvA - All Fields - Version 10.20.25 (42).csv` carries a
**version date in the filename, NOT the data-snapshot date**. The numeric
suffix is the report-definition version (when the OBI report query itself
was last edited), not when the data was extracted.

KosPos importer must record the **actual snapshot date** from one of:

- File mtime when the user uploads it (best heuristic available today).
- A header field in a future export shape (if OBI starts emitting one).
- A user-entered "as-of date" at upload time (fallback, lossy).

**Never trust the filename for snapshot date.**

## Column shape (verified against the 10.20.25 sample for FY26, 2,710 rows DBI+CPC)

68 columns total. Group by purpose:

### Chartfield-string dimensions (51 cols)

| Range | Group | Notes |
|---|---|---|
| `Budget Period` | Fiscal year (4-digit, e.g. `2026`) | Single FY per export |
| `Fund Group Description` … `Fund Lvl 1 Name` (8 cols) | Fund hierarchy | Includes **`Annual/Continuing`** (values: `ANNUAL_FUNDS` / `CONTINUING_FUNDS`) and **`Fund Control`** (`FACCT` annual / `FCNT` continuing / `FAUTH` capital, etc.) — matches [`obi-payroll`'s Fund Control distinction](../domain/labor-report.md#tab-7--bi-payroll) |
| `Department Group Code` … `Department Description` (7 cols) | Department hierarchy | **Division / Section / Department** layers — richer than BI Payroll's single dept layer |
| `Project Code` … `Project Type Name` (5 cols) | Project | Includes `Project Owning Dept Group` + Code |
| `Activity Code` … `Activity Owning Dept` (4 cols) | Activity | |
| `Authority Lvl 1 Code` … `Authority Description` (4 cols) | Authority | |
| `Account Lvl 2 Description` … `Account Description` (5 cols) | Account | `Account Description` matches BI Payroll's column `V` exactly — same source vocabulary |
| `Agency Use Code` + `Agency Use Description` (2 cols) | Agency Use | Mostly empty |
| `TRIO Code` + `TRIO Description` (2 cols) | TRIO | Mostly empty |
| `WBS Lvl 1` … `WBS Lvl 5 Name` (10 cols) | WBS 5-level hierarchy | Capital-project breakdown |

### Budget metrics (8 cols)

| Col | Meaning | KK adjustment surface |
|---|---|---|
| `Original Budget` | The Board-adopted budget for the FY (matches BFM eturn `AZ FY 20XX-XX Board`) | — |
| `Supplemental Budget` | Mid-year supplemental appropriations | KK source |
| **`Transfer & Other Budget`** | **Mid-year budget transfers (the primary KK transfer column)** | **KK source — DBI→CPC transfer of function visible here** |
| `Enc Carryforward In` | Prior-year encumbrances carried forward | Reflects PY KK action |
| `Auto Carryforward In` | Auto-carry prior-year unspent | Reflects PY KK action |
| `Manual Carryforward In` | Manually-carried PY unspent | KK source |
| `Revised Budget Pre-Close` | Sum of all above — the **live budget** to compare against actuals | Use this as the reconciliation budget anchor |
| `Revised Budget Close` | Post-close budget (after carryforward-outs) | Year-end view |

### Actuals metrics (4 cols)

| Col | Meaning |
|---|---|
| **`GL Actuals`** | **Posted GL actuals for the FY — the reconciliation anchor for BI Payroll** |
| `Encumbrance` | Open encumbrances (POs, contracts) |
| `Pre-Encumbrance` | Pending encumbrances |
| `Reserved Budget` | Budget reserved (admin block) |

### Balance metrics (5 cols)

| Col | Meaning |
|---|---|
| `Unreserved Available Balance Pre-Close` | `Revised - GL Actuals - Encumbrance - Reserved` |
| `Enc Carryforward Out` | Encumbrances rolling forward |
| `Auto Carryforward Out` | Auto-carry rolling forward |
| `Manual Carryforward Out` | Manual carry rolling forward |
| `Available Balance Close - Change Formula Each Year` | Final balance (formula name implies the workbook hand-edits this each FY) |

## Reconciliation pattern (verified)

KosPos's reconciliation view runs two comparisons per chartfield string:

### KK adjustments — BVA budget vs BFM eturn

```
KK_adjustment(chartfield) = BVA.Revised_Budget_Pre_Close(chartfield)
                          − BFM_eturn.FY_Board(chartfield)
```

Equivalent (in BVA's own columns) to:

```
KK_adjustment(chartfield) = Supplemental
                          + Transfer & Other Budget
                          + Auto Carryforward In
                          + Manual Carryforward In
                          + Enc Carryforward In
```

**Verified example (10.20.25 sample, FY26 DBI Fund 10190 Overtime account 511010):**

| Field | Value |
|---|---|
| BVA `Original Budget` | $349,749 |
| BFM eturn `FY 2025-26 Board` for same chartfield | $349,749 |
| BVA `Transfer & Other Budget` | $0 |
| BVA `Revised Budget Pre-Close` | $349,749 |
| **KK adjustment for this chartfield** | **$0** ✓ |

**Verified example (DBI Perm Salaries 501010, all funds):**

| Field | Value |
|---|---|
| BVA `Original Budget` | $45,610,177 |
| BVA `Transfer & Other Budget` | **-$2,040,294** (KK transfer **out** — DBI→CPC transfer of function) |
| BVA `Revised Budget Pre-Close` | $43,370,523 |
| **KK adjustment** | **-$2,040,294** (the DBI→CPC move) |
| CPC Perm Salaries 501010 (mirror side) | Transfer & Other = +$1,983,530 |

The DBI side and CPC side don't net to exactly zero ($2.04M out vs $1.98M in)
because pieces of the DBI transfer went to depts other than CPC (and CPC
received from other depts too). KosPos surfaces all chartfield-level transfers
without trying to net them into "DBI ↔ CPC" pairs.

### GL adjustments — BVA actuals vs BI Payroll actuals

```
GL_adjustment(chartfield) = BVA.GL_Actuals(chartfield)
                          − BI_Payroll_YTD(chartfield, excluding inactive positions)
```

The BI Payroll YTD figure aggregates `'BI Payroll'!AL` filtered by the
chartfield-string components (Fund + Dept + Project + Activity + Authority +
Account) and the active-position set.

**Verified example (DBI Fund 10190 Overtime 511010):**

| Field | Value |
|---|---|
| BVA `GL Actuals` | $438,678 |
| OPS!E37 (BI Payroll YTD via Overtime pivot, fund 10190) | $438,786 |
| **GL adjustment** | **+$108** (within rounding + OBI 1-day lag) |

A near-zero adjustment is the expected steady state. **Large deltas indicate
GL journal entries that didn't run through PS HCM timesheets** (post-PP
manual reclassifications, expense reimbursements coded to labor accounts,
etc.) — and those are exactly what KosPos should surface.

### Exclude inactive positions

Per Alex (during Tab 20 walkthrough): the BI Payroll side of the GL comparison
must exclude positions in the [Inactive view](../domain/labor-report.md#tab-13--inactive)
(positions paid in BI Payroll but not in the current P&P snapshot). Otherwise
the GL_adjustment delta picks up legitimate payroll for inactivated positions
as "missing from BVA," which is wrong.

## Snapshot scope (the 10.20.25 sample)

| Dimension | DBI | CPC | Total |
|---|---|---|---|
| BVA rows | 990 | 1,720 | 2,710 |
| Distinct chartfield strings (rows per FY) | 990 | 1,720 | 2,710 |
| Salaries (501010) Revised Budget | $43.37M | $21.84M | $65.21M |
| Salaries GL Actuals (mid-FY) | $29.50M | $18.59M | $48.09M |

**CPC has more BVA rows than DBI** (1,720 vs 990) despite carrying fewer
positions, because CPC operates across many more chartfield strings (capital
projects, federal/state grants, special revenues) while DBI labor mostly posts
to fund 10190 + a couple of others. This validates the
[DBI fund-10190 shortcut](../domain/labor-report.md#multi-dept-generalization-caveats-dbi-shortcuts-to-undo)
warning across multiple tabs — citywide labor reporting must reconcile across
all funds, not just operating.

## KosPos importer design

`lib/importers/bva/` — Phase 2.4 sub-phase target.

- **Header-driven fingerprint** (same pattern as
  [BI Payroll importer](../domain/labor-report.md#3-pre-compute-the-rollup-cube-once-query-it-many-ways)):
  match columns by canonical substring (`"original budget"`, `"transfer & other"`,
  `"gl actuals"`, `"revised budget pre-close"`, etc.) so column renames or
  reorders don't silently break the importer.
- **Full-replace per `(fiscal_year, snapshot_date)`** with snapshot history
  preserved. Same model as BI Payroll + P&P Data importers.
- **Snapshot date sourced from file mtime, not filename.** Surface a warning
  if the user uploads a file whose mtime is more than a few hours older than
  the upload time (suggests they're uploading an old file).
- **Pair-with-BI-Payroll detection.** Surface a Data Issue if the BVA
  snapshot's PP coverage doesn't match the latest BI Payroll snapshot's PP
  coverage — likely a refresh-order timing violation.
- **Pre-compute the reconciliation cube on import:** per-chartfield rows
  carrying `(BFM_Board, BVA_Revised, KK_adjustment, BI_Payroll_YTD,
  BVA_GL_Actuals, GL_adjustment)` so reconciliation views are O(1) lookups
  rather than per-cell scans.

## Open questions / TODO

- [ ] **Snapshot-date convention.** Once a fresh BVA pull is available,
      confirm whether OBI emits a snapshot/run timestamp anywhere in the
      file content or response headers, or whether file mtime is the best
      available source.
- [ ] **Account-Lvl-3 vs Account Description grain.** BVA has both
      `Account Lvl 3 Description` (`Salaries`, `Mandatory Fringe Benefits`)
      and `Account Description` (`Perm Salaries-Misc-Regular`, `Overtime -
      Scheduled Misc`, etc.). Confirm KosPos rollups use Account Description
      (the granularity BI Payroll's account exclusions key on) consistently;
      Account Lvl 3 is a useful display label but not the join key.
- [ ] **Carryforward-Out interpretation for mid-year views.** The Out columns
      reflect what _will_ carry forward at FY close. During-FY they appear
      as zero in the sample — verify in a late-FY snapshot whether they
      populate before close.
- [ ] **WBS hierarchy use cases.** WBS 5 levels are present but not used by
      the labor report. Worth documenting per capital-project module when
      that surfaces.

## Cross-references

- [`../domain/labor-report.md`](../domain/labor-report.md) — Tab 20 (Report
  Data) § KosPos improvements #1–#2 (the BVA-driven reconciliation feature);
  § Cross-cutting concerns — refresh-order timing rule (same content as
  this file's § Refresh-order timing).
- [`ps-financials.md`](ps-financials.md) — BVA's source system.
- [`obi.md`](obi.md) — BVA's current delivery channel.
- [`bfm.md`](bfm.md) — the eturn that BVA's `Original Budget` should match.
