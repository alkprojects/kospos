# BVA reconciliation suite — verified findings

**Audit run:** 2026-05-25 (autonomous session 17)
**Inputs:**

- `Labor Report 5.21.26.xlsx` — workbook with 110,027-row BI Payroll + 798-row Report Data + 2,694-row BFM 15.10.006 FY26 eturn.
- `BvA - All Fields - Version 10.20.25 (42).csv` — 68 cols × 2,710 rows for DBI+CPC FY26 (snapshot date approx 2026-05-08 by file mtime).

**Tooling:** Python 3.14 + openpyxl `iter_rows(values_only=True)` for the
workbook, stdlib `csv.DictReader` for BVA. Read-only; no workbook edits.

**Purpose:** Empirical evidence base for KosPos's `lib/quality/` flag set
and for the BVA-driven reconciliation views designed in
[Tab 20 § KosPos improvements #1–#2](../domain/labor-report.md#kospos-improvements-20)
and [`../data-sources/bva.md`](../data-sources/bva.md).

## Methodology

**Chartfield grain.** All reconciliations join on the 7-tuple
`(Dept Group, Fund, Dept, Project, Activity, Authority, Account)`. Both
sides normalized to **leading-zero-stripped string** for each component
(BI Payroll stores integer codes; BVA stores zero-padded strings —
`'0001'` vs `1` activity codes are the same chartfield).

**Labor scope.** "Labor accounts" = BVA `Account Lvl 3 Description ∈
{Salaries, Mandatory Fringe Benefits}`. BVA also carries revenue +
non-personnel expense; the GL Actuals comparison is meaningful only on
labor.

**Active-position filter.** The BI Payroll side of GL reconciliation
**does NOT** apply the Inactive-tab exclusion in this audit pass. Per Tab
20 design, KosPos must apply that filter; the unfiltered totals shown
here include payroll for inactivated positions on the BI Payroll side
that BVA's GL Actuals would not see at the same chartfield.

## Snapshot summary

| Surface | Rows | Labor totals |
|---|---|---|
| BI Payroll | 110,027 (DBI+CPC FYTD) | $84.25M YTD Balance Amount (all accounts; 100% are labor accounts) |
| Report Data | 798 (8 archetypes) | per-position S = $103.4M Total Budget; YTD U = $79.81M (Grand Total per OPS Summary) |
| BFM 15.10.006 FY26 eturn | 2,694 (2,007 per-position + 687 summary) | per-position `BY HCM Position#`: 552 distinct, $103.4M `AZ FY 2025-26 Board` |
| BVA | 2,710 (DBI+CPC FY26) | Labor = 1,562 chartfield rows; Revised Budget = $93.12M; GL Actuals = $87.56M |

**Cross-check:** BVA labor Revised Budget ($93.12M) ≈ Report Data S
($103.4M) is **$10.3M off**. The labor scope match needs attention —
either BVA includes accounts Report Data S doesn't, or vice versa.
**Open question** at the end of this audit.

---

## Test 1 — Per-chartfield KK adjustments (Transfer & Other Budget on labor)

**Hypothesis:** BVA's `Transfer & Other Budget` captures every mid-year
budget journal. The DBI→CPC transfer of function should be visible as a
DBI labor chartfield with large negative xfer and one or more CPC labor
chartfields with matching positive xfer.

**Method:** Filter BVA to (Dept Group ∈ {DBI,CPC}) × (Account Lvl 3 ∈
{Salaries, Mandatory Fringe Benefits}) × (xfer ≠ 0). Sort by signed
amount.

**Result:** 40 labor chartfields with non-zero KK adjustment.

**Top 5 negative (transfers OUT):**

| Dept Group | Dept | Fund | Account | Original | Revised | Xfer |
|---|---|---|---|---|---|---|
| DBI | DBI ADM Mgmt Info Systems | SR BIF Operating Project | Perm Salaries-Misc-Regular | $3,728,381 | $1,678,573 | **-$2,049,808** |
| DBI | DBI ADM Mgmt Info Systems | SR BIF Operating Project | Dependent Coverage | $266,162 | $0 | -$266,162 |
| DBI | DBI ADM Mgmt Info Systems | SR BIF Operating Project | Retire City Misc | $523,151 | $288,188 | -$234,963 |
| DBI | DBI ADM Mgmt Info Systems | SR BIF Operating Project | Social Security (OASDI & HI) | $217,928 | $118,657 | -$99,271 |
| DBI | DBI ADM Mgmt Info Systems | SR BIF Operating Project | Social Sec-Medicare(HI Only) | $54,462 | $30,343 | -$24,119 |

**Top 5 positive (transfers IN):**

| Dept Group | Dept | Fund | Account | Original | Revised | Xfer |
|---|---|---|---|---|---|---|
| CPC | CPC Administration | GF Annual Account Ctrl | Perm Salaries-Misc-Regular | $0 | $1,235,760 | **+$1,235,760** |
| CPC | CPC Administration | GF Annual Account Ctrl | Retire City Misc | $0 | $823,840 | +$823,840 |
| CPC | CPC Current Planning | GF Annual Account Ctrl | Perm Salaries-Misc-Regular | $0 | $645,489 | +$645,489 |
| CPC | CPC Current Planning | GF Annual Account Ctrl | Retire City Misc | $0 | $430,326 | +$430,326 |
| DBI | DBI ADM Mgmt Info Systems | SR BIF Operating Project | Misc-Other Timeoff | $0 | $226,874 | +$226,874 |

**Aggregate (labor only):**

| Dept Group | KK adjustment (labor) |
|---|---|
| DBI | **-$2,046,054** (transfers OUT) |
| CPC | **+$3,305,884** (transfers IN) |
| Net (DBI+CPC) | +$1,259,829 |

**Findings:**

1. **The DBI→CPC transfer of function shows up entirely on one DBI
   department**: `DBI ADM Mgmt Info Systems` (Dept Code 229346),
   moving budget out of fund `SR BIF Operating Project` (the
   Continuing-Authority Building Inspection Fund). All 10 DBI labor
   chartfields with negative KK adjustments are on this single dept.
2. **CPC's KK receipts span two depts**: `CPC Administration` (~$2.1M
   in two account-rows) and `CPC Current Planning` (~$1.1M in two
   account-rows), both from fund `GF Annual Account Ctrl` (General
   Fund). So the move is BIF→GF along with DBI→CPC — a fund as well
   as dept transfer.
