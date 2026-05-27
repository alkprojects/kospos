/**
 * Inactive view — Tab 13 INACTIVE replacement. Phase 2.2.20.
 *
 * Pure query against the loaded data: positions that received pay in the
 * latest OBI BI Payroll snapshot but are NOT in the active P&P roster. These
 * are typically separated / terminated positions still accruing their final
 * checks (regular wages, retirement payouts, lump-sum payoffs).
 *
 * Per labor-report.md § Tab 13 § KosPos improvement #1 — replaces the
 * workbook's manual "PivotTable5 ⋈ P&P Data XLOOKUP ⋈ Report Data INACTIVATED
 * block paste" three-step flow with one live query.
 *
 * Returns one summary row per inactive position, with:
 *   - last known incumbent (from latest PPE in the OBI rows for this position)
 *   - 5-bucket FYTD spend (regular / overtime / RPO / premium / temp LSP)
 *   - inferred separation hint based on which buckets are non-zero
 *
 * Sort order: total FYTD spend descending — biggest spend first.
 *
 * Why not "people"-level? Tab 13 is per-position; a separated employee may
 * still appear in P&P on a *different* position they transferred to. The
 * useful question is "which positions have orphan FYTD spend that needs to
 * land in Report Data INACTIVATED" — and that's a position-level question.
 */

import type { Position } from '../../positions';
import type { ObiPayrollRow } from '../../importers/types';
import type { PayrollSnapshot } from '../../payroll';
import { ACCOUNT_DESCRIPTIONS } from '../../payroll';
import { normalizePositionKey } from '../../chartfields/resolve';

/**
 * Inferred reason hints, derived from which special-class buckets are
 * non-zero on the orphan FYTD spend. The hint is informational only — a real
 * separation reason lives in PS HCM (not in BI Payroll), so this is a
 * "likely" not a "confirmed" classification.
 */
export type InactiveReasonHint =
  | 'retirement-payout'   // RPO bucket > 0 → likely retired
  | 'temp-lumpsum-payoff' // tempLsp bucket > 0 → temp separation processed
  | 'wages-only';         // only regular / OT / premium → recent separation, still being closed

/** One row per inactive position. */
export interface InactivePositionSummary {
  /** Normalized position key (zero-stripped). */
  positionId: string;
  /** Display form preserved from the OBI row. */
  displayNumber: string;

  /** Last known incumbent's name (most-recent PPE in the snapshot). */
  lastIncumbent: string;
  /** Last known incumbent's person number. */
  lastEmplId: string;

  jobCode: string;
  jobCodeSet: string;
  jobDescription: string;

  departmentCode: string;
  departmentName: string;

  /** MAX(earningPeriodEnd) for this position in the snapshot. */
  lastPpe: string;
  /** Fiscal year label from the snapshot. */
  fiscalYear: string;

  /** Number of OBI rows aggregated into this summary. */
  rowCount: number;

  /** FYTD totals split into the 5 special-class buckets. */
  total: number;
  regular: number;
  overtime: number;
  rpo: number;
  premium: number;
  tempLsp: number;

  /** Inferred reason hint — see InactiveReasonHint. */
  reasonHint: InactiveReasonHint;
}

function bucketOf(accountDescription: string):
  'overtime' | 'rpo' | 'premium' | 'tempLsp' | 'regular' {
  switch (accountDescription) {
    case ACCOUNT_DESCRIPTIONS.overtime: return 'overtime';
    case ACCOUNT_DESCRIPTIONS.rpo:      return 'rpo';
    case ACCOUNT_DESCRIPTIONS.premium:  return 'premium';
    case ACCOUNT_DESCRIPTIONS.tempLsp:  return 'tempLsp';
    default:                            return 'regular';
  }
}

