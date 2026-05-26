import { describe, it, expect } from 'vitest';
import { buildPositions, hasDeptMismatch } from './build';
import { DEFAULT_DEPT_TREE } from '../reference/dept-tree';
import type { PsHcmPpRow } from '../importers/types';

function row(overrides: Partial<PsHcmPpRow> = {}): PsHcmPpRow {
  return {
    _source: 'ps-hcm-pp',
    snapshotDate: '2026-05-20',
    positionNumber: '10001',
    jobCode: '6278',
    jobCodeDescription: 'Building Inspector',
    positionDivision: 'DBI Inspection Services',
    departmentCode: '232000',
    departmentName: 'DBI Inspection Services',
    positionMaxHeadcount: 1,
    positionStatus: 'Approved',
    fillStatus: 'FILLED',
    vice1EmplId: '',
    vice1Name: '',
    previousEmployee: '',
    emplId: 'E12345',
    employeeName: 'Smith, Jane',
    employeeStatus: 'A',
    appointmentType: 'PCS',
    exemptCategory: '00 Not Exempt',
    salaryStep: '5',
    hourlyRate: 63.46,
    meritIncreaseDate: '2026-07-01',
    reportsToPosition: '',
    managerFirstName: '',
    managerLastName: '',
    cat1718AppointmentDate: '',
    cat1718ExemptCode: '',
    cat1718ExemptMonths: 0,
    cat1718TxExpiredDate: '',
    rosterCode: '21',
    rosterDescription: 'SEIU 1021',
    comboCode: '',
    comboDepartmentCode: '',
    comboDepartmentName: '',
    rtfId: '',
    rtfSubmittedDate: '',
    rtfStatus: '',
    rtfExpectedFillDate: '',
    budgetDepartmentCode: '232000',
    budgetDepartmentName: 'DBI Inspection Services',
    budgetJobCode: '6278',
    fte: 1,
    employeeJobCode: '6278',
    vacantDate: '',
    _row: 2,
    ...overrides,
  };
}

