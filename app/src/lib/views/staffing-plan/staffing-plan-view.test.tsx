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

  // --------------------------------------------------------------------------
  // Bug 3 (S29) — derived defaults + Manual user changes section
  // --------------------------------------------------------------------------

  it('Bug 3: vacant position with no manual action auto-populates Pending', () => {
    useAppStore.getState().addRows([ppRow('50001', { fillStatus: 'VACANT' })]);
    render(<StaffingPlanView />);
    expect(screen.getByText(/Pending · 1/i)).toBeInTheDocument();
    // The auto-chip badge appears on the row.
    expect(screen.getAllByText('auto').length).toBeGreaterThan(0);
    // The Hide button is available (not Delete).
    expect(screen.getByLabelText(/Hide auto-populated row for position 50001/i)).toBeInTheDocument();
  });

  it('Bug 3: Cat 17 position with no manual action auto-populates TEMP', () => {
    useAppStore.getState().addRows([
      ppRow('60001', { fillStatus: 'FILLED', cat1718ExemptCode: '17', cat1718ExemptMonths: 24, cat1718AppointmentDate: '2025-01-01', cat1718TxExpiredDate: '2027-01-01' }),
    ]);
    render(<StaffingPlanView />);
    expect(screen.getByText(/TEMP · 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Cat 17 temp/i)).toBeInTheDocument();
  });

  it('Bug 3: manual action on a vacant position suppresses the auto-Pending row', () => {
    useAppStore.getState().addRows([ppRow('50001', { fillStatus: 'VACANT' })]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    render(<StaffingPlanView />);
    expect(screen.getByText(/Active · 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending · 0/i)).toBeInTheDocument();
    // No auto badge — only the manual row.
    expect(screen.queryByText('auto')).not.toBeInTheDocument();
  });

  it('Bug 3: Hide button moves an auto row to the Manual user changes section', () => {
    useAppStore.getState().addRows([ppRow('50001', { fillStatus: 'VACANT' })]);
    render(<StaffingPlanView />);
    fireEvent.click(screen.getByLabelText(/Hide auto-populated row for position 50001/i));
    // Auto row leaves Pending
    expect(screen.getByText(/Pending · 0/i)).toBeInTheDocument();
    // Manual user changes section appears with 1 entry
    expect(screen.getByText(/Manual user changes · 1/i)).toBeInTheDocument();
    // Restore button is present
    expect(screen.getByLabelText(/Restore auto-populated row for position 50001/i)).toBeInTheDocument();
  });

  it('Bug 3: Restore button brings a hidden row back into its derived section', () => {
    useAppStore.getState().addRows([ppRow('50001', { fillStatus: 'VACANT' })]);
    useStaffingPlan.getState().hideDerivedAction('50001');
    render(<StaffingPlanView />);
    expect(screen.getByText(/Manual user changes · 1/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Restore auto-populated row for position 50001/i));
    // Row returns to Pending
    expect(screen.getByText(/Pending · 1/i)).toBeInTheDocument();
    // Manual user changes section disappears (no omissions left)
    expect(screen.queryByText(/Manual user changes/i)).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // S30 PR 2 — PlannedActionDetail modal: row-click drill-down, status guard,
  // convert-from-derived flow.
  // --------------------------------------------------------------------------

  it('S30: clicking a manual row opens the PlannedActionDetail modal', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    render(<StaffingPlanView />);
    // No modal initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Click the row — the position-id cell is inside the clickable <tr>
    const cells = screen.getAllByText('50001');
    // The first 50001 is the section row td; click its enclosing tr
    const tr = cells[0].closest('tr');
    expect(tr).toBeTruthy();
    fireEvent.click(tr!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Planned action detail/i)).toBeInTheDocument();
  });

  it('S30: clicking a derived row opens the modal in convert-from-auto mode', () => {
    useAppStore.getState().addRows([ppRow('50001', { fillStatus: 'VACANT' })]);
    render(<StaffingPlanView />);
    const cells = screen.getAllByText('50001');
    const tr = cells[0].closest('tr');
    fireEvent.click(tr!);
    // Modal mounted with the "converting from auto" affordance.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Converting from auto/i)).toBeInTheDocument();
    // Save button label reflects conversion.
    expect(screen.getByText(/Save \(convert to manual\)/i)).toBeInTheDocument();
  });

  it('S30: Cancel closes the modal without persisting changes', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    render(<StaffingPlanView />);
    fireEvent.click(screen.getAllByText('50001')[0].closest('tr')!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Store unchanged.
    expect(useStaffingPlan.getState().actions.size).toBe(1);
  });

  it('S30: Hide / Delete row buttons do NOT also open the modal (stopPropagation)', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    render(<StaffingPlanView />);
    fireEvent.click(screen.getByLabelText(/Delete action for position 50001/i));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('S30: status guard surfaces the force-override checkbox on backward transition', () => {
    useAppStore.getState().addRows([ppRow('50001')]);
    useStaffingPlan.getState().addAction({
      positionId: '50001', type: 'active-hire', status: 'offer',
    });
    render(<StaffingPlanView />);
    fireEvent.click(screen.getAllByText('50001')[0].closest('tr')!);
    // The status select inside the dialog is the one we want — getAllByLabelText
    // would also pick up other instances if the page had multiple; here it's
    // unique because the dialog mounts above.
    const statusSelect = screen.getByDisplayValue('offer') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'posted' } });
    // Force-override checkbox appears.
    expect(screen.getByText(/Force override/i)).toBeInTheDocument();
  });

  it('S30: convert-from-derived save materializes a manual action', () => {
    useAppStore.getState().addRows([ppRow('50001', { fillStatus: 'VACANT' })]);
    render(<StaffingPlanView />);
    // Header confirms the derived row.
    expect(screen.getByText(/Pending · 1/i)).toBeInTheDocument();
    expect(useStaffingPlan.getState().actions.size).toBe(0);

    fireEvent.click(screen.getAllByText('50001')[0].closest('tr')!);
    // Click Save (convert) — the basis is incomplete (no retCode / ppStartDate)
    // but that's allowed; the action saves with `basis: null`.
    fireEvent.click(screen.getByText(/Save \(convert to manual\)/i));

    // Modal closes; manual action appears in the store.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useStaffingPlan.getState().actions.size).toBe(1);
    const stored = useStaffingPlan.getState().toArray()[0];
    expect(stored.positionId).toBe('50001');
    expect(stored.type).toBe('pending');
  });

  // --------------------------------------------------------------------------
  // PR B (S30 follow-up) — global needle search on the Hiring Plan tab.
  // --------------------------------------------------------------------------

  it('search input filters actions to those whose position OR action matches', () => {
    useAppStore.getState().addRows([
      ppRow('50001', { fillStatus: 'VACANT', jobCode: '6278', jobCodeDescription: 'Building Inspector' }),
      ppRow('60001', { fillStatus: 'VACANT', jobCode: '5380', jobCodeDescription: 'Engineer' }),
    ]);
    render(<StaffingPlanView />);
    // Both auto-Pending rows are in the workspace.
    expect(screen.getByText(/Pending · 2/i)).toBeInTheDocument();

    // Search for "engineer" → 60001 stays, 50001 leaves.
    const input = screen.getByPlaceholderText(/Search any field/i);
    fireEvent.change(input, { target: { value: 'engineer' } });
    expect(screen.getByText(/Pending · 1/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 match/i)).toBeInTheDocument();

    // Clear the search → both rows return.
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText(/Pending · 2/i)).toBeInTheDocument();
  });

  it('search matches by position number (digits in the row)', () => {
    useAppStore.getState().addRows([
      ppRow('50001', { fillStatus: 'VACANT' }),
      ppRow('60001', { fillStatus: 'VACANT' }),
    ]);
    render(<StaffingPlanView />);
    const input = screen.getByPlaceholderText(/Search any field/i);
    fireEvent.change(input, { target: { value: '60001' } });
    expect(screen.getByText(/Pending · 1/i)).toBeInTheDocument();
  });

  it('search by incumbent name finds filled positions (joins to position record)', () => {
    // The position's incumbent name lives on `employeeName` on PsHcmPpRow;
    // buildAppointment lifts it into Position.appointment.name. The needle
    // walks both the action AND the position via the {action, position}
    // tuple, so a search for "Smith" hits position.appointment.name.
    useAppStore.getState().addRows([
      ppRow('50001', { fillStatus: 'FILLED', emplId: '11111', employeeName: 'Smith, Jane' }),
      ppRow('50002', { fillStatus: 'FILLED', emplId: '22222', employeeName: 'Doe, John' }),
    ]);
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    useStaffingPlan.getState().addAction({ positionId: '50002', type: 'active-hire' });
    render(<StaffingPlanView />);
    expect(screen.getByText(/Active · 2/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/Search any field/i);
    fireEvent.change(input, { target: { value: 'Smith' } });
    expect(screen.getByText(/Active · 1/i)).toBeInTheDocument();
  });
});
