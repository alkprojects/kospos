import { describe, it, expect } from 'vitest';
import { categorizeAccount, appropriationLabel } from './approp';
import { resolvePositionChartfields, normalizePositionKey } from './resolve';
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

  it('classifies 4xxx accounts as account-tree (project/authority requires reference table)', () => {
    // Until the appropriation-control reference table is loaded, all numeric
    // non-labor accounts default to 'account'. See approp.ts note.
    expect(categorizeAccount('4000')).toBe('account');
    expect(categorizeAccount('4500')).toBe('account');
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
    positionCode: '',
    priorPositionCode: '',
    formId: '',
    deptGroup: 'DBI',
    division: '',
    divisionTitle: '',
    section: '',
    sectionTitle: '',
    gfsType: 'NGFS',
    departmentCode: 'DBI',
    departmentName: 'Building Inspection',
    fund: '1GAGF',
    fundTitle: '',
    authority: '2DBIA',
    authorityTitle: '',
    project: '',
    projectTitle: '',
    activity: '',
    activityTitle: '',
    accountLvl5Title: '',
    agencyUse: '',
    agencyUseTitle: '',
    jobCode: '6321_C',
    jobCodeDescription: 'Senior Building Inspector',
    jobClassTier: '',
    empOrg: 'SEIU 1021',
    empOrgTitle: '',
    retIndicator: 'M',
    positionStatus: 'A',
    action: '',
    fiscalYearStart: '2026',
    ppdStart: '',
    fiscalYearEnd: '',
    ppdEnd: '',
    budgetByFy: { 'FY 2026-27': { Mayor: { fte: 1.0, dollars: 120000 } } },
    defaultFiscalYear: 'FY 2026-27',
    defaultPhase: 'Mayor',
    fte: 1.0,
    budgetedSalary: 120000,
    budgetPhaseColumn: 'FY 2026-27 Mayor FTE',
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
    positionDivision: '',
    departmentCode: 'DBI',
    departmentName: 'Building Inspection',
    positionMaxHeadcount: 1,
    positionStatus: 'Approved',
    fillStatus: 'FILLED',
    vice1EmplId: '',
    vice1Name: '',
    previousEmployee: '',
    positionUsedFor: '',
    positionUsedForDescription: '',
    emplId: 'E12345',
    employeeName: 'Jane Smith',
    employeeStatus: 'A',
    appointmentType: 'PCS',
    exemptCategory: '',
    salaryStep: '5',
    hourlyRate: 58.12,
    meritIncreaseDate: '',
    reportsToPosition: '00000100',
    managerFirstName: '',
    managerLastName: '',
    cat1718AppointmentDate: '',
    cat1718ExemptCode: '',
    cat1718ExemptMonths: 0,
    cat1718TxExpiredDate: '',
    rosterCode: 'A001',
    rosterDescription: 'SEIU 1021',
    comboCode: '',
    comboDepartmentCode: '',
    comboDepartmentName: '',
    rtfId: '',
    rtfSubmittedDate: '',
    rtfStatus: '',
    rtfExpectedFillDate: '',
    budgetDepartmentCode: '',
    budgetDepartmentName: '',
    budgetJobCode: '',
    budgetPositionNumber: '',
    fte: 1.0,
    employeeJobCode: '6321_C',
    vacantDate: '',
    _row: 3,
    ...overrides,
  };
}

