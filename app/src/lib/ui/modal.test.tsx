/**
 * Modal tests. Covers the behavior the six migrated dialogs rely on, plus the
 * a11y additions the lift introduced (Phase 2.2.w / carry-forward H):
 *
 *  - Renders children inside a role="dialog" carrying the aria-label
 *  - Esc closes (default), and closeOnEsc={false} suppresses it
 *  - Backdrop click closes; a click on the card does not; closeOnBackdrop={false}
 *    suppresses the backdrop close
 *  - Focus moves into the dialog on open and is restored to the trigger on close
 *  - Tab is trapped: wraps last→first, and Shift+Tab wraps first→last
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders children inside a labelled dialog', () => {
    render(
      <Modal onClose={() => {}} ariaLabel="Test dialog">
        <p>Body content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('closes on Escape by default', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} ariaLabel="Test dialog"><p>x</p></Modal>);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on Escape when closeOnEsc is false', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="Test dialog" closeOnEsc={false}>
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click but not on a click inside the card', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} ariaLabel="Test dialog"><p>x</p></Modal>);
    const dialog = screen.getByRole('dialog');
    // Click inside the card → no close.
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    // Click the backdrop (the overlay, parent of the card) → close.
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on a backdrop click when closeOnBackdrop is false', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="Test dialog" closeOnBackdrop={false}>
        <p>x</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog on open and restores it on close', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(trigger).toHaveFocus();

    const { unmount } = render(
      <Modal onClose={() => {}} ariaLabel="Test dialog">
        <button>Inside</button>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveFocus();

    unmount();
    expect(trigger).toHaveFocus();
    document.body.removeChild(trigger);
  });

  it('traps Tab within the dialog (wraps last→first and first→last)', () => {
    render(
      <Modal onClose={() => {}} ariaLabel="Test dialog">
        <button>First</button>
        <button>Last</button>
      </Modal>,
    );
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    const dialog = screen.getByRole('dialog');

    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});
