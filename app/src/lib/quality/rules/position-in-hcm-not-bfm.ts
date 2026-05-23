/**
 * QR-005: Active position in PS HCM has no corresponding BFM budget line.
 *
 * An active, filled position with no budget entry means either the position
 * is being funded from a different account than expected, or BFM was never
 * updated when the position was created in HCM.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const positionInHcmNotBfm: QualityRule = {
  id: 'QR-005',
  description: 'Active filled HCM position has no matching BFM budget line',
  check(records: ImportedRow[]): Issue[] {
    const bfmPositions = new Set(
      records
        .filter(r => r._source === 'bfm-position')
        .map(r => r.positionNumber)
    );

    if (bfmPositions.size === 0) return [];

    return records
      .filter(r => r._source === 'ps-hcm-pp')
      .filter(r => r.emplId && r.positionStatus === 'A') // filled & active
      .filter(r => !bfmPositions.has(r.positionNumber))
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
