/**
 * Modal — shared dialog overlay-frame for KosPos detail dialogs.
 *
 * Lifts the overlay + card shell that had been copy-pasted across six dialogs
 * (Phase 2.2.w / carry-forward H; inventory in
 * docs/proposals/s46-ui-ux-review.md § "Modal inventory"). It owns the
 * backdrop, the card frame, `role="dialog"` + `aria-modal` + `aria-label`,
 * Esc-to-close, backdrop-click-to-close, and — new for all six — a
 * focus-trap + focus-restore (none of the dialogs managed focus before).
 *
 * It reconciles two layout families without changing how either looks:
 *   - align="top"    — detail editors: top-aligned, the *backdrop* scrolls,
 *                      uses the `.card` class (border + radius). maxWidth 720
 *                      (1040 for the wide Eligibility detail).
 *   - align="center" — read-only viewers: vertically centered, the *card*
 *                      scrolls (maxHeight 90vh), inline border/radius + shadow.
 *
 * Deliberately NOT owned: the per-dialog close (✕) button and footer. Those
 * vary in style across the six (borderless ✕ vs bordered ×, some with a footer
 * "Close"); unifying them would change their appearance, which is out of scope
 * for this no-visual-change lift. A shared ModalFooter / close button is the
 * planned C1 follow-up.
 *
 * z-index is standardized to 1000 (was 1000 for editors, 100 for viewers; no
 * two of these dialogs ever co-render). LoadingOverlay stays separate at 2000
 * so it always sits above modals.
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  /** Called on Esc (if closeOnEsc), backdrop click (if closeOnBackdrop), or
   *  whatever close control the caller renders inside. */
  onClose: () => void;
  /** Accessible name announced when the dialog opens. */
  ariaLabel: string;
  /** "top" (editors — backdrop scrolls) | "center" (viewers — card scrolls). */
  align?: 'top' | 'center';
  /** Card max width in px. Default 720. */
  maxWidth?: number;
  /** Esc closes the dialog. Default true. */
  closeOnEsc?: boolean;
  /** Clicking the backdrop closes the dialog. Default true. */
  closeOnBackdrop?: boolean;
  /** Overlay stacking order. Default 1000 (LoadingOverlay is 2000). */
  zIndex?: number;
  /** Extra styles merged onto the card (e.g. a tighter `gap`). */
  contentStyle?: React.CSSProperties;
  children: React.ReactNode;
}

export function Modal({
  onClose,
  ariaLabel,
  align = 'top',
  maxWidth = 720,
  closeOnEsc = true,
  closeOnBackdrop = true,
  zIndex = 1000,
  contentStyle,
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Focus management: move focus into the dialog on open and restore it to the
  // triggering element on close. None of the six dialogs did this before.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    cardRef.current?.focus();
    return () => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (closeOnEsc && e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !cardRef.current) return;
    // Trap Tab within the dialog so focus can't escape to the page behind.
    // (The selector already excludes disabled / tabindex=-1; the dialogs hide
    // optional controls by not rendering them, so there are no display:none
    // focusables to filter out here.)
    const focusable = Array.from(
      cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const idx = focusable.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey && idx <= 0) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (idx === -1 || idx === focusable.length - 1)) {
      e.preventDefault();
      first.focus();
    }
  }

  const overlayStyle: React.CSSProperties =
    align === 'top'
      ? {
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex, overflow: 'auto', padding: '40px 20px',
        }
      : {
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex,
        };

  const cardStyle: React.CSSProperties =
    align === 'top'
      ? {
          background: 'var(--surface)',
          width: '100%', maxWidth,
          display: 'flex', flexDirection: 'column', gap: 16,
          padding: 20,
          outline: 'none',
          ...contentStyle,
        }
      : {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 28,
          maxWidth, width: '92vw',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          outline: 'none',
          ...contentStyle,
        };

  return (
    <div
      style={overlayStyle}
      onKeyDown={handleKeyDown}
      onClick={
        closeOnBackdrop
          ? e => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={align === 'top' ? 'card' : undefined}
        style={cardStyle}
      >
        {children}
      </div>
    </div>
  );
}
