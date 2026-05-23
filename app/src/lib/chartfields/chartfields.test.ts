import { describe, it, expect } from 'vitest';
import { categorizeAccount, appropriationLabel } from './approp';
import { resolvePositionChartfields } from './resolve';
import type { BfmPositionRow, PsHcmPpRow, ObiPayrollRow } from '../importers/types';

// ---------------------------------------------------------------------------
// categorizeAccount
// ---------------------------------------------------------------------------

describe('categorizeAccount', () => {
  it('classifies salary accounts as labor', () => {
    expect(categorizeAccount('5010')).toBe('labor');
    expect(categorizeAccount('5130')).toBe('labor');
  });

  it('classifies benefit accounts as labor', () => {
    expect(categorizeAccount('6130')).toBe('labor');
    expect(categorizeAccount('6020')).toBe('labor');
  });

  it('classifies non-personnel accounts as account-tree', () => {
    expect(categorizeAccount('7020')).toBe('account');
    expect(categorizeAccount('8100')).toBe('account');
    expect(categorizeAccount('9993')).toBe('account');
  });

  it('classifies work order accounts as none', () => {
    expect(categorizeAccount('WO123')).toBe('none');
    expect(categorizeAccount('wo-456')).toBe('none');
  });

  it('classifies reserve accounts as none', () => {
    expect(categorizeAccount('RES001')).toBe('none');
    expect(categorizeAccount('RSV-2')).toBe('none');
  });

  it('returns none for blank input', () => {
    expect(categorizeAccount('')).toBe('none');
    expect(categorizeAccount('  ')).toBe('none');
  });
});

describe('appropriationLabel', () => {
  it('returns readable labels', () => {
    expect(appropriationLabel('labor')).toContain('Labor');
    expect(appropriationLabel('account')).toContain('Account');
    expect(appropriationLabel('project')).toContain('Project');
    expect(appropriationLabel('authority')).toContain('Authority');
    expect(appropriationLabel('none')).toContain('Standalone');
  });
});

// ---------------------------------------------------------------------------
// resolvePositionChartfields
// ---------------------------------------------------------------------------

function makeBfmRow(overrides: Partial<BfmPositionRow> = {}): BfmPositionRow {
  return {
    _source: 'bfm-position',
    positionNumber: '00001001',
    priorPositionNumber: '',
    departmentCode: 'DBI',
    departmentName: 'Building Inspection',
    jobCode: '6321_C',
    jobCodeDescription: 'Senior Building Inspector',
    empOrg: 'SEIU 1021',
    retIndicator: 'M',
    positionStatus: 'A',
    fund: '1GAGF',
    authority: '2DBIA',
    project: '',
    activity: '',
    fte: 1.0,
    budgetedSalary: 120000,
    budgetPhaseColumn: 'FY 2026-27 Mayor FTE',
    fiscalYearStart: '2026',
    _row: 2,
    ...overrides,
  };
}

function makeHcmRow(overrides: Partial<PsHcmPpRow> = {}): PsHcmPpRow {
  return {
    _source: 'ps-hcm-pp',
    snapshotDate: '2026-05-01',
    positionNumber: '00001001',
    jobCode: '6321_C',
    jobCodeDescription: 'Senior Building Inspector',
    departmentCode: 'DBI',
    departmentName: 'Building Inspection',
    positionStatus: 'Approved',
    fillStatus: 'FILLED',
    emplId: 'E12345',
    employeeName: 'Jane Smith',
    appointmentType: 'PCS',
    salaryStep: '5',
    hourlyRate: 58.12,
    reportsToPosition: '00000100',
    rosterCode: 'A001',
    rosterDescription: 'SEIU 1021',
    rtfStatus: '',
    rtfExpectedFillDate: '',
    fte: 1.0,
    comboCode: '',
    employeeJobCode: '6321_C',
    _row: 3,
    ...overrides,
  };
}

