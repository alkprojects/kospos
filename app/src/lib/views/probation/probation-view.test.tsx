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
import { ProbationsView, buildProbationNotificationEmail, buildProbationMailtoUri } from './ProbationsView';
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

  it('table row auto-resolves supervisor from the linked position.reportsTo when probation.supervisor is blank', () => {
    useAppStore.getState().addRows([
      ppRow('50001', {
        employeeName: 'Smith, John',
        emplId: '111111',
        jobCode: '1820',
        reportsToPosition: '40001',
        managerFirstName: 'Carey',
        managerLastName: 'McElroy',
      }),
    ]);
    useProbations.getState().addProbation({
      employeeName: 'Smith, John',
      employeeId: '111111',
      positionId: '50001',
      positionDisplayNumber: '50001',
      jobCode: '1820',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      // supervisor intentionally left blank → expect auto-resolution
    });
    render(<ProbationsView />);
    // The auto-resolved label "(auto)" only appears when supervisor is auto-
    // resolved (not when manually set).
    expect(screen.getByText('Carey McElroy')).toBeInTheDocument();
    expect(screen.getByText('(auto)')).toBeInTheDocument();
  });

  it('table row uses manual supervisor when set (overrides auto-resolution)', () => {
    useAppStore.getState().addRows([
      ppRow('50001', {
        employeeName: 'Smith, John',
        emplId: '111111',
        jobCode: '1820',
        reportsToPosition: '40001',
        managerFirstName: 'Carey',
        managerLastName: 'McElroy',
      }),
    ]);
    useProbations.getState().addProbation({
      employeeName: 'Smith, John',
      employeeId: '111111',
      positionId: '50001',
      positionDisplayNumber: '50001',
      jobCode: '1820',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      supervisor: 'Acting Supervisor, J.',
    });
    render(<ProbationsView />);
    // Manual value wins; no "(auto)" annotation.
    expect(screen.getByText('Acting Supervisor, J.')).toBeInTheDocument();
    expect(screen.queryByText('(auto)')).not.toBeInTheDocument();
    expect(screen.queryByText('Carey McElroy')).not.toBeInTheDocument();
  });

  it('table renders deputy column with free-text value when set', () => {
    useProbations.getState().addProbation({
      employeeName: 'Smith, John',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      deputy: 'Lee, Deputy',
    });
    render(<ProbationsView />);
    expect(screen.getByText('Lee, Deputy')).toBeInTheDocument();
  });

  it('add form: supervisor + deputy fields populate the new row', () => {
    render(<ProbationsView />);
    fireEvent.change(screen.getByLabelText(/Employee name/i), { target: { value: 'Newhire, Just' } });
    fireEvent.change(screen.getByLabelText(/Start work date/i), { target: { value: '2026-05-15' } });
    fireEvent.change(screen.getByLabelText(/^Supervisor$/i), { target: { value: 'Sup, A.' } });
    fireEvent.change(screen.getByLabelText(/^Deputy$/i), { target: { value: 'Dep, B.' } });
    fireEvent.click(screen.getByRole('button', { name: /Add probation/i }));

    const rows = useProbations.getState().toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].supervisor).toBe('Sup, A.');
    expect(rows[0].deputy).toBe('Dep, B.');
  });

  it('add form: picking the "6 months" preset sets endDate = start + 6 months + hours = 1040', () => {
    render(<ProbationsView />);
    fireEvent.change(screen.getByLabelText(/Employee name/i), { target: { value: 'Newhire, Just' } });
    fireEvent.change(screen.getByLabelText(/Start work date/i), { target: { value: '2026-01-15' } });
    // Default preset is 2080h; pick "6 months"
    fireEvent.click(screen.getByRole('radio', { name: /6 months/i }));
    // End date input should now show start + 6 months
    expect((screen.getByLabelText(/^End date$/i) as HTMLInputElement).value).toBe('2026-07-15');
    fireEvent.click(screen.getByRole('button', { name: /Add probation/i }));
    const stored = useProbations.getState().toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].baseEndDate).toBe('2026-07-15');
    expect(stored[0].probationaryPeriodHours).toBe(1040);
  });

  it('add form: picking the "1 year" preset sets endDate = start + 1 year + hours = 2080', () => {
    render(<ProbationsView />);
    fireEvent.change(screen.getByLabelText(/Employee name/i), { target: { value: 'Newhire, Just' } });
    fireEvent.change(screen.getByLabelText(/Start work date/i), { target: { value: '2026-01-15' } });
    fireEvent.click(screen.getByRole('radio', { name: /^1 year/i }));
    expect((screen.getByLabelText(/^End date$/i) as HTMLInputElement).value).toBe('2027-01-15');
    fireEvent.click(screen.getByRole('button', { name: /Add probation/i }));
    expect(useProbations.getState().toArray()[0].baseEndDate).toBe('2027-01-15');
    expect(useProbations.getState().toArray()[0].probationaryPeriodHours).toBe(2080);
  });

  it('add form: typing a custom end date snaps preset to Custom and preserves user value through submit', () => {
    render(<ProbationsView />);
    fireEvent.change(screen.getByLabelText(/Employee name/i), { target: { value: 'Newhire, Just' } });
    fireEvent.change(screen.getByLabelText(/Start work date/i), { target: { value: '2026-01-15' } });
    fireEvent.change(screen.getByLabelText(/^End date$/i), { target: { value: '2026-09-30' } });
    const customRadio = screen.getByRole('radio', { name: /^Custom$/i });
    expect(customRadio).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Add probation/i }));
    expect(useProbations.getState().toArray()[0].baseEndDate).toBe('2026-09-30');
  });

  it('table: clicking the end-date cell (no extensions) opens an inline date editor that saves on blur', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Edit, Me',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-15',
      baseEndDate: '2027-01-14',
    });
    render(<ProbationsView />);
    // Inline edit input is not present initially
    expect(screen.queryByLabelText(/End date for Edit, Me/i)).not.toBeInTheDocument();

    // Click the end-date cell text
    const endCellText = screen.getByText('2027-01-14');
    fireEvent.click(endCellText);

    // Inline input now present
    const inlineInput = screen.getByLabelText(/End date for Edit, Me/i) as HTMLInputElement;
    expect(inlineInput).toBeInTheDocument();

    // Change + blur → update commits
    fireEvent.change(inlineInput, { target: { value: '2027-03-01' } });
    fireEvent.blur(inlineInput);

    expect(useProbations.getState().probations.get(id)?.baseEndDate).toBe('2027-03-01');
  });

  it('table: end-date cell with extensions is read-only (forces detail-modal flow)', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'HasExt, Row',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-15',
      baseEndDate: '2027-01-14',
    });
    useProbations.getState().addExtension(id, { newEndDate: '2027-07-01' });
    render(<ProbationsView />);
    // Clicking the cell opens the detail modal — does NOT open an inline editor
    const endCellText = screen.getByText('2027-07-01');
    fireEvent.click(endCellText);
    expect(screen.queryByLabelText(/End date for HasExt, Row/i)).not.toBeInTheDocument();
    // The row's onClick should have run, opening detail modal
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  describe('buildProbationNotificationEmail', () => {
    it('addresses supervisor + deputy when both are set', () => {
      const { subject, body } = buildProbationNotificationEmail({
        employeeName: 'Smith, John',
        employeeId: '111111',
        positionDisplayNumber: '50001',
        supervisor: 'Carey McElroy',
        deputy: 'Park, Deputy',
        currentEnd: '2026-09-30',
      });
      expect(subject).toBe('Probation completion approaching — Smith, John');
      expect(body).toContain('Hello Carey McElroy and Park, Deputy,');
      expect(body).toContain("Smith, John (#111111)");
      expect(body).toContain('on position 50001');
      expect(body).toContain('completion date of 2026-09-30');
      expect(body).toContain('email HR');
    });

    it('addresses supervisor only when deputy is unset', () => {
      const { body } = buildProbationNotificationEmail({
        employeeName: 'Smith, Jane',
        supervisor: 'Carey McElroy',
        currentEnd: '2026-09-30',
      });
      // Greeting line specifically — body has unrelated " and " elsewhere
      // (e.g. "anything else that should be…"), so anchor to the start.
      expect(body.split('\n')[0]).toBe('Hello Carey McElroy,');
    });

    it('handles unknown supervisor + blank end date gracefully', () => {
      const { subject, body } = buildProbationNotificationEmail({
        employeeName: 'Unknown, Person',
        supervisor: '',
        currentEnd: '',
      });
      expect(subject).toBe('Probation completion approaching — Unknown, Person');
      expect(body).toContain('Hello (supervisor),');
      expect(body).toContain('(no end date set)');
    });
  });

  describe('buildProbationMailtoUri', () => {
    it('produces a well-formed mailto: URI with subject + body params', () => {
      const uri = buildProbationMailtoUri({
        employeeName: 'Smith, John',
        supervisor: 'Carey McElroy',
        currentEnd: '2026-09-30',
      });
      expect(uri.startsWith('mailto:?')).toBe(true);
      expect(uri).toContain('subject=Probation+completion+approaching'.replace(/\+/g, '%20'));
      // body= portion present
      expect(uri).toContain('body=');
    });

    it('encodes spaces as %20 (Outlook-safe), not +', () => {
      const uri = buildProbationMailtoUri({
        employeeName: 'Smith, John',
        supervisor: 'Carey McElroy',
        currentEnd: '2026-09-30',
      });
      // No raw '+' should appear in the URI body — all spaces are %20.
      expect(uri).not.toContain('+');
    });
  });

  describe('row selection + notification panel', () => {
    it('renders a select-all checkbox in the header and per-row checkboxes', () => {
      useProbations.getState().addProbation({
        employeeName: 'Row, One',
        probationaryPeriodHours: 2080,
        startWorkDate: '2026-01-01',
      });
      render(<ProbationsView />);
      expect(screen.getByLabelText(/Select all visible probations/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Select probation for Row, One/i)).toBeInTheDocument();
    });

    it('Generate emails button is hidden until 1+ rows are selected', () => {
      useProbations.getState().addProbation({
        employeeName: 'Row, One',
        probationaryPeriodHours: 2080,
        startWorkDate: '2026-01-01',
      });
      render(<ProbationsView />);
      expect(screen.queryByRole('button', { name: /Generate emails/i })).not.toBeInTheDocument();
      fireEvent.click(screen.getByLabelText(/Select probation for Row, One/i));
      expect(screen.getByRole('button', { name: /Generate emails/i })).toBeInTheDocument();
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    });

    it('selecting via row checkbox does NOT open the detail modal (stopPropagation)', () => {
      useProbations.getState().addProbation({
        employeeName: 'Row, One',
        probationaryPeriodHours: 2080,
        startWorkDate: '2026-01-01',
      });
      render(<ProbationsView />);
      fireEvent.click(screen.getByLabelText(/Select probation for Row, One/i));
      // Detail modal should NOT have opened
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('Clear button resets the selection', () => {
      useProbations.getState().addProbation({
        employeeName: 'Row, One',
        probationaryPeriodHours: 2080,
        startWorkDate: '2026-01-01',
      });
      render(<ProbationsView />);
      fireEvent.click(screen.getByLabelText(/Select probation for Row, One/i));
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^Clear$/i }));
      expect(screen.queryByText(/1 selected/i)).not.toBeInTheDocument();
    });

    it('clicking Generate emails opens the notification panel with mailto: + copy buttons per selected row', () => {
      useProbations.getState().addProbation({
        employeeName: 'Smith, John',
        probationaryPeriodHours: 2080,
        startWorkDate: '2026-01-01',
        supervisor: 'Carey McElroy',
        deputy: 'Park, Deputy',
      });
      useProbations.getState().addProbation({
        employeeName: 'Smith, Jane',
        probationaryPeriodHours: 2080,
        startWorkDate: '2026-01-01',
        supervisor: 'Carey McElroy',
      });
      render(<ProbationsView />);

      // Select all
      fireEvent.click(screen.getByLabelText(/Select all visible probations/i));
      expect(screen.getByText(/2 selected/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Generate emails/i }));

      // Panel header
      expect(screen.getByText(/Notify supervisors & deputies/i)).toBeInTheDocument();
      // One mailto: per row
      expect(screen.getByLabelText(/Open mailto for Smith, John/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Open mailto for Smith, Jane/i)).toBeInTheDocument();
      // One copy-template per row
      expect(screen.getByLabelText(/Copy email template for Smith, John/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Copy email template for Smith, Jane/i)).toBeInTheDocument();
    });
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