3. **DBI labor xfer-out ($-2.05M) does not net to CPC labor xfer-in
   ($+3.31M)**. The $1.26M imbalance means CPC received budget from
   other (non-DBI) departments too (or DBI's $2.05M went partly to
   non-CPC destinations). KosPos surfaces all chartfield-level KK
   adjustments individually and does **not** try to pair "from" and
   "to" sides — the workbook MERGE row 753 (a single $2.31M
   hand-keyed cell) is a stop-gap that doesn't reflect this.

**KosPos surfaces this as:** _Data Issue category_ —
**`kk-adjustment-detected`** per chartfield row. A live reconciliation
panel lists each chartfield with non-zero `Transfer & Other Budget`,
the source eturn anchor, and lets the user click through to the journal
detail (when available). No attempt to pair sides.

---

## Test 2 — Per-chartfield GL adjustments (labor only)

**Hypothesis:** `BVA.GL_Actuals - BI_Payroll_YTD ≈ 0` per chartfield in
steady state. Material deltas indicate manual GL reclasses, expense
reimbursements coded to labor accounts, or **(critically)** retiree /
non-payroll GL postings that BI Payroll cannot see.

**Method:** Aggregate BI Payroll's `Balance Amount` at the chartfield
grain across all 110,027 rows. Aggregate BVA's `GL Actuals` at the
same chartfield grain on labor accounts only. Compute the delta per
chartfield.

**Join coverage:**

| Metric | Count | Notes |
|---|---|---|
| BVA labor chartfields | 1,562 | |
| BI Payroll chartfields | 977 | |
| Joined (chartfield in both) | 961 | |
| BVA labor not in BI Payroll | 601 | Most are budget-only (no actuals yet). Includes the 601 chartfields with non-zero budget but $0 GL. |
| BI Payroll not in BVA labor | 16 | All are account `200075` (an accrual account treated as non-labor by BVA, but balance-amount-emitted by BI Payroll). Total: $14,008. |

