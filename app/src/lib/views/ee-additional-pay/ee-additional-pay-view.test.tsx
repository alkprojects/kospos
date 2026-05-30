/**
 * Light render tests for EeAdditionalPayView (the Source Tables sub-tab).
 * Pins:
 *  - Empty-state copy when no additional-pay rows are loaded
 *  - One row per assignment, with the employee name + #
 *  - Acting / Supervisory kind chips render
 *  - Per-PP amount renders with cents
 *  - Search narrows the visible rows
 *
 * The store is reset between tests via clearAll().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EeAdditionalPayView } from './EeAdditionalPayView';
import { useAppStore } from '../../store';
import type { PsHcmEeAddlPayRow } from '../../importers/types';

function eeRow(partial: Partial<PsHcmEeAddlPayRow> = {}): PsHcmEeAddlPayRow {
  return {
    _source: 'ps-hcm-ee-addl-pay',
    departmentGroupCode: 'DBI',
    departmentTitle: 'Dept of Building Inspection',
    emplId: '187518',
    emplRecord: 0,
    effectiveDate: '2026-01-12',
    lastName: 'Smith',
    firstName: 'Jane',
    middleName: '',
    preferredFirstName: '',
    rosterCode: '21',
    rosterDescription: 'SEIU 1021',
    payStatus: 'A',
    jobCode: '6278',
    unionCode: '791',
    salaryPlan: '1',
    step: '5',
    additionalPayAmount: 250.5,
    rateCode: 'ACTFLT',
    _row: 2,
    ...partial,
  };
}

beforeEach(() => {
  useAppStore.getState().clearAll();
});

describe('EeAdditionalPayView', () => {
  it('shows an empty state when no additional-pay rows are loaded', () => {
    render(<EeAdditionalPayView />);
    expect(screen.getByText(/No EE Additional Pay loaded/i)).toBeInTheDocument();
  });

  it('renders a row per assignment with the employee name and #', () => {
    useAppStore.getState().addRows([
      eeRow({ lastName: 'Smith', firstName: 'Jane', emplId: '187518', rateCode: 'ACTFLT', _row: 2 }),
      eeRow({ lastName: 'Lee', firstName: 'Robert', emplId: '204417', rateCode: 'SUPFLT', _row: 3 }),
    ]);
    render(<EeAdditionalPayView />);
    expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
    expect(screen.getByText('Lee, Robert')).toBeInTheDocument();
    expect(screen.getByText('187518')).toBeInTheDocument();
  });

  it('renders Acting and Supervisory kind chips', () => {
    useAppStore.getState().addRows([
      eeRow({ rateCode: 'ACTFLT', _row: 2 }),
      eeRow({ rateCode: 'SUPFLT', emplId: '204417', _row: 3 }),
    ]);
    render(<EeAdditionalPayView />);
    // "Acting"/"Supervisory" also appear in the rollup stat + footer copy, so
    // assert at least one (the chip) renders for each kind.
    expect(screen.getAllByText('Acting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Supervisory').length).toBeGreaterThan(0);
  });

  it('renders the per-PP amount with cents', () => {
    useAppStore.getState().addRows([eeRow({ additionalPayAmount: 250.5 })]);
    render(<EeAdditionalPayView />);
    // Shows in both the rollup total and the table cell; confirm cents render.
    expect(screen.getAllByText('$250.50').length).toBeGreaterThan(0);
  });

  it('search narrows the visible rows', () => {
    useAppStore.getState().addRows([
      eeRow({ lastName: 'Alpha', firstName: 'One', emplId: '111111', _row: 2 }),
      eeRow({ lastName: 'Beta', firstName: 'Two', emplId: '222222', _row: 3 }),
    ]);
    render(<EeAdditionalPayView />);
    fireEvent.change(screen.getByLabelText(/Search additional pay/i), { target: { value: 'Alpha' } });
    expect(screen.getByText('Alpha, One')).toBeInTheDocument();
    expect(screen.queryByText('Beta, Two')).not.toBeInTheDocument();
  });
});
