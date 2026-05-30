import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssuesView } from './IssuesView';
import { useAppStore } from '../../store';
import type { Issue } from '../../quality/types';

beforeEach(() => {
  useAppStore.getState().clearAll();
});

/** Inject issues directly — the view's job is rendering/filtering; the rules
 *  that *produce* issues are covered in quality.test.ts. */
function setIssues(issues: Issue[]) {
  useAppStore.setState({ issues });
}

describe('IssuesView', () => {
  it('shows the empty state when there are no issues', () => {
    render(<IssuesView />);
    expect(screen.getByText('No issues to correct')).toBeInTheDocument();
  });

  it('lists each issue message and a total chip', () => {
    setIssues([
      { ruleId: 'QR-007', severity: 'error', message: 'Both acting and supervisory pay', emplId: 'E1' },
      { ruleId: 'QR-008', severity: 'warning', message: 'Supervisory differential owed', positionNumber: '10001' },
    ]);
    render(<IssuesView />);
    // The selected (first) issue's message appears in BOTH the list row and the
    // detail panel, so assert presence via getAllByText rather than getByText.
    expect(screen.getAllByText('Both acting and supervisory pay').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Supervisory differential owed').length).toBeGreaterThan(0);
    expect(screen.getByText('All (2)')).toBeInTheDocument();
  });

  it('filters to a single severity when its chip is clicked', () => {
    setIssues([
      { ruleId: 'QR-007', severity: 'error', message: 'An error issue', emplId: 'E1' },
      { ruleId: 'QR-008', severity: 'warning', message: 'A warning issue', positionNumber: '10001' },
    ]);
    render(<IssuesView />);
    fireEvent.click(screen.getByText('Errors (1)'));
    expect(screen.getAllByText('An error issue').length).toBeGreaterThan(0);
    expect(screen.queryByText('A warning issue')).not.toBeInTheDocument();
  });

  it('shows the selected rule detail and navigates from a source link', () => {
    setIssues([
      { ruleId: 'QR-007', severity: 'error', message: 'Both acting and supervisory pay', emplId: 'E1' },
    ]);
    const onNavigate = vi.fn();
    render(<IssuesView onNavigate={onNavigate} />);
    // The detail panel pulls rationale + citation from the real QR-007 rule.
    expect(screen.getByText('Why this matters')).toBeInTheDocument();
    // Citation is unique by its revision date (the rationale also says "SF DHR").
    expect(screen.getByText(/rev\. 3\/21\/23/)).toBeInTheDocument();
    // QR-007's sourceTabs include 'data' (Source Tables) — its link navigates.
    fireEvent.click(screen.getByText(/Open Source Tables/));
    expect(onNavigate).toHaveBeenCalledWith('data');
  });
});
