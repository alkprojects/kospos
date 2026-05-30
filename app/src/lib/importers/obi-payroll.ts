/**
 * OBI BI Payroll report importer.
 *
 * Per-pay-period rows — NOT a YTD summary.
 * Each row = one position × one earning code × one pay period.
 * 39 transactional columns; col AM is a trailing blank ignored at import time.
 *
 * Column names match real DBI exports (May 2026). Full column inventory:
 * see docs/domain/labor-report.md § Tab 7 — BI Payroll.
 *
 * See docs/DECISIONS.md ADR-007 (provisional column list is being amended in
 * Phase 2.4 to match the 39-column transactional shape captured here).
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { ObiPayrollRow } from './types';
import { num, str, iso, makeColLookup } from './cells';

/**
 * Splits the OBI AE column ("Job Code") into its citywide-set prefix and the
 * 4-digit SF job code. Format observed: `"COMMN:5380"`. KosPos stores the
 * 4-digit code as the join key and preserves the set as metadata per the
 * Tab 7 improvement #5 design.
 */
function splitJobCode(raw: string): { jobCode: string; jobCodeSet: string } {
  if (!raw) return { jobCode: '', jobCodeSet: '' };
  const i = raw.indexOf(':');
  if (i < 0) return { jobCode: raw, jobCodeSet: '' };
  return { jobCode: raw.slice(i + 1).trim(), jobCodeSet: raw.slice(0, i).trim() };
}

export function importObiPayroll(ws: WorkSheet, headerRow = 0): ObiPayrollRow[] {
  const rows = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => str(h).toLowerCase());
  const col = makeColLookup(headers);

  // Fiscal year + dept group
  const iFY                = col('fiscal year');
  const iDeptGroup         = col('department group code');

  // Fund hierarchy
  const iFundLvl1Code      = col('fund lvl 1 code');
  const iFundLvl1Desc      = col('fund lvl 1 desc');
  const iFundControl       = col('fund control');
  const iFund              = col('fund code');
  const iFundDesc          = col('fund description');

  // Department
  const iDept              = col('department code');
  const iDeptName          = col('department description');
  // Backward-compat fallback: older importer / tests used "Department"
  const iDeptLegacy        = iDept >= 0 ? -1 : col('department');

  // Project / Activity / Authority
  const iProject           = col('project code');
  const iProjectDesc       = col('project description');
  const iActivity          = col('activity code');
  const iActivityDesc      = col('activity description');
  const iAuthLvl1          = col('authority lvl 1 code');
  const iAuthLvl1Desc      = col('authority lvl 1 description');
  const iAuth              = col('authority code');
  const iAuthDesc          = col('authority description');

  // Account
  const iAcctLvl2Desc      = col('account lvl 2 description');
  const iAcctLvl5Name      = col('account lvl 5 name');
  const iAcctLvl3Desc      = col('account lvl 3 description');
  // Real export header is "Account Code"; older test fixture used "Account"
  const iAcctCode          = col('account code');
  const iAcctCodeLegacy    = iAcctCode >= 0 ? -1 : col('account');
  const iAcctDesc          = col('account description');

  // Earning period
  const iPeriodNum         = col('earning period number');
  const iPeriodEnd         = col('earning period end date');

  // Person
  const iPerson            = col('person number');
  const iName              = col('person full name');

  // Roster
  const iRoster            = col('roster code');

  // Earnings
  const iEarnCode          = col('earnings code');
  const iEarnDesc          = col('earnings code description');

  // Position + Job
  const iPos               = col('position identifier');
  const iJC                = col('job code');
  const iJCDesc            = col('job description');

  // Assignment
  const iAssignment        = col('assignment number');
  const iAppt              = col('hr assignment appointment type');

  // Hours / FTE / Amount
  const iIsFte             = col('is fte hours');
  const iEarnHours         = col('earning hours');
  const iFte               = col('pay period fte');
  const iBalance           = col('balance amount');

  // First pass: parse rows, also tracking MAX(earningPeriodEnd) for asOfDate.
  const parsed: ObiPayrollRow[] = [];
  let asOfDate = '';

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const posId = str(r[iPos]);
    if (!posId) continue;

    const rawJC = str(r[iJC]);
    const { jobCode, jobCodeSet } = splitJobCode(rawJC);

    // Earning Period End Date — coerce Excel serials to ISO so downstream
    // PP-range filters compare ISO-against-ISO and the summary header doesn't
    // surface `46150`. See `iso()` JSDoc for the failure mode this fixes.
    const periodEnd = iso(r[iPeriodEnd]);
    if (periodEnd > asOfDate) asOfDate = periodEnd;

    const deptCode = iDept >= 0
      ? str(r[iDept])
      : iDeptLegacy >= 0 ? str(r[iDeptLegacy]) : '';
    const acctCode = iAcctCode >= 0
      ? str(r[iAcctCode])
      : iAcctCodeLegacy >= 0 ? str(r[iAcctCodeLegacy]) : '';

    parsed.push({
      _source:                 'obi-payroll',

      fiscalYear:              str(r[iFY]),
      departmentGroupCode:     str(r[iDeptGroup]),

      fundLvl1Code:            str(r[iFundLvl1Code]),
      fundLvl1Description:     str(r[iFundLvl1Desc]),
      fundControl:             str(r[iFundControl]),
      fund:                    str(r[iFund]),
      fundDescription:         str(r[iFundDesc]),

      departmentCode:          deptCode,
      departmentName:          str(r[iDeptName]),

      projectCode:             str(r[iProject]),
      projectDescription:      str(r[iProjectDesc]),
      activityCode:            str(r[iActivity]),
      activityDescription:     str(r[iActivityDesc]),
      authorityLvl1Code:       str(r[iAuthLvl1]),
      authorityLvl1Description: str(r[iAuthLvl1Desc]),
      authority:               str(r[iAuth]),
      authorityDescription:    str(r[iAuthDesc]),

      accountLvl2Description:  str(r[iAcctLvl2Desc]),
      accountLvl5Name:         str(r[iAcctLvl5Name]),
      accountLvl3Description:  str(r[iAcctLvl3Desc]),
      accountCode:             acctCode,
      accountDescription:      str(r[iAcctDesc]),

      earningPeriodNumber:     num(r[iPeriodNum]),
      earningPeriodEnd:        periodEnd,

      personNumber:            str(r[iPerson]),
      personFullName:          str(r[iName]),

      rosterCode:              str(r[iRoster]),

      earningsCode:            str(r[iEarnCode]),
      earningsDescription:     str(r[iEarnDesc]),

      positionIdentifier:      posId,
      jobCode,
      jobCodeSet,
      jobDescription:          str(r[iJCDesc]),

      assignmentNumber:        num(r[iAssignment]),
      appointmentType:         str(r[iAppt]),

      isFteHours:              str(r[iIsFte]),
      earningHours:            num(r[iEarnHours]),
      payPeriodFTE:            num(r[iFte]),
      balanceAmount:           num(r[iBalance]),

      _asOfDate:               '', // filled in second pass
      _row:                    headerRow + i + 1,
    });
  }

  // Second pass: stamp every row with the per-import-call MAX(earningPeriodEnd).
  for (const row of parsed) row._asOfDate = asOfDate;

  return parsed;
}
