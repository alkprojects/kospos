# Labor Report — tab-by-tab reference

The authoritative deep-dive on Alex's `Labor Report 5.21.26.xlsx` (and its successor
weekly snapshots). This file is the **blueprint for Phase 2 (Current-Year Workspace)**:
every tab here becomes a corresponding page in KosPos, plus a column in the improved
Excel export.

**Status: SKELETON.** Sections will be filled in during the Phase 2.0 deep-dive
walkthrough with Alex. Each tab gets the same template (see below) so future sessions
can pattern-match.

## How to use this file

Each tab section follows the same template:

- **Purpose** — what the tab is for; who reads it.
- **Data sources** — where the inputs come from (BI Payroll pivot, BFM, manual entry,
  Calendar tab, etc.). Includes upload format for v1 and the path-to-Snowflake for v2.
- **Formulas** — every formula written down, with cell references back to the workbook.
  Plain-English explanation per formula.
- **What's manual / fragile** — places where the tab silently depends on something a
  human had to remember (hardcoded constants, copy-pasted values, DBI-specific
  shortcuts).
- **KosPos improvements** — what we'd do differently in the rebuild.
- **KosPos UI sketch** — rough notes on how this tab becomes a page in the app.
- **Excel export notes** — what the corresponding column / sheet in the KosPos-emitted
  `.xlsx` should look like.
- **Open questions / TODO** — anything left to confirm with Alex or research.

## Cross-cutting

This section captures behavior that runs across multiple tabs (the Calendar
constants, the dept-rollup, the fund filters).

- **Calendar tab integration.** `Calendar!I2 / J2 / K2` (PPs elapsed / total / remaining)
  are referenced by nearly every per-tab formula. KosPos derives these from PS HCM
  scheduling data once, then exposes them as constants. See
  [`definitions.md`](definitions.md) § "Pay Period (PP)".
- **Fund-level filters.** The workbook commonly filters to fund 10190 (DBI's operating
  fund) — this is a DBI shortcut. KosPos defaults to "all funds" and offers a per-tab
  fund filter.
- **Dept-group rollup.** Most tabs roll up to `Department Group Code = "DBI"`. KosPos
  treats this as the dept-group dimension; multi-dept extension is a Phase 3 concern.

---

## Tab 1 — Operating Report Summary

**Purpose:** _(to be filled in walkthrough)_

**Data sources:** _(walkthrough)_

**Formulas:** Already partially documented in
[`special-class.md`](special-class.md) § "Operating Report Summary — DBI section reference"
(rows 36–42). Walkthrough should fill in non-special-class rows.

**What's manual / fragile:** _(walkthrough)_

**KosPos improvements:** _(walkthrough)_

**KosPos UI sketch:** _(walkthrough)_

**Excel export notes:** _(walkthrough)_

**Open questions / TODO:** _(walkthrough)_

---

## Tab 2 — BI Payroll

**Purpose:** _(walkthrough)_

**Data sources:** _(walkthrough — likely OBI BI Payroll pull, manually uploaded)_

**Formulas:** _(walkthrough)_

**What's manual / fragile:** _(walkthrough)_

**KosPos improvements:** _(walkthrough)_

**KosPos UI sketch:** _(walkthrough)_

**Excel export notes:** _(walkthrough)_

**Open questions / TODO:** _(walkthrough)_

---

## Tab 3 — Premium (Premium Pay pivot)

**Purpose:** _(walkthrough)_

**Data sources:** _(walkthrough)_

**Formulas:** Per [`special-class.md`](special-class.md) § PREMM_E (pending walkthrough),
`Premium!P5` and `P6` formulas need full decode.

**What's manual / fragile:** _(walkthrough)_

**KosPos improvements:** _(walkthrough)_

**KosPos UI sketch:** _(walkthrough)_

**Excel export notes:** _(walkthrough)_

**Open questions / TODO:** _(walkthrough)_

---

## Tab 4 — Overtime

**Purpose:** _(walkthrough)_

**Data sources:** _(walkthrough)_

**Formulas:** Already documented in [`special-class.md`](special-class.md) § OVERM_E.
Walkthrough should confirm the per-dept rows 7–14 not yet extracted.

