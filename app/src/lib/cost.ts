/**
 * Cost-of-position math, ported from CCSF-Job-Class-Calculator.
 *
 * Read `docs/domain/calculator-port.md` for the architecture, type model,
 * and standalone-to-port mapping. Read `docs/domain/calculator-source-notes.md`
 * for the source inventory.
 *
 * All functions are pure — no DOM, no IO, no global state. Inputs in, outputs out.
 */

import stepsFileRaw from '../data/dhr-steps.json';
import rangesFileRaw from '../data/dhr-ranges.json';
import jcMapFileRaw from '../data/jc-map.json';
import retirementFileRaw from '../data/retirement.json';
import healthFileRaw from '../data/health.json';
import calendarFy2026Raw from '../data/calendar-fy2026.json';
import colaFy2026Raw from '../data/cola-fy2026.json';

// ============================================================================
// Reference-data types
// ============================================================================

/**
 * One snapshot covers one effective period. Lookup picks the snapshot whose
 * half-open interval [effectiveFrom, effectiveTo) contains the as-of date.
 * `effectiveTo === null` means open-ended (still in force).
 */
export interface DatedSnapshot {
  effectiveFrom: string;       // ISO YYYY-MM-DD
  effectiveTo: string | null;  // ISO YYYY-MM-DD (exclusive) or null
}

// --- Steps ------------------------------------------------------------------

export interface StepsSnapshot extends DatedSnapshot {
  /** rates[jobCode][setID][step] = hourlyRate */
  rates: Record<string, Record<string, Record<string, number>>>;
}
export interface StepsFile {
  snapshots: StepsSnapshot[];
}

// --- Ranges -----------------------------------------------------------------

export interface RangeBounds {
  min: number;
  max: number;
}
export interface RangeSetIDEntry {
  /** Doubles as empOrg for range classes. */
  unionCode: string;
  /** ranges["A"], ranges["B"], ... */
  ranges: Record<string, RangeBounds>;
}
export interface RangesSnapshot extends DatedSnapshot {
  /** entries[jobCode][setID] = { unionCode, ranges } */
  entries: Record<string, Record<string, RangeSetIDEntry>>;
}
export interface RangesFile {
  snapshots: RangesSnapshot[];
}

// --- JC-Map (step-class empOrg lookup) --------------------------------------

export interface JcMapSnapshot extends DatedSnapshot {
  /** map["COMMN_881"] = "002" */
  map: Record<string, string>;
}
export interface JcMapFile {
  snapshots: JcMapSnapshot[];
}

// --- Health-and-similar benefits per empOrg ---------------------------------

export interface HealthItem {
  name: string;
  type: 'fixed' | 'pct';
  /** fixed: annual dollars (divide by 26 for per-PP); pct: decimal rate on biweekly */
  value: number;
}
export interface HealthSnapshot extends DatedSnapshot {
  byEmpOrg: Record<string, HealthItem[]>;
}
export interface HealthFile {
  snapshots: HealthSnapshot[];
}

// --- Retirement contributions + payroll taxes -------------------------------

export interface RetirementItem {
  name: string;
  rate: number;
  cap: number | null;
  /** 'hourly' = tier threshold; 'annual' = OASDI-style salary cap; 'none' = uncapped */
  capScope: 'hourly' | 'annual' | 'none';
  /** Marks the item used for tier selection in `getRetirementTier`. */
  isTierDefining: boolean;
}
export interface RetirementSnapshot extends DatedSnapshot {
  /** byCode[retCode][tier] = items[]; tier "0" allowed for codes without tiering */
  byCode: Record<string, Record<string, RetirementItem[]>>;
}
export interface RetirementFile {
  snapshots: RetirementSnapshot[];
}

// --- Calendar (one file per FY) ---------------------------------------------

export interface PayPeriod {
  pp: number;        // 1..27
  ppe: string;       // pay-period-end ISO
  pct: number;       // 0.4 / 1.0 / 0.7
}
export interface CalendarFile {
  fiscalYear: string;
  effectiveFrom: string;
  effectiveTo: string;
  payPeriods: PayPeriod[];
}

