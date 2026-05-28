/**
 * LandingView — Phase 2.2.q PR 1.
 *
 * Welcome-tab dashboard showing what data is loaded + freshness per
 * source. Wires onto the auto-persistence status so the user always
 * knows whether the data was freshly loaded from .xlsx vs auto-restored
 * from the previous session's IndexedDB snapshot.
 *
 * Alex's S40 design directive:
 *
 *   "auto load silently, have a landing page that shows what data is
 *    loaded, when it was loaded, and for data like P&P and Payroll
 *    show the snapshot date / latest pp / etc."
 *
 * Layout:
 *   - Persistence status banner: "Snapshot auto-saved at 14:35" or
 *     "Restored from IndexedDB (saved 2026-05-28 14:30)" or empty.
 *   - Loaded data table (per `buildDataSummary`):
 *       source · count · freshness · open button
 *   - Workspace state table (planned actions, separations, etc.).
 *   - Empty state CTA: "Load Reports" button when nothing has loaded.
 *
 * Why a separate tab rather than overlay on every page: the data
 * dashboard answers "what's loaded right now?" — a question every other
 * tab assumes is already answered. Promoting it to a first-class tab
 * makes it the natural landing after a silent auto-restore.
 */

import { useAppStore } from '../../store';
import { useScrapers } from '../../scrapers/store';
import { useStaffingPlan } from '../../staffing-plan';
import { useSeparations } from '../../separations';
import { useProbations } from '../../probation';
import { usePositionNotes } from '../../positions/notes';
import { buildDataSummary, formatRefreshedAt } from './build';
import type { AutoPersistenceState } from '../../session/use-auto-persistence';

export interface LandingViewProps {
  /** Auto-persistence status from `useAutoSessionPersistence`. */
  persistence: AutoPersistenceState;
  /** Hop to a different tab (App owns the tab state). */
  onNavigate: (tab:
    | 'importer'
    | 'positions'
    | 'labor'
    | 'staffing-plan'
    | 'separations'
    | 'probation'
    | 'inactive'
    | 'eligibility'
    | 'calculator'
  ) => void;
}

export function LandingView({ persistence, onNavigate }: LandingViewProps) {
  const loadedRows = useAppStore(s => s.loadedRows);
  const lastBfmImportAt = useAppStore(s => s.lastBfmImportAt);
  const jobPostings = useScrapers(s => s.jobPostings);
  const jobPostingsRefreshedAt = useScrapers(s => s.jobPostingsRefreshedAt);
  const eligibilityLists = useScrapers(s => s.eligibilityLists);
  const eligibilityListsRefreshedAt = useScrapers(s => s.eligibilityListsRefreshedAt);
  const pdfCache = useScrapers(s => s.pdfCache);
  const staffingActions = useStaffingPlan(s => s.actions);
  const staffingDerivedRemoved = useStaffingPlan(s => s.derivedRemoved);
  const separations = useSeparations(s => s.separations);
  const probations = useProbations(s => s.probations);
  const notes = usePositionNotes(s => s.notes);

  const summary = buildDataSummary({
    loadedRows,
    lastBfmImportAt,
    jobPostingsCount: jobPostings.length,
    jobPostingsRefreshedAt,
    eligibilityListsCount: eligibilityLists.length,
    eligibilityListsRefreshedAt,
    pdfCacheCount: Object.keys(pdfCache).length,
    staffingActionsCount: staffingActions.size,
    staffingDerivedRemovedCount: staffingDerivedRemoved.size,
    pendingSeparationsCount: separations.size,
    probationsCount: probations.size,
    positionNotesCount: notes.size,
  });

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0, fontSize: 28, fontWeight: 600 }}>
        Welcome to KosPos
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0, marginBottom: 24 }}>
        Unified workspace for SF labor reports — budgeting, projections,
        hiring plans, probation tracking, and eligibility lists.
      </p>

      <PersistenceBanner persistence={persistence} />

      <section aria-label="Loaded data" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Loaded data
        </h2>
        {summary.empty
          // Suppress the empty CTA while IDB is still resolving — avoids a
          // 10-50ms flash of "No data" before the restore lands.
          && persistence.status !== 'init'
          && persistence.status !== 'loading' ? (
          <EmptyState onNavigate={onNavigate} />
        ) : (
          <SummaryTable rows={summary.sources} onNavigate={onNavigate} />
        )}
      </section>

      {!summary.empty && (
        <section aria-label="Workspace state" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Workspace state
          </h2>
          <SummaryTable rows={summary.userState} onNavigate={onNavigate} />
        </section>
      )}

      <section aria-label="Quick actions" style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <NavButton onClick={() => onNavigate('importer')} label="📂 Load Reports" primary />
        <NavButton onClick={() => onNavigate('positions')} label="Positions" />
        <NavButton onClick={() => onNavigate('eligibility')} label="Eligibility" />
        <NavButton onClick={() => onNavigate('calculator')} label="Job Class Calculator" />
      </section>

      <footer style={{ marginTop: 32, fontSize: 11, color: 'var(--muted)' }}>
        Data persists in this browser via IndexedDB (Phase 2.2.q).
        Cross-device sharing — Phase 2.2.q PR 2 (Cloudflare Pages + KV).
      </footer>
    </div>
  );
}

