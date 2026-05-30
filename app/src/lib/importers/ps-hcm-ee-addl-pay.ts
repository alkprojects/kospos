/**
 * PS HCM EE Additional Pay importer.
 *
 * Reads the `MRG_HR_EE_ADDL_PAY` PS HCM Query Manager export (the
 * "EE Additional Pay" tab in the labor report). 18 columns (A:R); each row is
 * one additional-pay assignment on one employee record.
 *
 * Column names verified against the real DBI export header list in
 * docs/data-sources/reports-folder-inventory.md § PS HCM exports. The two
 * rate codes the labor report audits are `ACTFLT` (acting pay) and `SUPFLT`
 * (supervisory pay) — see docs/domain/labor-report-tabs.md § Tab 9.
 *
 * The full-fidelity raw row is `PsHcmEeAddlPayRow` (in ./types.ts). The
 * downstream `lib/additional-pay/` entity layer turns these rows into typed
 * `AdditionalPay` entities and runs the dual-entry / supervisory-owed checks.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { PsHcmEeAddlPayRow } from './types';
import { num, str, iso, makeColLookup } from './cells';

export function importPsHcmEeAddlPay(ws: WorkSheet, headerRow = 0): PsHcmEeAddlPayRow[] {
  const rows = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => str(h).toLowerCase());
  const col = makeColLookup(headers);

  const iDept       = col('department');
  const iDeptTitle  = col('dept title');
  const iEmplId     = col('emplid');
  const iEmplRec    = col('empl record');
  const iEffDate    = col('eff date');
  const iLast       = col('last');
  const iFirst      = col('first name');
  const iMiddle     = col('middle');
  const iPreferred  = col('preferred first');
  const iRoster     = col('roster code');
  const iRosterDesc = col('roster code descr');
  const iPayStatus  = col('pay status');
  const iJobCode    = col('job code');
  const iUnion      = col('union code');
  const iSalPlan    = col('sal plan');
  const iStep       = col('step');
  const iAddlPay    = col('addl pay');
  const iRateCode   = col('rate code');

  const get = (row: unknown[], idx: number): unknown => (idx >= 0 ? row[idx] : '');

  const results: PsHcmEeAddlPayRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const emplId = str(get(r, iEmplId));
    if (!emplId) continue;

    results.push({
      _source:             'ps-hcm-ee-addl-pay',
      departmentGroupCode: str(get(r, iDept)),
      departmentTitle:     str(get(r, iDeptTitle)),
      emplId,
      emplRecord:          num(get(r, iEmplRec)),
      effectiveDate:       iso(get(r, iEffDate)),
      lastName:            str(get(r, iLast)),
      firstName:           str(get(r, iFirst)),
      middleName:          str(get(r, iMiddle)),
      preferredFirstName:  str(get(r, iPreferred)),
      rosterCode:          str(get(r, iRoster)),
      rosterDescription:   str(get(r, iRosterDesc)),
      payStatus:           str(get(r, iPayStatus)),
      jobCode:             str(get(r, iJobCode)),
      unionCode:           str(get(r, iUnion)),
      salaryPlan:          str(get(r, iSalPlan)),
      step:                str(get(r, iStep)),
      additionalPayAmount: num(get(r, iAddlPay)),
      rateCode:            str(get(r, iRateCode)),
      _row:                headerRow + i + 1,
    });
  }

  return results;
}
