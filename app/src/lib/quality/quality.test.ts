import { describe, it, expect } from 'vitest';
import type { ImportedRow } from '../importers/types';
import type { BfmPositionRow, PsHcmPpRow, ObiPayrollRow, PsHcmEeAddlPayRow } from '../importers/types';
import { positionInBfmNotHcm } from './rules/position-in-bfm-not-hcm';
import { payrollExceedsBudget } from './rules/payroll-exceeds-budget';
import { positionInHcmNotBfm } from './rules/position-in-hcm-not-bfm';
import { additionalPayOrphan } from './rules/additional-pay-orphan';
import { additionalPayActingSupervisoryConflict } from './rules/additional-pay-acting-supervisory-conflict';
import { findSupervisoryOwed } from './rules/additional-pay-supervisory-owed';
import { additionalPayActingOverlap } from './rules/additional-pay-acting-overlap';
import { positionDeptNotBudgetDept } from './rules/position-dept-not-budget-dept';
import { payrollWithoutBudgetedPosition } from './rules/payroll-without-budgeted-position';
import { ALL_RULES } from './index';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function bfmPos(overrides: Partial<BfmPositionRow> = {}): BfmPositionRow {
  return {
    _source: 'bfm-position',
    positionNumber:      '10001',
    priorPositionNumber: '10001',
    positionCode:        '',
    priorPositionCode:   '',
    formId:              '',
    deptGroup:           'DBI',
    division:            '',
    divisionTitle:       '',
    section:             '',
    sectionTitle:        '',
    gfsType:             'NGFS',
    departmentCode:      'DBI',
    departmentName:      'Dept of Building Inspection',
    fund:                '1GAGF',
    fundTitle:           '',
    authority:           'AUTH1',
    authorityTitle:      '',
    project:             '',
    projectTitle:        '',
    activity:            '',
    activityTitle:       '',
    accountLvl5Title:    '',
    agencyUse:           '',
    agencyUseTitle:      '',
    jobCode:             '6278_C',
    jobCodeDescription:  'Building Inspector',
    jobClassTier:        '',
    empOrg:              '21',
    empOrgTitle:         '',
    retIndicator:        '1',
    positionStatus:      'A',
    action:              '',
    fiscalYearStart:     '2027',
    ppdStart:            '',
    fiscalYearEnd:       '',
    ppdEnd:              '',
    budgetByFy:          { 'FY 2026-27': { Mayor: { fte: 1, dollars: 110000 } } },
    defaultFiscalYear:   'FY 2026-27',
    defaultPhase:        'Mayor',
    fte:                 1,
    budgetedSalary:      110000,
    budgetPhaseColumn:   'FY 2026-27 Mayor FTE',
    _row:                2,
    ...overrides,
  };
}

function hcmPos(overrides: Partial<PsHcmPpRow> = {}): PsHcmPpRow {
  return {
    _source: 'ps-hcm-pp',
    snapshotDate:           '2024-08-30',
    positionNumber:         '10001',
    jobCode:                '6278',
    jobCodeDescription:     'Building Inspector',
    positionDivision:       '',
    departmentCode:         'DBI',
    departmentName:         'Dept of Building Inspection',
    positionMaxHeadcount:   1,
    positionStatus:         'Approved',
    fillStatus:             'FILLED',
    vice1EmplId:            '',
    vice1Name:              '',
    previousEmployee:       '',
    positionUsedFor:            '',
    positionUsedForDescription: '',
    emplId:                 'E12345',
    employeeName:           'Smith, Jane',
    employeeStatus:         'A',
    appointmentType:        'PCS',
    exemptCategory:         '',
    salaryStep:             '5',
    hourlyRate:             63.46,
    meritIncreaseDate:      '',
    reportsToPosition:      '09000',
    managerFirstName:       '',
    managerLastName:        '',
    cat1718AppointmentDate: '',
    cat1718ExemptCode:      '',
    cat1718ExemptMonths:    0,
    cat1718TxExpiredDate:   '',
    rosterCode:             '21',
    rosterDescription:      'SEIU 1021',
    comboCode:              'C1234',
    comboDepartmentCode:    '',
    comboDepartmentName:    '',
    rtfId:                  '',
    rtfSubmittedDate:       '',
    rtfStatus:              '',
    rtfExpectedFillDate:    '',
    budgetDepartmentCode:   '',
    budgetDepartmentName:   '',
    budgetJobCode:          '',
    fte:                    1,
    employeeJobCode:        '6278',
    vacantDate:             '',
    _row:                   2,
    ...overrides,
  };
}

