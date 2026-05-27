/**
 * Light render tests for LoadingOverlay. Covers:
 *
 *  - Renders the spinner + status copy when given progress
 *  - Shows "File N of M" when multiple files queued
 *  - Shows "Loading file" when only one file queued
 *  - Stage label matches the stage value
 *  - File size renders in human-readable form (KB / MB)
 *  - role=status with aria-live for accessibility
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders status role with the current filename', () => {
    render(<LoadingOverlay progress={{
      totalFiles: 1,
      currentFileIndex: 0,
      currentFileName: 'Labor Report 5.21.26.xlsx',
      currentFileSizeBytes: 3_500_000,
      stage: 'parsing',
      filesDone: 0,
    }} />);
    expect(screen.getByRole('status', { name: /File upload in progress/i })).toBeInTheDocument();
    expect(screen.getByText('Labor Report 5.21.26.xlsx')).toBeInTheDocument();
  });

  it('shows "Loading file" for single-file uploads', () => {
    render(<LoadingOverlay progress={{
      totalFiles: 1,
      currentFileIndex: 0,
      currentFileName: 'a.xlsx',
      currentFileSizeBytes: 1024,
      stage: 'reading',
      filesDone: 0,
    }} />);
    expect(screen.getByText(/Loading file/i)).toBeInTheDocument();
  });

  it('shows "File N of M" for multi-file uploads', () => {
    render(<LoadingOverlay progress={{
      totalFiles: 4,
      currentFileIndex: 1, // second file
      currentFileName: 'b.xlsx',
      currentFileSizeBytes: 1024,
      stage: 'reading',
      filesDone: 1,
    }} />);
    expect(screen.getByText(/File 2 of 4/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 4 files complete/i)).toBeInTheDocument();
  });

  it('formats file size in human-readable units', () => {
    render(<LoadingOverlay progress={{
      totalFiles: 1,
      currentFileIndex: 0,
      currentFileName: 'big.xlsx',
      currentFileSizeBytes: 3_500_000,
      stage: 'parsing',
      filesDone: 0,
    }} />);
    // "3.3 MB · Parsing workbook…"
    expect(screen.getByText(/3\.3 MB/i)).toBeInTheDocument();
    expect(screen.getByText(/Parsing workbook/i)).toBeInTheDocument();
  });

  it('shows the reassurance copy', () => {
    render(<LoadingOverlay progress={{
      totalFiles: 1,
      currentFileIndex: 0,
      currentFileName: 'a.xlsx',
      currentFileSizeBytes: 1024,
      stage: 'importing',
      filesDone: 0,
    }} />);
    expect(screen.getByText(/Importing rows/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep this tab open/i)).toBeInTheDocument();
  });
});
