/**
 * Light render smoke tests for StaffingPlanView. Heavy interactive coverage
 * lives on the preview-MCP walkthrough; this file pins:
 *
 *  - Empty-state copy when no positions are loaded
 *  - Summary header counts update when actions are added
 *  - "X of Y priced ⚠" chip appears + disappears with the unpriced count
 *  - Sections render the correct slice of the action list
 *
 * The store is reset between tests via `clearAll()`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StaffingPlanView } from './StaffingPlanView';
import { useStaffingPlan } from '../../staffing-plan';
import { useAppStore } from '../../store';
import type { PsHcmPpRow } from '../../importers/types';

function ppRow(positionNumber: string, partial: Partial<PsHcmPpRow> = {}): PsHcmPpRow {
  return {
    _source: 'ps-hcm-pp',
    _row: 1,
    positionNumber,
    displayNumber: positionNumber,
    jobCode: '1234',
    jobCodeDescription: 'Test Class',
    departmentCode: '229000',
    effectiveDepartmentCode: '229000',
    departmentName: 'TEST',
    fillStatus: 'FILLED',
    positionStatus: 'A',
    fte: 1.0,
    maxHeadcount: 1,
    snapshotDate: '2026-05-20',
    name: 'Test Person',
    emplId: '11111',
    appointmentType: 'PCS',
    status: 'A',
    salaryStep: '4',
    hourlyRate: 50,
    meritIncreaseDate: '2026-08-01',
    ...partial,
  } as PsHcmPpRow;
}

beforeEach(() => {
  useStaffingPlan.getState().clearAll();
  useAppStore.getState().clearAll();
});

describe('StaffingPlanView', () => {
  it('shows empty state when no positions are loaded', () => {
    render(<StaffingPlanView />);
    expect(screen.getByText(/No positions loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/Load a PS HCM P&P snapshot/i)).toBeInTheDocument();
  });

  it('renders the summary header + 5 sections when positions exist', () => {
    useAppStore.getState().addRows([ppRow('50001'), ppRow('50002')]);
    render(<StaffingPlanView />);

    // Header chip per type
    expect(screen.getByText(/Active · 0/i)).toBeInTheDocument();
    expect(screen.getByText(/Separations · 0/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending · 0/i)).toBeInTheDocument();
    expect(screen.getByText(/TEMP · 0/i)).toBeInTheDocument();
    expect(screen.getByText(/Unfunded · 0/i)).toBeInTheDocument();

    // Net cost impact stat
    expect(screen.getByText(/Net cost impact/i)).toBeInTheDocument();
  });

  it('header rolls up Active count when an action is added via the store', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    render(<StaffingPlanView />);
    expect(screen.getByText(/Active · 1/i)).toBeInTheDocument();
  });

  it('renders unpriced cell in row when basis is null', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    const { container } = render(<StaffingPlanView />);
    // Cell-level match — "unpriced" italic cell content distinct from
    // the "X unpriced" hint label and any "Unfunded" section copy.
    const cells = container.querySelectorAll('td');
    const unpricedCell = [...cells].find(c => c.textContent === 'unpriced');
    expect(unpricedCell).toBeTruthy();
  });

  it('"X of Y priced ⚠" diagnostic chip appears on a section with unpriced actions', () => {
    useAppStore.getState().addRows([ppRow('50001'), ppRow('50002')]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    useStaffingPlan.getState().addAction({ positionId: '50002', type: 'active-hire' });
    render(<StaffingPlanView />);
    expect(screen.getByText(/0 of 2 priced/)).toBeInTheDocument();
  });

  it('add form rejects unknown position numbers with an inline error', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    render(<StaffingPlanView />);
    const input = screen.getByPlaceholderText(/e\.g\. 50001/i);
    fireEvent.change(input, { target: { value: '99999' } });
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText(/not in the loaded P&P snapshot/i)).toBeInTheDocument();
  });

  it('add form successfully creates an action that lands in the section table', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    render(<StaffingPlanView />);
    const input = screen.getByPlaceholderText(/e\.g\. 50001/i);
    fireEvent.change(input, { target: { value: '50001' } });
    fireEvent.click(screen.getByText('Add'));
    // Header count flips to 1
    expect(screen.getByText(/Active · 1/i)).toBeInTheDocument();
    // The new row appears in the table (position # cell)
    expect(screen.getAllByText('50001').length).toBeGreaterThan(0);
  });

  it('delete button removes a row from the section', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    render(<StaffingPlanView />);
    expect(screen.getByText(/Active · 1/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Delete action for position 50001/i));
    expect(screen.getByText(/Active · 0/i)).toBeInTheDocument();
  });

  it('Marco Jacobo pattern: same position with 3 different action types shows in 3 sections', () => {
    useAppStore.getState().addRows([ppRow('1115135')]);
    useStaffingPlan.getState().addAction({ positionId: '1115135', type: 'active-hire' });
    useStaffingPlan.getState().addAction({ positionId: '1115135', type: 'separation' });
    useStaffingPlan.getState().addAction({ positionId: '1115135', type: 'temp-tracking' });
    render(<StaffingPlanView />);
    // Header counts split correctly
    expect(screen.getByText(/Active · 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Separations · 1/i)).toBeInTheDocument();
    expect(screen.getByText(/TEMP · 1/i)).toBeInTheDocument();
    // Multi-action positions summary surfaces the position
    expect(screen.getByText(/Multi-action positions/i)).toBeInTheDocument();
  });
});
