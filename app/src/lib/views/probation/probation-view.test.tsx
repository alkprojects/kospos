/**
 * Light render tests for ProbationsView. Heavy interactive coverage lives
 * on the preview-MCP walkthrough; this file pins:
 *
 *  - Empty-state copy when no probations exist
 *  - Renders rows when probations are added via the store
 *  - Add form requires employee name + start date (blank → error)
 *  - Add form succeeds → new row appears
 *  - Status filter narrows the visible rows
 *  - Search input narrows the visible rows
 *  - Summary header count tracks filtered set
 *  - "Alerted only" toggle narrows to approaching + past-due rows
 *  - Row click opens detail modal
 *  - Delete from modal removes the row
 *  - Status guard rejects backward transition without override
 *  - Add extension auto-transitions open → extended
 *
 * The store is reset between tests via clearAll().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProbationsView } from './ProbationsView';
import { useProbations } from '../../probation';
import { useAppStore } from '../../store';
import type { PsHcmPpRow } from '../../importers/types';

/** Minimal PS-HCM P&P row helper for tests that need positions + incumbents
 *  loaded so the people-index has entries (employee-name / # autocomplete). */
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
  useProbations.getState().clearAll();
  useAppStore.getState().clearAll();
});

describe('ProbationsView', () => {
  it('shows empty-state copy when no probations exist', () => {
    render(<ProbationsView />);
    expect(screen.getByText(/No probations yet/i)).toBeInTheDocument();
  });

  it('renders one row per probation in the store', () => {
    useProbations.getState().addProbation({
      employeeName: 'Smith, Alice',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    useProbations.getState().addProbation({
      employeeName: 'Jones, Bob',
      probationaryPeriodHours: 1040,
      startWorkDate: '2026-02-01',
    });
    render(<ProbationsView />);
    expect(screen.getByText('Smith, Alice')).toBeInTheDocument();
    expect(screen.getByText('Jones, Bob')).toBeInTheDocument();
  });

  it('shows summary header stats reflecting added probations', () => {
    useProbations.getState().addProbation({
      employeeName: 'A',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    useProbations.getState().addProbation({
      employeeName: 'B',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    render(<ProbationsView />);
    // "Probations" label appears in the summary header.
    expect(screen.getAllByText(/Probations/i).length).toBeGreaterThan(0);
    // The count "2" is rendered in multiple places (top-line stat + Open
    // bucket); confirm at least one renders.
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('add form rejects blank employee name with an inline error', () => {
    render(<ProbationsView />);
    const addButton = screen.getByRole('button', { name: /Add probation/i });
    fireEvent.click(addButton);
    expect(screen.getByText(/Employee name is required/i)).toBeInTheDocument();
  });

  it('add form rejects blank start date with an inline error', () => {
    render(<ProbationsView />);
    const nameInput = screen.getByLabelText(/Employee name/i);
    fireEvent.change(nameInput, { target: { value: 'Test, A' } });
    // Leave start date blank.
    const addButton = screen.getByRole('button', { name: /Add probation/i });
    fireEvent.click(addButton);
    expect(screen.getByText(/Start work date is required/i)).toBeInTheDocument();
  });

  it('add form succeeds and renders the new row', () => {
    render(<ProbationsView />);
    const nameInput = screen.getByLabelText(/Employee name/i);
    fireEvent.change(nameInput, { target: { value: 'Newhire, Just' } });
    const startInput = screen.getByLabelText(/Start work date/i);
    fireEvent.change(startInput, { target: { value: '2026-05-15' } });
    const addButton = screen.getByRole('button', { name: /Add probation/i });
    fireEvent.click(addButton);
    expect(screen.getByText('Newhire, Just')).toBeInTheDocument();
    const stored = useProbations.getState().toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe('open');
    expect(stored[0].probationaryPeriodHours).toBe(2080); // form default
    expect(stored[0].startWorkDate).toBe('2026-05-15');
  });

  it('status filter chip narrows the visible rows', () => {
    useProbations.getState().addProbation({
      employeeName: 'OpenOne',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      status: 'open',
    });
    useProbations.getState().addProbation({
      employeeName: 'ClearedOne',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      status: 'cleared',
    });
    render(<ProbationsView />);

    expect(screen.getByText('OpenOne')).toBeInTheDocument();
    expect(screen.getByText('ClearedOne')).toBeInTheDocument();

    // Click "Cleared · 1" filter chip → only cleared visible.
    const clearedChip = screen.getByRole('radio', { name: /Cleared · 1/i });
    fireEvent.click(clearedChip);
    expect(screen.queryByText('OpenOne')).not.toBeInTheDocument();
    expect(screen.getByText('ClearedOne')).toBeInTheDocument();
  });

  it('search input narrows the visible rows', () => {
    useProbations.getState().addProbation({
      employeeName: 'Alpha, One',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    useProbations.getState().addProbation({
      employeeName: 'Beta, Two',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    render(<ProbationsView />);

    const search = screen.getByLabelText(/Search probations/i);
    fireEvent.change(search, { target: { value: 'Alpha' } });
    expect(screen.getByText('Alpha, One')).toBeInTheDocument();
    expect(screen.queryByText('Beta, Two')).not.toBeInTheDocument();
  });

  it('count hint shows "of N total" when a filter narrows the set', () => {
    useProbations.getState().addProbation({
      employeeName: 'OpenOne',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      status: 'open',
    });
    useProbations.getState().addProbation({
      employeeName: 'ClearedOne',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      status: 'cleared',
    });
    render(<ProbationsView />);
    fireEvent.click(screen.getByRole('radio', { name: /Cleared · 1/i }));
    expect(screen.getByText(/of 2 total/i)).toBeInTheDocument();
  });

  it('alerted-only toggle narrows to approaching + past-due rows', () => {
    // Past-due: start 1 year ago, baseEndDate 5 months ago, status open
    useProbations.getState().addProbation({
      employeeName: 'PastDue, Now',
      probationaryPeriodHours: 2080,
      startWorkDate: '2025-01-01',
      baseEndDate: '2025-12-31',
      status: 'open',
    });
    // Healthy: start now, ends 1 year out, status open
    useProbations.getState().addProbation({
      employeeName: 'Healthy, Hue',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-05-01',
      baseEndDate: '2027-05-01',
      status: 'open',
    });
    render(<ProbationsView />);

    // Both visible initially.
    expect(screen.getByText('PastDue, Now')).toBeInTheDocument();
    expect(screen.getByText('Healthy, Hue')).toBeInTheDocument();

    const toggle = screen.getByLabelText(/Show only alerted rows/i);
    fireEvent.click(toggle);
    expect(screen.getByText('PastDue, Now')).toBeInTheDocument();
    expect(screen.queryByText('Healthy, Hue')).not.toBeInTheDocument();
  });

  it('row click opens the detail modal', () => {
    useProbations.getState().addProbation({
      employeeName: 'Detail, Subject',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    render(<ProbationsView />);
    const row = screen.getByLabelText(/Open details for probation Detail, Subject/i);
    fireEvent.click(row);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
  });

  it('detail modal delete removes the row', () => {
    useProbations.getState().addProbation({
      employeeName: 'Doomed, Row',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    render(<ProbationsView />);
    fireEvent.click(screen.getByLabelText(/Open details for probation Doomed, Row/i));
    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);
    expect(screen.queryByText('Doomed, Row')).not.toBeInTheDocument();
    expect(screen.getByText(/No probations yet/i)).toBeInTheDocument();
  });

  it('status guard rejects backward transition without override', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'GuardCase, A',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      status: 'cleared',
    });
    render(<ProbationsView />);
    fireEvent.click(screen.getByLabelText(/Open details for probation GuardCase, A/i));

    // Change status back to "open" (backward from terminal).
    const statusSelect = screen.getByLabelText(/^Status$/i);
    fireEvent.change(statusSelect, { target: { value: 'open' } });

    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    expect(saveBtn).toBeDisabled();

    // Check the override checkbox + fill reason → Save enables. (Use the
    // label-scoped selector — the parent view also has an "Alerted only"
    // checkbox, so getByRole('checkbox') would match multiple.)
    const overrideChk = screen.getByLabelText(/Force override/i);
    fireEvent.click(overrideChk);
    const reasonInput = screen.getByLabelText(/Override reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Recorded wrong outcome' } });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    // Status updated + override reason logged in history.
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.status).toBe('open');
    const statusEntry = rec.history.find(h => h.field === 'status')!;
    expect(statusEntry.overrideReason).toBe('Recorded wrong outcome');
  });

  it('add form: picking a different name from the datalist updates the employee # (regression — was sticky on the old person)', () => {
    // Two known incumbents on two positions.
    useAppStore.getState().addRows([
      ppRow('50001', { employeeName: 'Smith, John', emplId: '111111', jobCode: '1820' }),
      ppRow('50002', { employeeName: 'Smith, Jane', emplId: '222222', jobCode: '1820' }),
    ]);
    render(<ProbationsView />);

    const nameInput = screen.getByLabelText(/Employee name/i);
    const idInput = screen.getByLabelText(/Employee number/i);

    // Pick John first — name + id auto-fill.
    fireEvent.change(nameInput, { target: { value: 'Smith, John' } });
    expect((nameInput as HTMLInputElement).value).toBe('Smith, John');
    expect((idInput as HTMLInputElement).value).toBe('111111');

    // Now pick Jane via the name datalist.
    fireEvent.change(nameInput, { target: { value: 'Smith, Jane' } });
    expect((nameInput as HTMLInputElement).value).toBe('Smith, Jane');
    // Before the fix, this assertion failed — the # stayed on '111111'.
    expect((idInput as HTMLInputElement).value).toBe('222222');
  });

  it('add form: picking a different employee # from the datalist updates the name (regression — was sticky on the old person)', () => {
    useAppStore.getState().addRows([
      ppRow('50001', { employeeName: 'Smith, John', emplId: '111111', jobCode: '1820' }),
      ppRow('50002', { employeeName: 'Smith, Jane', emplId: '222222', jobCode: '1820' }),
    ]);
    render(<ProbationsView />);

    const nameInput = screen.getByLabelText(/Employee name/i);
    const idInput = screen.getByLabelText(/Employee number/i);

    fireEvent.change(idInput, { target: { value: '111111' } });
    expect((nameInput as HTMLInputElement).value).toBe('Smith, John');
    expect((idInput as HTMLInputElement).value).toBe('111111');

    fireEvent.change(idInput, { target: { value: '222222' } });
    // Before the fix, this assertion failed — the name stayed on 'Smith, John'.
    expect((nameInput as HTMLInputElement).value).toBe('Smith, Jane');
    expect((idInput as HTMLInputElement).value).toBe('222222');
  });

  it('add extension from detail modal auto-transitions open → extended', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'ExtCase, E',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      baseEndDate: '2027-01-01',
      status: 'open',
    });
    render(<ProbationsView />);
    fireEvent.click(screen.getByLabelText(/Open details for probation ExtCase, E/i));

    fireEvent.click(screen.getByRole('button', { name: /\+ Add extension/i }));
    const newEndInput = screen.getByLabelText(/Extension new end date/i);
    fireEvent.change(newEndInput, { target: { value: '2027-07-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Save extension/i }));

    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.extensions).toHaveLength(1);
    expect(rec.extensions[0].newEndDate).toBe('2027-07-01');
    expect(rec.status).toBe('extended');
  });
});
