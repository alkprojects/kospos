import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarView } from './CalendarView';

// These assertions are deliberately clock-independent: they check the static
// calendar/COLA reference data, not the as-of-derived "current PP" / "elapsed"
// values (which depend on the test machine's real date).
describe('CalendarView', () => {
  it('renders the fiscal-year summary header', () => {
    render(<CalendarView />);
    expect(screen.getByText('Fiscal year')).toBeInTheDocument();
    expect(screen.getByText('FY2026')).toBeInTheDocument();
    expect(screen.getByText('Pay periods')).toBeInTheDocument();
    expect(screen.getByText('Year elapsed')).toBeInTheDocument();
  });

  it('lists the pay periods with timezone-safe formatted period-end dates', () => {
    render(<CalendarView />);
    // PP1's and PP27's period-end dates, formatted without a Date round-trip
    // so they never shift by a day across timezones.
    expect(screen.getByText('Jul 4, 2025')).toBeInTheDocument(); // PP1 (partial)
    expect(screen.getByText('Jun 30, 2026')).toBeInTheDocument(); // PP27 (partial)
    expect(screen.getByText('Period End (PPE)')).toBeInTheDocument();
  });

  it('shows the COLA & payroll constants', () => {
    render(<CalendarView />);
    expect(screen.getByText('Mid-year COLA')).toBeInTheDocument();
    expect(screen.getByText('1.50%')).toBeInTheDocument(); // midYear.rate (0.015)
    expect(screen.getByText('$176,100')).toBeInTheDocument(); // OASDI pre (CY2025)
    expect(screen.getByText('$185,407')).toBeInTheDocument(); // OASDI post (CY2026)
  });

  it('exposes an as-of date control', () => {
    render(<CalendarView />);
    expect(screen.getByLabelText(/as-of date/i)).toBeInTheDocument();
  });
});
