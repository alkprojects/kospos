/**
 * QR-005: Active position in PS HCM has no corresponding BFM budget line.
 *
 * An active, filled position with no budget entry means either the position
 * is being funded from a different account than expected, or BFM was never
 * updated when the position was created in HCM.
 *
 * Uses Position Fill Status = "FILLED" as the fill indicator (more reliable
 * than Employee ID presence, which can be empty for acting arrangements).
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';
import { normalizePositionKey } from '../../chartfields/resolve';

export const positionInHcmNotBfm: QualityRule = {
  id: 'QR-005',
  description: 'Active filled HCM position has no matching BFM budget line',
  rationale:
    'A filled, active PS HCM position has no matching BFM budget line. The person is working but the position is not budgeted here, so either it is funded from a different account than expected, or BFM was never updated when the position was created.',
  fix:
    'Locate the funding source. If it should be budgeted here, add the BFM line; if it is funded elsewhere, confirm the correct chartfield.',
  citations: [
    { label: 'Cross-system reconciliation: PS HCM Position Fill Status = FILLED with no BFM budget line' },
  ],
  sourceTabs: ['positions', 'data'],
  check(records: ImportedRow[]): Issue[] {
    const bfmPositions = new Set(
      records
        .filter(r => r._source === 'bfm-position')
        .map(r => normalizePositionKey(r.positionNumber))
    );

    if (bfmPositions.size === 0) return [];

    return records
      .filter(r => r._source === 'ps-hcm-pp')
      .filter(r => r.fillStatus === 'FILLED')
      .filter(r => !bfmPositions.has(normalizePositionKey(r.positionNumber)))
      .map(r => ({
        ruleId: 'QR-005',
        severity: 'warning' as const,
        message: `Position ${r.positionNumber} (${r.employeeName || 'filled'}) is active in HCM but has no BFM budget line`,
        positionNumber: r.positionNumber,
        emplId: r.emplId,
        sourceRows: [r._row],
      }));
  },
};
