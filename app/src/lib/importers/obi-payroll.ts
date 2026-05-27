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

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

/**
 * Coerce an "Earning Period End Date" cell value to ISO `YYYY-MM-DD`.
 *
 * The OBI .xlsx export stores this column as an Excel date serial (a number
 * like 46150 — days since the Excel epoch). SheetJS's default `sheet_to_json`
 * surfaces that as a raw number, which `String(...)` would render as `"46150"`.
 * That string then flows downstream into:
 *   - `_asOfDate` (which the Payroll summary header displays raw)
 *   - PP-range filter comparisons in `lib/views/labor/aggregate.ts`, which
 *     compare `earningPeriodEnd` lexicographically against ISO date strings —
 *     a serial-vs-ISO mismatch silently drops every row.
 *
 * This converter handles:
 *   - numeric Excel serial (most common case for .xlsx)
 *   - JS Date object (in case `cellDates: true` is ever passed at `read()` time)
 *   - already-ISO string (CSV exports, or anything containing `-` / `/`)
 *   - empty / null cells (returns `''`)
 *
 * Returns ISO `YYYY-MM-DD` slice of the UTC date so it sorts and compares
 * lexicographically as expected by the downstream PP-range filter.
 */
function iso(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'number') {
    if (!isFinite(v) || v <= 0) return '';
    // Excel epoch is 1899-12-30 (offset 25569 days to the JS 1970-01-01 epoch
    // — that offset already accounts for Excel's spurious 1900 leap day).
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (s === '') return '';
  // If the string looks like a date already (contains a separator), pass through.
  if (/[-/]/.test(s)) return s;
  // Otherwise try parsing as a numeric serial.
  const n = Number(s);
  if (!isNaN(n) && isFinite(n) && n > 0) return iso(n);
  return s;
}

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
  const col = (name: string) => headers.indexOf(name.toLowerCase());

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
