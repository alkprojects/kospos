import { useRef, useState } from 'react';
import { read } from 'xlsx';
import { detect } from '../../lib/importers/detect';
import { importBfmPosition } from '../../lib/importers/bfm-position';
import { importBfmNonPosition } from '../../lib/importers/bfm-non-position';
import { importPsHcmPp } from '../../lib/importers/ps-hcm-pp';
import { importObiPayroll } from '../../lib/importers/obi-payroll';
import { useAppStore } from '../../lib/store';
import type { ImportedRow } from '../../lib/importers/types';
import { LoadingOverlay } from './LoadingOverlay';
import type { LoadingProgress } from './LoadingOverlay';

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

/** Yield to the browser between files so the LoadingOverlay can repaint
 *  before the next sync .xlsx parse blocks the main thread. */
function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

export function FilePicker({ disabled = false }: { disabled?: boolean } = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addRows = useAppStore(s => s.addRows);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [progress, setProgress] = useState<LoadingProgress | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const next: FileStatus[] = [];

    // Surface the overlay before the first parse so the user sees feedback
    // immediately rather than after the first sync xlsx parse blocks the
    // main thread for ~1-3s on a real labor report.
    setProgress({
      totalFiles: fileArray.length,
      currentFileIndex: 0,
      currentFileName: fileArray[0].name,
      currentFileSizeBytes: fileArray[0].size,
      stage: 'reading',
      filesDone: 0,
    });
    await nextFrame();

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setProgress({
        totalFiles: fileArray.length,
        currentFileIndex: i,
        currentFileName: file.name,
        currentFileSizeBytes: file.size,
        stage: 'reading',
        filesDone: i,
      });
      await nextFrame();

      try {
        const buf = await file.arrayBuffer();
        const isCSV = file.name.toLowerCase().endsWith('.csv');

        setProgress({
          totalFiles: fileArray.length,
          currentFileIndex: i,
          currentFileName: file.name,
          currentFileSizeBytes: file.size,
          stage: 'parsing',
          filesDone: i,
        });
        await nextFrame();

        const wb = isCSV
          ? read(new TextDecoder().decode(buf), { type: 'string' })
          : read(buf, { type: 'array' });

        setProgress({
          totalFiles: fileArray.length,
          currentFileIndex: i,
          currentFileName: file.name,
          currentFileSizeBytes: file.size,
          stage: 'importing',
          filesDone: i,
        });
        await nextFrame();

        // Scan every sheet — Eturns files have both Pos and Nonpos sheets
        let totalRows = 0;
        let lastType = 'unknown';
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const detection = detect(ws);
          if (detection.type === 'unknown') continue;

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
          totalRows += rows.length;
          lastType = detection.type;
        }

        next.push({
          name: file.name,
          type: totalRows > 0 ? lastType : 'unknown',
          rowCount: totalRows,
        });
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
    setProgress(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const loading = progress !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {progress && <LoadingOverlay progress={progress} />}
      <div
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 8,
          padding: '28px 24px',
          textAlign: 'center',
          background: 'var(--surface)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
        onClick={disabled ? undefined : () => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={disabled ? e => e.preventDefault() : e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={disabled ? undefined : e => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload labor report files"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm,.csv"
          multiple
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {disabled
            ? 'Importing source files requires dev mode'
            : loading ? 'Reading…' : 'Drop files here or click to browse'}
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
