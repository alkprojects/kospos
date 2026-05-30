/**
 * Render tests for PositionsView's cross-tab job-code scope (Phase 2.2.s,
 * Option C). The job code is set from the Eligibility tab via
 * usePositionsScope; this view filters its list to it, shows a clearable
 * banner, and surfaces a job-code-aware empty state.
 *
 * Heavy Position-building coverage lives in positions/positions.test.ts (pure
 * buildPositions). This file pins the view-layer scope behavior.
 *
 * Both stores are reset between tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PositionsView } from './PositionsView';
import { usePositionsScope } from './scope-store';
import { useAppStore } from '../../store';
import type { PsHcmPpRow, PsHcmEeAddlPayRow } from '../../importers/types';

/** Canonical-shape PS-HCM P&P row (mirrors positions/positions.test.ts). */
function ppRow(overrides: Partial<PsHcmPpRow> = {}): PsHcmPpRow {
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
  } as PsHcmPpRow;
}

/** Two positions with distinct job codes + incumbents so assertions can
 *  tell them apart regardless of the (shared) job-code column text. */
function seedTwoPositions() {
  useAppStore.getState().addRows([
    ppRow({ positionNumber: '10001', jobCode: '6278',
            jobCodeDescription: 'Building Inspector', employeeName: 'Smith, Jane' }),
    ppRow({ positionNumber: '10002', jobCode: '1820',
            jobCodeDescription: 'Junior Admin Analyst', employeeName: 'Doe, John',
            budgetJobCode: '1820', employeeJobCode: '1820', _row: 3 }),
  ]);
}

/** Minimal EE Additional Pay row for the Position Detail join-by-emplId tests. */
function eeRow(overrides: Partial<PsHcmEeAddlPayRow> = {}): PsHcmEeAddlPayRow {
  return {
    _source: 'ps-hcm-ee-addl-pay',
    departmentGroupCode: 'DBI',
    departmentTitle: 'DBI Inspection Services',
    emplId: 'E12345',
    emplRecord: 0,
    effectiveDate: '2026-01-12',
    lastName: 'Smith',
    firstName: 'Jane',
    middleName: '',
    preferredFirstName: '',
    rosterCode: '21',
    rosterDescription: 'SEIU 1021',
    payStatus: 'A',
    jobCode: '6278',
    unionCode: '791',
    salaryPlan: '1',
    step: '5',
    additionalPayAmount: 250.5,
    rateCode: 'ACTFLT',
    _row: 9,
    ...overrides,
  };
}

beforeEach(() => {
  useAppStore.getState().clearAll();
  usePositionsScope.getState().clearScope();
});

describe('PositionsView — Additional Pay on Position Detail', () => {
  it('shows an Additional Pay card joined to the incumbent by emplId', () => {
    useAppStore.getState().addRows([
      ppRow({ positionNumber: '10001', emplId: 'E12345', employeeName: 'Smith, Jane' }),
      eeRow({ emplId: 'E12345', rateCode: 'ACTFLT', additionalPayAmount: 250.5 }),
    ]);
    render(<PositionsView />);
    fireEvent.click(screen.getByLabelText(/Open details for position 10001/i));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Additional Pay')).toBeInTheDocument();
    expect(within(dialog).getByText('ACTFLT')).toBeInTheDocument();
    expect(within(dialog).getByText('$250.50')).toBeInTheDocument();
  });

  it('omits the Additional Pay card when the incumbent has no matching rows', () => {
    useAppStore.getState().addRows([
      ppRow({ positionNumber: '10001', emplId: 'E12345', employeeName: 'Smith, Jane' }),
      eeRow({ emplId: 'E99999' }), // different employee — no join
    ]);
    render(<PositionsView />);
    fireEvent.click(screen.getByLabelText(/Open details for position 10001/i));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('Additional Pay')).not.toBeInTheDocument();
  });
});

