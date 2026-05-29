/**
 * SessionSaveLoad — compact Save / Load-session control for the header top bar.
 *
 * Moved out of the Load Reports tab's session panel (Phase 2.2.u, Alex's S45 ask:
 * "move save/load session to the top bar") so the local-file Save / Load is
 * reachable from any tab. The heavier Publish + Cloudflare-settings controls
 * stay on the Load Reports tab (`SessionExportImport`). Both share the snapshot
 * plumbing via `useSessionSnapshot`.
 *
 * Status is a transient inline note to the left of the buttons: success
 * auto-clears after a few seconds; a load error persists until the next action
 * so a bad file isn't silently missed (full detail in the title attribute).
 */

import { useEffect, useRef, useState } from 'react';
import { useSessionSnapshot } from '../../lib/session/use-session-snapshot';

type Status =
  | { kind: 'idle' }
  | { kind: 'saved' }
  | { kind: 'loaded'; rowCount: number }
  | { kind: 'error'; message: string };

export function SessionSaveLoad() {
  const { isEmpty, saveToFile, loadFromFile } = useSessionSnapshot();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // Auto-clear success messages; errors persist until the next action.
  useEffect(() => {
    if (status.kind === 'saved' || status.kind === 'loaded') {
      const t = setTimeout(() => setStatus({ kind: 'idle' }), 4000);
      return () => clearTimeout(t);
    }
  }, [status]);

  function handleSave() {
    if (isEmpty) return;
    saveToFile();
    setStatus({ kind: 'saved' });
  }

  async function handleLoad(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const outcome = await loadFromFile(files[0]);
      setStatus(
        outcome.ok
          ? { kind: 'loaded', rowCount: outcome.rowCount }
          : { kind: 'error', message: outcome.message },
      );
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to read file.',
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const statusText =
    status.kind === 'saved'
      ? 'Saved ✓'
      : status.kind === 'loaded'
        ? `Loaded ${status.rowCount.toLocaleString('en-US')} rows ✓`
        : status.kind === 'error'
          ? 'Load failed'
          : '';
  const statusColor = status.kind === 'error' ? '#c0392b' : '#1a7a3c';

  const buttonBase: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: 14,
    fontSize: 12,
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {statusText && (
        <span
          role="status"
          aria-live="polite"
          title={status.kind === 'error' ? status.message : statusText}
          style={{
            fontSize: 11,
            color: statusColor,
            maxWidth: 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {statusText}
        </span>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={isEmpty}
        aria-label="Save current session to a JSON file"
        title={
          isEmpty
            ? 'Nothing to save yet — load some data or add a planned action first.'
            : 'Save the current session to a JSON file'
        }
        style={{
          ...buttonBase,
          border: `1px solid ${isEmpty ? 'var(--border)' : 'var(--accent)'}`,
          background: isEmpty ? 'var(--surface)' : 'var(--accent)',
          color: isEmpty ? 'var(--muted)' : '#fff',
          cursor: isEmpty ? 'not-allowed' : 'pointer',
        }}
      >
        💾 Save
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Load a previously-saved session file"
        title="Load a previously-saved session file (replaces the current session)"
        style={{
          ...buttonBase,
          border: '1px solid var(--accent)',
          background: 'transparent',
          color: 'var(--accent)',
        }}
      >
        📂 Load
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={e => handleLoad(e.target.files)}
      />
    </div>
  );
}