function obiRow(overrides: Partial<ObiPayrollRow> = {}): ObiPayrollRow {
  return {
    _source: 'obi-payroll',
    fiscalYear:               'FY2024',
    departmentGroupCode:      'DBI',
    fundLvl1Code:             '',
    fundLvl1Description:      '',
    fundControl:              '',
    fund:                     '1GAGF',
    fundDescription:          '',
    departmentCode:           'DBI',
    departmentName:           'Dept of Building Inspection',
    projectCode:              '',
    projectDescription:       '',
    activityCode:             '',
    activityDescription:      '',
    authorityLvl1Code:        '',
    authorityLvl1Description: '',
    authority:                'AUTH1',
    authorityDescription:     '',
    accountLvl2Description:   '',
    accountLvl5Name:          '',
    accountLvl3Description:   '',
    accountCode:              '501010',
    accountDescription:       '',
    earningPeriodNumber:      15,
    earningPeriodEnd:         '2024-01-26',
    personNumber:             '12345',
    personFullName:           'Smith, Jane',
    rosterCode:               '',
    earningsCode:             'WKP',
    earningsDescription:      'Regular Biweekly Pay',
    positionIdentifier:       '10001',
    jobCode:                  '6278',
    jobCodeSet:               'COMMN',
    jobDescription:           'Building Inspector',
    assignmentNumber:         0,
    appointmentType:          'PCS',
    isFteHours:               'Y',
    earningHours:             80,
    payPeriodFTE:             1,
    balanceAmount:            4846.15,
    _asOfDate:                '2024-01-26',
    _row:                     2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// QR-001: position in BFM not HCM
// ---------------------------------------------------------------------------

describe('QR-001 positionInBfmNotHcm', () => {
  it('fires when BFM position has no HCM match', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '10001' }),
      hcmPos({ positionNumber: '10999' }),
    ];
    const issues = positionInBfmNotHcm.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].positionNumber).toBe('10001');
    expect(issues[0].ruleId).toBe('QR-001');
  });

  it('does not fire when every BFM position has an HCM match', () => {
    const records: ImportedRow[] = [bfmPos(), hcmPos()];
    expect(positionInBfmNotHcm.check(records)).toHaveLength(0);
  });

  it('does not fire when HCM data is not loaded', () => {
    const records: ImportedRow[] = [bfmPos()];
    expect(positionInBfmNotHcm.check(records)).toHaveLength(0);
  });

  // Regression (S58): BFM keeps zero-padded position numbers ("00304335") while
  // PS HCM stores them numerically ("304335"). Joining on the normalized key
  // means the same logical position is recognized, not flagged as missing.
  it('treats a zero-padded BFM number and an unpadded HCM number as the same position', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '00304335' }),
      hcmPos({ positionNumber: '304335' }),
    ];
    expect(positionInBfmNotHcm.check(records)).toHaveLength(0);
  });

  it('keeps the original padded BFM form in the message when genuinely absent from HCM', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '00304335' }),
      hcmPos({ positionNumber: '10999' }),
    ];
    const issues = positionInBfmNotHcm.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].positionNumber).toBe('00304335');
  });
});

// ---------------------------------------------------------------------------
// QR-003: payroll exceeds budget
// ---------------------------------------------------------------------------