function PersistenceBanner({ persistence }: { persistence: AutoPersistenceState }): React.JSX.Element | null {
  const { status, lastSavedAt, lastError, loadedSnapshotSavedAt } = persistence;
  if (status === 'init' || status === 'empty') return null;
  if (status === 'loading') {
    return (
      <Banner tone="info">Loading saved session from this browser…</Banner>
    );
  }
  if (status === 'load-error') {
    return (
      <Banner tone="error">
        Could not restore saved session: {lastError}. Working in-memory; loads will still save.
      </Banner>
    );
  }
  if (status === 'save-error') {
    return (
      <Banner tone="error">
        Auto-save failed: {lastError}. Data is in-memory; use Save session for a manual backup.
      </Banner>
    );
  }
  // 'loaded' / 'saved' / 'saving' — all positive states.
  const restoredAt = loadedSnapshotSavedAt
    ? formatRefreshedAt(loadedSnapshotSavedAt)
    : '';
  const savedAt = lastSavedAt ? formatRefreshedAt(lastSavedAt) : '';
  // Per Phase 2.2.q PR 2: name the source of the restore so the user
  // knows whether the loaded data is local or shared. Falls back to the
  // local-browser phrasing when source is empty (matches PR 1 behavior).
  const sourceLabel = persistence.loadedSnapshotSource === 'cloudflare'
    ? 'shared (Cloudflare)'
    : 'this browser';
  if (status === 'saving') {
    return <Banner tone="info">Auto-saving snapshot…</Banner>;
  }
  return (
    <Banner tone="success">
      {restoredAt && <>Restored from {sourceLabel} (saved {restoredAt}). </>}
      {savedAt && <>Last auto-save {savedAt}.</>}
      {!restoredAt && !savedAt && <>Session will auto-save on every change.</>}
    </Banner>
  );
}

function Banner({ tone, children }: {
  tone: 'info' | 'success' | 'error';
  children: React.ReactNode;
}): React.JSX.Element {
  const palette = tone === 'success'
    ? { bg: '#d4f4e3', border: '#1a7a3c', color: '#1a7a3c' }
    : tone === 'error'
      ? { bg: '#fecaca', border: '#dc2626', color: '#7f1d1d' }
      : { bg: '#dbeafe', border: '#2563eb', color: '#1e40af' };
  return (
    <div
      role="status"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 12,
        marginBottom: 0,
      }}
    >
      {children}
    </div>
  );
}

function SummaryTable({
  rows,
  onNavigate,
}: {
  rows: Array<{
    source: string;
    label: string;
    count: number;
    countLabel: string;
    latestLabel?: string;
    tabHint?: string;
  }>;
  onNavigate: LandingViewProps['onNavigate'];
}): React.JSX.Element {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {rows.map(r => {
            const isLoaded = r.count > 0;
            return (
              <tr
                key={r.source}
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: isLoaded ? 'var(--text)' : 'var(--muted)',
                }}
              >
                <td style={{ padding: '8px 12px', fontWeight: isLoaded ? 500 : 400 }}>
                  {r.label}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {r.count.toLocaleString('en-US')}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>
                  {r.countLabel}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {r.latestLabel ?? ''}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  {isLoaded && r.tabHint && (
                    <button
                      onClick={() => onNavigate(r.tabHint as LandingViewProps['onNavigate'] extends (t: infer T) => void ? T : never)}
                      style={{
                        fontSize: 11,
                        padding: '2px 10px',
                        border: '1px solid var(--accent)',
                        borderRadius: 12,
                        background: 'transparent',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Open →
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: LandingViewProps['onNavigate'] }): React.JSX.Element {
  return (
    <div className="card" style={{ padding: 24, textAlign: 'center' }}>
      <p style={{ marginTop: 0, color: 'var(--muted)', fontSize: 14 }}>
        No data loaded yet.
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>
        Load your P&P, BFM, OBI Payroll, or Hiring Plan reports to get started.
        Any data loaded will be auto-saved to this browser so the next reload
        starts where you left off.
      </p>
      <button
        onClick={() => onNavigate('importer')}
        style={{
          marginTop: 12,
          padding: '8px 20px',
          border: '1px solid var(--accent)',
          borderRadius: 16,
          background: 'var(--accent)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'inherit',
          fontWeight: 600,
        }}
      >
        📂 Load Reports →
      </button>
    </div>
  );
}

function NavButton({ onClick, label, primary = false }: {
  onClick: () => void;
  label: string;
  primary?: boolean;
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px',
        border: '1px solid var(--accent)',
        borderRadius: 14,
        background: primary ? 'var(--accent)' : 'transparent',
        color: primary ? '#fff' : 'var(--accent)',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'inherit',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}