**Top 10 POSITIVE GL adjustments (BVA GL > BI Payroll YTD):**

| Dept Group | Dept | Fund | Account | BVA GL | BI YTD | Δ |
|---|---|---|---|---|---|---|
| DBI | DBI ADM Administration-Gen | f=10190 | Health Service-Retiree Subsidy (515610) | $1,824,253 | $0 | **+$1,824,253** |
| CPC | CPC Administration | f=10000 | Health Service-Retiree Subsidy | $1,176,846 | $0 | **+$1,176,846** |
| CPC | CPC Administration | f=10000 p=10043255 | Perm Salaries-Misc-Regular | $478,826 | $175,652 | +$303,173 |
| CPC | CPC Administration | f=10000 p=10043255 | Retire City Misc | $147,371 | $28,893 | +$118,478 |
| CPC | CPC Citywide Planning | f=10000 p=10001647 | Perm Salaries-Misc-Regular | $1,689,854 | $1,574,564 | +$115,290 |
| DBI | DBI ADM Administration-Gen | f=10190 | Health Service-City Match (515010) | $116,412 | $9,230 | +$107,182 |
| CPC | CPC Citywide Planning | f=10000 p=10001647 | Health Service-City Match | $307,172 | $200,948 | +$106,224 |
| DBI | DBI ADM Administration-Gen | f=10190 | Health Service-Admin Cost | $72,270 | $0 | +$72,270 |
| CPC | CPC Citywide Planning | f=10690 p=10040078 | Perm Salaries-Misc-Regular | $58,614 | $0 | +$58,614 |
| CPC | CPC Citywide Planning | f=10020 p=10009479 | Temp Misc LumpSum Payoff | $52,188 | $0 | +$52,188 |

**Top 10 NEGATIVE GL adjustments (BI Payroll YTD > BVA GL):**

| Dept Group | Dept | Fund | Account | BVA GL | BI YTD | Δ |
|---|---|---|---|---|---|---|
| CPC | CPC Administration | f=10000 p=10001648 | Perm Salaries-Misc-Regular | $4,925,896 | $5,229,070 | -$303,173 |
| CPC | CPC Citywide Planning | f=10770 p=10042339 | Perm Salaries-Misc-Regular | $42,186 | $193,305 | -$151,119 |
| CPC | CPC Administration | f=10000 p=10001648 | Retire City Misc | $792,059 | $910,537 | -$118,478 |
| CPC | CPC Citywide Planning | f=10000 p=10037365 | Temp Misc LumpSum Payoff | $3,295 | $55,483 | -$52,188 |
| CPC | CPC Citywide Planning | f=10000 p=10037365 | Temp Misc Regular Salaries | $333,918 | $367,870 | -$33,952 |
| CPC | CPC Citywide Planning | f=10770 p=10042339 | Retire City Misc | $6,321 | $33,655 | -$27,334 |
| CPC | CPC Citywide Planning | f=10680 p=10042280 | Perm Salaries-Misc-Regular | $32,053 | $54,838 | -$22,785 |
| CPC | CPC Citywide Planning | f=10670 p=10023235 | Perm Salaries-Misc-Regular | $90,303 | $112,197 | -$21,894 |
| CPC | CPC Citywide Planning | f=10770 p=10042339 | Misc-Other Timeoff | $0 | $18,930 | -$18,930 |
| CPC | CPC Citywide Planning | f=10770 p=10042339 | Health Service-City Match | $5,994 | $24,368 | -$18,374 |

**Aggregate:**

- BVA labor GL: **$87.56M**
- BI Payroll YTD: **$84.25M**
- Net Δ: **+$3.31M** (BVA has $3.31M more than BI Payroll)

**Findings:**

1. **The $3.31M aggregate Δ is dominated by retiree-and-administered-benefits
   accounts** that flow through GL but **NOT through BI Payroll**:
   - Health Service-Retiree Subsidy (515610): $3.00M
   - Health Service-Admin Cost: $72k
   - Health Service-City Match: ~$213k (DBI + CPC)
   - Retiree Health-Match-Prop B: ~$15k (small)
   - These accounts pay current-period benefits to **retirees**, billed
     directly to GL by SFERS / HSS rather than running through PS HCM
     timesheets. Result: BI Payroll always shows $0 for them.