describe('QR-003 payrollExceedsBudget', () => {
  it('fires when summed balance amounts exceed budget by more than 5%', () => {
    const records: ImportedRow[] = [
      bfmPos({ budgetedSalary: 100000 }),
      // Two periods totalling 106000 — 6% over
      obiRow({ balanceAmount: 53000, earningPeriodNumber: 1 }),
      obiRow({ balanceAmount: 53000, earningPeriodNumber: 2, _row: 3 }),
    ];
    const issues = payrollExceedsBudget.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-003');
  });

  it('does not fire when total is within 5% buffer', () => {
    const records: ImportedRow[] = [
      bfmPos({ budgetedSalary: 100000 }),
      obiRow({ balanceAmount: 104000 }),
    ];
    expect(payrollExceedsBudget.check(records)).toHaveLength(0);
  });

  it('does not fire when BFM data is not loaded', () => {
    const records: ImportedRow[] = [obiRow({ balanceAmount: 200000 })];
    expect(payrollExceedsBudget.check(records)).toHaveLength(0);
  });

  // Regression (S58): before normalization a zero-padded BFM key would miss the
  // unpadded OBI identifier and the over-budget would be SILENTLY skipped.
  it('joins OBI spend to a zero-padded BFM budget so an overage is not missed', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '00010001', budgetedSalary: 100000 }),
      obiRow({ positionIdentifier: '10001', balanceAmount: 106000 }),
    ];
    const issues = payrollExceedsBudget.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].positionNumber).toBe('10001'); // original OBI form preserved
  });

  // S58: only base salary (WKP) counts toward the budget comparison; premiums /
  // overtime are excluded so it is a base-to-base check.
  it('excludes non-base earnings (overtime) from the budget comparison', () => {
    const records: ImportedRow[] = [
      bfmPos({ budgetedSalary: 100000 }),
      obiRow({ earningsCode: 'WKP', balanceAmount: 90000 }),           // base — within budget
      obiRow({ earningsCode: 'OTP', balanceAmount: 60000, _row: 3 }),  // overtime — must NOT count
    ];
    expect(payrollExceedsBudget.check(records)).toHaveLength(0);
  });

  it('flags when base salary (WKP) alone exceeds budget, ignoring premium padding', () => {
    const records: ImportedRow[] = [
      bfmPos({ budgetedSalary: 100000 }),
      obiRow({ earningsCode: 'WKP', balanceAmount: 106000 }),          // base over budget
      obiRow({ earningsCode: 'PRM', balanceAmount: 5000, _row: 3 }),   // premium — ignored either way
    ];
    expect(payrollExceedsBudget.check(records)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// QR-005: position in HCM not BFM
// ---------------------------------------------------------------------------

describe('QR-005 positionInHcmNotBfm', () => {
  it('fires for a filled position missing from BFM', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '10999' }),
      hcmPos({ positionNumber: '10001', fillStatus: 'FILLED' }),
    ];
    const issues = positionInHcmNotBfm.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].positionNumber).toBe('10001');
  });

  it('does not fire for a vacant position missing from BFM', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '10999' }),
      hcmPos({ positionNumber: '10001', emplId: '', fillStatus: 'VACANT' }),
    ];
    expect(positionInHcmNotBfm.check(records)).toHaveLength(0);
  });

  it('does not fire when BFM data is not loaded', () => {
    const records: ImportedRow[] = [hcmPos()];
    expect(positionInHcmNotBfm.check(records)).toHaveLength(0);
  });

  // Regression (S58): a 7-digit HCM number ("1010593") matches the same
  // position carried zero-padded to 8 digits in BFM ("01010593").
  it('treats an unpadded HCM number and a zero-padded BFM number as the same position', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '01010593' }),
      hcmPos({ positionNumber: '1010593', fillStatus: 'FILLED' }),
    ];
    expect(positionInHcmNotBfm.check(records)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// QR-006 additionalPayOrphan — acting dual-entry
// ---------------------------------------------------------------------------

function eeAddl(overrides: Partial<PsHcmEeAddlPayRow> = {}): PsHcmEeAddlPayRow {
  return {
    _source: 'ps-hcm-ee-addl-pay',
    departmentGroupCode: 'DBI', departmentTitle: 'Dept of Building Inspection',
    emplId: '187518', emplRecord: 0, effectiveDate: '2026-01-12',
    lastName: 'Smith', firstName: 'Jane', middleName: '', preferredFirstName: '',
    rosterCode: '21', rosterDescription: 'SEIU 1021',
    payStatus: 'A', jobCode: '6278', unionCode: '791',
    salaryPlan: '1', step: '5', additionalPayAmount: 250.5, rateCode: 'ACTFLT',
    _row: 1,
    ...overrides,
  };
}

/** A P&P position manually marked "Acting Assignment" for an emplid (cols U/V). */
function markedActing(emplId: string, positionNumber = '10001'): PsHcmPpRow {
  return hcmPos({
    positionNumber,
    positionUsedFor: 'Acting Assignment',
    positionUsedForDescription: emplId,
  });
}

describe('QR-006 additionalPayOrphan (acting dual-entry)', () => {
  it('flags paid-but-not-marked: an ACTFLT payee with no "Position Used For" marker', () => {
    const records: ImportedRow[] = [
      eeAddl({ emplId: '187518', rateCode: 'ACTFLT', payStatus: 'A' }),
      hcmPos({ positionNumber: '10001' }), // present, but does not mark 187518
    ];
    const issues = additionalPayOrphan.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-006');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].emplId).toBe('187518');
    expect(issues[0].message).toContain('no position is marked');
  });

  it('flags marked-but-not-paid: a "Position Used For" marker with no ACTFLT pay', () => {
    const records: ImportedRow[] = [
      markedActing('204417', '10002'),
      eeAddl({ emplId: '999', rateCode: 'SUPFLT' }), // supervisory only — no acting pay
    ];
    const issues = additionalPayOrphan.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-006');
    expect(issues[0].positionNumber).toBe('10002');
    expect(issues[0].message).toContain('no acting pay');
  });

  it('passes when both sides agree (paid AND marked)', () => {
    const records: ImportedRow[] = [
      eeAddl({ emplId: '187518', rateCode: 'ACTFLT' }),
      markedActing('187518', '10001'),
    ];
    expect(additionalPayOrphan.check(records)).toHaveLength(0);
  });

  it('treats an inactive ACTFLT as not-paid (stale marker → marked-but-not-paid)', () => {
    const records: ImportedRow[] = [
      eeAddl({ emplId: '187518', rateCode: 'ACTFLT', payStatus: 'I' }),
      markedActing('187518', '10001'),
    ];
    const issues = additionalPayOrphan.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].positionNumber).toBe('10001');
  });

  it('does not check when only one source is loaded', () => {
    expect(additionalPayOrphan.check([eeAddl({ rateCode: 'ACTFLT' })])).toHaveLength(0);
    expect(additionalPayOrphan.check([markedActing('187518')])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// QR-007 additionalPayActingSupervisoryConflict — acting + supervisory both
// ---------------------------------------------------------------------------

describe('QR-007 additionalPayActingSupervisoryConflict', () => {
  it('flags an employee with both active ACTFLT and SUPFLT', () => {
    const issues = additionalPayActingSupervisoryConflict.check([
      eeAddl({ emplId: '187518', rateCode: 'ACTFLT', _row: 5 }),
      eeAddl({ emplId: '187518', rateCode: 'SUPFLT', _row: 9 }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-007');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].emplId).toBe('187518');
    expect(issues[0].sourceRows).toEqual([5, 9]);
  });

  it('does not flag acting-only or supervisory-only', () => {
    expect(additionalPayActingSupervisoryConflict.check([
      eeAddl({ emplId: '187518', rateCode: 'ACTFLT' }),
    ])).toHaveLength(0);
    expect(additionalPayActingSupervisoryConflict.check([
      eeAddl({ emplId: '187518', rateCode: 'SUPFLT' }),
    ])).toHaveLength(0);
  });

  it('does not flag when one side is inactive', () => {
    const issues = additionalPayActingSupervisoryConflict.check([
      eeAddl({ emplId: '187518', rateCode: 'ACTFLT', payStatus: 'A' }),
      eeAddl({ emplId: '187518', rateCode: 'SUPFLT', payStatus: 'I' }),
    ]);
    expect(issues).toHaveLength(0);
  });

  it('does not flag two different employees each holding one kind', () => {
    const issues = additionalPayActingSupervisoryConflict.check([
      eeAddl({ emplId: '187518', rateCode: 'ACTFLT' }),
      eeAddl({ emplId: '204417', rateCode: 'SUPFLT' }),
    ]);
    expect(issues).toHaveLength(0);
  });

  it('does not check when no additional-pay rows are loaded', () => {
    expect(additionalPayActingSupervisoryConflict.check([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// QR-008 supervisory differential owed — findSupervisoryOwed (injected grades)
// ---------------------------------------------------------------------------

describe('QR-008 findSupervisoryOwed (supervisory differential owed)', () => {
  // Injected grade lookup: class code → top-of-grade biweekly (date ignored).
  const grades: Record<string, number> = {
    '0922': 5000, // manager class
    '0923': 5300, // higher-grade subordinate (5300 > 5000 × 1.05)
    '6278': 4000, // lower-grade subordinate
  };
  const gradeOf = (code: string) => grades[code] ?? null;

  // Marks an emplid as already receiving a supervisory differential AND makes
  // the additional-pay source non-empty (so the rule runs).
  const supflt = (emplId: string) => eeAddl({ emplId, rateCode: 'SUPFLT' });

  it('flags a manager whose grade is < 5% above the highest subordinate, no SUPFLT', () => {
    const records: ImportedRow[] = [
      hcmPos({ positionNumber: '10001', emplId: 'M1', employeeName: 'Boss, Pat', employeeJobCode: '0922' }),
      hcmPos({ positionNumber: '10002', emplId: 'S1', employeeJobCode: '0923', reportsToPosition: '10001' }),
      supflt('SOMEONE_ELSE'),
    ];
    const issues = findSupervisoryOwed(records, gradeOf);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-008');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].positionNumber).toBe('10001');
    expect(issues[0].emplId).toBe('M1');
  });

  it('does not flag when the manager grade is already ≥ 5% above the subordinate', () => {
    const records: ImportedRow[] = [
      hcmPos({ positionNumber: '10001', emplId: 'M1', employeeJobCode: '0922' }),
      hcmPos({ positionNumber: '10002', emplId: 'S1', employeeJobCode: '6278', reportsToPosition: '10001' }),
      supflt('SOMEONE_ELSE'),
    ];
    expect(findSupervisoryOwed(records, gradeOf)).toHaveLength(0);
  });

  it('does not flag a manager already receiving SUPFLT', () => {
    const records: ImportedRow[] = [
      hcmPos({ positionNumber: '10001', emplId: 'M1', employeeJobCode: '0922' }),
      hcmPos({ positionNumber: '10002', emplId: 'S1', employeeJobCode: '0923', reportsToPosition: '10001' }),
      supflt('M1'),
    ];
    expect(findSupervisoryOwed(records, gradeOf)).toHaveLength(0);
  });

  it('does not flag a vacant manager or a manager with no filled subordinates', () => {
    expect(findSupervisoryOwed([
      hcmPos({ positionNumber: '10001', emplId: '', employeeJobCode: '0922' }),
      hcmPos({ positionNumber: '10002', emplId: 'S1', employeeJobCode: '0923', reportsToPosition: '10001' }),
      supflt('X'),
    ], gradeOf)).toHaveLength(0);

    expect(findSupervisoryOwed([
      hcmPos({ positionNumber: '10001', emplId: 'M1', employeeJobCode: '0922' }),
      supflt('X'),
    ], gradeOf)).toHaveLength(0);
  });

  it('does not check when the additional-pay source is not loaded', () => {
    expect(findSupervisoryOwed([
      hcmPos({ positionNumber: '10001', emplId: 'M1', employeeJobCode: '0922' }),
      hcmPos({ positionNumber: '10002', emplId: 'S1', employeeJobCode: '0923', reportsToPosition: '10001' }),
    ], gradeOf)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// QR-009 additionalPayActingOverlap — employee with multiple active ACTFLT
// ---------------------------------------------------------------------------

describe('QR-009 additionalPayActingOverlap', () => {
  it('flags an employee with active ACTFLT on 2+ distinct employee records', () => {
    const issues = additionalPayActingOverlap.check([
      eeAddl({ emplId: '187518', emplRecord: 0, rateCode: 'ACTFLT', _row: 3 }),
      eeAddl({ emplId: '187518', emplRecord: 1, rateCode: 'ACTFLT', _row: 7 }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-009');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].emplId).toBe('187518');
    expect(issues[0].sourceRows).toEqual([3, 7]);
  });

  // Regression (S58): the EE Additional Pay export is effective-dated, so ONE
  // ongoing assignment appears as several rows on the SAME employee record.
  // That is the history of a single assignment, not concurrent acting.
  it('does NOT flag effective-dated history of one assignment (same record)', () => {
    expect(additionalPayActingOverlap.check([
      eeAddl({ emplId: '187518', emplRecord: 0, rateCode: 'ACTFLT', effectiveDate: '2026-01-12', _row: 3 }),
      eeAddl({ emplId: '187518', emplRecord: 0, rateCode: 'ACTFLT', effectiveDate: '2026-03-01', _row: 7 }),
    ])).toHaveLength(0);
  });

  it('does not flag a single acting assignment', () => {
    expect(additionalPayActingOverlap.check([
      eeAddl({ emplId: '187518', rateCode: 'ACTFLT' }),
    ])).toHaveLength(0);
  });

  it('ignores inactive ACTFLT rows (an inactive record is not a 2nd concurrent assignment)', () => {
    expect(additionalPayActingOverlap.check([
      eeAddl({ emplId: '187518', emplRecord: 0, rateCode: 'ACTFLT', payStatus: 'A' }),
      eeAddl({ emplId: '187518', emplRecord: 1, rateCode: 'ACTFLT', payStatus: 'I' }),
    ])).toHaveLength(0);
  });

  it('does not count supervisory rows toward the acting overlap', () => {
    expect(additionalPayActingOverlap.check([
      eeAddl({ emplId: '187518', emplRecord: 0, rateCode: 'ACTFLT' }),
      eeAddl({ emplId: '187518', emplRecord: 1, rateCode: 'SUPFLT' }),
    ])).toHaveLength(0);
  });

  it('does not check when no additional-pay rows are loaded', () => {
    expect(additionalPayActingOverlap.check([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// QR-011 positionDeptNotBudgetDept — position dept vs budget dept
// ---------------------------------------------------------------------------

describe('QR-011 positionDeptNotBudgetDept', () => {
  it('fires when position department differs from budget department', () => {
    const issues = positionDeptNotBudgetDept.check([
      hcmPos({ positionNumber: '10001', departmentCode: 'DBI', budgetDepartmentCode: 'DPW' }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-011');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].positionNumber).toBe('10001');
    expect(issues[0].message).toContain('DBI');
    expect(issues[0].message).toContain('DPW');
  });

  it('does not fire when the two departments match', () => {
    expect(positionDeptNotBudgetDept.check([
      hcmPos({ departmentCode: 'DBI', budgetDepartmentCode: 'DBI' }),
    ])).toHaveLength(0);
  });

  it('does not fire when the budget department is blank (not specified)', () => {
    expect(positionDeptNotBudgetDept.check([
      hcmPos({ departmentCode: 'DBI', budgetDepartmentCode: '' }),
    ])).toHaveLength(0);
  });

  it('ignores non-HCM rows', () => {
    expect(positionDeptNotBudgetDept.check([
      bfmPos({ departmentCode: 'DBI' }),
    ])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// QR-012 payrollWithoutBudgetedPosition — OBI spend with no position record
// ---------------------------------------------------------------------------

describe('QR-012 payrollWithoutBudgetedPosition', () => {
  it('fires when OBI spend posts to a position absent from BFM and HCM', () => {
    const issues = payrollWithoutBudgetedPosition.check([
      bfmPos({ positionNumber: '10001' }),
      obiRow({ positionIdentifier: '99999', balanceAmount: 5000 }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-012');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].positionNumber).toBe('99999');
  });

  it('does not fire when the OBI position is budgeted in BFM', () => {
    expect(payrollWithoutBudgetedPosition.check([
      bfmPos({ positionNumber: '10001' }),
      obiRow({ positionIdentifier: '10001', balanceAmount: 5000 }),
    ])).toHaveLength(0);
  });

  it('does not fire when the OBI position is established in HCM (even if not in BFM)', () => {
    expect(payrollWithoutBudgetedPosition.check([
      hcmPos({ positionNumber: '10001' }),
      obiRow({ positionIdentifier: '10001', balanceAmount: 5000 }),
    ])).toHaveLength(0);
  });

  it('does not check when neither BFM nor HCM is loaded', () => {
    expect(payrollWithoutBudgetedPosition.check([
      obiRow({ positionIdentifier: '99999', balanceAmount: 5000 }),
    ])).toHaveLength(0);
  });

  it('skips blank position identifiers (non-position earnings)', () => {
    expect(payrollWithoutBudgetedPosition.check([
      bfmPos({ positionNumber: '10001' }),
      obiRow({ positionIdentifier: '', balanceAmount: 5000 }),
    ])).toHaveLength(0);
  });

  it('skips net-zero positions (washes / corrections)', () => {
    expect(payrollWithoutBudgetedPosition.check([
      bfmPos({ positionNumber: '10001' }),
      obiRow({ positionIdentifier: '88888', balanceAmount: 100, _row: 2 }),
      obiRow({ positionIdentifier: '88888', balanceAmount: -100, _row: 3 }),
    ])).toHaveLength(0);
  });

  // Regression (S58): an unpadded OBI identifier must match a zero-padded BFM
  // key, so legitimately-budgeted spend is not flagged as orphaned.
  it('does not flag OBI spend budgeted under a zero-padded BFM key', () => {
    expect(payrollWithoutBudgetedPosition.check([
      bfmPos({ positionNumber: '00010001' }),
      obiRow({ positionIdentifier: '10001', balanceAmount: 5000 }),
    ])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Rule metadata — every registered rule must carry detail-panel content so the
// Issues view can show a rationale, a suggested fix, a citation, and a link to
// the source tab. Compile-time `required` fields enforce presence; this guards
// non-emptiness and applies to every future rule added to ALL_RULES.
// ---------------------------------------------------------------------------

describe('rule metadata completeness', () => {
  it('every registered rule has rationale, fix, a citation, and a source tab', () => {
    expect(ALL_RULES.length).toBeGreaterThan(0);
    for (const rule of ALL_RULES) {
      expect(rule.rationale.trim(), `${rule.id} rationale`).not.toBe('');
      expect(rule.fix.trim(), `${rule.id} fix`).not.toBe('');
      expect(rule.citations.length, `${rule.id} citations`).toBeGreaterThan(0);
      expect(rule.sourceTabs.length, `${rule.id} sourceTabs`).toBeGreaterThan(0);
      for (const c of rule.citations) {
        expect(c.label.trim(), `${rule.id} citation label`).not.toBe('');
      }
    }
  });
});
