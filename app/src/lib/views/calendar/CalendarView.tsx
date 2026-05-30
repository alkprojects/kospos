/**
 * Calendar — a Data-tab sub-view (Phase 2.2.ab).
 *
 * Alex's S52 ask: "in the data section there should be a calendar sub-tab."
 *
 * Surfaces the pre-baked FY pay-period calendar (`data/calendar-fy2026.json`)
 * and the COLA / payroll constants (`data/cola-fy2026.json`) — the same
 * reference data the Job Class Calculator's pay-period dropdown reads from
 * (`lib/calc-opts.ts`). This is the read-only home for workbook Tab 5
 * (Calendar) and the first user-visible surface for roadmap sub-phase
 * `2.2.1 lib/calendar/`. Pure view — no acquisition, no edits.
 *
 * Pay periods carry a weight (`pct`): in FY26, PP1 is a 0.4x partial,
 * PP2–26 are full 1.0x, and PP27 is a 0.7x partial — 27 pay periods, weighted
 * sum 26.1. That weighted sum is the denominator for COLA-aware year-end
 * projection, so "year elapsed" here is weight-based, not a raw PP count.
 */

import { useMemo, useState } from 'react';
import { Stat } from '../../ui';
import { fmtMoney } from '../../format';
import calendarRaw from '../../../data/calendar-fy2026.json';
import colaRaw from '../../../data/cola-fy2026.json';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format an ISO `YYYY-MM-DD` as e.g. "Jul 4, 2025" by parsing the parts
 * directly — never constructs a `Date`, so it can't shift by a day in a
 * negative-UTC-offset timezone (same reasoning as JobPostingsView.releasedDate).
 */
function fmtPpe(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** Fraction (0..1) → percent string, 2 decimals — e.g. 0.015 → "1.50%". */
function fmtPct(frac: number): string {
  return `${(frac * 100).toFixed(2)}%`;
}

/** Today as a local ISO `YYYY-MM-DD` (drives the default as-of date). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const TH: React.CSSProperties = { padding: '8px 12px', fontWeight: 600 };
const TD: React.CSSProperties = { padding: '8px 12px' };

export function CalendarView() {
  const payPeriods = calendarRaw.payPeriods;
  const [asOf, setAsOf] = useState<string>(todayIso);

  const totalWeight = useMemo(
    () => payPeriods.reduce((sum, p) => sum + p.pct, 0),
    [payPeriods],
  );

  // "Current" = the first pay period whose period-end is on/after the as-of
  // date (the PP we're inside). Null once the whole FY has elapsed.
  const current = useMemo(
    () => payPeriods.find(p => p.ppe >= asOf) ?? null,
    [payPeriods, asOf],
  );

  // Completed = pay periods whose period-end is strictly before the as-of date.
  const completed = useMemo(
    () => payPeriods.filter(p => p.ppe < asOf),
    [payPeriods, asOf],
  );
  const completedWeight = completed.reduce((sum, p) => sum + p.pct, 0);
  const elapsedFrac = totalWeight > 0 ? completedWeight / totalWeight : 0;

  const midYearPp = payPeriods.find(p => p.pp === colaRaw.midYear.appliesAtPP);
  const midYearWhen = midYearPp
    ? `effective PP${colaRaw.midYear.appliesAtPP} (${fmtPpe(midYearPp.ppe)})`
    : `effective PP${colaRaw.midYear.appliesAtPP}`;

  const colaOverrides = Object.entries(colaRaw.pp1.byEmpOrg)
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header — top-aligned so the stat values share a baseline. */}
      <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Stat label="Fiscal year" value={calendarRaw.fiscalYear} />
        <Stat label="Pay periods" value={String(payPeriods.length)} />
        <Stat
          label="Current pay period"
          value={current ? `PP${current.pp}` : 'FY ended'}
          hint={current ? `ends ${fmtPpe(current.ppe)}` : undefined}
        />
        <Stat
          label="Year elapsed"
          value={fmtPct(elapsedFrac)}
          hint={`${completed.length} of ${payPeriods.length} PPs complete · weighted`}
        />
      </div>

      {/* As-of control — drives the current-PP highlight and the elapsed %. */}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
        As-of date
        <input
          type="date"
          value={asOf}
          min={calendarRaw.effectiveFrom}
          max={calendarRaw.effectiveTo}
          onChange={e => setAsOf(e.target.value || todayIso())}
          style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }}
        />
      </label>

      {/* Pay-period calendar */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
              <th style={TH}>Pay Period</th>
              <th style={TH}>Period End (PPE)</th>
              <th style={TH}>Weight</th>
              <th style={TH}>Note</th>
            </tr>
          </thead>
          <tbody>
            {payPeriods.map(p => {
              const isCurrent = current?.pp === p.pp;
              return (
                <tr
                  key={p.pp}
                  style={{
                    borderTop: '1px solid var(--border)',
                    background: isCurrent ? 'var(--accent-soft)' : undefined,
                  }}
                >
                  <td style={{ ...TD, fontFamily: 'monospace' }}>
                    PP{p.pp}{isCurrent ? ' ◄ current' : ''}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtPpe(p.ppe)}</td>
                  <td style={{ ...TD, fontFamily: 'monospace' }}>{p.pct.toFixed(1)}×</td>
                  <td style={{ ...TD, color: 'var(--muted)' }}>{p.pct < 1 ? 'partial period' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* COLA / payroll constants */}
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: '4px 0 0' }}>COLA &amp; payroll constants</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, maxWidth: 660 }}>
        Display-only reference — the pre-baked salary tables already bake these COLA rates in.
        The OASDI wage base differs across the two calendar years FY26 spans.
      </p>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
              <th style={TH}>Constant</th>
              <th style={TH}>Value</th>
              <th style={TH}>Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: '1px solid var(--border)' }}>
              <td style={TD}>Mid-year COLA</td>
              <td style={{ ...TD, fontFamily: 'monospace' }}>{fmtPct(colaRaw.midYear.rate)}</td>
              <td style={{ ...TD, color: 'var(--muted)' }}>{midYearWhen}</td>
            </tr>
            <tr style={{ borderTop: '1px solid var(--border)' }}>
              <td style={TD}>PP1 COLA (default)</td>
              <td style={{ ...TD, fontFamily: 'monospace' }}>{fmtPct(colaRaw.pp1.defaultRate)}</td>
              <td style={{ ...TD, color: 'var(--muted)' }}>applied at PP1; per-employee-org overrides below</td>
            </tr>
            {colaOverrides.map(([org, rate]) => (
              <tr key={org} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={TD}>PP1 COLA · emp-org {org}</td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{fmtPct(rate)}</td>
                <td style={{ ...TD, color: 'var(--muted)' }}>override</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid var(--border)' }}>
              <td style={TD}>OASDI wage base · CY2025</td>
              <td style={{ ...TD, fontFamily: 'monospace' }}>{fmtMoney(colaRaw.oasdiWageBase.pre)}</td>
              <td style={{ ...TD, color: 'var(--muted)' }}>Jul–Dec 2025 (FY26 first half)</td>
            </tr>
            <tr style={{ borderTop: '1px solid var(--border)' }}>
              <td style={TD}>OASDI wage base · CY2026</td>
              <td style={{ ...TD, fontFamily: 'monospace' }}>{fmtMoney(colaRaw.oasdiWageBase.post)}</td>
              <td style={{ ...TD, color: 'var(--muted)' }}>Jan–Jun 2026 (FY26 second half)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