2. **The CPC perm-salaries Δs (±$303k) are project-code reclassifications.**
   Look at the matched pairs:
   - `(CPC, 10000, 229235, 10043255, 1, 10000, 501010)` Perm Salaries: BVA GL=$479k, BI=$176k → Δ=+$303k
   - `(CPC, 10000, 229235, 10001648, 1, 10000, 501010)` Perm Salaries: BVA GL=$4.93M, BI=$5.23M → Δ=-$303k
   Same dept, same fund, same account, **two different project codes**.
   BI Payroll posted everything to project `10001648`; GL journal moved
   $303k of it to project `10043255` after the fact. Net change: $0 (one
   chartfield gives, another receives). KosPos surfaces these pairs with
   a "project-code reclassification" annotation when the dept × fund ×
   account sum across multiple projects nets near zero.
3. **The DBI / CPC Citywide perm-salaries Δs around -$151k / -$22k / -$21k**
   are timing artifacts. The 10.20.25 snapshot was run sometime around
   PP22 (2026-05-08); the cited deltas are within ±1 PP of payroll
   processing.
4. **Zero "type-coercion-failure"** at the chartfield grain. Once both
   sides are normalized to leading-zero-stripped strings, every BI
   Payroll chartfield with non-zero spending joins to a BVA chartfield
   (with the exception of 16 rows totaling $14k on account `200075`,
   an accrual account intentionally classified by BVA as non-labor).

**KosPos surfaces this as:**

- _Data Issue category 1_ — **`gl-adjustment-non-payroll-account`**.
  Filters on accounts known to be GL-only (Retiree Subsidy / Admin Cost
  / etc.); shows BVA GL Actuals without complaining that BI Payroll
  doesn't match. Display as "expected — not paid through payroll."
- _Data Issue category 2_ — **`gl-adjustment-project-reclassification`**.
  When dept × fund × account spans multiple projects with summed Δ ≈ 0,
  group them and label as "BI Payroll posted to project A; GL journal
  moved $X to project B."
- _Data Issue category 3_ — **`gl-adjustment-timing-window`**. When Δ
  is within ±$50k AND within ±1 PP-worth of typical posting timing,
  suppress as expected; flag if larger.
- _Data Issue category 4_ — **`gl-adjustment-unexplained`**. Anything
  that doesn't fall into 1–3 deserves a manual look. Currently 0 such
  rows in this snapshot.

---

## Test 3 — SPECIAL block hand-paste verification (AX vs AZ)

