/**
 * SessionExportImport — Save / Load session affordances above the
 * FilePicker on the Load Reports tab.
 *
 * Three save/load modes:
 *
 *   1. **File** (since Phase 2.2.h): download the session as a JSON
 *      file. Useful for offline backup + emailing to a colleague.
 *   2. **IndexedDB** (since Phase 2.2.q PR 1): auto-saves to this
 *      browser. No UI here — see `useAutoSessionPersistence` +
 *      `LandingView` for status.
 *   3. **Cloudflare publish** (Phase 2.2.q PR 2): push the current
 *      snapshot to a shared Cloudflare Workers KV namespace so other
 *      browsers / devices load it on next open. Gated by a publish
 *      secret stored in localStorage.
 *
 * The publish flow requires Alex to set up the Cloudflare Pages project
 * + KV binding once, then paste the Pages URL + publish secret here.
 * See `docs/research/persistence-architecture-options.md` for the
 * architecture rationale + setup steps.
 */

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../lib/store';
import { useStaffingPlan } from '../../lib/staffing-plan';
import { useSeparations } from '../../lib/separations';
import { useProbations } from '../../lib/probation';
import { usePositionNotes } from '../../lib/positions/notes';
import { useScrapers } from '../../lib/scrapers/store';
import {
  SESSION_SCHEMA_VERSION,
  buildSessionFile,
  defaultSessionFilename,
  parseSessionFile,
} from '../../lib/session/snapshot';
import {
  publishSnapshot,
  readCloudflareConfig,
  writeCloudflareConfig,
  type CloudflareConfig,
  type PublishStage,
} from '../../lib/session/cloudflare-publish';