**What's manual / fragile:** _(walkthrough)_

**KosPos improvements:** Existing OVERM UI in `app/src/modules/special-class/` is the
budget-development form. The labor-report-tab view is the **YTD + projection** view —
related but different presentation.

**KosPos UI sketch:** _(walkthrough)_

**Excel export notes:** _(walkthrough)_

**Open questions / TODO:** _(walkthrough)_

---

## Tab 5 — Retirement Payout

**Purpose:** _(walkthrough)_

**Data sources:** _(walkthrough)_

**Formulas:** Already documented in [`special-class.md`](special-class.md) § RTPOM_E.

**What's manual / fragile:** _(walkthrough)_

**KosPos improvements:** _(walkthrough)_

**KosPos UI sketch:** _(walkthrough)_

**Excel export notes:** _(walkthrough)_

**Open questions / TODO:** _(walkthrough)_

---

## Tab 6 — Step

**Purpose:** _(walkthrough)_

**Data sources:** _(walkthrough)_

**Formulas:** Partially documented in [`special-class.md`](special-class.md) § STEPM_C.

**What's manual / fragile:** Per Alex's prior walkthrough, the per-PP step-variance
formula (`BY2`) has known shortcuts.

**KosPos improvements:** _(walkthrough)_

**KosPos UI sketch:** _(walkthrough)_

**Excel export notes:** _(walkthrough)_

**Open questions / TODO:** _(walkthrough)_

---

## Tab 7 — Calendar

**Purpose:** The pay-calendar lookup. Source of `I2` (PPs elapsed) / `J2` (PPs in FY) /
`K2` (remaining). Already partially documented in [`definitions.md`](definitions.md).

**Data sources:** Controller's Office Payroll Division annual pay calendar
([`../data-sources/controller.md`](../data-sources/controller.md)).

**Formulas:** _(walkthrough — confirm row mapping of dates → PP numbers)_

**What's manual / fragile:** _(walkthrough)_

**KosPos improvements:** Compute live from the pay calendar JSON; never hardcode
elapsed-PP count.

**KosPos UI sketch:** _(walkthrough — probably internal-only; not a user-facing tab)_

**Excel export notes:** _(walkthrough)_

**Open questions / TODO:** _(walkthrough)_

---

## Tab 8 — Report Data

**Purpose:** The raw `Operating Report Summary` source rows (referenced as
`'Report Data'!$S$649:$S$748` etc. in `special-class.md`).

**Data sources:** _(walkthrough — likely BFM Non-Position eturn)_

**Formulas:** _(walkthrough)_

**What's manual / fragile:** _(walkthrough)_

**KosPos improvements:** _(walkthrough)_

**KosPos UI sketch:** _(walkthrough — probably internal staging; not user-facing)_

**Excel export notes:** _(walkthrough)_

**Open questions / TODO:** _(walkthrough)_

---

## Additional tabs

_(Walkthrough will enumerate every other tab in the workbook — Staffing Plan, P&P Data,
Active Labor, DHR-Steps, Cost per FTE, 15.15.002 Benefit Rates, BFM 15.10.006 FY26,
etc. Add a section per tab using the template above.)_

---

## Data sources inventory (built during walkthrough)

A flat list of every upstream file/query the labor report consumes. For each, capture
the v1 mechanism (manual upload? scrape?) and the eventual v2 plan (Snowflake when
available).

| Source | Used by tab(s) | v1 mechanism | v2 plan | KosPos importer path |
|---|---|---|---|---|
| _(walkthrough)_ | | | | |

## Cross-references

- [`special-class.md`](special-class.md) — math already documented for RTPOM, OVERM
  (and pending for PREMM, STEPM, 9993, 9994, 9995, TEMPM).
- [`budget-process.md`](budget-process.md) — the three-function framework (this file
  covers functions 2 and 3 — current-year YTD and projection).
- [`definitions.md`](definitions.md) — context-dependent definitions (Temp, Vacancy,
  Department, Pay Period) referenced throughout the labor-report formulas.
- [`../data-sources/`](../data-sources/) — per-source detail.
