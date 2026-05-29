/**
 * CopyButton — small "two squares" icon button that copies a value to the
 * clipboard on click.
 *
 * Alex flagged at S33 session open:
 * > all displayed data elements should have the two squares copy to
 * > clipboard ui element. that would be a big qol feature for users.
 *
 * Visual: the standard ⧉ overlapping-rectangles icon (rendered as inline
 * SVG so it scales cleanly and respects currentColor for theme alignment).
 * On click, copies the supplied value via `navigator.clipboard.writeText`,
 * swaps to a checkmark for ~1.2 seconds as visual confirmation, then
 * reverts.
 *
 * Accessibility:
 *   - `aria-label` describes the action ("Copy Position number to clipboard")
 *   - The icon is `aria-hidden` since the label covers it
 *   - On copy, aria-live region announces "Copied"
 *
 * Fallback: when navigator.clipboard is unavailable (rare — pre-2020
 * browsers, insecure contexts), falls back to a temporary textarea +
 * document.execCommand('copy'). This keeps the button useful in
 * file:// previews / older corporate IE-mode browsers.
 *
 * Usage:
 *   <span>{position.displayNumber} <CopyButton value={position.displayNumber} label="Position number" /></span>
 */

import { useState } from 'react';

interface CopyButtonProps {
  /** The value to copy to the clipboard. */
  value: string;
  /** Used in the aria-label + tooltip ("Copy {label} to clipboard"). */
  label?: string;
  /** Optional override for the inline button size. Defaults to 14px (small,
   *  intended to sit alongside a value without dominating it). */
  size?: number;
}

async function copyToClipboard(text: string): Promise<boolean> {
  // Preferred path — Clipboard API (HTTPS or localhost only).
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy fallback below
    }
  }
  // Legacy fallback: textarea + execCommand. Documented-but-deprecated;
  // still works in every browser KosPos targets.
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ value, label = 'value', size = 14 }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function handleCopy(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation(); // don't bubble into a row-click handler
    e.preventDefault();
    if (!value) return;
    const ok = await copyToClipboard(value);
    setState(ok ? 'copied' : 'failed');
    setTimeout(() => setState('idle'), 1200);
  }

  const ariaLabel = state === 'copied'
    ? `Copied ${label}`
    : state === 'failed'
    ? `Failed to copy ${label}`
    : `Copy ${label} to clipboard`;

  return (
    <button
      type="button"
      onClick={handleCopy}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCopy(e); }}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={!value}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 6,
        height: size + 6,
        marginLeft: 4,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: value ? 'pointer' : 'not-allowed',
        color: state === 'copied' ? 'var(--success)'
             : state === 'failed' ? '#b91c1c'
             : 'var(--muted)',
        opacity: value ? 1 : 0.4,
        verticalAlign: 'middle',
        borderRadius: 3,
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        if (value && state === 'idle') {
          e.currentTarget.style.background = 'var(--accent-soft)';
          e.currentTarget.style.color = 'var(--accent)';
        }
      }}
      onMouseLeave={e => {
        if (state === 'idle') {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--muted)';
        }
      }}
    >
      {state === 'copied' ? (
        <CheckIcon size={size} />
      ) : state === 'failed' ? (
        <XIcon size={size} />
      ) : (
        <CopyIcon size={size} />
      )}
    </button>
  );
}

/** The "two squares" icon Alex referenced — two overlapping rounded
 *  rectangles. Drawn as inline SVG so it inherits currentColor. */
function CopyIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {/* Back square */}
      <rect x="3" y="3" width="9" height="9" rx="1.5" />
      {/* Front square (offset) */}
      <rect x="6" y="6" width="9" height="9" rx="1.5" fill="var(--surface)" />
    </svg>
  );
}

function CheckIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3,8 7,12 13,4" />
    </svg>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  );
}
