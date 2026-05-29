/**
 * Eligibility workspace — Tab 11 surface. Phase 2.2.k (2.2.28) +
 * Phase 2.2.l live-fetch upgrade + Phase 2.2.m summary-row redesign.
 *
 * Combines two upstream feeds keyed by SF Job Code:
 *
 *   - SF Careers open postings (SmartRecruiters Posting API, CORS-OK)
 *   - SF DHR eligibility lists + score reports (CORS-proxy chain;
 *     corsproxy.io → allorigins.win → codetabs.com, optional Worker URL
 *     backup). Manual paste stays in the UI as a last-resort fallback.
 *
 * Phase 2.2.m (Alex's S36 directive):
 *   - The summary table now shows ONE compact line per job code — counts
 *     + date ranges instead of stacked link lists. Saves vertical space
 *     dramatically; a code with 12 active lists fits in one row.
 *   - Clicking a row opens EligibilityDetail with every posting + list
 *     (active and expired) for the code.
 *   - Filter toolbar with status (any/active/expired/list-only/posting-
 *     only), exam type (score-report / eligible-list), department
 *     multi-select, citywide-only toggle.
 *
 * Layout:
 *   - Summary header: totals + last-refreshed-at per source + refresh
 *     buttons + clear-all
 *   - Backup proxy settings (collapsed)
 *   - Advanced fallback: manual paste (collapsed)
 *   - Filter toolbar (search · status · exam type · department · citywide)
 *   - Per-jobCode summary table — click row to open detail modal
 *
 * Phase 2.2.s (Option C): each summary row gains a "Positions →" affordance
 * that sets the Positions job-code scope (usePositionsScope) and fires the
 * onViewPositions callback so the App shell switches tabs — the cross-tab nav
 * that was the S34 carry-forward. With that landed, this tab is promoted out
 * of `devOnly` (alongside Probation) in App.tsx.
 */

import { useMemo, useRef, useState } from 'react';
import { CopyButton } from '../../ui';
import {
  EMPTY_ELIGIBILITY_FILTERS,
  applyEligibilityFilters,
  buildJobCodeRollups,
  collectDepartments,
  fetchDhrExamResults,
  fetchJobPostings,
  parseDhrExamHtml,
  summarizeRollup,
  useScrapers,
  FetchDhrError,
  FetchJobPostingsError,
} from '../../scrapers';
import type {
  EligibilityFilters,
  EligibilityStatusFilter,
  JobCodeRollup,
} from '../../scrapers';
import { EligibilityDetail } from './EligibilityDetail';
import { usePositionsScope } from '../positions/scope-store';

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
      {hint && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{hint}</span>}
    </div>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const ms = Date.now() - then;
  if (Number.isNaN(then)) return 'never';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

// ---------------------------------------------------------------------------
// Refresh-postings affordance — fires the live fetch + manages the
// progress / error UI inline (avoids dragging in the full LoadingOverlay
// modal since this scrape is fast).
// ---------------------------------------------------------------------------

