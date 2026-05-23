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
    departmentCode: 'DBI',
    departmentName: 'Dept of Building Inspection',
    positionNumber: '00456',
    jobCode: '6278',
    jobCodeDescription: 'Building Inspector',
    positionStatus: 'Filled',
    fte: 1,
    budgetedSalary: 110000,
    fund: '1GAGF',
    authority: 'AUTH1',
    fiscalYear: 'FY2026',
    _row: 2,
    ...overrides,
  };
}

function hcmPos(overrides: Partial<PsHcmPpRow> = {}): PsHcmPpRow {
  return {
    _source: 'ps-hcm-pp',
    positionNumber: '00456',
    jobCode: '6278',
    jobCodeDescription: 'Building Inspector',
    departmentCode: 'DBI',
    departmentName: 'Dept of Building Inspection',
    positionStatus: 'A',
    emplId: 'E12345',
    employeeName: 'Smith, Jane',
    appointmentType: 'PCS',
    salaryStep: '5',
    salaryAmount: 110000,
    reportsToPosition: '00100',
    rtfStatus: '',
    rtfExpectedFillDate: '',
    fte: 1,
    unionCode: '21',
    _row: 2,
    ...overrides,
  };
}

function obiRow(overrides: Partial<ObiPayrollRow> = {}): ObiPayrollRow {
  return {
    _source: 'obi-payroll',
    departmentCode: 'DBI',
    departmentName: 'Dept of Building Inspection',
    positionNumber: '00456',
    emplId: 'E12345',
    employeeName: 'Smith, Jane',
    jobCode: '6278',
    accountCode: '501010',
    fund: '1GAGF',
    authority: 'AUTH1',
    ytdSalary: 60000,
    ytdBenefits: 30000,
    ytdTotal: 90000,
    fiscalYear: 'FY2026',
    reportPeriod: 'July 2025 – March 2026',
    _row: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// QR-001: position in BFM not HCM
// ---------------------------------------------------------------------------

describe('QR-001 positionInBfmNotHcm', () => {
  it('fires when BFM position has no HCM match', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '00456' }),
      hcmPos({ positionNumber: '00999' }), // different position
    ];
    const issues = positionInBfmNotHcm.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].positionNumber).toBe('00456');
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
      hcmPos({ emplId: '', rtfStatus: '', rtfExpectedFillDate: '' }),
    ];
    const issues = vacantNoRtf.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-002');
  });

  it('does not fire when RTF status is present', () => {
    const records: ImportedRow[] = [
      hcmPos({ emplId: '', rtfStatus: 'Open', rtfExpectedFillDate: '2026-09-01' }),
    ];
    expect(vacantNoRtf.check(records)).toHaveLength(0);
  });

  it('does not fire for a filled position', () => {
    const records: ImportedRow[] = [hcmPos()]; // has emplId
    expect(vacantNoRtf.check(records)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// QR-003: payroll exceeds budget
// ---------------------------------------------------------------------------

describe('QR-003 payrollExceedsBudget', () => {
  it('fires when YTD total exceeds budget by more than 5%', () => {
    const records: ImportedRow[] = [
      bfmPos({ budgetedSalary: 100000 }),
      obiRow({ ytdTotal: 106000 }), // 6% over
    ];
    const issues = payrollExceedsBudget.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('QR-003');
  });

  it('does not fire when YTD is within 5% buffer', () => {
    const records: ImportedRow[] = [
      bfmPos({ budgetedSalary: 100000 }),
      obiRow({ ytdTotal: 104000 }), // 4% over — within buffer
    ];
    expect(payrollExceedsBudget.check(records)).toHaveLength(0);
  });

  it('does not fire when BFM data is not loaded', () => {
    const records: ImportedRow[] = [obiRow({ ytdTotal: 200000 })];
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
  it('fires for an active filled position missing from BFM', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '00999' }),
      hcmPos({ positionNumber: '00456', emplId: 'E12345', positionStatus: 'A' }),
    ];
    const issues = positionInHcmNotBfm.check(records);
    expect(issues).toHaveLength(1);
    expect(issues[0].positionNumber).toBe('00456');
  });

  it('does not fire for a vacant position missing from BFM', () => {
    const records: ImportedRow[] = [
      bfmPos({ positionNumber: '00999' }),
      hcmPos({ positionNumber: '00456', emplId: '', positionStatus: 'A' }),
    ];
    expect(positionInHcmNotBfm.check(records)).toHaveLength(0);
  });

  it('does not fire when BFM data is not loaded', () => {
    const records: ImportedRow[] = [hcmPos()];
    expect(positionInHcmNotBfm.check(records)).toHaveLength(0);
  });
});
