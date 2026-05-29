/**
 * Badge — the small rounded status pill used across the views.
 *
 * A byte-identical `badge(label, color, bg)` helper had been copy-pasted into
 * PositionsView, PositionDetail and StaffingPlanView. This is the C5 part-2
 * follow-up (docs/proposals/s46-ui-ux-review.md § C5): one shared component,
 * consuming the semantic color tokens added in C5 part 1 (#162).
 *
 * Two ways to colour it (no visual change from the old helper either way):
 *   - `tone` — a semantic token pair (success / warn / caution / danger /
 *     neutral / accent), the common case.
 *   - `color` + `bg` — explicit, for the handful of one-off / dynamically
 *     computed colours that don't map to a palette tone (e.g. the purple
 *     Cat-17/18 chip, or the per-type Staffing-Plan colours).
 * An explicit `color`/`bg` wins over `tone` when both are given.
 */

export type BadgeTone = 'success' | 'warn' | 'caution' | 'danger' | 'neutral' | 'accent';

const TONE_PAIR: Record<BadgeTone, [color: string, bg: string]> = {
  success: ['var(--success)', 'var(--success-soft)'],
  warn:    ['var(--warn)', 'var(--warn-soft)'],
  caution: ['var(--caution)', 'var(--caution-soft)'],
  danger:  ['var(--danger)', 'var(--danger-soft)'],
  neutral: ['var(--neutral)', 'var(--neutral-soft)'],
  accent:  ['var(--accent)', 'var(--accent-soft)'],
};

export interface BadgeProps {
  /** Semantic palette tone — expands to its [text, soft-bg] token pair. */
  tone?: BadgeTone;
  /** Explicit text colour (wins over tone). */
  color?: string;
  /** Explicit background (wins over tone). */
  bg?: string;
  children: React.ReactNode;
}

export function Badge({ tone, color, bg, children }: BadgeProps) {
  const [toneColor, toneBg] = tone ? TONE_PAIR[tone] : [undefined, undefined];
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 10,
      color: color ?? toneColor,
      background: bg ?? toneBg,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}
