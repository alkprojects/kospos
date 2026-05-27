import { FilePicker } from './FilePicker';
import { SessionExportImport } from './SessionExportImport';
import { DataIssuesPanel } from '../issues/DataIssuesPanel';
import { useAppStore } from '../../lib/store';

export function ImporterView() {
  const loadedRows = useAppStore(s => s.loadedRows);
  const clearAll = useAppStore(s => s.clearAll);

  const counts = loadedRows.reduce<Record<string, number>>((acc, r) => {
    acc[r._source] = (acc[r._source] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SessionExportImport />

      <div className="card">
        <h2>Load Reports</h2>
        <FilePicker />
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
        </div>
      )}

      <DataIssuesPanel />
    </div>
  );
}