describe('PositionsView — Additional Pay in the list', () => {
  it('shows an at-a-glance kind chip on a position whose incumbent has additional pay', () => {
    useAppStore.getState().addRows([
      ppRow({ positionNumber: '10001', emplId: 'E12345', employeeName: 'Smith, Jane' }),
      eeRow({ emplId: 'E12345', rateCode: 'SUPFLT' }),
    ]);
    render(<PositionsView />);
    // No modal open — "Supervisory" only appears as the list chip.
    expect(screen.getByText('Supervisory')).toBeInTheDocument();
    // The summary stat + filter toggle surface only when the source is loaded.
    expect(screen.getByText("Add'l pay")).toBeInTheDocument();
  });

  it('"Add’l pay only" filter narrows to positions with additional pay', () => {
    useAppStore.getState().addRows([
      ppRow({ positionNumber: '10001', jobCode: '0922', emplId: 'E12345', employeeName: 'Smith, Jane' }),
      ppRow({ positionNumber: '10002', jobCode: '1820', emplId: 'E22222', employeeName: 'Doe, John',
              budgetJobCode: '1820', employeeJobCode: '1820', _row: 3 }),
      eeRow({ emplId: 'E12345', rateCode: 'ACTFLT' }), // only Smith has additional pay
    ]);
    render(<PositionsView />);
    expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
    expect(screen.getByText('Doe, John')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /pay only/i }));
    expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
    expect(screen.queryByText('Doe, John')).not.toBeInTheDocument();
  });

  it('shows no additional-pay stat or filter when the source is not loaded', () => {
    useAppStore.getState().addRows([
      ppRow({ positionNumber: '10001', emplId: 'E12345', employeeName: 'Smith, Jane' }),
    ]);
    render(<PositionsView />);
    expect(screen.queryByText("Add'l pay")).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /pay only/i })).not.toBeInTheDocument();
  });
});

describe('PositionsView — cross-tab job-code scope', () => {
  it('shows all positions and no scope banner when nothing is scoped', () => {
    seedTwoPositions();
    render(<PositionsView />);
    expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
    expect(screen.getByText('Doe, John')).toBeInTheDocument();
    expect(screen.queryByText(/Filtered to job code:/i)).not.toBeInTheDocument();
  });

  it('filters the list to the scoped job code and shows a banner with the class title', () => {
    seedTwoPositions();
    usePositionsScope.getState().setJobCode('6278');
    render(<PositionsView />);
    // Banner present, with the class title resolved from the matching position.
    const banner = screen.getByText(/Filtered to job code:/i).closest('div')!;
    expect(within(banner).getByText('6278')).toBeInTheDocument();
    expect(within(banner).getByText('Building Inspector')).toBeInTheDocument();
    // Only the 6278 incumbent is in the table; the 1820 one is filtered out.
    expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
    expect(screen.queryByText('Doe, John')).not.toBeInTheDocument();
  });

  it('normalizes case/whitespace when matching the scoped code', () => {
    useAppStore.getState().addRows([
      ppRow({ positionNumber: '20001', jobCode: 'Q002',
              jobCodeDescription: 'Police Officer', employeeName: 'Roe, Pat',
              budgetJobCode: 'Q002', employeeJobCode: 'Q002' }),
    ]);
    usePositionsScope.getState().setJobCode('  q002  ');
    render(<PositionsView />);
    expect(screen.getByText('Roe, Pat')).toBeInTheDocument();
    expect(screen.getByText(/Filtered to job code:/i)).toBeInTheDocument();
  });

  it('clearing the banner filter restores the full list', () => {
    seedTwoPositions();
    usePositionsScope.getState().setJobCode('6278');
    render(<PositionsView />);
    expect(screen.queryByText('Doe, John')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear filter/i }));
    expect(usePositionsScope.getState().jobCode).toBeNull();
    expect(screen.getByText('Doe, John')).toBeInTheDocument();
  });

  it('shows a job-code-aware empty state when no position has the scoped code', () => {
    seedTwoPositions();
    usePositionsScope.getState().setJobCode('9999');
    render(<PositionsView />);
    expect(
      screen.getByText(/No positions in the loaded P&P snapshot have job code 9999\./i),
    ).toBeInTheDocument();
  });
});
