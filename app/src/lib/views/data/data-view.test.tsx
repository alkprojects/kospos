/**
 * Render tests for DataView — the Data tab's sub-tab container (Phase 2.2.u).
 *
 * Asserts the two source-table sub-tabs render, default to Eligibility Lists,
 * and switch on click. Distinguishing markers: "Lists last parsed" is an
 * Eligibility-only stat; "Departments" is a Job-Postings-only stat.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataView } from './DataView';
import { useScrapers } from '../../scrapers';

beforeEach(() => {
  useScrapers.getState().clearAll();
});

describe('DataView — source-table sub-tabs', () => {
  it('renders both sub-tabs', () => {
    render(<DataView />);
    expect(screen.getByRole('tab', { name: 'Eligibility Lists' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Job Postings' })).toBeInTheDocument();
  });

  it('defaults to the Eligibility Lists sub-view', () => {
    render(<DataView />);
    expect(screen.getByRole('tab', { name: 'Eligibility Lists' })).toHaveAttribute('aria-selected', 'true');
    // Eligibility-only stat is present; Job-Postings-only stat is not.
    expect(screen.getByText('Lists last parsed')).toBeInTheDocument();
    expect(screen.queryByText('Departments')).not.toBeInTheDocument();
  });

  it('switches to the Job Postings sub-view on click', () => {
    render(<DataView />);
    fireEvent.click(screen.getByRole('tab', { name: 'Job Postings' }));
    expect(screen.getByRole('tab', { name: 'Job Postings' })).toHaveAttribute('aria-selected', 'true');
    // Now the Job-Postings-only stat shows and the Eligibility-only stat is gone.
    expect(screen.getByText('Departments')).toBeInTheDocument();
    expect(screen.queryByText('Lists last parsed')).not.toBeInTheDocument();
  });
});