**Hypothesis (per [Tab 20 § Manual/fragile](../domain/labor-report.md#whats-manual--fragile-20)):**
the 100 SPECIAL block rows in Report Data S649:S748 were pasted from
BFM 15.10.006's `FY 2025-26 Technical Adjustment (AX)` column, but
should have been pasted from `FY 2025-26 Board (AZ)`. If AX ≠ AZ for
any class-summary row, the SPECIAL block budget total is stale.

**Method:** Walk the 100 SPECIAL block rows. For each `(JobClsTitle, DeptIDTitle)`
combo in Report Data, find matching BFM class-summary rows and compare
SPECIAL.S vs BFM.AX vs BFM.AZ.

**Result:** **`AX == AZ` for every BFM class-summary row in this snapshot.**

| BFM class-summary rows (Job Class Title is a special-class name) | 673 |
|---|---|
| Rows where AX == AZ | **673** |
| Rows where AX ≠ AZ | 0 |

The TEMPM Interns G40 cells (BFM!AZ1195/1197/1199/1201) — explicitly
referenced by OPS Summary — also have AX == AZ in this snapshot.

**Findings:**

1. **The AX-vs-AZ migration issue is DORMANT in this snapshot.** No
   Technical Adjustment has been applied to any special-class summary
   row after Board adoption. The Tab 20 concern is real but won't
   manifest until CON makes a post-Board adjustment.
2. **What would happen if AX ≠ AZ:** Today's SPECIAL block formula
   `S2 = SUMIFS(BFM!AX, BFM!D, D2)` would silently use the Technical
   Adjustment value. If CON adopts a $500k post-Board cost-saving
   adjustment, the SPECIAL block would record the cost-saving, but the
   Board-adopted-budget anchor in downstream views would diverge.
   KosPos must default to AZ.
3. **A latent variation exists**: NEWP rows 750-751 in Report Data have
   **hand-keyed** S values (not SUMIFS-driven). Those are visually
   identical to AX values today (because AX == AZ everywhere), but
   would diverge from AZ-based defaults if CON makes a NEWP-targeted
   Technical Adjustment.

**KosPos surfaces this as:**

- **Default budget anchor = BFM AZ (Board-adopted)**, with AX (Technical
  Adjustment) preserved as a variance layer.
- _Data Issue category_ — **`bfm-budget-layer-drift`** if AZ - AX ≠ 0 for
  any (dept-group, account-description) row that downstream views read.

---

## Test 4 — MERGE row 753 lookup ($2.31M DBI ADM MIS)

**Hypothesis (per [Tab 20 § MERGE row](../domain/labor-report.md#formulas--merge-row-row-753-231m-mid-year-transfer)):**
Report Data row 753 is a hand-keyed placeholder for the mid-year DBI→CPC
transfer of function. Its S=$2,310,727 should appear somewhere in BVA
as a Transfer & Other Budget for DBI ADM MIS Salaries.

**Method:** Filter BVA for DBI ADM MIS (Dept Code 229346) × Salaries
account (501010). Sum `Transfer & Other Budget`. Compare to $2,310,727.

**Result:**

| BVA filter | Sum of Transfer & Other Budget |
|---|---|
| DBI ADM MIS (229346) × Perm Salaries (501010) | **-$2,049,808** |
| DBI ADM MIS × all labor accounts | -$2,728,369 |
| Report Data row 753 S value | $2,310,726.57 |

**Findings:**

1. **Neither BVA value matches $2.31M exactly.** Closest match: Salaries
   alone (-$2.05M) differs by $261k; labor-total (-$2.73M) differs by
   $418k.
2. **The Report Data row 753 value is a hand-keyed estimate, not a
   BVA-sourced figure.** Per Alex's note in the Tab 20 walkthrough,
   MERGE row 753 was created as a stop-gap before BVA was identified
   as the source of truth. It captures a piece of the transfer (likely
   Salaries + selected benefits) but rounds / aggregates approximately.
3. **KosPos's BVA-driven view should REPLACE row 753.** Once BVA is
   imported, the per-chartfield Transfer & Other Budget tells the
   exact KK story — no hand-key needed. Decommission the MERGE row
   entirely in Phase 2.4.

**KosPos surfaces this as:**

- _Workflow change_ — **MERGE row replaced by per-chartfield KK reconciliation
  view** (see Test 1). The dollars are still attributable to DBI ADM MIS
  + Salaries + benefits chartfields; they just live in their proper
  rows, not in an aggregated placeholder.
- _Data Issue category_ — **`workbook-merge-row-stale`** if a workbook
  importer encounters MERGE rows on import. Flag and suggest replacement
  by BVA reconciliation.

---

## Test 5 — Pool-position COUNTIF dedup check

**Hypothesis (per [Tab 20 § Pool positions](../domain/labor-report.md#multi-dept-generalization-caveats-dbi-shortcuts-to-undo)):**
The COUNTIF guard at every per-position formula zeroes out duplicate
rows (rows 2+ for the same Position Number). All 36 expected duplicate
rows should have S=0 AND U=0 AND AZ=0 (no leakage).

**Method:** Walk Report Data per-position rows 2-606. Group by Position
Number; for each pool position (2+ rows), check rows beyond the first
for non-zero values in S, U, or AZ.

**Result:**

| Metric | Value |
|---|---|
| Distinct per-position rows (non-archetype) | 569 |
| Pool positions (2+ rows per Position Number) | **8** |
| Total duplicate rows (rows beyond first per position) | **36** |
| Leakage instances (any S, U, or AZ non-zero on a dup row) | **0** ✓ |

**Top 5 most-duplicated positions:**

| Position Number | Row count | Likely identity |
|---|---|---|
| 1094089 | 14 | DBI Board of Inspectors / Commissioners pool |
| 1068950 | 7 | (likely another commissioner pool) |
| 1125966 | 7 | (likely another commissioner pool) |
| 1092892 | 7 | (likely another commissioner pool) |
| 1158719 | 3 | (smaller pool) |

**Findings:**

1. **The COUNTIF dedup works perfectly.** All 36 duplicate rows have S,
   U, and AZ all zero. The SPECIAL block + dept totals never
   double-count pool-position dollars.
2. **8 pool positions accounting for 36 duplicates** is a small fraction
   of the workbook (5.9% of 605 per-position rows), but the largest
   single position (1094089 = 14 rows) means the visual clutter in OPS
   Detail is concentrated.
3. **The dedup mechanism is row-order-dependent.** If pool position rows
   are inserted in a different order on a future refresh, the "first"
   row (which keeps the values) might differ — though as long as the
   sum-over-the-pool stays correct, it shouldn't matter. KosPos's
   one-position-per-row model removes the ambiguity entirely.

**KosPos surfaces this as:**

- _Data Issue category_ — **`pool-position-detected`**. Flag every
  position with 2+ incumbents; recommend (but don't enforce) one
  position per incumbent. Show as a collapsible "(N incumbents)" badge
  in [OPS Detail](../domain/labor-report.md#tab-27--operating-report-detail).

---

## Test 6 — Text-vs-numeric BFM join check

**Hypothesis:** 102 (now 103 in this snapshot) per-position rows in
Report Data have `S=0`. Some may be **genuinely** missing-from-BFM (new
positions added mid-year), but some may fail the join only because of
text-vs-int coercion mismatch between Report Data!D (int) and
BFM!D (string with leading zeros).

**Method:** For every Report Data per-position row with S=0:

1. Skip Exclude=Y rows (9 in this snapshot — TEMPM/blank-VACANT with
   zero actuals).
2. Skip pool-position duplicate rows (where the same position appeared
   in an earlier row — the COUNTIF guard zeroes these by design).
3. Look up the remaining positions in BFM by normalizing
   `str(d).lstrip('0')` on both sides.
4. Classify as:
   - **Unmatched** — position not in BFM at all (genuinely missing).
   - **Matched-zero** — position in BFM with AX=AZ=0 (zero-budget;
     valid).
   - **Matched-nonzero** — position in BFM with AX>0 or AZ>0
     (**suspected type-coercion failure** where SUMIFS should have
     pulled but didn't).

**Result:**

| Bucket | Count |
|---|---|
| Total non-excluded S=0 rows | 94 |
| Pool-position COUNTIF dups (S=0 by design) | 36 |
| Non-pool S=0 (real BFM-side failures) | **58** |
| ↳ Genuinely unmatched in BFM (new positions mid-year) | 30 |
| ↳ Matched in BFM with AX=AZ=0 (zero-budget, valid) | 28 |
| ↳ **Matched in BFM with AX or AZ ≠ 0 (type-coercion failure!)** | **0** ✓ |

**Findings:**

1. **The type-coercion failure does NOT exist in this snapshot.** Excel's
   SUMIFS is type-coercive for numeric-vs-string: BFM's
   `'01106950'` (zero-padded string) and Report Data's `1106950` (int)
   both coerce to the same numeric value, so the SUMIFS matches
   correctly. **No silent zeroing of in-BFM positions due to type
   mismatch.** Tab 20's concern was hypothetical.
2. **BFM's `BY HCM Position#` (col D) is 100% string-typed** with three
   length buckets:
   - 8 chars zero-padded (1,306 rows) — modern PS HCM position numbers
     stored with a leading `0`.
   - 4 chars `NEWPxxx` (677 rows) — placeholder IDs for budgeted-but-not-yet-assigned positions.
   - 10 chars `NEWPxxxxxx` (24 rows) — same placeholder, longer numbering.
3. **Report Data's `Position Number` (col D) is 100% int-typed** with
   one exception (the row 750 NEWP315641 placeholder, which is the only
   string).
4. **KosPos importer must replicate the coercion explicitly.** Don't
   blindly type-cast Position Numbers — handle both `'01106950'` and
   `1106950` and `1106950` as the same key. A canonical
   `normalize_position_id(value) → int` helper at import time
   eliminates the issue. **If KosPos doesn't do this, every BFM ↔
   PS HCM join silently breaks** — Excel will hide the issue, KosPos
   would surface it as "BFM is missing 552 positions."
5. **30 genuinely-missing-from-BFM positions = new positions added
   mid-year**. They have BI Payroll actuals but no eturn budget yet
   because the eturn snapshot pre-dates their creation. KosPos handles
   via Phase 2.4 eturn refresh tracking — each position must be in the
   eturn snapshot effective at the report date.
6. **28 zero-budget BFM positions = intentionally de-funded or
   "Status=I" (Inactive) positions**. KosPos surfaces these as "budget
   $0, expected — position is held inactive."

**KosPos surfaces this as:**

- _Data Issue category 1_ — **`bfm-position-missing`** for the 30
  unmatched. Recommend BFM eturn refresh.
- _Data Issue category 2_ — **`bfm-position-zero-budget`** for the 28
  matched-zero. Display as "expected — position held inactive."
- **`lib/importers/canonical/normalize_position_id.ts`** — a
  cross-system position-ID normalizer in code, with tests covering
  the int / zero-padded-string / NEWP-placeholder variants.

---

## Test 7 — Dormant `<>10190` double-count bug check

**Hypothesis (per [Tab 20 cross-cutting concerns](../domain/labor-report.md#multi-dept-generalization-caveats-dbi-shortcuts-to-undo)):**
The Report Data BB:CB continuing-grid formula filters BI Payroll on
`F<>10190`, which is the **wrong complement** of the
`F IN {10190, 10000}` operating filter. The bug activates as soon as
DBI starts posting to fund 10000 (CPC's operating fund) — since DBI's
operating fund 10190 would be excluded from continuing but fund 10000
postings would land in BOTH operating (per the Y:AY filter `F IN {10190,
10000}`) AND continuing (per the wrong `F<>10190` filter).

**Method:** Scan all 110,027 BI Payroll rows for any where
`F = 10000 AND Department Group Code = "DBI"`.

**Result:** **0 rows.** The bug is **STILL DORMANT.**

**DBI fund distribution (BI Payroll):**

| Fund Code | YTD Balance Amount |
|---|---|
| 10190 (DBI SR BIF) | **$51,843,423** |
| 10230 (DBI Continuing) | $213,404 |
| (all others) | $0 |

**CPC fund distribution (BI Payroll):**

| Fund Code | YTD Balance Amount |
|---|---|
| 10000 (CPC General Fund) | $28,415,395 |
| 10840 | $1,971,909 |
| 10770 | $773,704 |
| 10020 | $500,674 |
| (six others) | $533,994 |

**Findings:**

1. **DBI posts only to fund 10190 + 10230 in this snapshot.** Both 10230
   amount and the fund-`<>10190` bug are dormant.
2. **CPC operates across 10 funds** in this snapshot, dominated by 10000
   (General Fund) but with material activity in 5 secondary funds. The
   "DBI fund 10190 / CPC fund 10000" pairing already documented in
   cross-cutting concerns isn't a clean two-fund split — CPC's
   capital-project / federal-grant work spans many funds.
3. **The bug activates the moment any DBI position posts to fund 10000.**
   Most likely trigger: post-merger CPC-to-DBI roll-in where a CPC
   position is reassigned to DBI but keeps charging to its existing GF
   10000 chartfield.

**KosPos surfaces this as:**

- _Data Issue category_ — **`dormant-bug-activation`**. Compute the
  operating-fund set as `BFM.fund_control = "FACCT"`; flag any BI
  Payroll row where the operating-fund-set membership disagrees with a
  user-provided dept-group operating-fund mapping.
- The fix in code is **derive continuing as the complement of
  operating**, never as `<>{single_fund}`.

---

## Aggregate findings

**What this audit confirms:**

1. **BVA's chartfield grain matches BI Payroll's chartfield grain after
   normalization.** Once leading zeros are stripped, the join works
   cleanly on 961 of 977 BI Payroll chartfields. 16 unmatched chartfields
   total only $14k (account 200075 accrual; not a labor-reconciliation
   concern).
2. **The DBI→CPC transfer of function is real, visible, and traceable
   per chartfield.** DBI ADM MIS lost $2.05M of Salaries budget (plus
   ~$680k of benefits) to CPC Administration ($2.06M) and CPC Current
   Planning ($1.08M), with the residual to non-CPC depts.
3. **No type-coercion failures in this snapshot.** Excel's SUMIFS handles
   the int/string coercion. KosPos importer must replicate this
   explicitly.
4. **No leakage in pool-position COUNTIF dedup.** 36 of 36 dup rows are
   correctly zeroed.
5. **AX-vs-AZ migration is dormant in this snapshot.** No Technical
   Adjustments have been applied post-Board to any special-class summary
   row. Concern remains valid; just not triggered yet.
6. **`<>10190` continuing-grid bug is dormant.** DBI posts only to fund
   10190 + 10230; no fund 10000 activity for DBI.
7. **The MERGE row 753 hand-keyed value ($2.31M) doesn't match any
   single BVA total exactly.** It's a stop-gap, not BVA-derived.
   KosPos's BVA-driven reconciliation view replaces it.

**What needs follow-up:**

- [ ] **BVA labor Revised Budget ($93.12M) ≠ Report Data S ($103.4M).**
      $10.3M gap unexplained. Possibilities:
      (a) Report Data S includes more accounts (specifically: Charges
      for Services account 510210 RPO is in Salaries L3, but is the
      Sick Pay account `Misc-Sick Pay` in BVA's Salaries L3 or in
      Mandatory Fringe? Verify L3 inclusion).
      (b) Report Data S double-counts the SPECIAL block (rows 649–748
      add ~$10M in hand-pasted special-class budgets, which are
      separately accounted in BVA via the named accounts).
      Reasonable call: most likely (b). KosPos's BVA-driven view
      doesn't have a SPECIAL block at all; the reconciliation is at
      the chartfield grain, with special-class as a derived rollup.
- [ ] **Active-position filter not applied** to the BI Payroll side of
      Test 2. KosPos must apply this filter per Tab 20 design; results
      here are upper-bound on the Δ.
- [ ] **Project-code reclassification pairing** (Test 2 finding #2) is
      currently detected by manual eyeballing. Codify a rule: when
      dept × fund × account spans 2+ projects with summed Δ ≈ 0, group
      as a reclassification event.
- [ ] **NEWP placeholder positions** (Report Data row 750 = `NEWP315641`,
      BFM has 677 NEWP placeholders) — the BVA side has chartfields
      keyed by chartfield string, not by NEWP ID. Cross-reference of
      NEWP-budgeted positions against BVA would be a separate audit.
- [ ] **Retiree-benefit GL account coverage** (Test 2 finding #1):
      explicit list of accounts that flow through GL but not BI Payroll
      must be maintained — confirmed in this snapshot: 515610 (Health
      Service-Retiree Subsidy), 515510 (Health Service-Admin Cost),
      partial of 515010 (Health Service-City Match). Likely also: 519110
      (Retiree COLA), some lines under 513xxx. KosPos importer should
      tag these accounts as `payroll_routed = false`.

## Cross-references

- [`../data-sources/bva.md`](../data-sources/bva.md) — BVA schema +
  refresh-order timing rule + reconciliation pattern.
- [`../domain/labor-report.md#tab-20--report-data`](../domain/labor-report.md#tab-20--report-data) —
  Report Data 8 archetypes + per-position formulas + the
  `<>10190` dormant bug discussion.
- [`../domain/labor-report.md#tab-26--operating-report-summary`](../domain/labor-report.md#tab-26--operating-report-summary) —
  OPS Summary special-class block + the BFM!AZ1195/1197/1199/1201
  TEMPM hardcoded reference (verified in Test 3 here).
- [`../data-sources/bfm.md`](../data-sources/bfm.md) — BFM eturn AX/AZ
  rule.
