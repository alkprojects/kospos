/**
 * SessionExportImport — Save / Load session affordances above the
 * FilePicker on the Load Reports tab.
 *
 * Save: serializes loadedRows + staffing-plan + position-notes state to
 * a JSON file, triggers a browser download. Filename:
 * `kospos-session-YYYY-MM-DDTHHMM.json`.
 *
 * Load: file input accepting `.json`. Parses + validates the schema +
 * fans the payload back to the three Zustand stores. Shows a status
 * message inline.
 *
 * No backend / no upload — the file lives on the user's machine. PII
 * (names, emplIds, salaries) stays local. Bridges the gap until Phase
 * 2.2.33 ships IndexedDB persistence.
 */

import { useRef, useState } from 'react';
import { useAppStore } from '../../lib/store';
import { useStaffingPlan } from '../../lib/staffing-plan';
import { useSeparations } from '../../lib/separations';
import { useProbations } from '../../lib/probation';
import { usePositionNotes } from '../../lib/positions/notes';
import {
  SESSION_SCHEMA_VERSION,
  buildSessionFile,
  defaultSessionFilename,
  parseSessionFile,
} from '../../lib/session/snapshot';

type Status =
  | { kind: 'idle' }
  | { kind: 'saved'; filename: string; rowCount: number }
  | { kind: 'loaded'; filename: string; rowCount: number }
  | { kind: 'error'; message: string };

export function SessionExportImport() {
  const loadedRows = useAppStore(s => s.loadedRows);
  const lastBfmImportAt = useAppStore(s => s.lastBfmImportAt);
  const restoreApp = useAppStore(s => s.restoreFromSession);

  const staffingActions = useStaffingPlan(s => s.actions);
  const staffingDerivedRemoved = useStaffingPlan(s => s.derivedRemoved);
  const restoreStaffing = useStaffingPlan(s => s.restoreFromSession);

  const pendingSeparations = useSeparations(s => s.separations);
  const restoreSeparations = useSeparations(s => s.restoreFromSession);

  const probations = useProbations(s => s.probations);
  const restoreProbations = useProbations(s => s.restoreFromSession);

  const notes = usePositionNotes(s => s.notes);
  const restoreNotes = usePositionNotes(s => s.restoreFromSession);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  function handleSave() {
    const file = buildSessionFile({
      loadedRows,
      lastBfmImportAt,
      staffingPlanActions: staffingActions,
      staffingPlanDerivedRemoved: staffingDerivedRemoved,
      positionNotes: notes,
      pendingSeparations,
      probations,
    });
    const json = JSON.stringify(file, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = defaultSessionFilename(new Date());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus({ kind: 'saved', filename, rowCount: loadedRows.length });
  }

  async function handleLoad(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const text = await file.text();
      const result = parseSessionFile(text);
      if (!result.ok) {
        const msg = (() => {
          switch (result.reason) {
            case 'invalid-json':
              return `Not a valid JSON file: ${result.detail}`;
            case 'not-a-session-file':
              return `This doesn't look like a KosPos session file. ${result.detail}`;
            case 'schema-mismatch':
              return `Schema version mismatch (file v${result.got}, app expects v${result.expected}). Save a fresh session in the current build.`;
          }
        })();
        setStatus({ kind: 'error', message: msg });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const { payload } = result.file;
      restoreApp(payload.loadedRows, payload.lastBfmImportAt);
      restoreStaffing(payload.staffingPlanActions, payload.staffingPlanDerivedRemoved);
      restoreNotes(payload.positionNotes);
      // Backward-compatible: v1 files saved before Phase 2.2.i don't carry
      // `pendingSeparations`. Default to []; existing in-memory rows are
      // wiped (the "load replaces the session" contract).
      restoreSeparations(payload.pendingSeparations ?? []);
      // Same back-compat rule for `probations` (Phase 2.2.j).
      restoreProbations(payload.probations ?? []);
      setStatus({
        kind: 'loaded',
        filename: file.name,
        rowCount: payload.loadedRows.length,
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to read file.',
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const totalActions = staffingActions.size;
  const totalNotes = notes.size;
  const totalHidden = staffingDerivedRemoved.size;
  const totalSeparations = pendingSeparations.size;
  const totalProbations = probations.size;
  const saveDisabled =
    loadedRows.length === 0 && totalActions === 0 && totalNotes === 0 &&
    totalHidden === 0 && totalSeparations === 0 && totalProbations === 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14 }}>Session</strong>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Save the current in-memory state to a JSON file on your machine, then
          reload it on a fresh browser to skip re-importing every file.
          Includes loaded rows + Hiring Plan actions + position notes.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          aria-label="Save current session to a JSON file"
          title={saveDisabled ? 'Nothing to save — load some data or add a planned action first.' : undefined}
          style={{
            padding: '5px 14px',
            border: `1px solid ${saveDisabled ? 'var(--border)' : 'var(--accent)'}`,
            borderRadius: 14,
            background: saveDisabled ? 'var(--surface)' : 'var(--accent)',
            color: saveDisabled ? 'var(--muted)' : '#fff',
            cursor: saveDisabled ? 'not-allowed' : 'pointer',
            fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          💾 Save session
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Load a previously-saved session file"
          style={{
            padding: '5px 14px',
            border: '1px solid var(--accent)', borderRadius: 14,
            background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          📂 Load session…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={e => handleLoad(e.target.files)}
        />
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          schema v{SESSION_SCHEMA_VERSION} · {loadedRows.length.toLocaleString('en-US')} rows
          {totalActions > 0 && <> · {totalActions} planned action{totalActions === 1 ? '' : 's'}</>}
          {totalHidden > 0 && <> · {totalHidden} hidden</>}
          {totalNotes > 0 && <> · {totalNotes} note{totalNotes === 1 ? '' : 's'}</>}
          {totalSeparations > 0 && <> · {totalSeparations} separation{totalSeparations === 1 ? '' : 's'}</>}
          {totalProbations > 0 && <> · {totalProbations} probation{totalProbations === 1 ? '' : 's'}</>}
        </span>
      </div>

      {status.kind === 'saved' && (
        <div style={{
          fontSize: 12, color: '#1a7a3c',
          background: '#d4f4e3', border: '1px solid #1a7a3c', borderRadius: 4,
          padding: '6px 10px',
        }}>
          Saved <span style={{ fontFamily: 'monospace' }}>{status.filename}</span>{' '}
          ({status.rowCount.toLocaleString('en-US')} rows). Check your Downloads folder.
        </div>
      )}
      {status.kind === 'loaded' && (
        <div style={{
          fontSize: 12, color: '#1a7a3c',
          background: '#d4f4e3', border: '1px solid #1a7a3c', borderRadius: 4,
          padding: '6px 10px',
        }}>
          Loaded <span style={{ fontFamily: 'monospace' }}>{status.filename}</span>{' '}
          ({status.rowCount.toLocaleString('en-US')} rows). Existing in-memory state was replaced.
        </div>
      )}
      {status.kind === 'error' && (
        <div style={{
          fontSize: 12, color: '#7f1d1d',
          background: '#fecaca', border: '1px solid #dc2626', borderRadius: 4,
          padding: '6px 10px',
        }}>
          {status.message}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Session files contain SF public-employee data (names, IDs, classifications,
        salaries) — all public records under the Sunshine Ordinance + state law.
        Private fields (SSN, dependents, health info) aren't in these reports.
        Session files stay on your machine until you share them; KosPos doesn't
        upload anywhere. IndexedDB persistence is queued for Phase 2.2.33.
      </div>
    </div>
  );
}