type Status =
  | { kind: 'idle' }
  | { kind: 'saved'; filename: string; rowCount: number }
  | { kind: 'loaded'; filename: string; rowCount: number }
  // S41 UX: `stage` lets the banner show what phase we're in (building
  // the in-memory snapshot, gzip-compressing, uploading) so the user
  // sees motion + meaningful progress instead of a static
  // "Publishing…" line for 5-15 seconds on 300K-row data.
  | { kind: 'publishing'; stage: 'building' | PublishStage }
  | { kind: 'published'; savedAt: string; bytes: number }
  | { kind: 'config-saved' }
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

  // Phase 2.2.q PR 2 — scrapers state goes into the snapshot so a
  // publish carries the eligibility lists + PDF cache alongside the
  // rest. Per-field selectors (NOT an object-returning selector) to
  // avoid a fresh reference per render — Zustand's
  // `useSyncExternalStore` would flag an infinite loop otherwise.
  const jobPostings = useScrapers(s => s.jobPostings);
  const jobPostingsRefreshedAt = useScrapers(s => s.jobPostingsRefreshedAt);
  const eligibilityLists = useScrapers(s => s.eligibilityLists);
  const eligibilityListsRefreshedAt = useScrapers(s => s.eligibilityListsRefreshedAt);
  const pdfCache = useScrapers(s => s.pdfCache);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [config, setConfig] = useState<CloudflareConfig>(() => readCloudflareConfig());
  const [showConfig, setShowConfig] = useState(false);

  // Re-read config when the toggle opens — covers the case where the
  // user pastes a value in DevTools then opens the panel.
  useEffect(() => {
    if (showConfig) setConfig(readCloudflareConfig());
  }, [showConfig]);

  function buildCurrentSnapshot() {
    return buildSessionFile({
      loadedRows,
      lastBfmImportAt,
      staffingPlanActions: staffingActions,
      staffingPlanDerivedRemoved: staffingDerivedRemoved,
      positionNotes: notes,
      pendingSeparations,
      probations,
      jobPostings,
      jobPostingsRefreshedAt,
      eligibilityLists,
      eligibilityListsRefreshedAt,
      pdfCache,
    });
  }

  function handleSave() {
    const file = buildCurrentSnapshot();
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

  async function handlePublish() {
    // S41 UX: set the publishing banner BEFORE the heavy work starts,
    // then yield to React (await a microtask) so the banner paints
    // before JSON.stringify on 300K rows blocks the main thread for
    // several seconds. Without this, the user sees nothing happen
    // after clicking the button — and Chrome eventually shows its
    // "page unresponsive" dialog. With these yields, the banner +
    // spinner are visible immediately + the browser stays responsive
    // enough to skip the dialog.
    setStatus({ kind: 'publishing', stage: 'building' });
    await new Promise(r => setTimeout(r, 0));
    const file = buildCurrentSnapshot();
    await new Promise(r => setTimeout(r, 0));
    const result = await publishSnapshot(file, undefined, undefined, stage => {
      setStatus({ kind: 'publishing', stage });
    });
    if (result.ok) {
      setStatus({ kind: 'published', savedAt: result.savedAt, bytes: result.bytes });
      return;
    }
    const msg = (() => {
      switch (result.reason) {
        case 'not-configured':
          return 'Cloudflare Pages URL not set. Open settings below to configure.';
        case 'no-secret':
          return 'Publish secret not set. Open settings below to paste it.';
        case 'http-error':
          return `Publish failed (HTTP ${result.status}): ${result.detail}`;
        case 'network-error':
          return `Publish failed (network): ${result.detail}`;
      }
    })();
    setStatus({ kind: 'error', message: msg });
  }

  function handleSaveConfig() {
    writeCloudflareConfig(config);
    setStatus({ kind: 'config-saved' });
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
  const publishConfigured = config.pagesUrl !== '' && config.publishSecret !== '';
  const publishDisabled =
    saveDisabled || !publishConfigured || status.kind === 'publishing';

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
        <button
          onClick={handlePublish}
          disabled={publishDisabled}
          aria-label="Publish snapshot to Cloudflare so other devices can load it"
          title={
            !publishConfigured
              ? 'Configure Cloudflare Pages URL + publish secret in settings below.'
              : saveDisabled
                ? 'Nothing to publish — load some data first.'
                : 'Publish current snapshot to Cloudflare. Other devices will load it on next open.'
          }
          style={{
            padding: '5px 14px',
            border: `1px solid ${publishDisabled ? 'var(--border)' : 'var(--accent)'}`,
            borderRadius: 14,
            background: publishDisabled ? 'var(--surface)' : 'transparent',
            color: publishDisabled ? 'var(--muted)' : 'var(--accent)',
            cursor: publishDisabled ? 'not-allowed' : 'pointer',
            fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          ☁ Publish snapshot
        </button>
        <button
          onClick={() => setShowConfig(!showConfig)}
          aria-label="Cloudflare publish settings"
          aria-expanded={showConfig}
          style={{
            padding: '5px 12px',
            border: '1px solid var(--border)', borderRadius: 14,
            background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit',
          }}
        >
          ⚙ Cloudflare settings
        </button>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          schema v{SESSION_SCHEMA_VERSION} · {loadedRows.length.toLocaleString('en-US')} rows
          {totalActions > 0 && <> · {totalActions} planned action{totalActions === 1 ? '' : 's'}</>}
          {totalHidden > 0 && <> · {totalHidden} hidden</>}
          {totalNotes > 0 && <> · {totalNotes} note{totalNotes === 1 ? '' : 's'}</>}
          {totalSeparations > 0 && <> · {totalSeparations} separation{totalSeparations === 1 ? '' : 's'}</>}
          {totalProbations > 0 && <> · {totalProbations} probation{totalProbations === 1 ? '' : 's'}</>}
        </span>
      </div>

      {showConfig && (
        <div
          aria-label="Cloudflare publish settings"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 12,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            One-time setup. See <a href="https://github.com/alkprojects/kospos/blob/main/docs/research/persistence-architecture-options.md" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>persistence-architecture-options.md</a> for the full Cloudflare Pages + KV setup steps.
            Values stay on this device (localStorage) — never in the bundle.
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
            <span style={{ fontWeight: 500 }}>Cloudflare Pages URL</span>
            <input
              type="url"
              placeholder="https://kospos.pages.dev"
              value={config.pagesUrl}
              onChange={e => setConfig(c => ({ ...c, pagesUrl: e.target.value }))}
              style={{
                padding: '4px 8px', fontSize: 12, fontFamily: 'monospace',
                border: '1px solid var(--border)', borderRadius: 4,
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
            <span style={{ fontWeight: 500 }}>Publish secret</span>
            <input
              type="password"
              placeholder="value of PUBLISH_SECRET env var in Cloudflare Pages settings"
              value={config.publishSecret}
              onChange={e => setConfig(c => ({ ...c, publishSecret: e.target.value }))}
              style={{
                padding: '4px 8px', fontSize: 12, fontFamily: 'monospace',
                border: '1px solid var(--border)', borderRadius: 4,
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSaveConfig}
              style={{
                padding: '4px 12px',
                border: '1px solid var(--accent)', borderRadius: 12,
                background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
              }}
            >
              Save settings
            </button>
            <button
              onClick={() => {
                setConfig({ pagesUrl: '', publishSecret: '' });
              }}
              style={{
                padding: '4px 12px',
                border: '1px solid var(--border)', borderRadius: 12,
                background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

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
      {status.kind === 'publishing' && (
        <div style={{
          fontSize: 12, color: '#1e40af',
          background: '#dbeafe', border: '1px solid #2563eb', borderRadius: 4,
          padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* SMIL-animated spinner — no CSS keyframes needed, supported in
              every modern browser. Gives the banner motion so the user
              knows the work isn't frozen even when the main thread is
              briefly blocked by JSON.stringify on a large payload. */}
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" stroke="#93c5fd" strokeWidth="3" fill="none" />
            <path d="M 12 2 A 10 10 0 0 1 22 12" stroke="#2563eb" strokeWidth="3" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
            </path>
          </svg>
          <span>
            {status.stage === 'building' && 'Building snapshot from in-memory state…'}
            {status.stage === 'compressing' && 'Compressing snapshot for upload…'}
            {status.stage === 'uploading' && 'Uploading to Cloudflare…'}
          </span>
        </div>
      )}
      {status.kind === 'published' && (
        <div style={{
          fontSize: 12, color: '#1a7a3c',
          background: '#d4f4e3', border: '1px solid #1a7a3c', borderRadius: 4,
          padding: '6px 10px',
        }}>
          Published snapshot ({(status.bytes / 1024).toLocaleString('en-US', { maximumFractionDigits: 1 })} KB).
          Anyone with the Cloudflare URL will load this on next open.
        </div>
      )}
      {status.kind === 'config-saved' && (
        <div style={{
          fontSize: 12, color: '#1a7a3c',
          background: '#d4f4e3', border: '1px solid #1a7a3c', borderRadius: 4,
          padding: '6px 10px',
        }}>
          Cloudflare settings saved to this browser.
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
        Session data contains SF public-employee records (names, IDs, classifications,
        salaries) — all public under the Sunshine Ordinance + state law. Private fields
        (SSN, dependents, health info) aren't in these reports. Local saves stay on
        this device (file + IndexedDB auto-save). Cloudflare publishing is opt-in:
        anyone with the Pages URL can read; only those with the publish secret can write.
      </div>
    </div>
  );
}
