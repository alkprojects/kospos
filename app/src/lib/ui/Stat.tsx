/**
 * Stat — the summary-card cell used in every view's header stat-row: an
 * uppercase muted label over a 20px/700 value, with an optional small
 * muted hint line beneath.
 *
 * A byte-identical `function Stat({ label, value, hint? })` had been
 * copy-pasted into all eight list views — PositionsView (the hint-less
 * subset) plus Separations, Probations, Labor, JobPostings, Eligibility,
 * Inactive and StaffingPlan. This is code-health batch 2 from
 * docs/proposals/s48-code-health-review.md (U1): one shared component, no
 * visual change. PositionsView simply omits `hint`, which renders nothing
 * — identical output to its old local copy.
 */

export interface StatProps {
  /** Uppercase muted label (e.g. "Total positions"). */
  label: string;
  /** The headline value, rendered at 20px / 700. */
  value: string;
  /** Optional small muted sub-line beneath the value. Omit for the
   *  label+value-only variant (PositionsView). */
  hint?: string;
}

export function Stat({ label, value, hint }: StatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
      {hint && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{hint}</span>}
    </div>
  );
}
