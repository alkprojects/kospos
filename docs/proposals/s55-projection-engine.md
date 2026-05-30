# Projection engine (`lib/projections`) — design proposal

**Date:** 2026-05-30 (Session 55) · **Status:** proposal — *not implemented* ·
**Author:** S55 away-session analysis. **Decision-owner: Alex.**

> **Why this is a proposal, not a PR.** Alex's S55 steer: *"projection engine
> is complex with nuance — I'd like to be present for that one."* So this
> session did the **analysis** and is laying out the **decisions** — it builds
> none of the projection behavior. Part A is the uncontroversial scaffolding
> (mostly consolidation + the already-shipped calendar primitive); **Part B is
> a set of decisions only Alex should make**, each written as *options →
> trade-offs → a recommendation*, in the guided-decision style from
> `docs/CLAUDE.md`. Nothing here is built; pick the Part B answers and the
> staged plan at the end becomes the build.

The unified COLA-aware projection engine is the lever that lifts workbook tabs
**16–19** (Premium / Overtime / Step / Retirement Payout — the "Special Class"
view, currently *Partial: budget-only*) from Partial → Shipped, and unblocks
the headline **26 / 27** Operating Report Summary + Detail projection pages.
See the build-status scorecard in [`labor-report.md`](../domain/labor-report.md).

---

## 1. What already exists (don't rebuild it)

The projection math is **~80% already present** — but scattered across
per-special-class modules, with the hard part (COLA-aware per-PP salary cost)
already solved. A survey of `app/src/lib/`:

