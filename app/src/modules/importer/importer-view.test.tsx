/**
 * Tests for the Load Data hub (Phase 2.2.t — Alex's S44 directive):
 *  - FilePicker honors `disabled` (the dev-gated file imports).
 *  - ScrapeSourcesPanel renders the refresh controls relocated from the
 *    Eligibility tab.
 *  - ImporterView dev-gates the file importer outside dev mode while keeping
 *    the live scrapes available to everyone.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilePicker } from './FilePicker';
import { ScrapeSourcesPanel } from './ScrapeSourcesPanel';
import { ImporterView } from './ImporterView';
import { useAppStore } from '../../lib/store';
import { useScrapers } from '../../lib/scrapers/store';

beforeEach(() => {
  useAppStore.getState().restoreFromSession([], '');
  useScrapers.getState().clearAll();
});

describe('FilePicker — dev gate', () => {
  it('is interactive by default', () => {
    render(<FilePicker />);
    expect(screen.getByLabelText('Upload labor report files')).toHaveAttribute('aria-disabled', 'false');
    expect(screen.getByText(/Drop files here/)).toBeInTheDocument();
  });

  it('greys out + blocks interaction when disabled', () => {
    render(<FilePicker disabled />);
    expect(screen.getByLabelText('Upload labor report files')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/requires dev mode/)).toBeInTheDocument();
  });
});

describe('ScrapeSourcesPanel', () => {
  it('renders both refresh buttons relocated from the Eligibility tab', () => {
    render(<ScrapeSourcesPanel />);
    expect(screen.getByRole('button', { name: /Refresh job postings/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh eligibility lists/ })).toBeInTheDocument();
  });
});

describe('ImporterView — Load Data hub', () => {
  it('dev-gates the file importer outside dev mode but keeps the live scrapes', () => {
    render(<ImporterView devMode={false} />);
    expect(screen.getByLabelText('Upload labor report files')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/Importing labor-report source files/)).toBeInTheDocument();
    // The relocated live scrapes stay usable for everyone.
    expect(screen.getByRole('button', { name: /Refresh job postings/ })).toBeInTheDocument();
  });

  it('enables the file importer in dev mode', () => {
    render(<ImporterView devMode />);
    expect(screen.getByLabelText('Upload labor report files')).toHaveAttribute('aria-disabled', 'false');
  });
});
