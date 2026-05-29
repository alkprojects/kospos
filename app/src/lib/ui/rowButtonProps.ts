/**
 * rowButtonProps — make a clickable table <tr> keyboard-operable.
 *
 * Phase 2.2.w / proposals C2 (P1 a11y). Five of six list views had detail-
 * opening <tr>s with onClick + cursor:pointer but no role / tabIndex / key
 * handler, so keyboard + screen-reader users could not open a detail record
 * anywhere except the Eligibility table (the one row that got it right). This
 * lifts that correct pattern into one place so every list behaves the same.
 *
 * Spread the result onto the <tr>; the caller keeps its own key / style /
 * aria-label (and any hover handlers):
 *
 *   <tr {...rowButtonProps(() => setSelectedId(p.id))}
 *       aria-label={`Open details for ${p.name}`}
 *       style={{ cursor: 'pointer' }}>
 *
 * It is a plain function, NOT a hook, so it is safe to call inside a .map().
 *
 * Enter / Space fire `onOpen` only when the row ITSELF is focused
 * (`e.target === e.currentTarget`). That keeps the row handler from also
 * firing when a nested control (a CopyButton, a link, a "Positions ->" button)
 * is focused and activated by keyboard — so no per-control stopPropagation is
 * needed. (Mouse clicks on those nested controls are already handled by their
 * own click-stopPropagation; the row's onClick stays a plain `onOpen`.)
 */

import type { KeyboardEvent } from 'react';

export interface RowButtonProps {
  role: 'button';
  tabIndex: 0;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

export function rowButtonProps(onOpen: () => void): RowButtonProps {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
        e.preventDefault();
        onOpen();
      }
    },
  };
}
