import { FilePicker } from './FilePicker';
import { ScrapeSourcesPanel } from './ScrapeSourcesPanel';
import { SessionExportImport } from './SessionExportImport';
import { DataIssuesPanel } from '../issues/DataIssuesPanel';
import { useAppStore } from '../../lib/store';

/**
 * Load Reports tab — the single home for data acquisition + session
 * persistence. Always visible (Phase 2.2.t). The live scrapes
 * (ScrapeSourcesPanel) and Save/Publish work for everyone; the
 * labor-report file importers (FilePicker) are dev-gated since those are
 * the heavy, centrally-managed uploads ("grey out the upload for other
 * sources outside dev mode" — Alex's S44 directive).
 */
export function ImporterView({ devMode = false }: { devMode?: boolean } = {}) {
  const loadedRows = useAppStore(s => s.loadedRows);
  const clearAll = useAppStore(s => s.clearAll);

  const counts = loadedRows.reduce<Record<string, number>>((acc, r) => {
    acc[r._source] = (acc[r._source] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SessionExportImport />

      <ScrapeSourcesPanel />

      <div className="card">
        <h2>Load source files</h2>
        {!devMode && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 0 }}>
            Importing labor-report source files (BFM Eturns · PS HCM P&P · OBI
            Payroll) requires dev mode — these are managed centrally. The live
            data sources above (job postings + eligibility lists) stay available
            to everyone.
          </p>
        )}
        <FilePicker disabled={!devMode} />
      </div>

      {loadedRows.length > 0 && (
        <div className="card">
          <h2>Loaded Data</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
            {Object.entries(counts).map(([src, n]) => (
              <span key={src} style={{
                fontSize: 12,
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                borderRadius: 12,
                padding: '3px 10px',
                fontFamily: 'monospace',
              }}>
                {src}: {n} rows
              </span>
            ))}
          </div>
          {/* Clearing the centrally-managed labor rows is dev-gated too —
              same intent as gating the upload: a normal user shouldn't be
              able to wipe source data they can't re-import. */}
          {devMode && (
            <button
              onClick={clearAll}
              style={{
                fontSize: 12,
                padding: '4px 12px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--surface)',
                cursor: 'pointer',
                color: 'var(--muted)',
              }}
            >
              Clear all loaded data
            </button>
          )}
        </div>
      )}

      <DataIssuesPanel />
    </div>
  );
}