describe('buildPositions', () => {
  it('builds a Position from a single P&P row', () => {
    const positions = buildPositions([row()], DEFAULT_DEPT_TREE);
    expect(positions).toHaveLength(1);
    const p = positions[0];
    expect(p.id).toBe('10001');
    expect(p.displayNumber).toBe('10001');
    expect(p.jobCode).toBe('6278');
    expect(p.fillStatus).toBe('FILLED');
    expect(p.fte).toBe(1);
  });

  it('models the three department concepts explicitly', () => {
    const p = buildPositions(
      [row({
        departmentCode: '232000', departmentName: 'DBI Inspection Services',
        budgetDepartmentCode: '233000', budgetDepartmentName: 'DBI Permit Services',
      })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(p.effectiveDept.code).toBe('232000');
    expect(p.effectiveDept.name).toBe('DBI Inspection Services');
    expect(p.budgetedDept.code).toBe('233000');
    expect(p.budgetedDept.name).toBe('DBI Permit Services');
    // Both should resolve to a node in the seed tree
    expect(p.effectiveDept.node?.deptGroup).toBe('DBI');
    expect(p.budgetedDept.node?.deptGroup).toBe('DBI');
  });

  it('resolves dept hierarchy from the seed tree', () => {
    const p = buildPositions([row({ departmentCode: '229235' })], DEFAULT_DEPT_TREE)[0];
    expect(p.effectiveDept.hierarchy.map(n => n.code)).toEqual(['229235', '229000']);
  });

  it('leaves DepartmentRef.node null when code is unknown', () => {
    const p = buildPositions(
      [row({ departmentCode: '999999', departmentName: 'Unknown Dept' })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(p.effectiveDept.code).toBe('999999');
    expect(p.effectiveDept.name).toBe('Unknown Dept');
    expect(p.effectiveDept.node).toBeNull();
    expect(p.effectiveDept.hierarchy).toEqual([]);
  });

  it('attaches an Appointment when the position is filled', () => {
    const p = buildPositions([row()], DEFAULT_DEPT_TREE)[0];
    expect(p.appointment?.emplId).toBe('E12345');
    expect(p.appointment?.type).toBe('PCS');
    expect(p.appointment?.hourlyRate).toBe(63.46);
  });

  it('omits Appointment for vacant positions', () => {
    const p = buildPositions(
      [row({ fillStatus: 'VACANT', emplId: '', employeeName: '', appointmentType: '' })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(p.appointment).toBeUndefined();
    expect(p.fillStatus).toBe('VACANT');
  });

  it('builds Cat 17/18 tracking only when the exempt code is 17 or 18', () => {
    const cat18 = buildPositions(
      [row({
        cat1718ExemptCode: '18',
        cat1718AppointmentDate: '2024-01-15',
        cat1718ExemptMonths: 36,
        cat1718TxExpiredDate: '2027-01-15',
      })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(cat18.appointment?.cat1718?.category).toBe('18');
    expect(cat18.appointment?.cat1718?.months).toBe(36);
    expect(cat18.appointment?.cat1718?.expiredDate).toBe('2027-01-15');

    const notExempt = buildPositions(
      [row({ cat1718ExemptCode: '', cat1718AppointmentDate: '2024-01-15' })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(notExempt.appointment?.cat1718).toBeUndefined();
  });

  it('attaches a ComboOverride when comboCode is set', () => {
    const p = buildPositions(
      [row({
        comboCode: 'DBII1',
        comboDepartmentCode: '232000',
        comboDepartmentName: 'DBI Inspection Services',
      })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(p.comboOverride?.code).toBe('DBII1');
    expect(p.comboOverride?.department.code).toBe('232000');
  });

  it('resolves reports-to from the parent position in the same set', () => {
    const positions = buildPositions(
      [
        row({ positionNumber: '20000', emplId: 'M99', employeeName: 'Park, Karen',
          managerFirstName: '', managerLastName: '' }),
        row({ positionNumber: '10001', reportsToPosition: '20000',
          managerFirstName: 'Karen', managerLastName: 'Park' }),
      ],
      DEFAULT_DEPT_TREE,
    );
    const child = positions.find(p => p.id === '10001')!;
    expect(child.reportsTo?.positionNumber).toBe('20000');
    expect(child.reportsTo?.managerFirstName).toBe('Karen');
    expect(child.reportsTo?.managerLastName).toBe('Park');
  });

  it('deduplicates by position id (keeps first row)', () => {
    const positions = buildPositions(
      [
        row({ positionNumber: '10001', employeeName: 'Smith, Jane' }),
        row({ positionNumber: '10001', employeeName: 'Doe, John' }),
      ],
      DEFAULT_DEPT_TREE,
    );
    expect(positions).toHaveLength(1);
    expect(positions[0].appointment?.name).toBe('Smith, Jane');
  });

  it('normalizes position numbers (zero-padded variants merge by id)', () => {
    const positions = buildPositions(
      [row({ positionNumber: '00010001' })],
      DEFAULT_DEPT_TREE,
    );
    expect(positions[0].id).toBe('10001');
    expect(positions[0].displayNumber).toBe('00010001');
  });

  it('attaches userNotes from the passed map', () => {
    const notes = new Map([['10001', 'Cat 18 set up for 5-year IS project per DHR override letter']]);
    const p = buildPositions([row()], DEFAULT_DEPT_TREE, { userNotes: notes })[0];
    expect(p.userNotes).toMatch(/IS project/);
  });

  it('sorts output by displayNumber numerically', () => {
    const positions = buildPositions(
      [
        row({ positionNumber: '20000' }),
        row({ positionNumber: '300' }),
        row({ positionNumber: '10001' }),
      ],
      DEFAULT_DEPT_TREE,
    );
    expect(positions.map(p => p.displayNumber)).toEqual(['300', '10001', '20000']);
  });
});

describe('hasDeptMismatch', () => {
  it('returns false when budgeted = effective', () => {
    const p = buildPositions(
      [row({ departmentCode: '232000', budgetDepartmentCode: '232000' })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(hasDeptMismatch(p)).toBe(false);
  });

  it('returns true when budgeted != effective and no combo override', () => {
    const p = buildPositions(
      [row({ departmentCode: '232000', budgetDepartmentCode: '233000' })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(hasDeptMismatch(p)).toBe(true);
  });

  it('returns false when combo override targets budgeted dept (mismatch reconciled)', () => {
    const p = buildPositions(
      [row({
        departmentCode: '232000', budgetDepartmentCode: '233000',
        comboCode: 'DBII1',
        comboDepartmentCode: '233000', comboDepartmentName: 'DBI Permit Services',
      })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(hasDeptMismatch(p)).toBe(false);
  });

  it('returns false when either side is unknown (avoid noise)', () => {
    const p = buildPositions(
      [row({ departmentCode: '', budgetDepartmentCode: '232000' })],
      DEFAULT_DEPT_TREE,
    )[0];
    expect(hasDeptMismatch(p)).toBe(false);
  });
});
