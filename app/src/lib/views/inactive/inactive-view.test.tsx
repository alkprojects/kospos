/**
 * Light render tests for InactiveView. Heavy interactive coverage lives on
 * the preview-MCP walkthrough; this file pins:
 *
 *  - Empty-state copy for: no data / no OBI / no P&P
 *  - Renders inactive rows when P&P + OBI are both loaded
 *  - Reason chip filter narrows the visible set
 *  - Search input narrows the visible set
 *  - "All paid positions active" message when there are no inactives
 *
 * Store reset between tests via useAppStore.clearAll().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InactiveView } from './InactiveView';
import { useAppStore } from '../../store';
import type { ObiPayrollRow, PsHcmPpRow } from '../../importers/types';
import { ACCOUNT_DESCRIPTIONS } from '../../payroll';

function obi(
  partial: Partial<ObiPayrollRow> & {
    positionIdentifier: string;
    balanceAmount: number;
    accountDescription: string;
  },
): ObiPayrollRow {
  return {
    _source: 'obi-payroll',
    fiscalYear: '2026',
    departmentGroupCode: 'DBI',
    fundLvl1Code: '', fundLvl1Description: '', fundControl: '',
    fund: '10190', fundDescription: '',
    departmentCode: '229000', departmentName: 'BUILDING INSPECTION',
    projectCode: '', projectDescription: '',
    activityCode: '', activityDescription: '',
    authorityLvl1Code: '', authorityLvl1Description: '',
    authority: '', authorityDescription: '',
    accountLvl2Description: '', accountLvl5Name: '', accountLvl3Description: '',
    accountCode: '',
    earningPeriodNumber: 0, earningPeriodEnd: '2026-05-08',
    personNumber: '12345', personFullName: 'Smith, Jane',
    rosterCode: '',
    earningsCode: 'WKP', earningsDescription: '',
    jobCode: '6278', jobCodeSet: 'COMMN',
    jobDescription: 'Building Inspector',
    assignmentNumber: 0, appointmentType: 'PCS',
    isFteHours: 'Y', earningHours: 80, payPeriodFTE: 1,
    _asOfDate: '2026-05-08', _row: 1,
    ...partial,
  };
}

function pp(positionNumber: string, partial: Partial<PsHcmPpRow> = {}): PsHcmPpRow {
  return {
    _source: 'ps-hcm-pp',
    snapshotDate: '2026-05-20',
    positionNumber,
    jobCode: '6278', jobCodeDescription: 'Building Inspector',
    positionDivision: '',
    departmentCode: '229000', departmentName: 'BUILDING INSPECTION',
    positionMaxHeadcount: 1, positionStatus: 'A', fillStatus: 'FILLED',
    vice1EmplId: '', vice1Name: '',
    positionUsedFor: '', positionUsedForDescription: '',
    previousEmployee: '', emplId: '11111', employeeName: 'Active, Person',
    employeeStatus: 'A', appointmentType: 'PCS', exemptCategory: '',
    salaryStep: '4', hourlyRate: 50,
    meritIncreaseDate: '2026-08-01',
    reportsToPosition: '', managerFirstName: '', managerLastName: '',
    cat1718AppointmentDate: '', cat1718ExemptCode: '',
    cat1718ExemptMonths: 0, cat1718TxExpiredDate: '',
    rosterCode: '', rosterDescription: '',
    comboCode: '', comboDepartmentCode: '', comboDepartmentName: '',
    rtfId: '', rtfStatus: '', rtfSubmittedDate: '', rtfExpectedFillDate: '',
    budgetDepartmentCode: '229000', budgetDepartmentName: 'BUILDING INSPECTION',
    budgetJobCode: '6278', fte: 1, employeeJobCode: '6278', vacantDate: '',
    _row: 1,
    ...partial,
  };
}

beforeEach(() => {
  useAppStore.getState().clearAll();
});

describe('InactiveView', () => {
  it('shows the "no data" empty state when nothing is loaded', () => {
    render(<InactiveView />);
    expect(screen.getByText(/No data loaded/i)).toBeInTheDocument();
  });

  it('shows the "no BI Payroll" empty state when only P&P is loaded', () => {
    useAppStore.getState().addRows([pp('10001')]);
    render(<InactiveView />);
    expect(screen.getByText(/No BI Payroll loaded/i)).toBeInTheDocument();
  });

  it('shows the "no P&P" empty state when only OBI is loaded', () => {
    useAppStore.getState().addRows([
      obi({ positionIdentifier: '99001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc' }),
    ]);
    render(<InactiveView />);
    expect(screen.getByText(/No P&P loaded/i)).toBeInTheDocument();
  });

  it('shows the "every paid position active" message when nothing is inactive', () => {
    useAppStore.getState().addRows([
      pp('10001'),
      obi({ positionIdentifier: '10001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc' }),
    ]);
    render(<InactiveView />);
    expect(screen.getByText(/every FYTD-paid position is in the active P&P roster/i)).toBeInTheDocument();
  });

  it('renders one row per inactive position with last incumbent + FYTD spend', () => {
    useAppStore.getState().addRows([
      pp('10001'),
      // Inactive: in OBI, not in P&P.
      obi({ positionIdentifier: '99001', balanceAmount: 3200,
            accountDescription: 'Regular Salaries - Misc',
            personFullName: 'Retiree, Bob', personNumber: '54321' }),
      obi({ positionIdentifier: '99001', balanceAmount: 11000,
            accountDescription: ACCOUNT_DESCRIPTIONS.rpo,
            personFullName: 'Retiree, Bob', personNumber: '54321' }),
    ]);
    render(<InactiveView />);
    expect(screen.getByText('Retiree, Bob')).toBeInTheDocument();
    expect(screen.getByText('99001')).toBeInTheDocument();
    expect(screen.getByText('Retirement payout')).toBeInTheDocument();
  });

  it('reason-chip filter narrows the visible rows', () => {
    useAppStore.getState().addRows([
      pp('10001'),
      // Retirement-payout
      obi({ positionIdentifier: '99001', balanceAmount: 9000,
            accountDescription: ACCOUNT_DESCRIPTIONS.rpo,
            personFullName: 'Retiree, Bob' }),
      // Wages-only
      obi({ positionIdentifier: '99002', balanceAmount: 4000,
            accountDescription: 'Regular Salaries - Misc',
            personFullName: 'WagesOnly, Person' }),
    ]);
    render(<InactiveView />);
    // Both rows visible initially.
    expect(screen.getByText('Retiree, Bob')).toBeInTheDocument();
    expect(screen.getByText('WagesOnly, Person')).toBeInTheDocument();

    // Click the "Wages only" chip → only WagesOnly visible.
    const wagesChip = screen.getByRole('radio', { name: /Wages only/i });
    fireEvent.click(wagesChip);
    expect(screen.queryByText('Retiree, Bob')).not.toBeInTheDocument();
    expect(screen.getByText('WagesOnly, Person')).toBeInTheDocument();
  });

  it('search input narrows the visible rows', () => {
    useAppStore.getState().addRows([
      pp('10001'),
      obi({ positionIdentifier: '99001', balanceAmount: 9000,
            accountDescription: ACCOUNT_DESCRIPTIONS.rpo,
            personFullName: 'Alpha, One' }),
      obi({ positionIdentifier: '99002', balanceAmount: 4000,
            accountDescription: 'Regular Salaries - Misc',
            personFullName: 'Beta, Two' }),
    ]);
    render(<InactiveView />);
    const input = screen.getByLabelText(/Search inactive positions/i);
    fireEvent.change(input, { target: { value: 'Alpha' } });
    expect(screen.getByText('Alpha, One')).toBeInTheDocument();
    expect(screen.queryByText('Beta, Two')).not.toBeInTheDocument();
  });

  it('summary header inactive-position count tracks filtered set', () => {
    useAppStore.getState().addRows([
      pp('10001'),
      obi({ positionIdentifier: '99001', balanceAmount: 9000,
            accountDescription: ACCOUNT_DESCRIPTIONS.rpo,
            personFullName: 'Retiree, Bob' }),
      obi({ positionIdentifier: '99002', balanceAmount: 4000,
            accountDescription: 'Regular Salaries - Misc',
            personFullName: 'Wages, Only' }),
    ]);
    render(<InactiveView />);
    // 2 inactives visible.
    expect(screen.getByText('2')).toBeInTheDocument();

    // Filter to retirement-payout → 1 inactive visible + "of 2 total" hint.
    fireEvent.click(screen.getByRole('radio', { name: /Retirement payout/i }));
    expect(screen.getByText(/of 2 total/i)).toBeInTheDocument();
  });
});