function makeObiRow(overrides: Partial<ObiPayrollRow> = {}): ObiPayrollRow {
  return {
    _source: 'obi-payroll',
    fiscalYear: '2026',
    departmentGroupCode: 'DBI',
    fundLvl1Code: '',
    fundLvl1Description: '',
    fundControl: '',
    fund: '1GAGF',
    fundDescription: '',
    departmentCode: 'DBI',
    departmentName: 'Building Inspection',
    projectCode: '',
    projectDescription: '',
    activityCode: '',
    activityDescription: '',
    authorityLvl1Code: '',
    authorityLvl1Description: '',
    authority: '2DBIA',
    authorityDescription: '',
    accountLvl2Description: '',
    accountLvl5Name: '',
    accountLvl3Description: '',
    accountCode: '5010',
    accountDescription: '',
    earningPeriodNumber: 1,
    earningPeriodEnd: '2026-07-15',
    personNumber: 'E12345',
    personFullName: 'Jane Smith',
    rosterCode: '',
    earningsCode: 'WKP',
    earningsDescription: 'Regular Pay',
    positionIdentifier: '00001001',
    jobCode: '6321_C',
    jobCodeSet: 'COMMN',
    jobDescription: 'Senior Building Inspector',
    assignmentNumber: 0,
    appointmentType: 'PCS',
    isFteHours: 'Y',
    earningHours: 80,
    payPeriodFTE: 1.0,
    balanceAmount: 4615.38,
    _asOfDate: '2026-07-15',
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

  it('creates a row for positions that appear only in OBI (no BFM/HCM)', () => {
    // Real case: terminated employee with FY-end backpay — OBI has activity
    // but the position is gone from BFM and HCM snapshots.
    const result = resolvePositionChartfields([
      makeObiRow({ positionIdentifier: '00009999', balanceAmount: 1234.56 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].ytdActuals).toBeCloseTo(1234.56);
    expect(result[0].dataSources).toEqual(['obi']);
    expect(result[0].fund).toBe(''); // no BFM defaults available
  });

  it('keeps obi in dataSources even when net OBI total is zero (e.g. reversals)', () => {
    const result = resolvePositionChartfields([
      makeBfmRow(),
      makeObiRow({ balanceAmount: 100 }),
      makeObiRow({ balanceAmount: -100, earningPeriodNumber: 2 }),
    ]);
    expect(result[0].ytdActuals).toBe(0);
    expect(result[0].dataSources).toContain('obi');
  });

  it('joins sources with different position-number zero-padding', () => {
    // BFM uses padded "00001001", OBI uses unpadded "1001" — same position.
    const result = resolvePositionChartfields([
      makeBfmRow({ positionNumber: '00001001' }),
      makeObiRow({ positionIdentifier: '1001', balanceAmount: 500 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].dataSources).toContain('bfm');
    expect(result[0].dataSources).toContain('obi');
    expect(result[0].ytdActuals).toBe(500);
    expect(result[0].positionNumber).toBe('00001001'); // BFM's display form preserved
  });

  it('numeric sort handles unpadded keys correctly', () => {
    const result = resolvePositionChartfields([
      makeObiRow({ positionIdentifier: '10001', balanceAmount: 1 }),
      makeObiRow({ positionIdentifier: '1001', balanceAmount: 1 }),
      makeObiRow({ positionIdentifier: '101', balanceAmount: 1 }),
    ]);
    expect(result.map(r => r.positionNumber)).toEqual(['101', '1001', '10001']);
  });

  it('skips rows with empty position numbers', () => {
    const result = resolvePositionChartfields([
      makeBfmRow({ positionNumber: '' }),
      makeBfmRow({ positionNumber: '   ' }),
      makeObiRow({ positionIdentifier: '', balanceAmount: 100 }),
    ]);
    expect(result).toEqual([]);
  });
});

describe('normalizePositionKey', () => {
  it('strips leading zeros', () => {
    expect(normalizePositionKey('00001001')).toBe('1001');
    expect(normalizePositionKey('0001')).toBe('1');
  });

  it('trims whitespace', () => {
    expect(normalizePositionKey('  1001  ')).toBe('1001');
    expect(normalizePositionKey('\t00001001\n')).toBe('1001');
  });

  it('returns empty string for blank input', () => {
    expect(normalizePositionKey('')).toBe('');
    expect(normalizePositionKey('   ')).toBe('');
    expect(normalizePositionKey(null)).toBe('');
    expect(normalizePositionKey(undefined)).toBe('');
  });

  it('keeps a single zero as "0"', () => {
    expect(normalizePositionKey('0')).toBe('0');
    expect(normalizePositionKey('0000')).toBe('0');
  });

  it('passes alphanumeric position numbers through unchanged after trim', () => {
    expect(normalizePositionKey('ABC123')).toBe('ABC123');
  });
});
