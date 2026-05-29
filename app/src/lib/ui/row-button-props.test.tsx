/**
 * rowButtonProps tests — Phase 2.2.w / proposals C2 (P1 a11y).
 *
 * The helper makes a clickable <tr> keyboard-operable. Covers the props it
 * returns and the target-guarded key handling — the key behavior is that a
 * nested control's Enter/Space must NOT also open the row.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { rowButtonProps } from './rowButtonProps';

function renderRow(onOpen: () => void, nested = false) {
  return render(
    <table>
      <tbody>
        <tr {...rowButtonProps(onOpen)} aria-label="Open row">
          <td>{nested ? <button>Nested</button> : 'cell'}</td>
        </tr>
      </tbody>
    </table>,
  );
}

describe('rowButtonProps', () => {
  it('returns button role + tabIndex so the row takes keyboard focus', () => {
    const props = rowButtonProps(() => {});
    expect(props.role).toBe('button');
    expect(props.tabIndex).toBe(0);
  });

  it('onClick calls onOpen', () => {
    const onOpen = vi.fn();
    rowButtonProps(onOpen).onClick();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens on Enter and Space when the row itself is the target', () => {
    const onOpen = vi.fn();
    renderRow(onOpen);
    const row = screen.getByRole('button', { name: 'Open row' });
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('does NOT open when a nested control is the key target', () => {
    const onOpen = vi.fn();
    renderRow(onOpen, true);
    // Enter on the nested button bubbles to the row's handler, but the
    // target guard (e.target === e.currentTarget) keeps it from opening.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Nested' }), { key: 'Enter' });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('ignores other keys', () => {
    const onOpen = vi.fn();
    renderRow(onOpen);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Open row' }), { key: 'a' });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
