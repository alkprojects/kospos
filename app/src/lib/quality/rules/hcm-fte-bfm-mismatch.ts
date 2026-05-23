/**
 * QR-004: FTE in PS HCM differs from FTE in BFM for the same position.
 *
 * BFM budgets by FTE. If HCM has a different FTE than BFM, the budget and
 * actual headcount are out of sync — usually a data-entry error in one system.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const hcmFteBfmMismatch: QualityRule = {
  id: 'QR-004',
  description: 'FTE in PS HCM does not match FTE in BFM for the same position',
  check(records: ImportedRow[]): Issue[] {
    const bfmFte = new Map<string, { fte: number; row: number }>();
    for (const r of records) {
      if (r._source === 'bfm-position') {
        bfmFte.set(r.positionNumber, { fte: r.fte, row: r._row });
      }
    }

    if (bfmFte.size === 0) return [];

    const issues: Issue[] = [];
    for (const r of records) {
      if (r._source !== 'ps-hcm-pp') continue;
      const bfm = bfmFte.get(r.positionNumber);
      if (!bfm) continue;
      if (Math.abs(r.fte - bfm.fte) > 0.001) {
        issues.push({
          ruleId: 'QR-004',
          severity: 'warning',
          message: `Position ${r.positionNumber}: HCM FTE=${r.fte} but BFM FTE=${bfm.fte}`,
          positionNumber: r.positionNumber,
          sourceRows: [r._row, bfm.row],
        });
      }
    }
    return issues;
  },
};
