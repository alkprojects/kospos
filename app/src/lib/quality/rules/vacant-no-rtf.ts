/**
 * QR-002: Vacant position in HCM has no RTF status and no expected fill date.
 *
 * Vacancies without an RTF are budget risk — no hiring plan means the position
 * may sit open indefinitely, or worse, be filled without going through the
 * standard process.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const vacantNoRtf: QualityRule = {
  id: 'QR-002',
  description: 'Vacant HCM position has no RTF status and no expected fill date',
  check(records: ImportedRow[]): Issue[] {
    return records
      .filter(r => r._source === 'ps-hcm-pp')
      .filter(r => !r.emplId && !r.rtfStatus && !r.rtfExpectedFillDate)
      .map(r => ({
        ruleId: 'QR-002',
        severity: 'warning' as const,
        message: `Vacant position ${r.positionNumber} (${r.jobCodeDescription || r.jobCode}) has no RTF status or expected fill date`,
        positionNumber: r.positionNumber,
        sourceRows: [r._row],
      }));
  },
};