function makeObiRow(overrides: Partial<ObiPayrollRow> = {}): ObiPayrollRow {
  return {
    _source: 'obi-payroll',
    fiscalYear: '2026',
    departmentCode: 'DBI',
    departmentName: 'Building Inspection',
    positionIdentifier: '00001001',
    personNumber: 'E12345',
    personFullName: 'Jane Smith',
    jobCode: 'COMMN:6321_C',
    jobDescription: 'Senior Building Inspector',
    accountCode: '5010',
    fund: '1GAGF',
    authority: '2DBIA',
    earningPeriodNumber: 1,
    earningPeriodEnd: '2026-07-15',
    earningsCode: 'WKP',
    earningsDescription: 'Regular Pay',
    balanceAmount: 4615.38,
    payPeriodFTE: 1.0,
    appointmentType: 'PCS',
    _row: 4,
    ...overrides,
  };
}

describe('resolvePositionChartfields', () => {
  it('returns empty array for no rows', () => {
    expect(resolvePositionChartfields([])).toEqual([]);
  });

  it('resolves a position from BFM only', () => {
    const result = resolvePositionChartfields([makeBfmRow()]);
    expect(result).toHaveLength(1);
    const r = result[0];
    expect(r.positionNumber).toBe('00001001');
    expect(r.fund).toBe('1GAGF');
    expect(r.authority).toBe('2DBIA');
    expect(r.hasComboOverride).toBe(false);
    expect(r.comboCodeOverride).toBeNull();
    expect(r.dataSources).toContain('bfm');
    expect(r.dataSources).not.toContain('hcm');
  });

  it('merges BFM + HCM rows for the same position', () => {
    const result = resolvePositionChartfields([makeBfmRow(), makeHcmRow()]);
    expect(result).toHaveLength(1);
    const r = result[0];
    expect(r.dataSources).toContain('bfm');
    expect(r.dataSources).toContain('hcm');
    expect(r.fillStatus).toBe('FILLED');
    expect(r.positionStatus).toBe('A'); // from BFM
  });

  it('detects combo code override from HCM', () => {
    const result = resolvePositionChartfields([
      makeBfmRow(),
      makeHcmRow({ comboCode: 'DBII1' }),
    ]);
    expect(result[0].comboCodeOverride).toBe('DBII1');
    expect(result[0].hasComboOverride).toBe(true);
  });

  it('does not flag empty combo code as override', () => {
    const result = resolvePositionChartfields([
      makeBfmRow(),
      makeHcmRow({ comboCode: '   ' }),
    ]);
    expect(result[0].hasComboOverride).toBe(false);
    expect(result[0].comboCodeOverride).toBeNull();
  });

  it('accumulates OBI actuals for a position', () => {
    const result = resolvePositionChartfields([
      makeBfmRow(),
      makeObiRow({ balanceAmount: 4615.38 }),
      makeObiRow({ balanceAmount: 4615.38, earningPeriodNumber: 2 }),
    ]);
    expect(result[0].ytdActuals).toBeCloseTo(9230.76);
    expect(result[0].dataSources).toContain('obi');
  });

  it('produces a posting string', () => {
    const result = resolvePositionChartfields([makeBfmRow()]);
    expect(result[0].postingString).toContain('1GAGF');
    expect(result[0].postingString).toContain('DBI');
    expect(result[0].postingString).toContain('2DBIA');
  });

  it('handles two distinct positions', () => {
    const result = resolvePositionChartfields([
      makeBfmRow({ positionNumber: '00001001' }),
      makeBfmRow({ positionNumber: '00001002', fund: 'SPFND' }),
    ]);
    expect(result).toHaveLength(2);
    const p2 = result.find(r => r.positionNumber === '00001002');
    expect(p2?.fund).toBe('SPFND');
  });

  it('resolves a position from HCM only (no BFM row)', () => {
    const result = resolvePositionChartfields([makeHcmRow()]);
    expect(result).toHaveLength(1);
    expect(result[0].dataSources).toContain('hcm');
    expect(result[0].dataSources).not.toContain('bfm');
    expect(result[0].fund).toBe('');
  });

  it('results are sorted by position number', () => {
    const result = resolvePositionChartfields([
      makeBfmRow({ positionNumber: '00001003' }),
      makeBfmRow({ positionNumber: '00001001' }),
      makeBfmRow({ positionNumber: '00001002' }),
    ]);
    expect(result.map(r => r.positionNumber)).toEqual(['00001001', '00001002', '00001003']);
  });
});
