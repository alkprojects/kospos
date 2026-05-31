import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssuesView } from './IssuesView';
import { useAppStore } from '../../store';
import { useClearedFindings, clearedKey } from '../../quality/cleared';
import type { Issue } from '../../quality/types';

beforeEach(() => {
  useAppStore.getState().clearAll();
  useClearedFindings.getState().restoreFromSession([]);
});

/** Inject issues directly — the view's job is rendering/grouping/filtering; the
 *  rules that *produce* issues are covered in quality.test.ts. */
function setIssues(issues: Issue[]) {
  useAppStore.setState({ issues });
}

describe('IssuesView', () => {
  it('shows the empty state when there are no issues', () => {
    render(<IssuesView />);
    expect(screen.getByText('No issues to correct')).toBeInTheDocument();
  });

  it('groups issues by type (collapsed) with a total chip; messages hidden until expanded', () => {
    setIssues([
      { ruleId: 'QR-007', severity: 'error', message: 'Both acting and supervisory pay', emplId: 'E1' },
      { ruleId: 'QR-012', severity: 'warning', message: 'No budgeted position', positionNumber: '10001' },
    ]);
    render(<IssuesView />);
    expect(screen.getByText('All (2)')).toBeInTheDocument();
    // One collapsed group header per rule (aria-expanded=false), nothing else.
    expect(screen.getAllByRole('button', { expanded: false })).toHaveLength(2);
    // Finding messages are not rendered until a group is expanded.
    expect(screen.queryByText(/Both acting and supervisory pay/)).not.toBeInTheDocument();
  });

  it('filters to a single severity when its chip is clicked', () => {
    setIssues([
      { ruleId: 'QR-007', severity: 'error', message: 'An error issue', emplId: 'E1' },
      { ruleId: 'QR-012', severity: 'warning', message: 'A warning issue', positionNumber: '10001' },
    ]);
    render(<IssuesView />);
    fireEvent.click(screen.getByText('Errors (1)'));
    // Only the error group's header remains.
    expect(screen.getAllByRole('button', { expanded: false })).toHaveLength(1);
  });

  it('expands a group, then shows the selected finding detail and navigates from a source link', () => {
    setIssues([
      { ruleId: 'QR-007', severity: 'error', message: 'Both acting and supervisory pay', emplId: 'E1' },
    ]);
    const onNavigate = vi.fn();
    render(<IssuesView onNavigate={onNavigate} />);
    // Expand the single group, then click its (terse) finding row to select it.
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByText(/Both acting and supervisory pay/));
    // The detail panel pulls rationale + citation from the real QR-007 rule.
    expect(screen.getByText('Why this matters')).toBeInTheDocument();
    expect(screen.getByText(/rev\. 3\/21\/23/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Open Source Tables/));
    expect(onNavigate).toHaveBeenCalledWith('data');
  });

  it('expands a group on click and reveals its findings', () => {
    setIssues([
      { ruleId: 'QR-012', severity: 'warning', message: 'No budgeted position for 10001', positionNumber: '10001' },
      { ruleId: 'QR-012', severity: 'warning', message: 'No budgeted position for 10002', positionNumber: '10002' },
    ]);
    render(<IssuesView />);
    // Collapsed: the count chip on the single group reads 2; findings hidden.
    expect(screen.queryByText(/No budgeted position for 10001/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText(/No budgeted position for 10001/)).toBeInTheDocument();
    expect(screen.getByText(/No budgeted position for 10002/)).toBeInTheDocument();
  });
});

describe('IssuesView — clear / restore (S59)', () => {
  const ISSUES: Issue[] = [
    { ruleId: 'QR-008', severity: 'error', message: 'Reports-to is missing', positionNumber: '500', sourceRows: [10] },
    { ruleId: 'QR-008', severity: 'error', message: 'Reports-to is missing', positionNumber: '501', sourceRows: [11] },
    { ruleId: 'QR-011', severity: 'warning', message: 'Combo dept equals position dept', positionNumber: '600', sourceRows: [12] },
  ];

  it('clears a whole error type via the group checkbox + required reason', () => {
    setIssues(ISSUES);
    render(<IssuesView />);

    // All three findings are active to start.
    expect(screen.getByText('All (3)')).toBeInTheDocument();

    // Select every finding in the first group (QR-008, the two errors). The
    // group checkbox works while the group is still collapsed.
    fireEvent.click(screen.getAllByTitle('Select all findings in this type')[0]);

    // The bulk bar appears; its confirm button is gated on a reason.
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('Mark not an error')).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/required/), {
      target: { value: 'Commissioners on shared positions' },
    });
    expect(screen.getByText('Mark not an error')).not.toBeDisabled();
    fireEvent.click(screen.getByText('Mark not an error'));

    // The two QR-008 findings leave the active list; only QR-011 remains.
    expect(screen.getByText('All (1)')).toBeInTheDocument();
    // Both dismissals are recorded under the stable rule+position key.
    const cleared = useClearedFindings.getState().cleared;
    expect(cleared.size).toBe(2);
    expect(cleared.get(clearedKey('QR-008', '500'))?.reason).toBe('Commissioners on shared positions');
    expect(cleared.get(clearedKey('QR-008', '501'))?.reason).toBe('Commissioners on shared positions');
  });

  it('hides a pre-cleared finding from the active list and restores it', () => {
    setIssues(ISSUES);
    useClearedFindings.getState().setCleared(clearedKey('QR-011', '600'), 'Expected — combo by design');
    render(<IssuesView />);

    // Active count excludes the cleared QR-011 finding.
    expect(screen.getByText('All (2)')).toBeInTheDocument();

    // Open the Cleared section and restore the finding.
    fireEvent.click(screen.getByText('Cleared'));
    fireEvent.click(screen.getByText('Restore'));

    expect(screen.getByText('All (3)')).toBeInTheDocument();
    expect(useClearedFindings.getState().cleared.size).toBe(0);
  });

  it('selects a single finding from its detail panel', () => {
    setIssues(ISSUES);
    render(<IssuesView />);

    // Expand the QR-011 group, then open its finding's detail.
    fireEvent.click(screen.getByText('QR-011'));
    fireEvent.click(screen.getByText(/Combo dept equals position dept/));

    // The detail panel's "Mark not an error" checks just that finding.
    fireEvent.click(screen.getByText('Mark not an error'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});
