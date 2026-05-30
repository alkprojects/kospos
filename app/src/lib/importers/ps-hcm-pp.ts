/**
 * PS HCM Position & Personnel (P&P) Data importer.
 *
 * Reads OBI "Active Labor" CSV / labor-report "P&P Data" sheet.
 * Column names verified against real DBI exports (May 2026).
 * Source covers 88 OBI columns (A:CJ); this importer extracts the subset
 * KosPos's spine model needs — identity, classification, the three
 * department fields (effective / budgeted / combo), Cat 17/18 tracking,
 * RTF, roster, vice / previous-employee, and manager linkage. See
 * docs/domain/labor-report.md § Tab 6 — P&P Data for the full column map.
 *
 * The full-fidelity raw row representation is `PsHcmPpRow` (in ./types.ts).
 * The downstream `lib/positions/` entity layer consumes these rows + the
 * dept-tree reference to build `Position` entities (which are what views
 * render).
 *
 * See docs/DECISIONS.md ADR-006.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { PsHcmPpRow } from './types';
import { num, str, makeColLookup } from './cells';

export function importPsHcmPp(ws: WorkSheet, headerRow = 0): PsHcmPpRow[] {
  const rows = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => str(h).toLowerCase());
  const col = makeColLookup(headers);

  // Identity (A:N)
  const iSnapshot   = col('snapshot date');
  const iPos        = col('position number');
  const iJC         = col('position job code');
  const iJCDesc     = col('position description');
  const iPosStatus  = col('position status');
  const iPosDiv     = col('position division');
  const iDept       = col('position department id');
  const iDeptName   = col('position department description');
  const iMaxHC      = col('position max headcount');
  const iFillStatus = col('position fill status');
  // Vice / acting (O:V)
  const iVice1Id    = col('employee id vice 1');
  const iVice1Name  = col('employee name vice 1');
  const iPrevEmp    = col('previous employee');
  const iUsedFor     = col('position used for');
  const iUsedForDesc = col('position used for description');
  // Person / incumbent (W:AC)
  const iEmplId     = col('current employee id');
  const iEmpStatus  = col('employee status');
  const iName       = col('person full name');
  // Classification / compensation (AD:AJ)
  const iEmpJC      = col('employee job code');
  const iAppt       = col('employee appointment type');
  const iExempt     = col('ee exempt category description');
  const iStep       = col('employee step');
  const iHourly     = col('employee hourly rate');
  const iMerit      = col('employee merit increase date');
  // Reporting line (AK:AN)
  const iRptsTo     = col('position reports to');
  const iMgrFirst   = col('manager first name');
  const iMgrLast    = col('manager last name');
  // Cat 17/18 tracking (AV:AY)
  const iCat1718Appt = col('cat_17_18 appointment date');
  const iCat1718Code = col('cat_17_18 exempt code');
  const iCat1718Mos  = col('cat_17_18 exempt months');
  const iCat1718Exp  = col('cat_17_18 exempt tx expired date');
  // Roster (AZ:BA)
  const iRoster     = col('roster code');
  const iRosterDesc = col('roster code description');
  // Combo (BB:BE) — full combo expansion lives in chartfields/resolve.ts
  const iCombo      = col('combo code');
  const iComboDept  = col('combo cd deptid');
  const iComboDeptN = col('combo cd dept description');
  // RTF (BI:BN)
  const iRtfId      = col('latest rtf id');
  const iRtfSubmit  = col('rtf submitted date');
  const iRtfStatus  = col('rtf status');
  const iRtfDate    = col('rtf expected fill date');
  // Budget (BR, BU, CB, CC)
  const iFte        = col('budget position total fte');
  const iBudgetJC   = col('budget job code 1');
  const iBudgetDept = col('budget department code 1');
  const iBudgetDeptN = col('budget department description 1');
  // Vacancy tracking (CI)
  const iVacantDate = col('vacant date');

  const get = (row: unknown[], idx: number): unknown => (idx >= 0 ? row[idx] : '');

  const results: PsHcmPpRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const posNum = str(get(r, iPos));
    if (!posNum) continue;

    results.push({
      _source: 'ps-hcm-pp',
      snapshotDate:           str(get(r, iSnapshot)),
      positionNumber:         posNum,
      jobCode:                str(get(r, iJC)),
      jobCodeDescription:     str(get(r, iJCDesc)),
      positionDivision:       str(get(r, iPosDiv)),
      departmentCode:         str(get(r, iDept)),
      departmentName:         str(get(r, iDeptName)),
      positionMaxHeadcount:   num(get(r, iMaxHC)),
      positionStatus:         str(get(r, iPosStatus)),
      fillStatus:             str(get(r, iFillStatus)),
      vice1EmplId:            str(get(r, iVice1Id)),
      vice1Name:              str(get(r, iVice1Name)),
      previousEmployee:       str(get(r, iPrevEmp)),
      positionUsedFor:            str(get(r, iUsedFor)),
      positionUsedForDescription: str(get(r, iUsedForDesc)),
      emplId:                 str(get(r, iEmplId)),
      employeeName:           str(get(r, iName)),
      employeeStatus:         str(get(r, iEmpStatus)),
      appointmentType:        str(get(r, iAppt)),
      exemptCategory:         str(get(r, iExempt)),
      salaryStep:             str(get(r, iStep)),
      hourlyRate:             num(get(r, iHourly)),
      meritIncreaseDate:      str(get(r, iMerit)),
      reportsToPosition:      str(get(r, iRptsTo)),
      managerFirstName:       str(get(r, iMgrFirst)),
      managerLastName:        str(get(r, iMgrLast)),
      cat1718AppointmentDate: str(get(r, iCat1718Appt)),
      cat1718ExemptCode:      str(get(r, iCat1718Code)),
      cat1718ExemptMonths:    num(get(r, iCat1718Mos)),
      cat1718TxExpiredDate:   str(get(r, iCat1718Exp)),
      rosterCode:             str(get(r, iRoster)),
      rosterDescription:      str(get(r, iRosterDesc)),
      comboCode:              str(get(r, iCombo)),
      comboDepartmentCode:    str(get(r, iComboDept)),
      comboDepartmentName:    str(get(r, iComboDeptN)),
      rtfId:                  str(get(r, iRtfId)),
      rtfSubmittedDate:       str(get(r, iRtfSubmit)),
      rtfStatus:              str(get(r, iRtfStatus)),
      rtfExpectedFillDate:    str(get(r, iRtfDate)),
      budgetDepartmentCode:   str(get(r, iBudgetDept)),
      budgetDepartmentName:   str(get(r, iBudgetDeptN)),
      budgetJobCode:          str(get(r, iBudgetJC)),
      fte:                    num(get(r, iFte)),
      employeeJobCode:        str(get(r, iEmpJC)),
      vacantDate:             str(get(r, iVacantDate)),
      _row:                   headerRow + i + 1,
    });
  }

  return results;
}
