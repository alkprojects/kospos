/**
 * Render tests for JobPostingsView — the Data-tab Job Postings table
 * (Phase 2.2.u). Seeds the scrapers store and asserts the table, stats,
 * search filter, empty state, and posting link.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobPostingsView } from './JobPostingsView';
import { useScrapers } from '../../scrapers';
import type { JobPosting } from '../../scrapers';

function mkPosting(over: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'p1', name: 'Junior Admin Analyst (1820) - Building Inspection',
    jobCode: '1820', classTitle: 'Junior Admin Analyst',
    department: 'Building Inspection', location: 'San Francisco',
    releasedDate: '2026-05-15T12:00:00.000Z',
    url: 'https://jobs.smartrecruiters.com/example/1820', ...over,
  };
}

beforeEach(() => {
  useScrapers.getState().clearAll();
});

describe('JobPostingsView', () => {
  it('shows the empty state when no postings are loaded', () => {
    render(<JobPostingsView />);
    expect(screen.getByText(/No job postings loaded/)).toBeInTheDocument();
  });

  it('renders a row per posting with code, title, department, and a link', () => {
    useScrapers.getState().setJobPostings([
      mkPosting(),
      mkPosting({ id: 'p2', jobCode: '2622', classTitle: 'Senior Health Worker', department: 'Public Health' }),
    ]);
    render(<JobPostingsView />);
    expect(screen.getByText('Junior Admin Analyst')).toBeInTheDocument();
    expect(screen.getByText('Senior Health Worker')).toBeInTheDocument();
    expect(screen.getByText('Public Health')).toBeInTheDocument();
    // The posting link points at the SmartRecruiters URL.
    const links = screen.getAllByRole('link', { name: /Posting/ });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('smartrecruiters.com'));
  });

  it('counts distinct job codes and departments in the summary stats', () => {
    useScrapers.getState().setJobPostings([
      mkPosting(),
      mkPosting({ id: 'p2', jobCode: '1820', department: 'Building Inspection' }), // same code + dept
      mkPosting({ id: 'p3', jobCode: '2622', department: 'Public Health' }),
    ]);
    render(<JobPostingsView />);
    // 3 postings, 2 distinct job codes (1820, 2622), 2 distinct departments.
    expect(screen.getByText('Open postings').closest('div')).toHaveTextContent('3');
    expect(screen.getByText('Job codes').closest('div')).toHaveTextContent('2');
    expect(screen.getByText('Departments').closest('div')).toHaveTextContent('2');
  });

  it('filters rows by the search box', () => {
    useScrapers.getState().setJobPostings([
      mkPosting(),
      mkPosting({ id: 'p2', jobCode: '2622', classTitle: 'Senior Health Worker', department: 'Public Health' }),
    ]);
    render(<JobPostingsView />);
    fireEvent.change(screen.getByLabelText('Search job postings'), { target: { value: 'health' } });
    expect(screen.getByText('Senior Health Worker')).toBeInTheDocument();
    expect(screen.queryByText('Junior Admin Analyst')).not.toBeInTheDocument();
  });
});
