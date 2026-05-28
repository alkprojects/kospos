/**
 * EligibilityDetail — drill-down modal for one JobCodeRollup. Opens
 * over the EligibilityView when the user clicks a summary row.
 *
 * Read-only. The user comes here to inspect the underlying postings +
 * lists for one job code without leaving the summary table. The summary
 * row shows counts + date ranges; this modal shows every row that fed
 * them.
 *
 * Mirrors PlannedActionDetail / ProbationDetail / SeparationDetail's
 * fixed-overlay pattern — `role="dialog"` + `aria-modal="true"`, Esc
 * + backdrop click to close. No headless-ui dep, no Portal.
 *
 * Sections (top to bottom):
 *   - Header — job code, class title, summary chips, close (×).
 *   - Postings — all open postings; one row per posting with department
 *     + location + released date + external link to the SmartRecruiters
 *     listing.
 *   - Active eligibility lists — sorted newest-first; one row per list
 *     with post date + list ID + exam type + external link to the DHR PDF.
 *   - Expired lists — collapsed by default behind `<details>`; same row
 *     shape as Active.
 */

import { CopyButton } from '../../ui';
import { summarizeRollup } from '../../scrapers';
import type { JobCodeRollup } from '../../scrapers';

interface EligibilityDetailProps {
  rollup: JobCodeRollup;
  onClose: () => void;
}

const TYPE_LABELS: Record<'score-report' | 'eligible-list', string> = {
  'score-report': 'Score report (civil service)',
  'eligible-list': 'Eligible list (uniformed)',
};

// ---------------------------------------------------------------------------
// Inline section header — small, ALL-CAPS for visual separation between
// Postings / Active / Expired sections without consuming much height.
// ---------------------------------------------------------------------------

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      marginTop: 4, marginBottom: 4,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        textTransform: 'uppercase', color: 'var(--accent)',
      }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        {count.toLocaleString('en-US')}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary chips header — counts + date ranges. Mirrors the summary row's
// "at a glance" layout so the modal feels like a zoomed-in version of
// the same row.
// ---------------------------------------------------------------------------

function Chip({ label, value, tone }: { label: string; value: string; tone?: 'accent' | 'muted' | 'warn' }) {
  const colors = tone === 'accent'
    ? { bg: 'var(--accent-soft)', fg: 'var(--accent)' }
    : tone === 'warn'
    ? { bg: '#fef3c7', fg: '#92400e' }
    : { bg: 'var(--surface)', fg: 'var(--muted)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 500,
      background: colors.bg, color: colors.fg,
      border: '1px solid var(--border)',
    }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main detail modal
// ---------------------------------------------------------------------------

export function EligibilityDetail({ rollup, onClose }: EligibilityDetailProps) {
  const summary = summarizeRollup(rollup);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Eligibility detail for job code ${rollup.jobCode}`}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1000, overflow: 'auto', padding: '40px 20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{
        background: 'var(--surface)',
        width: '100%', maxWidth: 840,
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: 20,
      }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Job code
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>
                {rollup.jobCode}
              </div>
              <CopyButton value={rollup.jobCode} label="Job code" />
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              {rollup.classTitle || <em>(no class title)</em>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <Chip
                label="Postings"
                value={summary.postingCount.toLocaleString('en-US')}
                tone={summary.postingCount > 0 ? 'accent' : 'muted'}
              />
              <Chip
                label="Active lists"
                value={summary.activeCount.toLocaleString('en-US')}
                tone={summary.activeCount > 0 ? 'accent' : 'muted'}
              />
              <Chip
                label="Expired"
                value={summary.expiredCount.toLocaleString('en-US')}
                tone="muted"
              />
              {summary.citywideHint && (
                <Chip label="Hint" value="citywide candidate" tone="warn" />
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              padding: '4px 10px',
              border: '1px solid var(--border)', borderRadius: 12,
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
              fontSize: 14, fontFamily: 'inherit', lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        {/* Postings section */}
        <section>
          <SectionHeader label="Open postings" count={rollup.postings.length} />
          {rollup.postings.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>
              No open postings on SmartRecruiters.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
                    {['Released', 'Department', 'Location', 'Posting'].map(h => (
                      <th key={h} style={{
                        padding: '6px 10px', textAlign: 'left',
                        fontWeight: 600, fontSize: 11,
                        textTransform: 'uppercase', letterSpacing: 0.5,
                        color: 'var(--accent)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rollup.postings.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {p.releasedDate ? p.releasedDate.slice(0, 10) : '—'}
                      </td>
                      <td style={{ padding: '5px 10px' }}>
                        {p.department || <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '5px 10px' }}>
                        {p.location || <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '5px 10px' }}>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)' }}
                          title={p.name}
                        >
                          ↗ {p.name || 'open posting'}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Active eligibility lists */}
        <section>
          <SectionHeader label="Active eligibility lists" count={rollup.activeLists.length} />
          {rollup.activeLists.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>
              No active lists within the 2-year window (CSC Rule 411A/412).
            </div>
          ) : (
            <ListsTable lists={rollup.activeLists} />
          )}
        </section>

        {/* Expired lists — collapsed by default */}
        {rollup.expiredLists.length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
              Expired lists ({rollup.expiredLists.length.toLocaleString('en-US')})
            </summary>
            <div style={{ marginTop: 8 }}>
              <ListsTable lists={rollup.expiredLists} />
            </div>
          </details>
        )}

        {/* Footer — close-only */}
        <footer style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '5px 14px',
              border: '1px solid var(--border)', borderRadius: 14,
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared lists table — used for both active + expired sections so the
// row shape stays identical between them.
// ---------------------------------------------------------------------------

function ListsTable({ lists }: { lists: ReadonlyArray<JobCodeRollup['activeLists'][number]> }) {
  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
            {['Post date', 'List ID', 'Type', 'File'].map(h => (
              <th key={h} style={{
                padding: '6px 10px', textAlign: 'left',
                fontWeight: 600, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: 0.5,
                color: 'var(--accent)', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lists.map(l => (
            <tr key={l.fileUrl + l.listId} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {l.postDate || '—'}
              </td>
              <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>
                {l.listId}
                <CopyButton value={l.listId} label="List ID" />
              </td>
              <td style={{ padding: '5px 10px' }}>{TYPE_LABELS[l.type]}</td>
              <td style={{ padding: '5px 10px' }}>
                <a
                  href={l.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}
                  title={l.fileUrl}
                >
                  ↗ PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