// --- COLA (one file per FY) -------------------------------------------------

export interface ColaFile {
  fiscalYear: string;
  midYear: {
    appliesAtPP: number;
    /** Display-only: post-COLA salary tables already bake this in. */
    rate: number;
  };
  pp1: {
    /** Display-only: salary tables already bake the PP1 rate in. */
    defaultRate: number;
    byEmpOrg: Record<string, number>;
  };
  /**
   * Federal OASDI wage base per calendar year. FY spans two CYs (e.g. FY2026
   * covers CY2025 July–Dec and CY2026 Jan–Jun), which may have different caps.
   * `pre` applies to PPs whose ppe falls in the FY-start calendar year;
   * `post` applies to PPs whose ppe falls in the FY-end calendar year.
   */
  oasdiWageBase: {
    pre: number;
    post: number;
  };
}

// --- Discretionary range starting step (UI only — no math impact) -----------

export interface DiscSnapshot extends DatedSnapshot {
  /** startStepBySetIDCode["COMMN_1044"] = 11 → steps >= 11 are discretionary */
  startStepBySetIDCode: Record<string, number>;
}
export interface DiscFile {
  snapshots: DiscSnapshot[];
}

// ============================================================================
// Input/output types
// ============================================================================

export type SalaryType = 'step' | 'range';
export type RangePos = 'min' | 'max';

export interface BiweeklyRate {
  /** Biweekly salary using the pre-COLA snapshot. */
  pre: number;
  /** Biweekly salary using the post-COLA snapshot (equals pre if no mid-year change). */
  post: number;
}

export interface BenefitResult {
  /** Sum of all items for one PP. */
  total: number;
  /** itemName → dollars; only non-zero items included. */
  breakdown: Record<string, number>;
}

export interface CostInput {
  code: string;
  setid: string;
  retCode: string;
  /** ISO; must match a pay-period ppe in the chosen FY's calendar. */
  ppStartDate: string;
  salaryType: SalaryType;
  /** number for step; string ("A"/"B"/...) for range. */
  stepOrRange: number | string;
  /** Required when salaryType === 'range'. */
  rangePos?: RangePos;
  /** Drives data selection: e.g. "FY2026". */
  fiscalYear: string;
  /**
   * Wages the employee has already earned in the current calendar year before
   * `ppStartDate`. Used to determine remaining OASDI wage-base room.
   *
   * For a new hire with no prior wages in the calendar year, omit or pass 0.
   * For an existing employee starting mid-FY, pass their YTD wages (gross,
   * not OASDI-capped) from Jan 1 through the PP before `ppStartDate`.
   *
   * Defaults to 0 when omitted — correct for new positions or when the FY
   * starts at the same time as the calendar year.
   */
  cumulativeCalendarYearSalary?: number;
}

export interface PpRow {
  pp: number;
  ppe: string;
  pct: number;
  postCOLA: boolean;
  /** Display-only echo of the PP1 COLA rate for this empOrg. */
  pp1ColaRate: number;
  salary: number;
  benefits: number;
  /** salary + benefits */
  total: number;
  breakdown: Record<string, number>;
}

export interface SnapshotMeta {
  from: string;
  to: string | null;
}

export interface CostResult {
  ppRows: PpRow[];
  totalSalary: number;
  totalBen: number;
  pp26Salary: number;
  pp26Ben: number;
  pp26Found: boolean;
  pp26Breakdown: Record<string, number>;
  // Echoed for the UI's reference panel — issue #3 wants the math visible:
  empOrg: string;
  preBiweekly: number;
  postBiweekly: number;
  snapshotsUsed: {
    steps?: SnapshotMeta;
    ranges?: SnapshotMeta;
    retirement: SnapshotMeta;
    health: SnapshotMeta;
    jcMap?: SnapshotMeta;
  };
}

// ============================================================================
// Typed errors
// ============================================================================

export type CostCalcErrorCode =
  | 'no-rate'
  | 'no-emporg'
  | 'no-snapshot'
  | 'invalid-pp'
  | 'invalid-fy'
  | 'missing-range-pos';

