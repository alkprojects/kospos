/**
 * Eligibility workspace — Tab 11 surface. Phase 2.2.k (2.2.28) +
 * Phase 2.2.l live-fetch upgrade.
 *
 * Combines two upstream feeds keyed by SF Job Code:
 *
 *   - SF Careers open postings (SmartRecruiters Posting API, CORS-OK)
 *   - SF DHR eligibility lists + score reports — Phase 2.2.l: now fetched
 *     live via a public CORS-proxy chain (corsproxy.io → allorigins.win
 *     → codetabs.com), with an optional user-configured Cloudflare-Worker
 *     URL as backup. The manual-paste path stays in the UI as a last-
 *     resort "Advanced fallback" panel.
 *
 * Per Alex's S35 directive: the per-page manual paste workflow was "way
 * too much manual work" — replace with a one-click refresh.
 *
 * Layout:
 *   - Summary header: totals + last-refreshed-at per source
 *   - Refresh job postings (live, fast — SmartRecruiters)
 *   - Refresh eligibility lists (live, ~30s — CORS-proxy chain)
 *   - Settings card: Cloudflare-Worker URL (backup proxy slot)
 *   - Advanced fallback (collapsed): manual paste, kept for emergencies
 *   - Per-jobCode table: code | title | open postings | active lists | links
 *
 * `devOnly` tab until Alex returns and walks through real data.
 */

import { useMemo, useState } from 'react';
import { CopyButton } from '../../ui';
import {
  buildJobCodeRollups,
  fetchDhrExamResults,
  fetchJobPostings,
  filterRollups,
  parseDhrExamHtml,
  useScrapers,
  FetchDhrError,
  FetchJobPostingsError,
} from '../../scrapers';
import type { JobCodeRollup } from '../../scrapers';

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
// Main view
// ---------------------------------------------------------------------------

export function EligibilityView() {
  const jobPostings = useScrapers(s => s.jobPostings);
  const jobPostingsRefreshedAt = useScrapers(s => s.jobPostingsRefreshedAt);
  const eligibilityLists = useScrapers(s => s.eligibilityLists);
  const eligibilityListsRefreshedAt = useScrapers(s => s.eligibilityListsRefreshedAt);
  const clearAll = useScrapers(s => s.clearAll);

  const [search, setSearch] = useState('');

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
    () => filterRollups(allRollups, search),
    [allRollups, search],
  );

  const totalActive = useMemo(
    () => allRollups.reduce((acc, r) => acc + r.activeLists.length, 0),
    [allRollups],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header */}
      <div className="card" style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
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

      {/* Search */}
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search by job code or class title…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 260px',
            padding: '4px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
          aria-label="Search eligibility rollups"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              fontSize: 11, padding: '3px 10px',
              border: '1px solid var(--border)', borderRadius: 12,
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
              {['Job code', 'Title', 'Open postings', 'Active lists', 'Expired lists'].map(h => (
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
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {allRollups.length === 0
                    ? 'No data yet — refresh job postings or paste DHR HTML above.'
                    : 'No job codes match the current search.'}
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.jobCode} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {r.jobCode}
                    <CopyButton value={r.jobCode} label="Job code" />
                  </td>
                  <td style={{ padding: '5px 10px' }}>
                    {r.classTitle || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '5px 10px' }}>
                    {r.postings.length === 0
                      ? <span style={{ color: 'var(--muted)' }}>—</span>
                      : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {r.postings.map(p => (
                            <a
                              key={p.id}
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 11, color: 'var(--accent)' }}
                              title={p.name}
                            >
                              ↗ {p.releasedDate.slice(0, 10)} · {p.department || '—'}
                            </a>
                          ))}
                        </div>
                      )
                    }
                  </td>
                  <td style={{ padding: '5px 10px' }}>
                    {r.activeLists.length === 0
                      ? <span style={{ color: 'var(--muted)' }}>—</span>
                      : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {r.activeLists.map(l => (
                            <a
                              key={l.fileUrl}
                              href={l.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 11, color: 'var(--accent)' }}
                              title={`List ${l.listId}`}
                            >
                              ↗ {l.postDate} · {l.type === 'eligible-list' ? 'EL' : 'SR'} · {l.listId}
                            </a>
                          ))}
                        </div>
                      )
                    }
                  </td>
                  <td style={{ padding: '5px 10px' }}>
                    {r.expiredLists.length === 0
                      ? <span style={{ color: 'var(--muted)' }}>—</span>
                      : (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {r.expiredLists.length} expired
                        </span>
                      )
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Tab 11. KosPos is the system of record for the per-job-code
        "active posting / active list" rollup. Open postings come live
        from SmartRecruiters (the SF Careers platform). Eligibility lists
        come from sfdhr.org via a public CORS-proxy chain (corsproxy.io
        → allorigins.win → codetabs.com); if all proxies fail, a Cloudflare-
        Worker URL can be configured as backup, and a manual-paste panel
        remains as last-resort fallback. Active = posted within 2 years
        (CSC Rule 411A/412 — lists may be extended; v1 is age-only).
        Refreshing replaces the lists wholesale; manual paste appends with
        dedupe by (jobCode, listId, postDate).
      </div>
    </div>
  );
}
