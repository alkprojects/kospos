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
 *     · expired · citywide-hint), close (×).
 *   - Postings — all open postings; one row per posting with department
 *     + location + released date + external link to the SmartRecruiters
 *     listing.
 *   - Extraction progress bar — visible while PDFs are still loading;
 *     fades when all visible-section extractions have a cache entry.
 *   - In-modal filter chip row — search · status · exam type · dept ·
 *     citywide-only · reset · match count. Same chip-row shape as the
 *     main EligibilityView toolbar (Alex's "search/filter like every
 *     other page" directive).
 *   - Active eligibility lists — columns: post date · list ID · Duration
 *     · Expires · Status · Cert rule · Dept · Exam Type · PDF link.
 *     Click any column header to sort asc/desc/reset.
 *   - Expired lists — collapsed by default behind controlled `<details>`;
 *     same row shape as Active. PDF extraction only fires when the user
 *     expands the section.
 *
 * Phase 2.2.p changes (Alex's S39 directive — drill-modal UX overhaul):
 *   - REPLACED per-row Sub-type column with **Exam Type** (PBT/ETP/CBT/
 *     Q&E) — Alex's "the important field to show is exam type, not list
 *     type" call. The List Type / examSubType value drops from per-row;
 *     it's still captured in pdfCache for future use.
 *   - ADDED per-row **Duration** column. Source: pdfCache `duration`
 *     (e.g., "12 Months"). When absent, defaults to "2 yr". The header's
 *     constant "Duration: 2 yr · CSC 411A/412" chip is dropped — Phase
 *     2.2.o real-data discovery refutes the constant-2yr assumption.
 *   - Expires column now honors per-list Duration when extracted (via
 *     extended `computeListExpiration(list, windowDays, durationStr)`).
 *   - ADDED top-of-modal **PDF extraction progress bar** ("N of M
 *     extracted…"). Visible while any active-section (or expanded
 *     expired-section) list hasn't cached yet; fades at 100%.
 *   - ADDED in-modal **filter chip row** — same shape as the main
 *     EligibilityView toolbar: search · status · exam type chips · dept
 *     multi-select · citywide-only toggle · reset · match count. Filters
 *     both Active + Expired sections.
 *   - ADDED **column-header click-to-sort** on every list-table column
 *     except File. Asc → desc → reset cycle. Active sort column shows
 *     ▲/▼ indicator.
 *
 * Phase 2.2.o changes (carried):
 *   - Cert rule · Dept columns (PDF-extracted; per-cell loading/value/
 *     failure states).
 *   - Active-list extractions fire on modal mount; expired-list
 *     extractions fire on the controlled `<details>` open toggle so we
 *     don't pay 50× the cost up-front for codes the user only glances
 *     at Active on.
 *   - Footnote describes the PDF columns + their loading/failure states.
 *
 * Phase 2.2.n changes (Alex's S37 directive):
 *   - DROPPED per-row Type column.
 *   - ADDED Expires + Status columns + section-header type-breakdown.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CopyButton, Modal } from '../../ui';
import {
  applyEligibilityDetailFilters,
  collectExamTypes,
  collectListDepartments,
  computeListStatus,
  countListTypes,
  DEFAULT_DETAIL_SORT,
  EMPTY_DETAIL_FILTERS,
  EXPIRING_SOON_DAYS,
  pdfCacheKey,
  parseDuration,
  sortEligibilityLists,
  summarizeRollup,
  useScrapers,
} from '../../scrapers';
import type {
  DetailListStatusFilter,
  DetailSort,
  DetailSortColumn,
  EligibilityDetailFilters,
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
    expired:        { bg: '#fee2e2',            fg: 'var(--danger)' },
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
// PDF-extracted field cell — Phase 2.2.o (extended Phase 2.2.p with
// 'examType' + 'duration' fields). Three states:
//   1. Cache miss: extraction is either in-flight or queued. Render `…`
//      with a tooltip explaining the load.
//   2. Cache hit, success=false: extraction failed (all proxies down,
//      pdfjs threw on a malformed PDF). Render `—` with the error in
//      a tooltip — user can still click ↗ PDF to read the file.
//   3. Cache hit, success=true, field undefined: PDF parsed but the
//      matcher chain didn't find this field (older scanned PDFs,
//      atypical layout). Render `—` with a "not found" tooltip.
//   4. Cache hit, success=true, field value present: render the value.
//
// Phase 2.2.p — `field` union extended with 'examType' and 'duration'.
// `examSubType` (List Type, CPE/etc.) is no longer rendered per-row but
// is still captured on PdfExtract for future use.
// ---------------------------------------------------------------------------

function PdfFieldCell({
  extract,
  field,
  fallback,
}: {
  extract: PdfExtract | undefined;
  field: 'certRule' | 'listDepartment' | 'examType' | 'duration';
  /** Optional fallback string used when extract is missing OR field is
   *  undefined. Used by the Duration column to show "2 yr" instead of
   *  "—" when no per-list value was extracted (matches the CSC Rule
   *  411A/412 default). When provided, the cell falls back to the
   *  default value but keeps a tooltip explaining the situation. */
  fallback?: string;
}) {
  if (!extract) {
    if (fallback) {
      return (
        <span
          aria-label="Extracting PDF metadata"
          title="Extracting PDF metadata… (showing default until done)"
          style={{ color: 'var(--muted)', fontSize: 11 }}
        >
          {fallback}<span aria-hidden style={{ marginLeft: 4 }}>…</span>
        </span>
      );
    }
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
        {fallback || '—'}
      </span>
    );
  }
  const value = extract[field];
  if (!value) {
    if (fallback) {
      return (
        <span
          title="Field not found on PDF cover sheet — showing default"
          style={{ color: 'var(--muted)' }}
        >
          {fallback}
        </span>
      );
    }
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
// Top-of-modal PDF extraction progress bar — Phase 2.2.p. Shows "N of M
// extracted" with a horizontal fill while extractions are still in
// flight. Hidden when no work is pending OR when there's only one
// pending list (the per-row "…" affordances cover that case).
//
// Scope:
//   - Always counts the active lists.
//   - Includes the expired lists ONLY when the expired section is open
//     (matches the gated-fetch behavior — we don't fire expired
//     extractions until the user opens the disclosure).
// ---------------------------------------------------------------------------

function ExtractionProgressBar({
  visibleLists,
  pdfCache,
}: {
  visibleLists: ReadonlyArray<EligibilityList>;
  pdfCache: Readonly<Record<string, PdfExtract>>;
}) {
  const total = visibleLists.length;
  const cachedCount = useMemo(() => {
    let n = 0;
    for (const l of visibleLists) {
      if (pdfCache[pdfCacheKey(l.jobCode, l.listId, l.postDate)]) n++;
    }
    return n;
  }, [visibleLists, pdfCache]);

  if (total === 0) return null;
  const done = cachedCount >= total;
  // 1-list edge case is covered by the per-cell `…` — bar adds noise.
  if (total <= 1) return null;
  // Done state shown briefly then collapsed — render nothing when done.
  if (done) return null;

  const pct = total === 0 ? 0 : Math.round((cachedCount / total) * 100);

  return (
    <div
      role="status"
      aria-label={`PDF extraction progress: ${cachedCount} of ${total}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        padding: '8px 12px',
        background: 'var(--accent-soft)',
        border: '1px solid var(--border)',
        borderRadius: 6,
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontSize: 11, color: 'var(--accent)', fontWeight: 600, letterSpacing: 0.3,
      }}>
        <span>Extracting PDF metadata…</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {cachedCount.toLocaleString('en-US')} of {total.toLocaleString('en-US')}
        </span>
      </div>
      <div style={{
        height: 4, width: '100%',
        background: 'rgba(0,0,0,0.08)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'var(--accent)',
          transition: 'width 200ms ease-out',
        }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// In-modal filter chip row — Phase 2.2.p. Same shape as the main
// EligibilityView toolbar but axes are per-LIST (one rollup expanded
// into list rows) rather than per-rollup.
//
// Department picker is a dropdown-with-checkboxes (same as the main
// view). The universe is "depts seen in THIS rollup's pdfCache entries"
// — typically 1-5 — so the dropdown stays short.
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: DetailListStatusFilter; label: string }> = [
  { value: 'any',           label: 'Any status' },
  { value: 'active',        label: 'Active' },
  { value: 'expiring-soon', label: 'Expiring soon' },
  { value: 'expired',       label: 'Expired' },
];

function DetailFilterToolbar({
  filters,
  setFilters,
  availableExamTypes,
  availableDepts,
  matchCount,
  totalCount,
}: {
  filters: EligibilityDetailFilters;
  setFilters: (f: EligibilityDetailFilters) => void;
  availableExamTypes: string[];
  availableDepts: string[];
  matchCount: number;
  totalCount: number;
}) {
  const [deptOpen, setDeptOpen] = useState(false);
  const deptRef = useRef<HTMLDivElement>(null);

  function handleBackdropClick(e: React.MouseEvent) {
    if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
      setDeptOpen(false);
    }
  }

  function toggleExamType(t: string) {
    const next = new Set(filters.examTypes);
    if (next.has(t)) next.delete(t); else next.add(t);
    setFilters({ ...filters, examTypes: next });
  }

  function toggleDept(d: string) {
    const next = new Set(filters.departments);
    if (next.has(d)) next.delete(d); else next.add(d);
    setFilters({ ...filters, departments: next });
  }

  const hasAnyFilter =
    filters.search.trim() !== '' ||
    filters.status !== 'any' ||
    filters.examTypes.size > 0 ||
    filters.departments.size > 0 ||
    filters.citywideOnly;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}
         onClick={handleBackdropClick}>
      {/* Row 1 — search + status + exam-type chips */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search list ID, cert rule, dept, exam type…"
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          aria-label="Search lists"
          style={{
            flex: '1 1 220px', minWidth: 180,
            padding: '4px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        />
        <select
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value as DetailListStatusFilter })}
          aria-label="Status filter"
          style={{
            padding: '4px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {availableExamTypes.map(t => {
          const on = filters.examTypes.has(t);
          return (
            <button
              key={t}
              onClick={() => toggleExamType(t)}
              aria-pressed={on}
              style={{
                padding: '4px 10px', borderRadius: 12,
                border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                background: on ? 'var(--accent-soft)' : 'transparent',
                color: on ? 'var(--accent)' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: 11, fontFamily: 'inherit', fontWeight: on ? 600 : 400,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Row 2 — dept picker + citywide toggle + reset + match count */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div ref={deptRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDeptOpen(v => !v)}
            aria-expanded={deptOpen}
            aria-haspopup="listbox"
            disabled={availableDepts.length === 0}
            style={{
              padding: '4px 10px',
              border: '1px solid ' + (filters.departments.size > 0 ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 12,
              background: filters.departments.size > 0 ? 'var(--accent-soft)' : 'transparent',
              color: filters.departments.size > 0 ? 'var(--accent)' : 'var(--muted)',
              cursor: availableDepts.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 11, fontFamily: 'inherit',
              fontWeight: filters.departments.size > 0 ? 600 : 400,
              opacity: availableDepts.length === 0 ? 0.6 : 1,
            }}
          >
            {filters.departments.size === 0
              ? `Department: all${availableDepts.length === 0 ? ' (none extracted)' : ''}`
              : `Department: ${filters.departments.size} selected`}
            {' ▾'}
          </button>
          {deptOpen && availableDepts.length > 0 && (
            <div
              role="listbox"
              aria-label="Departments"
              style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: 6, zIndex: 50,
                maxHeight: 280, overflowY: 'auto',
                minWidth: 220, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {availableDepts.map(d => (
                <label key={d} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px', cursor: 'pointer', fontSize: 12,
                }}>
                  <input
                    type="checkbox"
                    checked={filters.departments.has(d)}
                    onChange={() => toggleDept(d)}
                  />
                  <span>{d}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filters.citywideOnly}
            onChange={e => setFilters({ ...filters, citywideOnly: e.target.checked })}
          />
          <span title="Restrict to lists whose extracted Scope = Citywide.">
            Citywide only
          </span>
        </label>
        {hasAnyFilter && (
          <button
            onClick={() => setFilters(EMPTY_DETAIL_FILTERS)}
            style={{
              padding: '3px 10px',
              border: '1px solid var(--border)', borderRadius: 12,
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
              fontSize: 11, fontFamily: 'inherit',
            }}
          >
            Reset filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          {matchCount === totalCount
            ? `${totalCount.toLocaleString('en-US')} lists`
            : `${matchCount.toLocaleString('en-US')} of ${totalCount.toLocaleString('en-US')} lists`}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main detail modal
// ---------------------------------------------------------------------------

export function EligibilityDetail({ rollup, today, onClose }: EligibilityDetailProps) {
  const summary = summarizeRollup(rollup);

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

  // Filter + sort state, scoped to the modal lifetime.
  const [filters, setFilters] = useState<EligibilityDetailFilters>(EMPTY_DETAIL_FILTERS);
  const [sort, setSort] = useState<DetailSort>(DEFAULT_DETAIL_SORT);

  // Visible-extractions universe — active always, expired only when the
  // section is open. Drives the progress bar AND the filter axes (so the
  // user only sees chips for data we've actually extracted).
  const visibleLists = useMemo<ReadonlyArray<EligibilityList>>(() => {
    return expiredOpen
      ? [...rollup.activeLists, ...rollup.expiredLists]
      : rollup.activeLists;
  }, [rollup.activeLists, rollup.expiredLists, expiredOpen]);

  const availableExamTypes = useMemo(
    () => collectExamTypes(visibleLists, pdfCache, pdfCacheKey),
    [visibleLists, pdfCache],
  );
  const availableDepts = useMemo(
    () => collectListDepartments(visibleLists, pdfCache, pdfCacheKey),
    [visibleLists, pdfCache],
  );

  // Filter + sort the active + expired sections independently. Filter
  // first (narrows the universe), then sort (places blanks last).
  const filteredActive = useMemo(
    () => applyEligibilityDetailFilters(rollup.activeLists, pdfCache, pdfCacheKey, filters, today),
    [rollup.activeLists, pdfCache, filters, today],
  );
  const sortedActive = useMemo(
    () => sortEligibilityLists(filteredActive, pdfCache, pdfCacheKey, sort, today),
    [filteredActive, pdfCache, sort, today],
  );
  const filteredExpired = useMemo(
    () => applyEligibilityDetailFilters(rollup.expiredLists, pdfCache, pdfCacheKey, filters, today),
    [rollup.expiredLists, pdfCache, filters, today],
  );
  const sortedExpired = useMemo(
    () => sortEligibilityLists(filteredExpired, pdfCache, pdfCacheKey, sort, today),
    [filteredExpired, pdfCache, sort, today],
  );

  const totalListsCount = rollup.activeLists.length + rollup.expiredLists.length;
  const matchListsCount = filteredActive.length + filteredExpired.length;

  // Section-header type-breakdowns recompute on the filtered subsets so
  // counts reflect what's visible.
  const activeBreakdown = formatTypeBreakdown(sortedActive);
  const expiredBreakdown = formatTypeBreakdown(sortedExpired);

  return (
    <Modal
      onClose={onClose}
      ariaLabel={`Eligibility detail for job code ${rollup.jobCode}`}
      maxWidth={1040}
      contentStyle={{ gap: 12 }}
    >
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

        {/* Phase 2.2.p — extraction progress bar (hidden when done) */}
        <ExtractionProgressBar visibleLists={visibleLists} pdfCache={pdfCache} />

        {/* Phase 2.2.p — in-modal filter chip row */}
        <DetailFilterToolbar
          filters={filters}
          setFilters={setFilters}
          availableExamTypes={availableExamTypes}
          availableDepts={availableDepts}
          matchCount={matchListsCount}
          totalCount={totalListsCount}
        />

        {/* Active eligibility lists */}
        <section>
          <SectionHeader
            label="Active eligibility lists"
            count={sortedActive.length}
            typeBreakdown={activeBreakdown}
          />
          {rollup.activeLists.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>
              No active lists within the 2-year window (CSC Rule 411A/412).
            </div>
          ) : sortedActive.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>
              No active lists match the current filters.
            </div>
          ) : (
            <ListsTable
              lists={sortedActive}
              today={today}
              pdfCache={pdfCache}
              sort={sort}
              setSort={setSort}
            />
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
              {sortedExpired.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>
                  No expired lists match the current filters.
                </div>
              ) : (
                <ListsTable
                  lists={sortedExpired}
                  today={today}
                  pdfCache={pdfCache}
                  sort={sort}
                  setSort={setSort}
                />
              )}
            </div>
          </details>
        )}

        {/* Phase 2.2.p footnote — describes the PDF columns + states +
            the new Duration / Exam Type columns. */}
        <div style={{
          fontSize: 11, color: 'var(--muted)',
          borderTop: '1px dashed var(--border)', paddingTop: 8,
        }}>
          <strong style={{ color: 'var(--muted)' }}>Duration · Cert rule · Dept · Exam Type:</strong>{' '}
          extracted on demand from each list's PDF cover sheet (Phase
          2.2.o; Duration + Exam Type surfaced in Phase 2.2.p).{' '}
          <strong>…</strong> = loading; <strong>—</strong> with
          hover-tooltip = parsed but field not found (older scanned PDFs /
          atypical layout) OR fetch failed (CORS proxy down).{' '}
          <strong>Duration</strong> falls back to <strong>2 yr</strong>{' '}
          (CSC Rule 411A/412 default) when not present in the PDF. Click{' '}
          <strong>↗ PDF</strong> on any row to verify against the source.
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
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared lists table — used for both active + expired sections so the
// row shape stays identical between them.
//
// Phase 2.2.p column shape: Post date · List ID · Duration · Expires ·
// Status · Cert rule · Dept · Exam Type · File.
// Click any header (except File) to sort asc → desc → reset.
// ---------------------------------------------------------------------------

interface SortableHeaderConfig {
  label: string;
  column: DetailSortColumn | null;  // null = not sortable
}

const HEADERS: SortableHeaderConfig[] = [
  { label: 'Post date',  column: 'postDate' },
  { label: 'List ID',    column: 'listId' },
  { label: 'Duration',   column: 'duration' },
  { label: 'Expires',    column: 'expires' },
  { label: 'Status',     column: 'status' },
  { label: 'Cert rule',  column: 'certRule' },
  { label: 'Dept',       column: 'dept' },
  { label: 'Exam Type',  column: 'examType' },
  { label: 'File',       column: null },
];

/** Click cycle: clicking a column toggles asc ↔ desc; clicking a
 *  different column always starts at asc.
 *
 *  An earlier 3-state (asc → desc → reset-to-default) cycle was a no-op
 *  on the default column (which is `postDate desc`), confusing the
 *  user. The 2-state toggle is predictable + matches every other tab's
 *  sort UX. */
function nextSort(current: DetailSort, column: DetailSortColumn): DetailSort {
  if (current.column !== column || current.direction === null) {
    return { column, direction: 'asc' };
  }
  return {
    column,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
}

function ListsTable({
  lists,
  today,
  pdfCache,
  sort,
  setSort,
}: {
  lists: ReadonlyArray<EligibilityList>;
  today: string;
  pdfCache: Record<string, PdfExtract>;
  sort: DetailSort;
  setSort: (s: DetailSort) => void;
}) {
  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
            {HEADERS.map(h => {
              const isSortable = h.column !== null;
              const active = isSortable && sort.column === h.column && sort.direction !== null;
              const arrow = active
                ? (sort.direction === 'asc' ? ' ▲' : ' ▼')
                : '';
              const baseStyle: React.CSSProperties = {
                padding: '6px 10px', textAlign: 'left',
                fontWeight: 600, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: 0.5,
                color: 'var(--accent)', whiteSpace: 'nowrap',
              };
              if (!isSortable) {
                return <th key={h.label} style={baseStyle}>{h.label}</th>;
              }
              return (
                <th
                  key={h.label}
                  style={baseStyle}
                  scope="col"
                  aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => setSort(nextSort(sort, h.column as DetailSortColumn))}
                    aria-label={`Sort by ${h.label}${active ? ` (currently ${sort.direction})` : ''}`}
                    style={{
                      background: 'transparent', border: 'none',
                      padding: 0, cursor: 'pointer',
                      color: active ? 'var(--accent)' : 'var(--muted)',
                      fontWeight: 600, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      fontFamily: 'inherit',
                    }}
                  >
                    {h.label}
                    <span aria-hidden style={{ marginLeft: 2, opacity: active ? 1 : 0.5 }}>
                      {arrow || ' ⇅'}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {lists.map(l => {
            const extract = pdfCache[pdfCacheKey(l.jobCode, l.listId, l.postDate)];
            // Per-list expiration honors PDF-extracted duration when present.
            const { daysRemaining, tone, expirationDate } = computeListStatus(
              l, today, undefined, extract?.duration,
            );
            // Duration column fallback — show "2 yr" (CSC Rule 411A/412
            // default) when extraction missing or field undefined. Distinct
            // from the "…" loading + "—" failure states which the
            // PdfFieldCell handles via the `fallback` prop.
            const durationFallback = '2 yr';
            return (
              <tr key={l.fileUrl + l.listId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {l.postDate || '—'}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>
                  {l.listId}
                  <CopyButton value={l.listId} label="List ID" />
                </td>
                <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                  <PdfFieldCell extract={extract} field="duration" fallback={durationFallback} />
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {expirationDate || '—'}
                  {extract?.success && parseDuration(extract.duration) !== undefined && (
                    <span
                      title={`Computed from per-list Duration: ${extract.duration}`}
                      style={{ marginLeft: 4, color: 'var(--muted)', fontSize: 10 }}
                    >
                      ⓘ
                    </span>
                  )}
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
                  <PdfFieldCell extract={extract} field="examType" />
                </td>
                <td style={{ padding: '5px 10px' }}>
                  <a
                    href={l.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}
                    title="Opens PDF cover sheet (source for Duration / Cert rule / Dept / Exam Type)"
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