function RefreshPostingsButton() {
  const setJobPostings = useScrapers(s => s.setJobPostings);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setProgress('Connecting to SmartRecruiters…');
    try {
      const postings = await fetchJobPostings({
        onProgress: info => {
          setProgress(`Fetched ${info.postingsSoFar} of ${info.totalFound} postings (page ${info.page})…`);
        },
      });
      setJobPostings(postings);
      setProgress(`Loaded ${postings.length} postings.`);
    } catch (err) {
      const msg = err instanceof FetchJobPostingsError
        ? err.message
        : err instanceof Error ? err.message : String(err);
      setError(msg);
      setProgress('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={run}
        disabled={busy}
        style={{
          padding: '6px 14px',
          border: '1px solid var(--accent)', borderRadius: 14,
          background: busy ? 'var(--surface)' : 'var(--accent)',
          color: busy ? 'var(--muted)' : '#fff',
          cursor: busy ? 'not-allowed' : 'pointer',
          fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
        }}
      >
        {busy ? '↻ Refreshing…' : '↻ Refresh job postings'}
      </button>
      {progress && (
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{progress}</span>
      )}
      {error && (
        <span style={{ fontSize: 11, color: '#7f1d1d' }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Refresh-eligibility-lists affordance — live fetch through the public
// CORS-proxy chain (replaces the manual-paste-as-primary path per Alex's
// S35 directive). Tries corsproxy.io → allorigins.win → codetabs.com per
// page; falls back to the optional Cloudflare-Worker URL when configured.
// Each page is ~500ms apart (polite throttle); 66 pages takes ~30s.
// ---------------------------------------------------------------------------

function RefreshEligibilityListsButton() {
  const setEligibilityLists = useScrapers(s => s.setEligibilityLists);
  const dhrWorkerUrl = useScrapers(s => s.dhrWorkerUrl);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setProgress('Connecting to sfdhr.org via CORS proxy…');
    try {
      const lists = await fetchDhrExamResults({
        workerUrl: dhrWorkerUrl || undefined,
        onProgress: info => {
          setProgress(`Fetched ${info.rowsSoFar} rows from ${info.pagesSoFar} pages (via ${info.proxyUsed})…`);
        },
      });
      // Wholesale replace — this fetch returns the entire corpus, not
      // an additive paste like the manual fallback.
      setEligibilityLists(lists);
      setProgress(`Loaded ${lists.length} eligibility lists.`);
    } catch (err) {
      if (err instanceof FetchDhrError) {
        const detail = err.proxyAttempts.map(a => `${a.label}: ${a.detail}`).join(' · ');
        setError(`All proxies failed. ${detail}. Try again, or use the manual-paste fallback below.`);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      setProgress('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={run}
        disabled={busy}
        style={{
          padding: '6px 14px',
          border: '1px solid var(--accent)', borderRadius: 14,
          background: busy ? 'var(--surface)' : 'var(--accent)',
          color: busy ? 'var(--muted)' : '#fff',
          cursor: busy ? 'not-allowed' : 'pointer',
          fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
        }}
      >
        {busy ? '↻ Refreshing eligibility lists…' : '↻ Refresh eligibility lists'}
      </button>
      {progress && (
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{progress}</span>
      )}
      {error && (
        <span style={{ fontSize: 11, color: '#7f1d1d' }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Worker URL settings — Alex's optional Cloudflare-Worker proxy slot. The
// default public proxy chain handles the common case; this is the backup
// for when those proxies are flaky / rate-limited. Persists to localStorage
// so the URL survives reloads (see store.ts `dhrWorkerUrl`).
// ---------------------------------------------------------------------------

function WorkerUrlSettings() {
  const dhrWorkerUrl = useScrapers(s => s.dhrWorkerUrl);
  const setDhrWorkerUrl = useScrapers(s => s.setDhrWorkerUrl);
  const [draft, setDraft] = useState(dhrWorkerUrl);
  const [saved, setSaved] = useState(false);

  function save() {
    setDhrWorkerUrl(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function clear() {
    setDraft('');
    setDhrWorkerUrl('');
  }

  return (
    <details className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
        Backup proxy: Cloudflare-Worker URL {dhrWorkerUrl && <span style={{ color: '#1a7a3c', fontWeight: 400 }}>· configured</span>}
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          The default public CORS proxies (corsproxy.io, allorigins.win, codetabs.com)
          handle the common case. If they're rate-limited / down / blocked, deploy
          a 10-line Cloudflare Worker that proxies <code>?url=&lt;upstream&gt;</code>
          to fetch and return the body. Paste its URL here as a backup.
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="url"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="https://my-worker.example.workers.dev"
            aria-label="Cloudflare Worker URL"
            style={{
              flex: '1 1 280px',
              padding: '4px 10px',
              border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 12, fontFamily: 'monospace',
              background: 'var(--surface)', color: 'inherit',
            }}
          />
          <button
            onClick={save}
            disabled={draft === dhrWorkerUrl}
            style={{
              padding: '4px 12px',
              border: '1px solid var(--accent)', borderRadius: 12,
              background: draft === dhrWorkerUrl ? 'var(--surface)' : 'var(--accent)',
              color: draft === dhrWorkerUrl ? 'var(--muted)' : '#fff',
              cursor: draft === dhrWorkerUrl ? 'not-allowed' : 'pointer',
              fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
          {dhrWorkerUrl && (
            <button
              onClick={clear}
              style={{
                padding: '4px 12px',
                border: '1px solid var(--border)', borderRadius: 12,
                background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Manual-paste fallback — kept as a `<details>`-collapsed escape hatch
// for the rare case the proxy chain is fully blocked. Was the primary
// path in Phase 2.2.k; demoted in Phase 2.2.l per Alex's directive.
// ---------------------------------------------------------------------------

function PasteDhrPanel() {
  const appendEligibilityLists = useScrapers(s => s.appendEligibilityLists);
  const [paste, setPaste] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  function parseAndApply() {
    setStatus(null);
    const trimmed = paste.trim();
    if (!trimmed) {
      setStatus('Paste the page HTML from sfdhr.org first.');
      return;
    }
    try {
      const lists = parseDhrExamHtml(trimmed);
      if (lists.length === 0) {
        setStatus('No exam-results rows found in the pasted HTML. Check that you copied the whole page or just the <table> from sfdhr.org/past-examination-results.');
        return;
      }
      appendEligibilityLists(lists);
      setStatus(`Parsed ${lists.length} rows.`);
      setPaste('');
    } catch (err) {
      setStatus(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <details className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
        Advanced fallback: paste DHR HTML manually
      </summary>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        Use this only when the live refresh above fails (all proxies blocked /
        offline). Open{' '}
        <a
          href="https://sfdhr.org/past-examination-results"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)' }}
        >
          https://sfdhr.org/past-examination-results
        </a>
        {' '}in a new tab, copy the page (Ctrl+A · Ctrl+C), paste below, click Parse.
        Repeat per page — Parse appends without replacing prior pastes.
      </span>
      <textarea
        value={paste}
        onChange={e => setPaste(e.target.value)}
        placeholder="Paste the copied HTML here…"
        rows={6}
        aria-label="Paste DHR HTML"
        style={{
          padding: '6px 10px',
          border: '1px solid var(--border)', borderRadius: 4,
          fontSize: 11, fontFamily: 'monospace',
          background: 'var(--surface)', color: 'inherit',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={parseAndApply}
          disabled={!paste.trim()}
          style={{
            padding: '5px 14px',
            border: '1px solid var(--accent)', borderRadius: 14,
            background: paste.trim() ? 'var(--accent)' : 'var(--surface)',
            color: paste.trim() ? '#fff' : 'var(--muted)',
            cursor: paste.trim() ? 'pointer' : 'not-allowed',
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          Parse + add to KosPos
        </button>
        {status && (
          <span style={{ fontSize: 11, color: status.startsWith('Parsed') ? '#1a7a3c' : '#7f1d1d' }}>
            {status}
          </span>
        )}
      </div>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Filter toolbar — search + status select + exam-type chips + department
// multi-select + citywide toggle + reset. Sits between the data-source
// cards and the summary table.
//
// Department picker: dropdown-list with checkboxes; closes on outside
// click. ~50+ depts seen in SF data; chip-row would overflow, dropdown
// keeps the toolbar one line tall.
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: EligibilityStatusFilter; label: string }> = [
  { value: 'any',          label: 'Any status' },
  { value: 'active',       label: 'Has active list' },
  { value: 'expired',      label: 'Has only expired' },
  { value: 'list-only',    label: 'List, no posting' },
  { value: 'posting-only', label: 'Posting, no list' },
];

const EXAM_TYPE_OPTIONS: Array<{ value: 'score-report' | 'eligible-list'; label: string }> = [
  { value: 'score-report',  label: 'Score reports (civil service)' },
  { value: 'eligible-list', label: 'Eligible lists (uniformed)' },
];

function FilterToolbar({
  filters,
  setFilters,
  allDepartments,
  matchCount,
  totalCount,
}: {
  filters: EligibilityFilters;
  setFilters: (f: EligibilityFilters) => void;
  allDepartments: string[];
  matchCount: number;
  totalCount: number;
}) {
  const [deptOpen, setDeptOpen] = useState(false);
  const deptRef = useRef<HTMLDivElement>(null);

  // Close the dept dropdown on outside-click. Keep it simple — one
  // useEffect with capture-phase, no portal.
  function handleBackdropClick(e: React.MouseEvent) {
    if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
      setDeptOpen(false);
    }
  }

  function toggleExamType(t: 'score-report' | 'eligible-list') {
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
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
         onClick={handleBackdropClick}>
      {/* Row 1 — search + status + exam-type chips */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search by job code or class title…"
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          aria-label="Search rollups"
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
          onChange={e => setFilters({ ...filters, status: e.target.value as EligibilityStatusFilter })}
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
        {EXAM_TYPE_OPTIONS.map(o => {
          const on = filters.examTypes.has(o.value);
          return (
            <button
              key={o.value}
              onClick={() => toggleExamType(o.value)}
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
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Row 2 — department multi-select + citywide toggle + reset + match count */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div ref={deptRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDeptOpen(v => !v)}
            aria-expanded={deptOpen}
            aria-haspopup="listbox"
            style={{
              padding: '4px 10px',
              border: '1px solid ' + (filters.departments.size > 0 ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 12,
              background: filters.departments.size > 0 ? 'var(--accent-soft)' : 'transparent',
              color: filters.departments.size > 0 ? 'var(--accent)' : 'var(--muted)',
              cursor: 'pointer',
              fontSize: 11, fontFamily: 'inherit',
              fontWeight: filters.departments.size > 0 ? 600 : 400,
            }}
          >
            {filters.departments.size === 0
              ? 'Department: all'
              : `Department: ${filters.departments.size} selected`}
            {' ▾'}
          </button>
          {deptOpen && (
            <div
              role="listbox"
              aria-label="Departments"
              style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: 6, zIndex: 50,
                maxHeight: 280, overflowY: 'auto',
                minWidth: 260, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {allDepartments.length === 0 ? (
                <span style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 8px' }}>
                  No postings loaded yet — refresh job postings to see departments.
                </span>
              ) : (
                allDepartments.map(d => (
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
                ))
              )}
            </div>
          )}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filters.citywideOnly}
            onChange={e => setFilters({ ...filters, citywideOnly: e.target.checked })}
          />
          <span title="Heuristic: list exists with no posting, OR postings span 2+ departments.">
            Citywide candidates only
          </span>
        </label>
        {hasAnyFilter && (
          <button
            onClick={() => setFilters(EMPTY_ELIGIBILITY_FILTERS)}
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
            ? `${totalCount.toLocaleString('en-US')} job codes`
            : `${matchCount.toLocaleString('en-US')} of ${totalCount.toLocaleString('en-US')} job codes`}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary row — one compact line per job code. Renders counts +
// date-range hints; the per-list links live in EligibilityDetail (opens
// on click).
// ---------------------------------------------------------------------------

function SummaryRow({
  rollup,
  onOpen,
  onViewPositions,
}: {
  rollup: JobCodeRollup;
  onOpen: () => void;
  /** When provided, renders a "Positions →" pill that cross-navigates to the
   *  Positions tab filtered to this job code. Hidden when omitted. */
  onViewPositions?: () => void;
}) {
  const s = summarizeRollup(rollup);

  // Active-list date range — collapse to a single date when oldest ===
  // newest; show "earliest → newest" otherwise.
  let activeDateLabel = '';
  if (s.activeCount > 0) {
    activeDateLabel = s.oldestActivePostDate === s.newestActivePostDate
      ? s.newestActivePostDate
      : `${s.oldestActivePostDate} → ${s.newestActivePostDate}`;
  }

  const examTypeHint = s.listTypes.length === 0
    ? ''
    : s.listTypes.length === 2
      ? 'mixed'
      : s.listTypes[0] === 'score-report' ? 'SR' : 'EL';

  // Stop-propagation on the inner Copy button so it doesn't bubble to
  // the row's click handler (which opens the modal).
  function stop(e: React.MouseEvent) { e.stopPropagation(); }
  // Keyboard equivalent for the nested "Positions →" button — keeps Enter /
  // Space on it from also firing the row's open-detail key handler.
  function stopKey(e: React.KeyboardEvent) { e.stopPropagation(); }

  return (
    <tr
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      tabIndex={0}
      role="button"
      aria-label={`Open detail for ${rollup.jobCode} ${rollup.classTitle}`}
      style={{
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
        {rollup.jobCode}
        <span onClick={stop} style={{ display: 'inline-flex' }}>
          <CopyButton value={rollup.jobCode} label="Job code" />
        </span>
      </td>
      <td style={{ padding: '6px 10px' }}>
        {rollup.classTitle || <span style={{ color: 'var(--muted)' }}>—</span>}
      </td>
      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
        {s.postingCount === 0 ? (
          <span style={{ color: 'var(--muted)' }}>—</span>
        ) : (
          <>
            <strong>{s.postingCount}</strong>
            <span style={{ color: 'var(--muted)', marginLeft: 6 }}>
              · newest {s.newestPostingDate || '—'}
            </span>
          </>
        )}
      </td>
      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
        {s.activeCount === 0 ? (
          <span style={{ color: 'var(--muted)' }}>—</span>
        ) : (
          <>
            <strong>{s.activeCount}</strong>
            {examTypeHint && (
              <span style={{
                marginLeft: 6, padding: '1px 6px', borderRadius: 8,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
              }}>{examTypeHint}</span>
            )}
            <span style={{ color: 'var(--muted)', marginLeft: 6 }}>
              · {activeDateLabel}
            </span>
          </>
        )}
      </td>
      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
        {s.expiredCount === 0 ? '—' : s.expiredCount}
      </td>
      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
        {s.departments.length === 0
          ? '—'
          : s.departments.length === 1
            ? s.departments[0]
            : `${s.departments.length} depts`}
      </td>
      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', textAlign: 'right', color: 'var(--muted)' }}>
        {onViewPositions && (
          <button
            onClick={e => { e.stopPropagation(); onViewPositions(); }}
            onKeyDown={stopKey}
            title={`Show ${rollup.jobCode} positions in the Positions tab`}
            aria-label={`Show positions for job code ${rollup.jobCode}`}
            style={{
              marginRight: 8, padding: '2px 8px', borderRadius: 10,
              border: '1px solid var(--accent)', background: 'var(--accent-soft)',
              color: 'var(--accent)', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            Positions →
          </button>
        )}
        {s.citywideHint && (
          <span title="Citywide candidate (list with no posting, or 2+ depts posting)"
                style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 8,
                  background: '#fef3c7', color: '#92400e',
                  fontWeight: 600, letterSpacing: 0.3,
                }}>
            citywide?
          </span>
        )}
        <span style={{ marginLeft: 8, color: 'var(--muted)' }}>›</span>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function EligibilityView({ onViewPositions }: {
  /** Fires after a row's job code is set as the Positions scope, so the App
   *  shell can switch to the Positions tab. Mirrors PositionsView's
   *  onViewPayroll. When omitted (e.g. the Positions tab is unavailable), the
   *  per-row "Positions →" affordance is hidden. */
  onViewPositions?: () => void;
} = {}) {
  const jobPostings = useScrapers(s => s.jobPostings);
  const jobPostingsRefreshedAt = useScrapers(s => s.jobPostingsRefreshedAt);
  const eligibilityLists = useScrapers(s => s.eligibilityLists);
  const eligibilityListsRefreshedAt = useScrapers(s => s.eligibilityListsRefreshedAt);
  const clearAll = useScrapers(s => s.clearAll);
  const setPositionsScope = usePositionsScope(s => s.setJobCode);

  const [filters, setFilters] = useState<EligibilityFilters>(EMPTY_ELIGIBILITY_FILTERS);
  const [openCode, setOpenCode] = useState<string | null>(null);

  // Cross-tab nav: set the Positions job-code scope, then ask the App shell
  // to switch tabs. Mirrors PositionDetail → setLaborScope + onViewPayroll.
  function viewPositionsFor(jobCode: string): void {
    setPositionsScope(jobCode);
    onViewPositions?.();
  }

  // Today pinned per render — see ProbationsView for rationale.
  const todayIso = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const allRollups = useMemo<JobCodeRollup[]>(
    () => buildJobCodeRollups(jobPostings, eligibilityLists, todayIso),
    [jobPostings, eligibilityLists, todayIso],
  );

  const filtered = useMemo(
    () => applyEligibilityFilters(allRollups, filters),
    [allRollups, filters],
  );

  const allDepartments = useMemo(() => collectDepartments(allRollups), [allRollups]);

  const totalActive = useMemo(
    () => allRollups.reduce((acc, r) => acc + r.activeLists.length, 0),
    [allRollups],
  );

  const openRollup = useMemo(
    () => openCode ? allRollups.find(r => r.jobCode === openCode) ?? null : null,
    [openCode, allRollups],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header */}
      {/* Top-align: stats with a hint sub-line (Open postings, Active lists)
          are taller than those without (Job codes, Lists last parsed);
          `alignItems: center` staggered the big numbers off a shared
          baseline. flex-start anchors every label + value to the same top
          edge and lets the hints hang below. */}
      <div className="card" style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start',
      }}>
        <Stat
          label="Job codes"
          value={allRollups.length.toLocaleString('en-US')}
          hint={filtered.length !== allRollups.length
            ? `${filtered.length.toLocaleString('en-US')} matching filter`
            : undefined}
        />
        <Stat
          label="Open postings"
          value={jobPostings.length.toLocaleString('en-US')}
          hint={jobPostingsRefreshedAt
            ? `refreshed ${timeAgo(jobPostingsRefreshedAt)}`
            : 'never refreshed'}
        />
        <Stat
          label="Active lists"
          value={totalActive.toLocaleString('en-US')}
          hint={`of ${eligibilityLists.length.toLocaleString('en-US')} parsed`}
        />
        <Stat
          label="Lists last parsed"
          value={eligibilityListsRefreshedAt ? timeAgo(eligibilityListsRefreshedAt) : 'never'}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <RefreshPostingsButton />
          <RefreshEligibilityListsButton />
          {(jobPostings.length > 0 || eligibilityLists.length > 0) && (
            <button
              onClick={clearAll}
              style={{
                padding: '6px 12px', height: 30,
                border: '1px solid var(--border)', borderRadius: 14,
                background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Backup proxy settings + manual-paste fallback (both collapsed by default) */}
      <WorkerUrlSettings />
      <PasteDhrPanel />

      {/* Filter toolbar */}
      <FilterToolbar
        filters={filters}
        setFilters={setFilters}
        allDepartments={allDepartments}
        matchCount={filtered.length}
        totalCount={allRollups.length}
      />

      {/* Summary table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
              {['Job code', 'Title', 'Postings', 'Active', 'Expired', 'Dept(s)', ''].map(h => (
                <th key={h} style={{
                  padding: '7px 10px',
                  textAlign: 'left',
                  fontWeight: 600, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  color: 'var(--accent)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {allRollups.length === 0
                    ? 'No data yet — refresh job postings or eligibility lists above.'
                    : 'No job codes match the current filters.'}
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <SummaryRow
                  key={r.jobCode}
                  rollup={r}
                  onOpen={() => setOpenCode(r.jobCode)}
                  onViewPositions={onViewPositions ? () => viewPositionsFor(r.jobCode) : undefined}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Tab 11. KosPos is the system of record for the per-job-code
        "active posting / active list" rollup. Click any row for the
        per-list / per-posting drill-down. Open postings come live from
        SmartRecruiters (the SF Careers platform). Eligibility lists come
        from sfdhr.org via a public CORS-proxy chain (corsproxy.io →
        allorigins.win → codetabs.com); if all proxies fail, a Cloudflare-
        Worker URL can be configured as backup, and a manual-paste panel
        remains as last-resort fallback. Active = posted within 2 years
        (CSC Rule 411A/412 — lists may be extended; v1 is age-only).
        Refreshing replaces the lists wholesale; manual paste appends with
        dedupe by (jobCode, listId, postDate).
      </div>

      {openRollup && (
        <EligibilityDetail
          rollup={openRollup}
          today={todayIso}
          onClose={() => setOpenCode(null)}
        />
      )}
    </div>
  );
}
