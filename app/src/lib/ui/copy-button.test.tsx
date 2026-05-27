/**
 * CopyButton tests. Covers:
 *
 *  - Renders an icon-only button with the right aria-label
 *  - Click invokes navigator.clipboard.writeText with the value
 *  - On success, swaps to a "Copied {label}" aria-label briefly
 *  - On failure, swaps to a "Failed to copy {label}" aria-label
 *  - Empty value → disabled button (no clipboard call)
 *  - Click event doesn't bubble to ancestors (important for usage in
 *    clickable rows — copy shouldn't trigger row-click)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  let writeTextMock: ReturnType<typeof vi.fn>;
  let originalClipboard: typeof navigator.clipboard;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  it('renders an icon button with a meaningful aria-label', () => {
    render(<CopyButton value="50001" label="Position number" />);
    expect(screen.getByRole('button', { name: /Copy Position number to clipboard/i })).toBeInTheDocument();
  });

  it('invokes navigator.clipboard.writeText with the value on click', async () => {
    render(<CopyButton value="50001" label="Position number" />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith('50001'));
  });

  it('swaps to "Copied" feedback after a successful copy', async () => {
    render(<CopyButton value="50001" label="Position number" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Copied Position number/i })).toBeInTheDocument(),
    );
  });

  it('swaps to "Failed to copy" feedback when clipboard rejects', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('denied'));
    // Also stub the legacy fallback so the failure branch is reached.
    const execMock = vi.fn().mockReturnValue(false);
    document.execCommand = execMock as unknown as typeof document.execCommand;
    render(<CopyButton value="50001" label="Position number" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Failed to copy Position number/i })).toBeInTheDocument(),
    );
  });

  it('is disabled when value is empty', () => {
    render(<CopyButton value="" label="Position number" />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it('stops click event from bubbling to ancestors (row-click safety)', async () => {
    const onRowClick = vi.fn();
    render(
      <div onClick={onRowClick}>
        <CopyButton value="50001" label="Position number" />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalled());
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
