/**
 * lib/views/inactive/ tests — query semantics for the Tab 13 INACTIVE
 * replacement. Pure unit tests on `buildInactiveSummary`.
 *
 * The view-level tests live in `inactive-view.test.tsx`.
 */

import { describe, it, expect } from 'vitest';
import type { ObiPayrollRow, PsHcmPpRow } from '../../importers/types';
import type { PayrollSnapshot } from '../../payroll';
import { buildPayrollSnapshots, pickLatestSnapshot } from '../../payroll';
import { ACCOUNT_DESCRIPTIONS } from '../../payroll';
import { buildPositions } from '../../positions';
import { DEFAULT_DEPT_TREE } from '../../reference/dept-tree';
import { buildInactiveSummary } from './build';

function obi(
  partial: Partial<ObiPayrollRow> & {
    positionIdentifier: string;
    balanceAmount: number;
    accountDescription: string;
  },
): ObiPayrollRow {
  return {
    _source: 'obi-payroll',
    fiscalYear: '2026',
    departmentGroupCode: 'DBI',
    fundLvl1Code: '', fundLvl1Description: '', fundControl: '',
    fund: '10190', fundDescription: '',
    departmentCode: '229000', departmentName: 'BUILDING INSPECTION',
    projectCode: '', projectDescription: '',
    activityCode: '', activityDescription: '',
    authorityLvl1Code: '', authorityLvl1Description: '',
    authority: '', authorityDescription: '',
    accountLvl2Description: '', accountLvl5Name: '', accountLvl3Description: '',
    accountCode: '',
    earningPeriodNumber: 0, earningPeriodEnd: '2026-05-08',
    personNumber: '12345', personFullName: 'Smith, Jane',
    rosterCode: '',
    earningsCode: 'WKP', earningsDescription: '',
    jobCode: '6278', jobCodeSet: 'COMMN',
    jobDescription: 'Building Inspector',
    assignmentNumber: 0, appointmentType: 'PCS',
    isFteHours: 'Y', earningHours: 80, payPeriodFTE: 1,
    _asOfDate: '2026-05-08', _row: 1,
    ...partial,
  };
}

function pp(positionNumber: string, partial: Partial<PsHcmPpRow> = {}): PsHcmPpRow {
  return {
    _source: 'ps-hcm-pp',
    snapshotDate: '2026-05-20',
    positionNumber,
    jobCode: '6278', jobCodeDescription: 'Building Inspector',
    positionDivision: '',
    departmentCode: '229000', departmentName: 'BUILDING INSPECTION',
    positionMaxHeadcount: 1, positionStatus: 'A', fillStatus: 'FILLED',
    vice1EmplId: '', vice1Name: '',
    previousEmployee: '', emplId: '11111', employeeName: 'Active, Person',
    employeeStatus: 'A', appointmentType: 'PCS', exemptCategory: '',
    salaryStep: '4', hourlyRate: 50,
    meritIncreaseDate: '2026-08-01',
    reportsToPosition: '', managerFirstName: '', managerLastName: '',
    cat1718AppointmentDate: '', cat1718ExemptCode: '',
    cat1718ExemptMonths: 0, cat1718TxExpiredDate: '',
    rosterCode: '', rosterDescription: '',
    comboCode: '', comboDepartmentCode: '', comboDepartmentName: '',
    rtfId: '', rtfStatus: '', rtfSubmittedDate: '', rtfExpectedFillDate: '',
    budgetDepartmentCode: '229000', budgetDepartmentName: 'BUILDING INSPECTION',
    budgetJobCode: '6278', fte: 1, employeeJobCode: '6278', vacantDate: '',
    _row: 1,
    ...partial,
  };
}

function snapOf(rows: ObiPayrollRow[]): PayrollSnapshot {
  const s = pickLatestSnapshot(buildPayrollSnapshots(rows));
  if (!s) throw new Error('expected a snapshot');
  return s;
}