| Capability | Where | State |
|---|---|---|
| **COLA-aware per-PP salary cost** | `lib/cost.ts:calcEmployeeCost()` | ✅ The real engine. Loads the calendar + COLA schedule, finds the mid-year COLA PP, iterates each PP applying the pre/post-COLA rate × the PP weight, accumulates the annual total. **This is the correct COLA-aware salary projector** and the Staffing Plan already calls it (`staffing-plan/build.ts:computeExpectedCost`). |
| **Pay-period elapsed / remaining (weighted)** | `lib/calendar/payPeriodElapsed()` | ✅ **Shipped S55** (PR #191). `{ completed, current, remaining, totalWeight, completedWeight, remainingWeight, elapsedFraction }`, parameterized by an as-of date. The denominator every year-end projection needs. |
| **Per-position YTD actuals** | `lib/payroll/build.ts` (`buildPayrollSnapshots`, `pickLatestSnapshot`) | ✅ Per-position cube split into 5 buckets `{ regular, overtime, rpo, premium, tempLsp }` + `asOfDate`. Historical only — no projection. |
| **Straight-line YTD pace** | `special-class/rtpom.ts:ytdBudgetPace` **≡** `overm.ts:ytdBudgetPace` | ⚠️ Two byte-identical copies. `budget × ppElapsed / ppTotal` — **raw PP counts, not weighted, not COLA-aware** (see Decision B1). |
| **RPO year-end projection (conservative floor)** | `rtpom.ts:projectRpoYearEnd` | ✅ `max(budget, ytdActual)` while PPs remain — deliberately lumpy-safe for retirements. |
| **OT year-end projection (annualize + gross-up)** | `overm.ts:projectOvermYearEnd` | ✅ `ytdSalary × (ppTotal/ppElapsed) × (budgetedTotal/budgetedSalary)`. Raw PP counts. |
| **Historical-mean + COLA-inflate + sentiment** (budget *development*, not year-end projection) | `rtpom.ts` + `overm.ts`: `historicalActualsMean`, `colaAdjustToYear`, `applySentiment` | ⚠️ **Three more byte-identical pairs** across the two files. |

**Headline:** the engine is a **thin wrapper + a consolidation**, not a
from-scratch build. The salary path is done (`cost.ts`); the actuals-driven
buckets each have a method; the duplication wants a shared home.

---

## 2. Part A — the uncontroversial scaffolding

These steps make no new modelling decisions; they're safe to do once the Part B
answers are in (or even before).

**A1. Create `lib/projections/` and absorb the duplicated helpers.**
Move the four byte-identical pairs (`ytdBudgetPace`, `historicalActualsMean`,
`colaAdjustToYear`, `applySentiment`) out of `rtpom.ts` + `overm.ts` into
`lib/projections/` (or a shared `special-class/shared.ts`). Pure dedup, gated by
the existing special-class tests. *(This is also s48 code-health L7-adjacent.)*

**A2. A single entry point.** A `projectFyEnd(input): Projection` function that
dispatches on a `method` and always returns the same shape, so every special-
class card and the OPS rollup read one contract:

```
Projection = {
  budget: number,            // FY budget for this bucket
  ytdActual: number,         // from the payroll snapshot
  ytdPace: number,           // straight-line pace to compare against (baseline)
  projection: number,        // the method's FY-end number
  variance: number,          // projection − budget  (+over / −under)
  method: ProjectionMethod,  // which rule produced `projection`
  asOfDate: string,          // the snapshot the projection is anchored to
}
```

**A3. Anchor on the shipped primitives.** Projections take `payPeriodElapsed(...)`
for the weighted elapsed/remaining and `calcEmployeeCost(...)` for any salary
path — never re-derive PP math or COLA application.

---

## 3. Part B — decisions for Alex (each: options → recommendation)

### B1. Does the straight-line pace become COLA-weighted, and how?

The memory rule [`feedback_projections_always_cola_aware`](../domain/labor-report.md)
says straight-line PP pacing *undercounts post-COLA* and projections must be
COLA-aware by default. Worked example: 26 PPs, \$1/PP pre-COLA, a 100% COLA at
PP13 → correct FY-end = 13×\$1 + 13×\$2 = **\$39**, not 26×\$1 (\$26) and not
26×avg (\$39 by luck). Today's `ytdBudgetPace` uses **raw PP counts** and is
COLA-blind.

There are actually **two** corrections folded together — keep them distinct:

- **Partial-period weighting** (the `pct` weights): a PP that only partly falls
  in the FY counts as 0.4 / 0.7. `payPeriodElapsed` already exposes
  `completedWeight` / `totalWeight`. **Low-controversy:** swap the pace
  denominator from raw counts to these weights everywhere. I recommend doing
  this unconditionally.
- **COLA weighting** (remaining PPs cost more post-COLA): this only matters for
  the **salary** path, where `cost.ts` *already handles it correctly*. For the
  **variable / actuals-driven** buckets (OT, RPO, Premium), the YTD actual is
  whatever was actually paid; "projecting remaining at the post-COLA rate"
  assumes those buckets scale with the wage rate, which OT/RPO largely **don't**
  (they're event- and discretion-driven).

**Options for the variable buckets:**
- **(a) Weighted straight-line** — `ytdActual / completedWeight × totalWeight`. Handles partials; ignores COLA. *Simple, defensible for discretionary spend.*
- **(b) COLA-split** — split the YTD actual into pre/post-COLA portions using the per-PP payroll snapshot, project the remaining weighted PPs at the post-COLA rate. *Most "correct"; meaningful only if the bucket truly scales with the rate.*
- **(c) Per-bucket choice** — salary path COLA-aware via `cost.ts`; OT/RPO/Premium use weighted straight-line (a); expose (b) as an optional "rate-scaled" view.

> **Recommendation: (c).** The salary path is already COLA-correct; forcing
> COLA-splitting onto discretionary OT/RPO is precision theater that the
> volatility (RPO swings ~4× year-to-year — `rtpom.ts` says so) swamps.
> **Question for you:** agree that "COLA-aware by default" is *satisfied by the
> salary path*, and the variable buckets only need **partial-period weighting**?
> Or do you want OT/Premium rate-scaled (b)?

### B2. Which projection method is the default per bucket?

The workbook deliberately uses **different** methods per bucket. Proposed
defaults (all unifiable behind `projectFyEnd`'s `method`):

| Bucket | Proposed default method | Basis |
|---|---|---|
| Regular labor (per position) | `cost.ts` per-position sum | Already COLA-aware; Staffing Plan uses it |
| Overtime (OVERM) | annualize + gross-up (`projectOvermYearEnd`) | Existing, workbook-validated |
| Retirement Payout (RTPOM) | conservative floor (`projectRpoYearEnd`) | Existing; lumpy-safe |
| Premium (PREMM) | **? — not yet specified** | needs a rule |
| Step savings (STEPM) | **? — see B4** | per-PP variance, nuance |
| 9993 attrition | residual (see B3) | — |

> **Recommendation:** keep the three existing, domain-validated methods as-is;
> they're already correct. **Questions for you:** (1) what method should
> **Premium (PREMM)** use — same annualize-and-gross-up as OT, or a floor? (2)
> Confirm OT keeps the `budgetedTotal/budgetedSalary` gross-up (the workbook's
> `BN8/BN6`) rather than a TRC-derived benefit (the `overm.ts` TODO).

### B3. How is attrition (9993) modelled?

OPS Summary hard-keys a prior-year attrition rate (`H43 = −0.15438`), hand-
entered annually, with the workbook note flagging it *"Questionable."* The
projection needs an attrition assumption to land the regular-labor number.

- **(a) Carry the hand-keyed rate** — a single user input per FY (matches today).
- **(b) Derive from a saved prior-FY end snapshot** — `9993_actual / non-9993_actual` from last year's close.
- **(c) Forward-looking** — from the current Separations + vacancy data (the Staffing Plan already tracks these).

> **Recommendation: (a) now, (b) later.** Ship a single editable "expected
> attrition %" input (with the prior-FY-derived value as the suggested default
> once an end-of-FY snapshot exists), and surface the methodology in a tooltip
> — directly addressing the workbook's "Questionable" self-flag. **Question:**
> is a single dept-group-level rate enough, or do you need per-division?

### B4. Step savings (STEPM): model merit-step events, or uniform rate?

`labor-report.md` flags that the workbook's per-PP step variance **assumes a
uniform per-PP rate** and so misleads the trend chart (pre-merit PPs look
under-budget, post-merit over). The aggregate is right; the per-PP shape is not.

- **(a) Uniform rate** (workbook parity) — aggregate-correct, trend-misleading.
- **(b) Merit-aware per-PP** — use each employee's Merit Increase Date (P&P col AJ) to step the rate mid-FY. More correct; needs the per-employee step history.

> **Recommendation: (a) for v1 parity, (b) as a fast-follow** once the
> per-employee step path is wired (it leans on the same `cost.ts` snapshot
> machinery). **Question:** is the per-PP *trend chart* important enough to
> prioritize (b), or is the aggregate sufficient for now?

### B5. What surfaces first, and where?

- **(a) Special-class cards (tabs 16–19)** — each card gains a YTD-actual +
  projection + variance row (today they're budget-only). Smallest, highest-
  signal first step; the card UI already exists.
- **(b) OPS Summary (tab 26)** — the cross-bucket rollup that *consumes* every
  per-bucket projection. Bigger; depends on (a) plus the regular-labor path.

> **Recommendation:** (a) first — wire `projectFyEnd` into the four special-
> class cards so each shows *budget / YTD / projection / variance*, then (b) the
> OPS rollup. **Question:** agree special-class-cards-first, OPS-second?

---

## 4. Staged build plan (once B1–B5 are answered)

1. **`lib/projections/` + consolidation (Part A)** — one PR; pure dedup of the
   four duplicated helper pairs + the `projectFyEnd` skeleton + `Projection`
   type. Behavior-neutral.
2. **Variable-bucket projections** — wire OT (`projectOvermYearEnd`) and RPO
   (`projectRpoYearEnd`) through `projectFyEnd` with the B1 weighting decision;
   add Premium per B2. Unit tests against the workbook's `H37 / H38` numbers.
3. **Special-class cards show projection** (B5a) — each of tabs 16–19 gains the
   budget / YTD / projection / variance row. First user-visible lift
   (Partial → Shipped).
4. **Regular-labor projection** — per-position `cost.ts` sum + the B3 attrition
   assumption.
5. **OPS Summary rollup (tab 26)** (B5b) — aggregate all buckets; then OPS
   Detail (27) for the drill-down.

Steps 1–2 are mechanical once B1/B2 are set; 3 is the first thing you'd *see*;
4–5 are the headline pages.

---

## 5. Open questions consolidated (for the working session)

- **B1** — Is "COLA-aware by default" satisfied by the salary path alone, with
  variable buckets needing only partial-period weighting? Or rate-scale OT/Premium?
- **B2** — Premium (PREMM) method? Keep OT's `BN8/BN6` gross-up?
- **B3** — Attrition: single hand-keyed rate (v1) vs prior-FY-derived; per-dept-group enough?
- **B4** — STEPM: uniform-rate parity vs merit-aware per-PP — is the trend chart worth (b)?
- **B5** — Special-class-cards-first, OPS-second — agreed?
- **Scope** — near-term DBI + CPC only (citywide is the separate Phase 8+ arc).

**See also:** [`labor-report.md`](../domain/labor-report.md) (scorecard + the
COLA-weighting cross-cutting note), [`special-class.md`](../domain/special-class.md)
(RTPOM/OVERM specs), [`budget-process.md`](../domain/budget-process.md) (the
three-function model), memory `feedback_projections_always_cola_aware`.
