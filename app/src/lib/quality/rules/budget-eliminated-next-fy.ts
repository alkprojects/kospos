/**
 * QR-014: A FILLED position is eliminated in next year's budget (0 FTE).
 *
 * Cross-system join of PS HCM (who is filled) with BFM (next fiscal year's
 * budget FTE). When a position is currently FILLED but its NEXT fiscal year's
 * budget gives it 0 FTE, the position is being eliminated and the incumbent
 * needs a placement / reassignment plan before the new fiscal year starts.
 *
 * "Next FY" is computed from today's date — SF fiscal years run Jul 1 → Jun 30 —
 * and never hardcoded (working agreement #4). The BFM eturn only carries the
 * BY+1 (next-FY) budget columns once the December budget-development reports are
 * loaded, so this rule produces ZERO findings until then.
 *
 * Next-FY FTE = the FTE of the most-advanced budget phase present for that FY
 * (the latest budget decision wins), mirroring how the importer resolves a
 * layer. A position absent from the next-FY columns is "not yet budgeted", not
 * "eliminated", and is skipped.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow, BfmBudgetLayers, BfmBudgetPhase } from '../../importers/types';
import { normalizePositionKey } from '../../chartfields/resolve';

/**
 * Start calendar year of the SF fiscal year a date falls in. The fiscal year
 * starts July 1, so a date in Jul–Dec belongs to FY(thisYear)-(thisYear+1) and
 * a date in Jan–Jun belongs to FY(thisYear-1)-(thisYear). Exported for tests.
 */
export function fiscalYearStartYear(asOf: Date): number {
  // getMonth() is 0-indexed; July = 6.
  return asOf.getMonth() >= 6 ? asOf.getFullYear() : asOf.getFullYear() - 1;
}

/** "FY YYYY-YY" label for a fiscal year given its start calendar year. */
export function fiscalYearLabel(startYear: number): string {
  const end = String((startYear + 1) % 100).padStart(2, '0');
  return `FY ${startYear}-${end}`;
}

/** The "FY YYYY-YY" label for the fiscal year AFTER the one `asOf` falls in. */
export function nextFiscalYearLabel(asOf: Date): string {
  return fiscalYearLabel(fiscalYearStartYear(asOf) + 1);
}

/** Most-advanced budget phase first — the latest decision wins. Mirrors the
 *  ordering the BFM importer uses to resolve a position's adopted layer. */
const PHASE_ORDER: readonly BfmBudgetPhase[] = [
  'Board', 'TechnicalAdjustment', 'Committee', 'Mayor', 'Department', 'Base', 'Original',
];

/** FTE of the most-advanced phase present in a FY's layers, or `null` when the
 *  FY carries no layer at all. */
function adoptedFte(layers: BfmBudgetLayers | undefined): number | null {
  if (!layers) return null;
  for (const phase of PHASE_ORDER) {
    const layer = layers[phase];
    if (layer) return layer.fte;
  }
  return null;
}

export const budgetEliminatedNextFy: QualityRule = {
  id: 'QR-014',
  description: 'Filled position is eliminated in next year’s budget (0 FTE)',
  rationale:
    'A position that is currently FILLED in PS HCM but carries 0 FTE in next fiscal year’s BFM budget is being eliminated. The incumbent needs a placement or reassignment plan before the new fiscal year. Next FY is read from the BFM budget-development (BY+1) columns, which load in December — until then this produces no findings.',
  fix:
    'Confirm the elimination is intended and plan the incumbent’s placement (reassignment, bumping, or separation). If the 0 FTE is a data-entry error, correct the BFM line. Use “mark not an error” once the plan is recorded.',
  citations: [
    { label: 'Cross-system: PS HCM Fill Status = FILLED with BFM next-FY budget FTE = 0' },
  ],
  sourceTabs: ['positions', 'data'],
  check(records: ImportedRow[]): Issue[] {
    const nextFy = nextFiscalYearLabel(new Date());

    // Next-FY FTE for each BFM position, keyed by normalized position number.
    // A position can appear on multiple BFM lines (split funding); keep the MAX
    // next-FY FTE so a single funded line keeps it off the eliminated list.
    const nextFyFteByKey = new Map<string, number>();
    for (const r of records) {
      if (r._source !== 'bfm-position') continue;
      const fte = adoptedFte(r.budgetByFy[nextFy]);
      if (fte === null) continue; // not budgeted next FY at all → skip
      const key = normalizePositionKey(r.positionNumber);
      const prev = nextFyFteByKey.get(key);
      if (prev === undefined || fte > prev) nextFyFteByKey.set(key, fte);
    }
    if (nextFyFteByKey.size === 0) return []; // no BY+1 columns loaded yet

    const issues: Issue[] = [];
    for (const r of records) {
      if (r._source !== 'ps-hcm-pp') continue;
      if (r.fillStatus !== 'FILLED') continue;
      const fte = nextFyFteByKey.get(normalizePositionKey(r.positionNumber));
      if (fte === undefined || fte !== 0) continue;
      issues.push({
        ruleId: 'QR-014',
        severity: 'warning',
        message:
          `Position ${r.positionNumber} (${r.employeeName || 'filled'}) is filled but has 0 FTE in the ` +
          `${nextFy} budget — the position is being eliminated next fiscal year. Plan the incumbent’s placement.`,
        positionNumber: r.positionNumber,
        emplId: r.emplId || undefined,
        sourceRows: [r._row],
      });
    }
    return issues;
  },
};
