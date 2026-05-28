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
 *   - Header — job code, class title, summary chips (postings · active
 *     · expired · duration · citywide-hint), close (×).
 *   - Postings — all open postings; one row per posting with department
 *     + location + released date + external link to the SmartRecruiters
 *     listing.
 *   - Active eligibility lists — sorted newest-first; columns: post date
 *     + list ID + expires (postDate + 2 years per CSC Rule 411A/412) +
 *     status (days left / expired N days ago) + Cert rule + Dept +
 *     Sub-type (Phase 2.2.o — lazy PDF-extracted) + PDF link.
 *   - Expired lists — collapsed by default behind controlled `<details>`;
 *     same row shape as Active. PDF extraction only fires when the user
 *     expands the section (avoids paying ~50 PDF fetches for codes most
 *     users never look past Active on).
 *
 * Phase 2.2.o changes:
 *   - ADDED 3 PDF-extracted columns (Cert rule · Dept · Sub-type)
 *     between Status and File. Each cell shows "…" while extraction is
 *     in flight, the value once extracted, or "—" with a tooltip when
 *     the field couldn't be parsed (older scanned PDFs / atypical
 *     layout).
 *   - Active-list extractions fire on modal mount (useEffect); expired-
 *     list extractions fire on the controlled `<details>` open toggle
 *     so we don't pay 50× the cost up-front for codes the user only
 *     glances at Active on.
 *   - Footnote now lists what *did* extract vs. the per-cell fallback
 *     ("—") for what couldn't.
 *
 * Phase 2.2.n changes (Alex's S37 directive):
 *   - DROPPED per-row Type column. Was constant "Score report (civil
 *     service)" for DBI's data and Alex flagged it as noise. The
 *     citywide-relevant info is preserved at the section header
 *     ("Active eligibility lists · 2 score reports + 1 eligible list")
 *     + at the rollup-level SR/EL chip in the summary row.
 *   - ADDED Expires column (derived: postDate + 2y).
 *   - ADDED Status column (color-coded: green active / yellow expiring
 *     soon ≤90d / red expired) with signed days-remaining.
 *   - ADDED Duration chip in the header.
 *   - ADDED footnote explaining that cert rule, list-row dept, and
 *     exam sub-type are on the PDF.
 */

import { useEffect, useState } from 'react';
import { CopyButton } from '../../ui';
import {
  computeListStatus,
  countListTypes,
  EXPIRING_SOON_DAYS,
  pdfCacheKey,
  summarizeRollup,
  useScrapers,
} from '../../scrapers';
import type {
  EligibilityList,
  JobCodeRollup,
  ListStatusTone,
  PdfExtract,
} from '../../scrapers';

interface EligibilityDetailProps {
  rollup: JobCodeRollup;
  /** Today as ISO `YYYY-MM-DD` — pinned by caller for determinism. */
  today: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Inline section header — small, ALL-CAPS for visual separation between
// Postings / Active / Expired sections without consuming much height.
// Phase 2.2.n: now carries an optional type-breakdown string after the
// count (e.g. "· 2 score reports + 1 eligible list") so the per-row
// Type column can be dropped without losing the citywide signal.
// ---------------------------------------------------------------------------

function SectionHeader({
  label,
  count,
  typeBreakdown,
}: {
  label: string;
  count: number;
  typeBreakdown?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      marginTop: 4, marginBottom: 4, flexWrap: 'wrap',
    }}>
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        textTransform: 'uppercase', color: 'var(--accent)',
      }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        {count.toLocaleString('en-US')}
      </span>
      {typeBreakdown && (
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          · {typeBreakdown}
        </span>
      )}
    </div>
  );
}

/**
 * Format the type breakdown for a section header. Returns empty when
 * the set is uniform (single type) so the header doesn't repeat the
 * common case redundantly — we only surface the split when it matters.
 */
