/**
 * LoadingOverlay — fixed-position modal that surfaces during file uploads.
 *
 * Why this exists: Alex flagged at S33 that big labor reports (the
 * 39-col OBI Payroll cube is ~3-5 MB; the 64-col BFM eturn is ~1-2 MB
 * with many sheets) take long enough to parse that users might think
 * the app crashed without a visible indicator. Inline "Reading…" text in
 * the FilePicker's drop zone is easy to miss when the user has scrolled
 * past it.
 *
 * The overlay covers the page with a semi-transparent backdrop + a
 * centered card showing:
 *   - Animated spinner (CSS keyframe; no asset dependency)
 *   - Current file name + size (so the user can correlate with what they
 *     just dropped)
 *   - Stage label (reading bytes → parsing workbook → importing rows)
 *   - Per-file progress (e.g. "File 2 of 4")
 *   - Reassurance copy ("large files can take 5-10s — keep this tab open")
 *
 * The .xlsx parse itself is synchronous (xlsx.read blocks the main
 * thread). The FilePicker yields a frame via requestAnimationFrame
 * between files + between stages so the overlay can repaint at the
 * stage boundaries; within a single parse the UI is frozen by design.
 *
 * Pure-presentational component — owns no state. The FilePicker drives
 * progress updates through the `progress` prop.
 */

export type LoadingStage = 'reading' | 'parsing' | 'importing';

export interface LoadingProgress {
  /** Total number of files queued in this upload. */
  totalFiles: number;
  /** Zero-indexed position of the file currently being processed. */
  currentFileIndex: number;
  /** Display name of the current file. */
  currentFileName: string;
  /** Size of the current file in bytes (for user expectation-setting). */
  currentFileSizeBytes: number;
  /** Which substage of the current file we're in. */
  stage: LoadingStage;
  /** Number of files fully processed (not counting the current one). */
  filesDone: number;
}

const STAGE_LABEL: Record<LoadingStage, string> = {
  reading:   'Reading file bytes…',
  parsing:   'Parsing workbook…',
  importing: 'Importing rows…',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function LoadingOverlay({ progress }: { progress: LoadingProgress }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="File upload in progress"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, // above modals (separation/probation detail = 1000)
        padding: 20,
      }}
    >
      <div className="card" style={{
        background: 'var(--surface)',
        maxWidth: 460, width: '100%',
        padding: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        textAlign: 'center',
      }}>
        <Spinner />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {progress.totalFiles > 1
              ? `File ${progress.currentFileIndex + 1} of ${progress.totalFiles}`
              : 'Loading file'}
          </div>
          <div style={{
            fontSize: 15, fontWeight: 700, fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}>
            {progress.currentFileName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {formatBytes(progress.currentFileSizeBytes)} · {STAGE_LABEL[progress.stage]}
          </div>
        </div>

        {progress.totalFiles > 1 && (
          <div style={{ width: '100%' }}>
            <div style={{
              height: 4, background: 'var(--border)', borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${((progress.filesDone) / progress.totalFiles) * 100}%`,
                background: 'var(--accent)',
                transition: 'width 0.2s ease',
              }} />
            </div>
            <div style={{
              fontSize: 11, color: 'var(--muted)', marginTop: 4,
            }}>
              {progress.filesDone} of {progress.totalFiles} files complete
            </div>
          </div>
        )}

        <div style={{
          fontSize: 11, color: 'var(--muted)',
          padding: '8px 12px', borderRadius: 4,
          background: 'var(--accent-soft)', width: '100%',
        }}>
          Large labor reports can take 5–10 seconds to parse. Keep this
          tab open — the app is working, not frozen.
        </div>
      </div>

      {/* Spinner keyframe — inline so the component has no .css dependency. */}
      <style>{`
        @keyframes kospos-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 40, height: 40,
        border: '4px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'kospos-spin 1s linear infinite',
      }}
    />
  );
}
