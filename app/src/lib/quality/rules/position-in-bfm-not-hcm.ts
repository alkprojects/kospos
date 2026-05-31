/**
 * QR-001: Position appears in BFM budget but has no matching record in PS HCM.
 *
 * A budgeted position that doesn't exist in HCM is either an input error or a
 * position that was eliminated in HCM but not removed from BFM — either way
 * it inflates the budget with phantom positions.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';
import { normalizePositionKey } from '../../chartfields/resolve';

export const positionInBfmNotHcm: QualityRule = {
  id: 'QR-001',
  description: 'Position in BFM budget has no matching record in PS HCM P&P',
  rationale:
    'A position appears in the BFM budget but has no matching PS HCM P&P record. Either the position was eliminated in HCM but never removed from BFM, or it is a keying error. Either way the budget carries a phantom position and overstates salary.',
  fix:
    'Confirm whether the position still exists. If it was eliminated, remove the BFM budget line; if it is genuinely new, ensure it is established in PS HCM.',
  citations: [
    { label: 'Cross-system reconciliation: BFM Position Budget vs PS HCM Position & Personnel' },
  ],
  sourceTabs: ['positions', 'data'],
  check(records: ImportedRow[]): Issue[] {
    const bfmPositions = records.filter(r => r._source === 'bfm-position');
    const hcmPositions = new Set(
      records
        .filter(r => r._source === 'ps-hcm-pp')
        .map(r => normalizePositionKey(r.positionNumber))
    );

    if (hcmPositions.size === 0) return []; // HCM not loaded yet — can't check

    return bfmPositions
      .filter(r => !hcmPositions.has(normalizePositionKey(r.positionNumber)))
      .map(r => ({
        ruleId: 'QR-001',
        severity: 'error' as const,
        message: `Position ${r.positionNumber} (${r.jobCodeDescription || r.jobCode}) exists in BFM but not in PS HCM`,
        positionNumber: r.positionNumber,
        sourceRows: [r._row],
      }));
  },
};
