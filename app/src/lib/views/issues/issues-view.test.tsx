import { describe, it, expect, beforeEach } from 'vitest';
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
    expect(screen.getByText('Both acting and supervisory pay')).toBeInTheDocument();
    expect(screen.getByText('Supervisory differential owed')).toBeInTheDocument();
    expect(screen.getByText('All (2)')).toBeInTheDocument();
  });

  it('filters to a single severity when its chip is clicked', () => {
    setIssues([
      { ruleId: 'QR-007', severity: 'error', message: 'An error issue', emplId: 'E1' },
      { ruleId: 'QR-008', severity: 'warning', message: 'A warning issue', positionNumber: '10001' },
    ]);
    render(<IssuesView />);
    fireEvent.click(screen.getByText('Errors (1)'));
    expect(screen.getByText('An error issue')).toBeInTheDocument();
    expect(screen.queryByText('A warning issue')).not.toBeInTheDocument();
  });
});