function inferReason(s: {
  regular: number; overtime: number; rpo: number; premium: number; tempLsp: number;
}): InactiveReasonHint {
  // Priority: RPO (retirement payout) is the strongest signal; temp LSP next;
  // otherwise wages-only. The non-RPO buckets coexist on most separations
  // (final reg wages + small OT often appear alongside RPO).
  if (s.rpo > 0)     return 'retirement-payout';
  if (s.tempLsp > 0) return 'temp-lumpsum-payoff';
  return 'wages-only';
}

/**
 * Build the per-position inactive summary.
 *
 * @param positions  Active P&P roster — positions present here are EXCLUDED
 *                   from the result. Pass `[]` when no P&P is loaded; in that
 *                   case every OBI position is treated as "potentially
 *                   inactive" (callers typically render an empty state
 *                   instead — this function doesn't make that decision).
 * @param snapshot   Latest OBI BI Payroll snapshot. Pass `null` to get [].
 */
export function buildInactiveSummary(
  positions: Position[],
  snapshot: PayrollSnapshot | null,
): InactivePositionSummary[] {
  if (!snapshot) return [];

  const activeIds = new Set(positions.map(p => p.id));

  // Group OBI rows by normalized positionIdentifier, skipping those that are
  // still in the active roster.
  const groups = new Map<string, ObiPayrollRow[]>();
  for (const r of snapshot.rows) {
    const key = normalizePositionKey(r.positionIdentifier);
    if (!key) continue;            // skip rows with no position id
    if (activeIds.has(key)) continue; // active = not inactive
    let g = groups.get(key);
    if (!g) { g = []; groups.set(key, g); }
    g.push(r);
  }

  const summaries: InactivePositionSummary[] = [];

  for (const [positionId, rows] of groups) {
    // Find the "last known incumbent" — the personFullName + personNumber on
    // the row with the latest earningPeriodEnd. Ties: prefer rows with a
    // non-empty personFullName (skip earnings-only rows with blank name).
    let latestRow: ObiPayrollRow | null = null;
    for (const r of rows) {
      if (!r.personFullName) continue;
      if (!latestRow || r.earningPeriodEnd > latestRow.earningPeriodEnd) {
        latestRow = r;
      }
    }
    // Fall back to first row when every row had blank name (rare; can happen
    // for orphan-account-only spend like RPO on a position whose employee
    // record was already cleared upstream).
    if (!latestRow) latestRow = rows[0];

    // Pick any row's metadata as the display anchor — they're all the same
    // position so position/dept/job columns are identical across rows.
    const anchor = latestRow;

    // Aggregate the 5 buckets.
    let total = 0, regular = 0, overtime = 0, rpo = 0, premium = 0, tempLsp = 0;
    let lastPpe = '';
    for (const r of rows) {
      total += r.balanceAmount;
      const b = bucketOf(r.accountDescription);
      if (b === 'overtime') overtime += r.balanceAmount;
      else if (b === 'rpo') rpo += r.balanceAmount;
      else if (b === 'premium') premium += r.balanceAmount;
      else if (b === 'tempLsp') tempLsp += r.balanceAmount;
      else regular += r.balanceAmount;
      if (r.earningPeriodEnd > lastPpe) lastPpe = r.earningPeriodEnd;
    }

    summaries.push({
      positionId,
      displayNumber:     anchor.positionIdentifier,
      lastIncumbent:     latestRow.personFullName,
      lastEmplId:        latestRow.personNumber,
      jobCode:           anchor.jobCode,
      jobCodeSet:        anchor.jobCodeSet,
      jobDescription:    anchor.jobDescription,
      departmentCode:    anchor.departmentCode,
      departmentName:    anchor.departmentName,
      lastPpe,
      fiscalYear:        snapshot.fiscalYear,
      rowCount:          rows.length,
      total, regular, overtime, rpo, premium, tempLsp,
      reasonHint:        inferReason({ regular, overtime, rpo, premium, tempLsp }),
    });
  }

  // Biggest spend first.
  summaries.sort((a, b) => b.total - a.total);
  return summaries;
}