export class CostCalcError extends Error {
  readonly code: CostCalcErrorCode;
  constructor(code: CostCalcErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'CostCalcError';
  }
}

// ============================================================================
// Loaded data (static imports; Vite bundles these at build time)
// ============================================================================

// Cast through unknown to silence TS's stricter inference on imported JSON —
// the types match the JSON shapes exactly; this is safe.
const stepsFile = stepsFileRaw as unknown as StepsFile;
const rangesFile = rangesFileRaw as unknown as RangesFile;
const jcMapFile = jcMapFileRaw as unknown as JcMapFile;
const retirementFile = retirementFileRaw as unknown as RetirementFile;
const healthFile = healthFileRaw as unknown as HealthFile;
const calendarFy2026 = calendarFy2026Raw as unknown as CalendarFile;
const colaFy2026 = colaFy2026Raw as unknown as ColaFile;

/** FY-keyed calendar lookup. Extend when FY2027 lands. */
const CALENDARS: Record<string, CalendarFile> = {
  FY2026: calendarFy2026,
};
const COLAS: Record<string, ColaFile> = {
  FY2026: colaFy2026,
};

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Returns the snapshot whose half-open interval [effectiveFrom, effectiveTo)
 * contains `asOfDate`. `effectiveTo === null` is treated as open-ended.
 * Returns `null` if no snapshot covers the date.
 */
function pickSnapshot<T extends DatedSnapshot>(
  snapshots: T[],
  asOfDate: string,
): T | null {
  for (const snap of snapshots) {
    if (asOfDate >= snap.effectiveFrom) {
      if (snap.effectiveTo === null || asOfDate < snap.effectiveTo) {
        return snap;
      }
    }
  }
  return null;
}

/**
 * Determines the retirement tier for a given hourly rate and ret code.
 *
 * Mirrors the standalone `getRetirementTier`: iterates tiers in ascending
 * numeric order, finds the tier-defining item (isTierDefining=true), and
 * returns the first tier whose hourly cap the rate doesn't exceed. Returns
 * the highest tier if all thresholds are exceeded. Returns 0 if retCode
 * is missing or has no tiers.
 */
function getRetirementTier(
  hourlyRate: number,
  retCode: string,
  retirement: RetirementSnapshot,
): number {
  const tiers = retirement.byCode[retCode];
  if (!tiers) return 0;

  const tierNumbers = Object.keys(tiers)
    .map(Number)
    .sort((a, b) => a - b);

  if (tierNumbers.length === 0) return 0;

  let highestTier = tierNumbers[tierNumbers.length - 1];

  for (const tier of tierNumbers) {
    const items = tiers[String(tier)];
    const definer = items.find(item => item.isTierDefining && item.capScope === 'hourly');
    if (!definer || definer.cap === null) continue;
    if (hourlyRate <= definer.cap) {
      return tier;
    }
  }

  return highestTier;
}

/**
 * Resolves empOrg for a job class.
 *
 * Step classes: looks up `jcMap.map["SETID_CODE"]`.
 * Range classes: looks up `ranges.entries[code][setid].unionCode`.
 * Returns null if not found.
 */