describe('buildInactiveSummary', () => {
  it('returns [] when snapshot is null', () => {
    const positions = buildPositions([pp('10001')], DEFAULT_DEPT_TREE);
    expect(buildInactiveSummary(positions, null)).toEqual([]);
  });

  it('returns [] when every OBI position is in the active P&P roster', () => {
    const positions = buildPositions(
      [pp('10001'), pp('10002')],
      DEFAULT_DEPT_TREE,
    );
    const snap = snapOf([
      obi({ positionIdentifier: '10001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc' }),
      obi({ positionIdentifier: '10002', balanceAmount: 4500, accountDescription: 'Regular Salaries - Misc' }),
    ]);
    expect(buildInactiveSummary(positions, snap)).toEqual([]);
  });

  it('surfaces positions that are paid in OBI but absent from P&P', () => {
    const positions = buildPositions([pp('10001')], DEFAULT_DEPT_TREE);
    const snap = snapOf([
      obi({ positionIdentifier: '10001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc' }),
      obi({ positionIdentifier: '99001', balanceAmount: 3200, accountDescription: 'Regular Salaries - Misc',
            personFullName: 'Doe, John', personNumber: '54321' }),
    ]);
    const out = buildInactiveSummary(positions, snap);
    expect(out).toHaveLength(1);
    expect(out[0].positionId).toBe('99001');
    expect(out[0].lastIncumbent).toBe('Doe, John');
    expect(out[0].lastEmplId).toBe('54321');
    expect(out[0].total).toBe(3200);
    expect(out[0].regular).toBe(3200);
  });

  it('treats zero-padded OBI identifiers as the same key as P&P', () => {
    // Position is '00010001' in OBI, '10001' in P&P — normalize must join them.
    const positions = buildPositions([pp('10001')], DEFAULT_DEPT_TREE);
    const snap = snapOf([
      obi({ positionIdentifier: '00010001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc' }),
    ]);
    expect(buildInactiveSummary(positions, snap)).toEqual([]);
  });

  it('skips OBI rows with empty positionIdentifier', () => {
    const positions = buildPositions([pp('10001')], DEFAULT_DEPT_TREE);
    const snap = snapOf([
      obi({ positionIdentifier: '', balanceAmount: 200, accountDescription: 'Regular Salaries - Misc' }),
    ]);
    expect(buildInactiveSummary(positions, snap)).toEqual([]);
  });

  it('aggregates the 5 buckets per position', () => {
    const positions = buildPositions([pp('10001')], DEFAULT_DEPT_TREE);
    const snap = snapOf([
      obi({ positionIdentifier: '99001', balanceAmount: 4000, accountDescription: 'Regular Salaries - Misc' }),
      obi({ positionIdentifier: '99001', balanceAmount: 500,  accountDescription: ACCOUNT_DESCRIPTIONS.overtime }),
      obi({ positionIdentifier: '99001', balanceAmount: 1200, accountDescription: ACCOUNT_DESCRIPTIONS.premium }),
      obi({ positionIdentifier: '99001', balanceAmount: 8000, accountDescription: ACCOUNT_DESCRIPTIONS.rpo }),
      obi({ positionIdentifier: '99001', balanceAmount: 300,  accountDescription: ACCOUNT_DESCRIPTIONS.tempLsp }),
    ]);
    const [s] = buildInactiveSummary(positions, snap);
    expect(s.total).toBe(14000);
    expect(s.regular).toBe(4000);
    expect(s.overtime).toBe(500);
    expect(s.premium).toBe(1200);
    expect(s.rpo).toBe(8000);
    expect(s.tempLsp).toBe(300);
    expect(s.rowCount).toBe(5);
  });

  it('reasonHint = retirement-payout when RPO > 0', () => {
    const positions: ReturnType<typeof buildPositions> = [];
    const snap = snapOf([
      obi({ positionIdentifier: '99001', balanceAmount: 3000, accountDescription: 'Regular Salaries - Misc' }),
      obi({ positionIdentifier: '99001', balanceAmount: 9000, accountDescription: ACCOUNT_DESCRIPTIONS.rpo }),
    ]);
    expect(buildInactiveSummary(positions, snap)[0].reasonHint).toBe('retirement-payout');
  });

  it('reasonHint = temp-lumpsum-payoff when tempLsp > 0 and no RPO', () => {
    const positions: ReturnType<typeof buildPositions> = [];
    const snap = snapOf([
      obi({ positionIdentifier: '99001', balanceAmount: 700, accountDescription: ACCOUNT_DESCRIPTIONS.tempLsp }),
    ]);
    expect(buildInactiveSummary(positions, snap)[0].reasonHint).toBe('temp-lumpsum-payoff');
  });

  it('reasonHint = wages-only when only regular / OT / premium are non-zero', () => {
    const positions: ReturnType<typeof buildPositions> = [];
    const snap = snapOf([
      obi({ positionIdentifier: '99001', balanceAmount: 2200, accountDescription: 'Regular Salaries - Misc' }),
      obi({ positionIdentifier: '99001', balanceAmount: 80,   accountDescription: ACCOUNT_DESCRIPTIONS.premium }),
    ]);
    expect(buildInactiveSummary(positions, snap)[0].reasonHint).toBe('wages-only');
  });

  it('picks last-known incumbent from the latest PPE for the position', () => {
    const positions: ReturnType<typeof buildPositions> = [];
    const snap = snapOf([
      obi({ positionIdentifier: '99001', balanceAmount: 1000, accountDescription: 'Regular Salaries - Misc',
            earningPeriodEnd: '2026-03-13', _asOfDate: '2026-05-08',
            personFullName: 'Old, Name', personNumber: '99999' }),
      obi({ positionIdentifier: '99001', balanceAmount: 1000, accountDescription: 'Regular Salaries - Misc',
            earningPeriodEnd: '2026-05-08', _asOfDate: '2026-05-08',
            personFullName: 'New, Name', personNumber: '88888' }),
    ]);
    const [s] = buildInactiveSummary(positions, snap);
    expect(s.lastIncumbent).toBe('New, Name');
    expect(s.lastEmplId).toBe('88888');
    expect(s.lastPpe).toBe('2026-05-08');
  });

  it('falls back across blank-name rows when picking last incumbent', () => {
    const positions: ReturnType<typeof buildPositions> = [];
    const snap = snapOf([
      obi({ positionIdentifier: '99001', balanceAmount: 1000, accountDescription: ACCOUNT_DESCRIPTIONS.rpo,
            earningPeriodEnd: '2026-05-08', _asOfDate: '2026-05-08',
            personFullName: '', personNumber: '' }),
      obi({ positionIdentifier: '99001', balanceAmount: 500,  accountDescription: 'Regular Salaries - Misc',
            earningPeriodEnd: '2026-04-24', _asOfDate: '2026-05-08',
            personFullName: 'Earlier, Name', personNumber: '11111' }),
    ]);
    const [s] = buildInactiveSummary(positions, snap);
    // RPO row has the latest PPE but blank name; we should fall back to the
    // earlier wages row that does have a name. lastPpe still reflects MAX
    // across all rows (not just the named one).
    expect(s.lastIncumbent).toBe('Earlier, Name');
    expect(s.lastEmplId).toBe('11111');
    expect(s.lastPpe).toBe('2026-05-08');
  });

  it('sorts results by total FYTD spend descending', () => {
    const positions: ReturnType<typeof buildPositions> = [];
    const snap = snapOf([
      obi({ positionIdentifier: '99001', balanceAmount: 1000, accountDescription: 'Regular Salaries - Misc' }),
      obi({ positionIdentifier: '99002', balanceAmount: 9000, accountDescription: 'Regular Salaries - Misc' }),
      obi({ positionIdentifier: '99003', balanceAmount: 4000, accountDescription: 'Regular Salaries - Misc' }),
    ]);
    const out = buildInactiveSummary(positions, snap);
    expect(out.map(s => s.positionId)).toEqual(['99002', '99003', '99001']);
  });
});
