import { useRef, useState } from 'react';
import { read } from 'xlsx';
import { detect } from '../../lib/importers/detect';
import { importBfmPosition } from '../../lib/importers/bfm-position';
import { importBfmNonPosition } from '../../lib/importers/bfm-non-position';
import { importPsHcmPp } from '../../lib/importers/ps-hcm-pp';
import { importObiPayroll } from '../../lib/importers/obi-payroll';
import { useAppStore } from '../../lib/store';
import type { ImportedRow } from '../../lib/importers/types';

const REPORT_LABELS: Record<string, string> = {
  'bfm-position':     'BFM Eturns — Position',
  'bfm-non-position': 'BFM Eturns — Non-Position',
  'ps-hcm-pp':        'PS HCM — P&P Data',
  'obi-payroll':      'OBI BI Payroll',
  'unknown':          'Unknown report type',
};

interface FileStatus {
  name: string;
  type: string;
  rowCount: number;
  error?: string;
}

export function FilePicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const addRows = useAppStore(s => s.addRows);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    const next: FileStatus[] = [];

    for (const file of Array.from(files)) {
      try {
        const buf = await file.arrayBuffer();
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const wb = isCSV
          ? read(new TextDecoder().decode(buf), { type: 'string' })
          : read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const detection = detect(ws);

        let rows: ImportedRow[] = [];
        if (detection.type === 'bfm-position') {
          rows = importBfmPosition(ws, detection.headerRow);
        } else if (detection.type === 'bfm-non-position') {
          rows = importBfmNonPosition(ws, detection.headerRow);
        } else if (detection.type === 'ps-hcm-pp') {
          rows = importPsHcmPp(ws, detection.headerRow);
        } else if (detection.type === 'obi-payroll') {
          rows = importObiPayroll(ws, detection.headerRow);
        }

        addRows(rows);
        next.push({ name: file.name, type: detection.type, rowCount: rows.length });
      } catch (err) {
        next.push({
          name: file.name,
          type: 'unknown',
          rowCount: 0,
          error: err instanceof Error ? err.message : 'Parse error',
        });
      }
    }

    setStatuses(prev => [...prev, ...next]);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 8,
          padding: '28px 24px',
          textAlign: 'center',
          background: 'var(--surface)',
          cursor: 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload labor report files"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm,.csv"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {loading ? 'Reading…' : 'Drop files here or click to browse'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          Accepts .xlsx, .xlsm, and .csv — BFM Eturns, PS HCM P&P, OBI Payroll
        </div>
      </div>

      {statuses.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', color: 'var(--muted)', fontWeight: 600 }}>File</th>
              <th style={{ padding: '6px 8px', color: 'var(--muted)', fontWeight: 600 }}>Detected type</th>
              <th style={{ padding: '6px 8px', color: 'var(--muted)', fontWeight: 600, textAlign: 'right' }}>Rows</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{s.name}</td>
                <td style={{ padding: '6px 8px' }}>
                  {s.error
                    ? <span style={{ color: '#c0392b' }}>{s.error}</span>
                    : s.type === 'unknown'
                      ? <span style={{ color: '#e67e22' }}>Unrecognised — check column headers</span>
                      : <span style={{ color: '#27ae60' }}>{REPORT_LABELS[s.type]}</span>
                  }
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{s.error ? '—' : s.rowCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
