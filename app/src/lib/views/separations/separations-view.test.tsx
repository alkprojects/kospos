/**
 * Light render tests for SeparationsView. Heavy interactive coverage lives
 * on the preview-MCP walkthrough; this file pins:
 *
 *  - Empty-state copy when no separations exist
 *  - Renders rows when separations are added via the store
 *  - Add form requires employee name (blank → error)
 *  - Add form succeeds → new row appears
 *  - Status filter narrows the visible rows
 *  - Search input narrows the visible rows
 *  - Summary header count tracks filtered set
 *  - Row click opens detail modal
 *  - Delete from modal removes the row
 *  - "🔗 Linked" indicator surfaces when linkedActionId is set
 *
 * The store is reset between tests via clearAll().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeparationsView } from './SeparationsView';
import { useSeparations } from '../../separations';
import { useAppStore } from '../../store';

beforeEach(() => {
  useSeparations.getState().clearAll();
  useAppStore.getState().clearAll();
});

describe('SeparationsView', () => {
  it('shows empty-state copy when no separations exist', () => {
    render(<SeparationsView />);
    expect(screen.getByText(/No pending separations yet/i)).toBeInTheDocument();
  });

  it('renders one row per separation in the store', () => {
    useSeparations.getState().addSeparation({ employeeName: 'Smith, Alice' });
    useSeparations.getState().addSeparation({ employeeName: 'Jones, Bob' });
    render(<SeparationsView />);
    expect(screen.getByText('Smith, Alice')).toBeInTheDocument();
    expect(screen.getByText('Jones, Bob')).toBeInTheDocument();
  });

  it('shows summary header stats reflecting added separations', () => {
    useSeparations.getState().addSeparation({ employeeName: 'A' });
    useSeparations.getState().addSeparation({ employeeName: 'B' });
    render(<SeparationsView />);
    // "Pending separations" appears in both the summary stat label and the
    // footer copy; just confirm at least one matches.
    expect(screen.getAllByText(/Pending separations/i).length).toBeGreaterThan(0);
    // The count "2" is rendered in multiple places (top-line stat + per-status
    // Rumored bucket); confirm at least one renders.
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('add form rejects blank employee name with an inline error', () => {
    render(<SeparationsView />);
    const addButton = screen.getByRole('button', { name: /Add separation/i });
    fireEvent.click(addButton);
    expect(screen.getByText(/Employee name is required/i)).toBeInTheDocument();
  });

  it('add form succeeds and renders the new row', () => {
    render(<SeparationsView />);
    const nameInput = screen.getByLabelText(/Employee name/i);
    fireEvent.change(nameInput, { target: { value: 'Newhire, Just' } });
    const addButton = screen.getByRole('button', { name: /Add separation/i });
    fireEvent.click(addButton);
    // Row appears with the typed name (defaults are exercised in the entity
    // CRUD tests — here we just confirm the form pipes through to the store).
    expect(screen.getByText('Newhire, Just')).toBeInTheDocument();
    // The store now has one row with the default status (rumored). Confirm
    // via store state since the chip label "Rumored" collides with the filter
    // chip + bucket stat label.
    const stored = useSeparations.getState().toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe('rumored');
    expect(stored[0].confidence).toBe('medium');
  });

  it('status filter chip narrows the visible rows', () => {
    useSeparations.getState().addSeparation({ employeeName: 'RumoredOne', status: 'rumored' });
    useSeparations.getState().addSeparation({ employeeName: 'ConfirmedOne', status: 'confirmed' });
    render(<SeparationsView />);

    // Both visible initially.
    expect(screen.getByText('RumoredOne')).toBeInTheDocument();
    expect(screen.getByText('ConfirmedOne')).toBeInTheDocument();

    // Click "Confirmed · 1" filter chip → only confirmed visible.
    const confirmedChip = screen.getByRole('radio', { name: /Confirmed · 1/i });
    fireEvent.click(confirmedChip);
    expect(screen.queryByText('RumoredOne')).not.toBeInTheDocument();
    expect(screen.getByText('ConfirmedOne')).toBeInTheDocument();
  });

  it('search input narrows the visible rows', () => {
    useSeparations.getState().addSeparation({ employeeName: 'Alpha, One' });
    useSeparations.getState().addSeparation({ employeeName: 'Beta, Two' });
    render(<SeparationsView />);

    const search = screen.getByLabelText(/Search separations/i);
    fireEvent.change(search, { target: { value: 'Alpha' } });
    expect(screen.getByText('Alpha, One')).toBeInTheDocument();
    expect(screen.queryByText('Beta, Two')).not.toBeInTheDocument();
  });

  it('count hint shows "of N total" when a filter narrows the set', () => {
    useSeparations.getState().addSeparation({ employeeName: 'RumoredOne', status: 'rumored' });
    useSeparations.getState().addSeparation({ employeeName: 'ConfirmedOne', status: 'confirmed' });
    render(<SeparationsView />);
    fireEvent.click(screen.getByRole('radio', { name: /Confirmed · 1/i }));
    expect(screen.getByText(/of 2 total/i)).toBeInTheDocument();
  });

  it('row click opens the detail modal', () => {
    useSeparations.getState().addSeparation({ employeeName: 'Detail, Subject' });
    render(<SeparationsView />);
    const row = screen.getByLabelText(/Open details for separation Detail, Subject/i);
    fireEvent.click(row);
    // Modal renders with role=dialog and a Save button.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('detail modal delete removes the row', () => {
    useSeparations.getState().addSeparation({ employeeName: 'Doomed, Row' });
    render(<SeparationsView />);
    fireEvent.click(screen.getByLabelText(/Open details for separation Doomed, Row/i));
    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);
    expect(screen.queryByText('Doomed, Row')).not.toBeInTheDocument();
    // Back to empty state.
    expect(screen.getByText(/No pending separations yet/i)).toBeInTheDocument();
  });

  it('🔗 Linked indicator surfaces when linkedActionId is set', () => {
    useSeparations.getState().addSeparation({
      employeeName: 'Linked, Row',
      linkedActionId: 'pa-abc',
    });
    render(<SeparationsView />);
    expect(screen.getByText(/🔗 Linked/i)).toBeInTheDocument();
  });

  it('status guard rejects backward transition without override', () => {
    const id = useSeparations.getState().addSeparation({
      employeeName: 'GuardCase, A',
      status: 'confirmed',
    });
    render(<SeparationsView />);
    fireEvent.click(screen.getByLabelText(/Open details for separation GuardCase, A/i));

    // Change status back to "rumored" (backward).
    const statusSelect = screen.getByLabelText(/^Status$/i);
    fireEvent.change(statusSelect, { target: { value: 'rumored' } });

    // Save button should be disabled — override required.
    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    expect(saveBtn).toBeDisabled();

    // Check the override checkbox + fill reason → Save enables.
    const overrideChk = screen.getByRole('checkbox');
    fireEvent.click(overrideChk);
    const reasonInput = screen.getByLabelText(/Override reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Walked it back' } });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    // Status updated + override reason logged in history.
    const rec = useSeparations.getState().separations.get(id)!;
    expect(rec.status).toBe('rumored');
    const statusEntry = rec.history.find(h => h.field === 'status')!;
    expect(statusEntry.overrideReason).toBe('Walked it back');
  });
});