function formatTypeBreakdown(lists: ReadonlyArray<EligibilityList>): string {
  const { scoreReports, eligibleLists } = countListTypes(lists);
  if (scoreReports === 0 && eligibleLists === 0) return '';
  if (scoreReports > 0 && eligibleLists === 0) return '';
  if (scoreReports === 0 && eligibleLists > 0) {
    return `${eligibleLists.toLocaleString('en-US')} eligible list${eligibleLists === 1 ? '' : 's'}`;
  }
  return `${scoreReports.toLocaleString('en-US')} score report${scoreReports === 1 ? '' : 's'} + ${eligibleLists.toLocaleString('en-US')} eligible list${eligibleLists === 1 ? '' : 's'}`;
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
// Per-row status pill — color-coded days-remaining for a single list.
// Drives the "Status" column in the lists table.
// ---------------------------------------------------------------------------

function StatusPill({ tone, label }: { tone: ListStatusTone; label: string }) {
  const colors: Record<ListStatusTone, { bg: string; fg: string }> = {
    active:         { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    'expiring-soon': { bg: '#fef3c7',           fg: '#92400e' },
    expired:        { bg: '#fee2e2',            fg: '#7f1d1d' },
    unknown:        { bg: 'var(--surface)',     fg: 'var(--muted)' },
  };
  const c = colors[tone];
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
      background: c.bg, color: c.fg,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

/** Format `daysRemaining` + `tone` into the user-facing pill text. */
function statusLabel(daysRemaining: number, tone: ListStatusTone): string {
  if (tone === 'unknown') return '—';
  if (tone === 'expired') {
    const ago = -daysRemaining;
    return ago === 0 ? 'expired today'
         : ago === 1 ? 'expired 1d ago'
         : `expired ${ago.toLocaleString('en-US')}d ago`;
  }
  return daysRemaining === 0 ? 'expires today'
       : daysRemaining === 1 ? '1d left'
       : `${daysRemaining.toLocaleString('en-US')}d left`;
}

// ---------------------------------------------------------------------------
// PDF-extracted field cell — Phase 2.2.o. Three states:
//   1. Cache miss: extraction is either in-flight or queued. Render `…`
//      with a tooltip explaining the load.
//   2. Cache hit, success=false: extraction failed (all proxies down,
//      pdfjs threw on a malformed PDF). Render `—` with the error in
//      a tooltip — user can still click ↗ PDF to read the file.
//   3. Cache hit, success=true, field undefined: PDF parsed but the
//      matcher chain didn't find this field (older scanned PDFs,
//      atypical layout). Render `—` with a "not found" tooltip.
//   4. Cache hit, success=true, field value present: render the value.
// ---------------------------------------------------------------------------

function PdfFieldCell({
  extract,
  field,
}: {
  extract: PdfExtract | undefined;
  field: 'certRule' | 'listDepartment' | 'examSubType';
}) {
  if (!extract) {
    return (
      <span
        aria-label="Extracting PDF metadata"
        title="Extracting PDF metadata…"
        style={{ color: 'var(--muted)', fontSize: 11 }}
      >
        …
      </span>
    );
  }
  if (!extract.success) {
    return (
      <span
        title={`PDF extraction failed: ${extract.error || 'unknown error'} (click ↗ PDF to read the file)`}
        style={{ color: 'var(--muted)' }}
      >
        —
      </span>
    );
  }
  const value = extract[field];
  if (!value) {
    return (
      <span
        title="Field not found on PDF cover sheet (older scanned list or atypical layout)"
        style={{ color: 'var(--muted)' }}
      >
        —
      </span>
    );
  }
  return <span>{value}</span>;
}

// ---------------------------------------------------------------------------
// Main detail modal
// ---------------------------------------------------------------------------

export function EligibilityDetail({ rollup, today, onClose }: EligibilityDetailProps) {
  const summary = summarizeRollup(rollup);
  const activeBreakdown = formatTypeBreakdown(rollup.activeLists);
  const expiredBreakdown = formatTypeBreakdown(rollup.expiredLists);

  // Zustand subscriptions — only the slices the modal actually reads.
  // pdfCache resub on every cache change so cells flip from … → value
  // once extractions resolve.
  const pdfCache = useScrapers(s => s.pdfCache);
  const fetchPdfExtractIfNeeded = useScrapers(s => s.fetchPdfExtractIfNeeded);

  // Active-list extractions fire on mount. Dedupe inside the store
  // (module-level `pdfInFlight` Set + cache check) makes re-render
  // re-fires harmless.
  useEffect(() => {
    rollup.activeLists.forEach(list => fetchPdfExtractIfNeeded(list));
  }, [rollup.activeLists, fetchPdfExtractIfNeeded]);

  // Expired-list extractions only fire when the user expands the
  // collapsed section — a code with 80 expired lists would otherwise
  // hammer the proxies for data most users never look at.
  const [expiredOpen, setExpiredOpen] = useState(false);
  useEffect(() => {
    if (!expiredOpen) return;
    rollup.expiredLists.forEach(list => fetchPdfExtractIfNeeded(list));
  }, [expiredOpen, rollup.expiredLists, fetchPdfExtractIfNeeded]);

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
        width: '100%', maxWidth: 960,
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
              <Chip
                label="Duration"
                value="2 yr · CSC 411A/412"
                tone="muted"
              />
              {summary.citywideHint && (
                <Chip label="Hint" value="citywide candidate" tone="warn" />
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close detail"
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
          <SectionHeader
            label="Active eligibility lists"
            count={rollup.activeLists.length}
            typeBreakdown={activeBreakdown}
          />
          {rollup.activeLists.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>
              No active lists within the 2-year window (CSC Rule 411A/412).
            </div>
          ) : (
            <ListsTable lists={rollup.activeLists} today={today} pdfCache={pdfCache} />
          )}
        </section>

        {/* Expired lists — controlled <details> so we know when to fire
            extractions (only on open) without re-firing on every render. */}
        {rollup.expiredLists.length > 0 && (
          <details
            open={expiredOpen}
            onToggle={e => setExpiredOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
              Expired lists ({rollup.expiredLists.length.toLocaleString('en-US')})
              {expiredBreakdown && (
                <span style={{ fontWeight: 400, marginLeft: 6 }}>· {expiredBreakdown}</span>
              )}
            </summary>
            <div style={{ marginTop: 8 }}>
              <ListsTable lists={rollup.expiredLists} today={today} pdfCache={pdfCache} />
            </div>
          </details>
        )}

        {/* Phase 2.2.o footnote — describes what the PDF columns do, and
            what `—` means (extraction failed vs. field not in PDF). */}
        <div style={{
          fontSize: 11, color: 'var(--muted)',
          borderTop: '1px dashed var(--border)', paddingTop: 8,
        }}>
          <strong style={{ color: 'var(--muted)' }}>Cert rule · Dept · Sub-type:</strong>{' '}
          extracted on demand from each list's PDF cover sheet
          (Phase 2.2.o). <strong>…</strong> = loading;
          <strong> —</strong> with hover-tooltip = parsed but field not
          found (older scanned PDFs / atypical layout) OR fetch failed
          (CORS proxy down). Click <strong>↗ PDF</strong> on any row
          to verify against the source.
        </div>

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
//
// Phase 2.2.o column shape: Post date · List ID · Expires · Status ·
// Cert rule · Dept · Sub-type · File.
// ---------------------------------------------------------------------------

function ListsTable({
  lists,
  today,
  pdfCache,
}: {
  lists: ReadonlyArray<EligibilityList>;
  today: string;
  pdfCache: Record<string, PdfExtract>;
}) {
  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
            {['Post date', 'List ID', 'Expires', 'Status', 'Cert rule', 'Dept', 'Sub-type', 'File'].map(h => (
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
          {lists.map(l => {
            const { daysRemaining, tone, expirationDate } = computeListStatus(l, today);
            const extract = pdfCache[pdfCacheKey(l.jobCode, l.listId, l.postDate)];
            return (
              <tr key={l.fileUrl + l.listId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {l.postDate || '—'}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>
                  {l.listId}
                  <CopyButton value={l.listId} label="List ID" />
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {expirationDate || '—'}
                </td>
                <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                  <StatusPill tone={tone} label={statusLabel(daysRemaining, tone)} />
                  {tone === 'expiring-soon' && (
                    <span
                      title={`Within the ${EXPIRING_SOON_DAYS}-day expiring-soon window`}
                      style={{ marginLeft: 4, color: 'var(--muted)', fontSize: 10 }}
                    >
                      ⓘ
                    </span>
                  )}
                </td>
                <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                  <PdfFieldCell extract={extract} field="certRule" />
                </td>
                <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                  <PdfFieldCell extract={extract} field="listDepartment" />
                </td>
                <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                  <PdfFieldCell extract={extract} field="examSubType" />
                </td>
                <td style={{ padding: '5px 10px' }}>
                  <a
                    href={l.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}
                    title="Opens PDF cover sheet (source for Cert rule / Dept / Sub-type)"
                  >
                    ↗ PDF
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
