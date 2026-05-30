/**
 * Stat tests — lock the shared summary-card contract extracted from the
 * eight byte-identical per-view copies (code-health batch 2;
 * docs/proposals/s48-code-health-review.md § U1).
 *
 * The render must stay identical to the old local copies:
 *  - an uppercase muted label over a 20px / 700 value
 *  - an optional small hint line that renders ONLY when `hint` is passed
 *    (PositionsView is the hint-less subset — it just omits the prop).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stat } from './Stat';

describe('Stat', () => {
  it('renders the label and value', () => {
    render(<Stat label="Total positions" value="587" />);
    expect(screen.getByText('Total positions')).toBeInTheDocument();
    expect(screen.getByText('587')).toBeInTheDocument();
  });

  it('renders the hint line when hint is provided', () => {
    render(<Stat label="Filled" value="412" hint="of 587 budgeted" />);
    expect(screen.getByText('of 587 budgeted')).toBeInTheDocument();
  });

  it('omits the hint line when hint is not provided (PositionsView subset)', () => {
    const { container } = render(<Stat label="Vacant" value="175" />);
    // Label + value spans only — no third (hint) span.
    expect(container.querySelectorAll('span')).toHaveLength(2);
  });

  it('applies the canonical type scale: a 20px/700 value over an 11px uppercase label', () => {
    render(<Stat label="Total" value="587" hint="all funds" />);
    const value = screen.getByText('587');
    expect(value.style.fontSize).toBe('20px');
    expect(value.style.fontWeight).toBe('700');
    const label = screen.getByText('Total');
    expect(label.style.fontSize).toBe('11px');
    expect(label.style.textTransform).toBe('uppercase');
    const hint = screen.getByText('all funds');
    expect(hint.style.fontSize).toBe('10px');
  });
});
