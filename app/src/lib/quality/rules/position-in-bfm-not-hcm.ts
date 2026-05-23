/**
 * QR-001: Position appears in BFM budget but has no matching record in PS HCM.
 *
 * A budgeted position that doesn't exist in HCM is either an input error or a
 * position that was eliminated in HCM but not removed from BFM — either way
 * it inflates the budget with phantom positions.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const positionInBfmNotHcm: QualityRule = {
  id: 'QR-001',
  description: 'Position in BFM budget has no matching record in PS HCM P&P',
  check(records: ImportedRow[]): Issue[] {
    const bfmPositions = records.filter(r => r._source === 'bfm-position');
    const hcmPositions = new Set(
      records
        .filter(r => r._source === 'ps-hcm-pp')
        .map(r => r.positionNumber)
    );

    if (hcmPositions.size === 0) return []; // HCM not loaded yet — can't check

    return bfmPositions
      .filter(r => !hcmPositions.has(r.positionNumber))
      .map(r => ({
        ruleId: 'QR-001',
        severity: 'error' as const,
        message: `Position ${r.positionNumber} (${r.jobCodeDescription || r.jobCode}) exists in BFM but not in PS HCM`,
        positionNumber: r.positionNumber,
        sourceRows: [r._row],
      }));
  },
};
