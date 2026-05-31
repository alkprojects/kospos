import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssuesView } from './IssuesView';
import { useAppStore } from '../../store';
import type { Issue } from '../../quality/types';

beforeEach(() => {
  useAppStore.getState().clearAll();
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
