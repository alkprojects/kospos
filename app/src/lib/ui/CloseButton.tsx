/**
 * CloseButton — the borderless ✕ in the top-right of the three detail editors
 * (SeparationDetail, ProbationDetail, PlannedActionDetail), which carried
 * byte-identical copies. C1 follow-up to the Phase 2.2.w `Modal` lift
 * (docs/proposals/s46-ui-ux-review.md § C1). No visual change.
 *
 * Scope note: this is deliberately ONLY the editors' borderless ✕. The other
 * dialogs' close controls differ in appearance and are left as-is —
 * EligibilityDetail uses a bordered pill `×` ("Close detail") plus a close-only
 * footer, and the Family-B viewers (PositionDetail / LaborView) use their own
 * borderless variants. Folding those into one button would change how they
 * look, which the no-visual-change constraint forbids.
 */

export interface CloseButtonProps {
  onClose: () => void;
  /** Accessible name. Default "Close". */
  ariaLabel?: string;
}

export function CloseButton({ onClose, ariaLabel = 'Close' }: CloseButtonProps) {
  return (
    <button
      onClick={onClose}
      aria-label={ariaLabel}
      style={{
        marginLeft: 'auto',
        border: 'none', background: 'transparent', cursor: 'pointer',
        fontSize: 18, color: 'var(--muted)',
      }}
    >
      ✕
    </button>
  );
}