function getEmpOrg(
  code: string,
  setid: string,
  salaryType: SalaryType,
  jcMap: JcMapSnapshot,
  ranges: RangesSnapshot,
): string | null {
  if (salaryType === 'step') {
    return jcMap.map[`${setid}_${code}`] ?? null;
  }
  return ranges.entries[code]?.[setid]?.unionCode ?? null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns biweekly pre-/post-COLA rates for a step- or range-based class.
 *
 * The caller passes both the pre- and post-COLA snapshots explicitly so that
 * `cost.ts` is the only place that does effective-date routing (in
 * `calcEmployeeCost`). This keeps `getBiweeklyRate` testable in isolation.
 *
 * @returns `null` if the class/setID/step-or-range isn't found.
 */
export function getBiweeklyRate(
  code: string,
  setid: string,
  salaryType: SalaryType,
  stepOrRange: number | string,
  rangePos: RangePos | undefined,
  preSteps: StepsSnapshot,
  postSteps: StepsSnapshot,
  preRanges: RangesSnapshot,
  postRanges: RangesSnapshot,
): BiweeklyRate | null {
  if (salaryType === 'step') {
    const step = String(stepOrRange);
    const preRate = preSteps.rates[code]?.[setid]?.[step];
    if (preRate === undefined) return null;
    // post falls back to pre if the class has no mid-year COLA entry
    const postRate = postSteps.rates[code]?.[setid]?.[step] ?? preRate;
    return { pre: preRate * 80, post: postRate * 80 };
  }

  // range
  if (!rangePos) return null;
  const rangeLetter = String(stepOrRange);
  const preBounds = preRanges.entries[code]?.[setid]?.ranges[rangeLetter];
  if (!preBounds) return null;
  const postBounds = postRanges.entries[code]?.[setid]?.ranges[rangeLetter] ?? preBounds;
  // Range values in dhr-ranges.json are *hourly* rates (same convention as
  // step rates), despite a misleading "biweekly" comment in the JSON. Verified
  // against careers.sf.gov/classifications/ — e.g., class 0922 Manager I Range
  // A post-COLA is "$136,604 annual", which equals 65.68 hourly × 80 × 26 PPs.
  // Multiply by 80 to convert hourly → biweekly, matching the step branch.
  const preVal = preBounds[rangePos];
  const postVal = postBounds[rangePos];
  if (preVal == null || postVal == null) return null;
  return {
    pre: preVal * 80,
    post: postVal * 80,
  };
}

/**
 * Returns benefits dollars for one pay period given a biweekly base salary.
 *
 * `cumulativeAnnualSalary` is the gross wages the employee has already earned
 * in the current calendar year before this PP (used for OASDI cap tracking).
 * Pass 0 for a new hire or the first PP of the calendar year.
 *
 * `annualCapOverrides` lets the caller substitute a different cap for named
 * items — used by `calcEmployeeCost` to apply the correct CY-specific OASDI
 * wage base (CY2025 vs CY2026 within the same FY).
 */
export function calcBenefitsForPP(
  biweeklySalary: number,
  retCode: string,
  empOrg: string,
  cumulativeAnnualSalary: number,
  retirement: RetirementSnapshot,
  health: HealthSnapshot,
  annualCapOverrides?: Record<string, number>,
): BenefitResult {
  const breakdown: Record<string, number> = {};
  let total = 0;

  // Retirement tier is determined from the hourly equivalent of the biweekly
  const hourlyRate = biweeklySalary / 80;
  const tier = getRetirementTier(hourlyRate, retCode, retirement);
  const retItems = retirement.byCode[retCode]?.[String(tier)] ?? [];

  for (const item of retItems) {
    // Skip tier-defining items — they're thresholds, not contribution rates
    if (item.isTierDefining && item.capScope === 'hourly') continue;

    let ben: number;
    if (item.capScope === 'annual' && item.cap !== null) {
      // City uses cumulative calendar-year tracking: charge 6.2% on wages up to
      // the annual wage base, then $0. The override lets calcEmployeeCost pass
      // the correct CY-specific cap (FY spans two CYs with different wage bases).
      const cap = annualCapOverrides?.[item.name] ?? item.cap;
      const remaining = Math.max(0, cap - cumulativeAnnualSalary);
      ben = Math.min(biweeklySalary, remaining) * item.rate;
    } else {
      ben = biweeklySalary * item.rate;
    }

    if (ben !== 0) {
      breakdown[item.name] = (breakdown[item.name] ?? 0) + ben;
      total += ben;
    }
  }

  // Health and other fixed/pct benefits
  const healthItems = health.byEmpOrg[empOrg] ?? [];
  for (const item of healthItems) {
    let ben: number;
    if (item.type === 'fixed') {
      ben = item.value / 26;
    } else {
      ben = biweeklySalary * item.value;
    }

    if (ben !== 0) {
      breakdown[item.name] = (breakdown[item.name] ?? 0) + ben;
      total += ben;
    }
  }

  return { total, breakdown };
}

/**
 * Top-level entry. Loads snapshots based on `input.fiscalYear`, runs the
 * per-PP loop from `input.ppStartDate` through the end of the FY, returns
 * totals + per-PP rows.
 *
 * Throws `CostCalcError` for missing data / invalid inputs (instead of the
 * standalone's null-return-then-DOM-error pattern).
 */
export function calcEmployeeCost(input: CostInput): CostResult {
  // --- 1. Load calendar and COLA for the requested FY ----------------------
  const calendar = CALENDARS[input.fiscalYear];
  if (!calendar) {
    throw new CostCalcError('invalid-fy', `No calendar for fiscal year "${input.fiscalYear}"`);
  }
  const cola = COLAS[input.fiscalYear];
  if (!cola) {
    throw new CostCalcError('invalid-fy', `No COLA data for fiscal year "${input.fiscalYear}"`);
  }

  if (input.salaryType === 'range' && !input.rangePos) {
    throw new CostCalcError('missing-range-pos', 'rangePos is required when salaryType is "range"');
  }

  // --- 2. Determine pre/post boundary dates --------------------------------
  // preBoundaryDate: first PP's ppe (representative of the pre-COLA period)
  // postBoundaryDate: the ppe of PP (COLA1_PP - 1), i.e. the last PP before mid-year COLA
  //   actually: COLA kicks in AT PP COLA1_PP, so we use that PP's ppe as the post date
  const preBoundaryDate = calendar.payPeriods[0].ppe;
  const postBoundaryDate = calendar.payPeriods[cola.midYear.appliesAtPP - 1].ppe;

  // --- 3. Pick snapshots ---------------------------------------------------
  const preSteps = pickSnapshot(stepsFile.snapshots, preBoundaryDate);
  const postSteps = pickSnapshot(stepsFile.snapshots, postBoundaryDate);
  const preRanges = pickSnapshot(rangesFile.snapshots, preBoundaryDate);
  const postRanges = pickSnapshot(rangesFile.snapshots, postBoundaryDate);
  const jcMap = pickSnapshot(jcMapFile.snapshots, preBoundaryDate);
  const retirement = pickSnapshot(retirementFile.snapshots, preBoundaryDate);
  const health = pickSnapshot(healthFile.snapshots, preBoundaryDate);

  if (!preSteps || !postSteps) {
    throw new CostCalcError('no-snapshot', `No steps snapshot for dates ${preBoundaryDate} / ${postBoundaryDate}`);
  }
  if (!preRanges || !postRanges) {
    throw new CostCalcError('no-snapshot', `No ranges snapshot for dates ${preBoundaryDate} / ${postBoundaryDate}`);
  }
  if (!jcMap) {
    throw new CostCalcError('no-snapshot', `No jc-map snapshot for date ${preBoundaryDate}`);
  }
  if (!retirement) {
    throw new CostCalcError('no-snapshot', `No retirement snapshot for date ${preBoundaryDate}`);
  }
  if (!health) {
    throw new CostCalcError('no-snapshot', `No health snapshot for date ${preBoundaryDate}`);
  }

  // --- 4. Biweekly rate ----------------------------------------------------
  const rate = getBiweeklyRate(
    input.code, input.setid, input.salaryType, input.stepOrRange, input.rangePos,
    preSteps, postSteps, preRanges, postRanges,
  );
  if (!rate) {
    throw new CostCalcError(
      'no-rate',
      `No salary rate for code=${input.code} setid=${input.setid} ` +
      `salaryType=${input.salaryType} stepOrRange=${input.stepOrRange}`,
    );
  }

  // --- 5. empOrg -----------------------------------------------------------
  const empOrg = getEmpOrg(input.code, input.setid, input.salaryType, jcMap, preRanges);
  if (!empOrg) {
    throw new CostCalcError(
      'no-emporg',
      `No empOrg for code=${input.code} setid=${input.setid} salaryType=${input.salaryType}`,
    );
  }

  // --- 6. PP1 COLA rate (display-only) -------------------------------------
  const pp1ColaRate = cola.pp1.byEmpOrg[empOrg] ?? cola.pp1.defaultRate;

  // --- 7. Find starting calendar index -------------------------------------
  const startIdx = calendar.payPeriods.findIndex(c => c.ppe === input.ppStartDate);
  if (startIdx === -1) {
    throw new CostCalcError(
      'invalid-pp',
      `ppStartDate "${input.ppStartDate}" not found in ${input.fiscalYear} calendar`,
    );
  }

  // --- 8. Per-PP loop ------------------------------------------------------
  const ppRows: PpRow[] = [];
  let totalSalary = 0;
  let totalBen = 0;
  let pp26Found = false;
  let pp26Breakdown: Record<string, number> = {};

  // OASDI uses calendar-year (CY) cumulative tracking. The cap resets on
  // Jan 1; within FY2026 that means two different wage bases apply.
  // We determine which CY a PP belongs to by its ppe year.
  const fyStartYear = parseInt(calendar.payPeriods[0].ppe.slice(0, 4), 10);
  let cyWages = input.cumulativeCalendarYearSalary ?? 0; // YTD wages entering this run

  for (let i = startIdx; i < calendar.payPeriods.length; i++) {
    const cal = calendar.payPeriods[i];

    // Reset CY wages when the ppe crosses into a new calendar year
    const ppeYear = parseInt(cal.ppe.slice(0, 4), 10);
    if (ppeYear > fyStartYear && i > 0) {
      const prevPpeYear = parseInt(calendar.payPeriods[i - 1].ppe.slice(0, 4), 10);
      if (ppeYear > prevPpeYear) {
        cyWages = 0;
      }
    }

    // Select the OASDI wage base for this PP's calendar year
    const oasdiCap = ppeYear === fyStartYear
      ? cola.oasdiWageBase.pre
      : cola.oasdiWageBase.post;
    const annualCapOverrides: Record<string, number> = { 'Social Security': oasdiCap };

    const isPostCOLA = cal.pp >= cola.midYear.appliesAtPP;
    const biwBase = isPostCOLA ? rate.post : rate.pre;
    const biwSalary = biwBase * cal.pct;

    const { total: benFull, breakdown } = calcBenefitsForPP(
      biwBase, input.retCode, empOrg, cyWages, retirement, health, annualCapOverrides,
    );
    const benAdjusted = benFull * cal.pct;

    // Advance CY cumulative by actual wages paid this PP (pct-adjusted)
    cyWages += biwSalary;
    totalSalary += biwSalary;
    totalBen += benAdjusted;

    ppRows.push({
      pp: cal.pp,
      ppe: cal.ppe,
      pct: cal.pct,
      postCOLA: isPostCOLA,
      pp1ColaRate,
      salary: biwSalary,
      benefits: benAdjusted,
      total: biwSalary + benAdjusted,
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([k, v]) => [k, v * cal.pct]),
      ),
    });

    if (cal.pp === 26) {
      pp26Found = true;
    }
  }

  // --- 9. PP26 reference row (mirrors standalone lines 1178-1203) ----------
  // Always uses the full post-COLA rate at pct=1, regardless of which PP the
  // run actually started from. This is the "what does one normal full PP cost"
  // figure used for the annual display row in the UI.
  //
  // PP27-starting case: if the run began at PP27 (the partial final PP),
  // pp26Found is false but we still produce the reference row — the UI can
  // display it with a note that it's synthesized, not observed.
  const pp26RefBen = calcBenefitsForPP(
    rate.post, input.retCode, empOrg, 0, retirement, health,
  );
  pp26Breakdown = pp26RefBen.breakdown;

  // --- 10. Build result ----------------------------------------------------
  return {
    ppRows,
    totalSalary,
    totalBen,
    pp26Salary: rate.post,
    pp26Ben: pp26RefBen.total,
    pp26Found,
    pp26Breakdown,
    empOrg,
    preBiweekly: rate.pre,
    postBiweekly: rate.post,
    snapshotsUsed: {
      steps: { from: preSteps.effectiveFrom, to: preSteps.effectiveTo },
      retirement: { from: retirement.effectiveFrom, to: retirement.effectiveTo },
      health: { from: health.effectiveFrom, to: health.effectiveTo },
      jcMap: { from: jcMap.effectiveFrom, to: jcMap.effectiveTo },
    },
  };
}
