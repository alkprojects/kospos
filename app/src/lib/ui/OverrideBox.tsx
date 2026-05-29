/**
 * OverrideBox — the amber "Force override (logged)" box the status-workflow
 * editors show when the user picks a guard-rejected status transition.
 *
 * SeparationDetail and ProbationDetail carried byte-identical copies. C1
 * follow-up to the Phase 2.2.w `Modal` lift
 * (docs/proposals/s46-ui-ux-review.md § C1). No visual change — exact extraction.
 *
 * The caller still decides *whether* to render it (it only appears when the
 * transition needs an override); this component owns the box, the checkbox +
 * its "skip {from} → {to} guard" label, and the reason input that appears
 * once the box is checked (orange border until a reason is typed).
 *
 * Note: PlannedActionDetail's override is intentionally NOT this box — there
 * it's an inline checkbox nested inside the Status field, a different shape.
 */

import { inputStyle } from './Field';

export interface OverrideBoxProps {
  /** Whether the force-override checkbox is checked. */
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** The status being transitioned away from (left of the arrow). */
  fromStatus: string;
  /** The status being transitioned to (right of the arrow). */
  toStatus: string;
  /** The required override-reason text. */
  reason: string;
  onReasonChange: (reason: string) => void;
}

export function OverrideBox({
  checked,
  onCheckedChange,
  fromStatus,
  toStatus,
  reason,
  onReasonChange,
}: OverrideBoxProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      background: '#fff8e6', border: '1px solid #d4a017', borderRadius: 4,
      padding: '8px 12px', fontSize: 12, color: '#5b4500',
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheckedChange(e.target.checked)}
        />
        Force override (skip {fromStatus} → {toStatus} guard — logged)
      </label>
      {checked && (
        <input
          type="text"
          value={reason}
          onChange={e => onReasonChange(e.target.value)}
          placeholder="Reason for override (required)"
          aria-label="Override reason"
          style={{
            ...inputStyle(),
            borderColor: reason.trim() === '' ? 'var(--warn)' : 'var(--border)',
          }}
        />
      )}
    </div>
  );
}
