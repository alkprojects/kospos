import { describe, it, expect } from 'vitest';
import type { ImportedRow } from '../importers/types';
import type { BfmPositionRow, PsHcmPpRow, ObiPayrollRow } from '../importers/types';
import { positionInBfmNotHcm } from './rules/position-in-bfm-not-hcm';
import { vacantNoRtf } from './rules/vacant-no-rtf';
import { payrollExceedsBudget } from './rules/payroll-exceeds-budget';
import { hcmFteBfmMismatch } from './rules/hcm-fte-bfm-mismatch';
import { positionInHcmNotBfm } from './rules/position-in-hcm-not-bfm';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function bfmPos(overrides: Partial<BfmPositionRow> = {}): BfmPositionRow {
  return {
    _source: 'bfm-position',
    positionNumber:      '10001',
    priorPositionNumber: '10001',
    departmentCode:      'DBI',
    departmentName:      'Dept of Building Inspection',
    jobCode:             '6278_C',
    jobCodeDescription:  'Building Inspector',
    empOrg:              '21',
    retIndicator:        '1',
    positionStatus:      'A',
    fund:                '1GAGF',
    authority:           'AUTH1',
    project:             '',
    activity:            '',
    fte:                 1,
    budgetedSalary:      110000,
    budgetPhaseColumn:   'FY 2026-27 Mayor FTE',
    fiscalYearStart:     '2027',
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
    fiscalYear:          'FY2024',
    departmentCode:      'DBI',
    departmentName:      'Dept of Building Inspection',
    positionIdentifier:  '10001',
    personNumber:        '12345',
    personFullName:      'Smith, Jane',
    jobCode:             'COMMN:6278',
    jobDescription:      'Building Inspector',
    accountCode:         '501010',
    fund:                '1GAGF',
    authority:           'AUTH1',
    earningPeriodNumber: 15,
    earningPeriodEnd:    '2024-01-26',
    earningsCode:        'WKP',
    earningsDescription: 'Regular Biweekly Pay',
    balanceAmount:       4846.15,
    payPeriodFTE:        1,
    appointmentType:     'PCS',
    _row:                2,
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
});

// ---------------------------------------------------------------------------
// QR-002: vacant no RTF
// ---------------------------------------------------------------------------

describe('QR-002 vacantNoRtf', () => {
  it('fires on a vacant position with no RTF info', () => {
    const records: ImportedRow[] = [
      hcmPos({ emplId: '', fillStatus: 'VACANT', rtfStatus: '', rtfExpectedFillDate: '' }),
    ];
    const issues = vacantNoRtf.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-002');
  });

  it('does not fire when RTF status is present', () => {
    const records: ImportedRow[] = [
      hcmPos({ emplId: '', fillStatus: 'VACANT', rtfStatus: 'Open', rtfExpectedFillDate: '2026-09-01' }),
    ];
    expect(vacantNoRtf.check(records)).toHaveLength(0);
  });

  it('does not fire for a filled position', () => {
    const records: ImportedRow[] = [hcmPos()]; // fillStatus FILLED, has emplId
    expect(vacantNoRtf.check(records)).toHaveLength(0);
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
});

// ---------------------------------------------------------------------------
// QR-004: FTE mismatch
// ---------------------------------------------------------------------------

describe('QR-004 hcmFteBfmMismatch', () => {
  it('fires when FTE values differ', () => {
    const records: ImportedRow[] = [
      bfmPos({ fte: 1 }),
      hcmPos({ fte: 0.5 }),
    ];
    const issues = hcmFteBfmMismatch.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-004');
  });

  it('does not fire when FTE matches', () => {
    const records: ImportedRow[] = [bfmPos({ fte: 1 }), hcmPos({ fte: 1 })];
    expect(hcmFteBfmMismatch.check(records)).toHaveLength(0);
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
});
