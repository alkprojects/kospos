/**
 * ScrapeSourcesPanel — live data-source acquisition for the Load Reports tab.
 *
 * Phase 2.2.t (Alex's S44 directive): the two scrape refresh controls used
 * to live on the Eligibility tab's summary header. They moved here so the
 * Load Reports tab is the single home for ALL data acquisition — uploaded
 * labor reports (FilePicker, dev-gated) plus the live scrapes — sitting
 * right next to the Save/Publish controls (SessionExportImport). The
 * Eligibility tab is now a pure read-only view of the rollup.
 *
 * Unlike the file importers, the live scrapes stay usable OUTSIDE dev mode:
 * refreshing job postings + eligibility lists is the routine action a
 * normal user runs, and the result auto-saves + publishes with the rest of
 * the session (see SessionExportImport gating).
 *
 * The four sub-components (RefreshPostingsButton, RefreshEligibilityLists-
 * Button, WorkerUrlSettings, PasteDhrPanel) are moved verbatim from
 * EligibilityView — same store calls, same proxy-chain behavior. Only the
 * import path for the scrapers lib changed (now `../../lib/scrapers`).
 */

import { useState } from 'react';
import {
  fetchDhrExamResults,
  fetchJobPostings,
  parseDhrExamHtml,
  useScrapers,
  FetchDhrError,
  FetchJobPostingsError,
} from '../../lib/scrapers';

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
        <span style={{ fontSize: 11, color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Refresh-eligibility-lists affordance — live fetch through the public
// CORS-proxy chain (replaces the manual-paste-as-primary path per Alex's
// S35 directive). Tries codetabs.com → corsproxy.io → allorigins.win per
// page (codetabs is the only one still working free as of S49; see
// fetch.ts § DEFAULT_PROXIES); falls back to the optional Cloudflare-Worker
// URL when configured.
// Pages are fetched in bounded-concurrency waves (Phase 2.2.v) instead of
// one-at-a-time with a 500ms throttle, cutting a full ~66-page scrape from
// ~50s to ~5s. A per-proxy timeout keeps a hung proxy from stalling a wave.
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
        <span style={{ fontSize: 11, color: 'var(--danger)' }}>
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
        Backup proxy: Cloudflare-Worker URL {dhrWorkerUrl && <span style={{ color: 'var(--success)', fontWeight: 400 }}>· configured</span>}
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
          <span style={{ fontSize: 11, color: status.startsWith('Parsed') ? 'var(--success)' : 'var(--danger)' }}>
            {status}
          </span>
        )}
      </div>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// The panel — composes the refresh affordances + per-source loaded counts +
// a Clear button, then the two collapsed fallback cards.
// ---------------------------------------------------------------------------

export function ScrapeSourcesPanel() {
  const jobPostings = useScrapers(s => s.jobPostings);
  const eligibilityLists = useScrapers(s => s.eligibilityLists);
  const clearAll = useScrapers(s => s.clearAll);
  const hasData = jobPostings.length > 0 || eligibilityLists.length > 0;

  return (
    <>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14 }}>Live data sources</strong>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Refresh job postings (SF Careers) and eligibility lists (SF DHR) straight
            from source. Available without dev mode; the result persists + publishes
            with the rest of the session. Browse the result on the Eligibility tab.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <RefreshPostingsButton />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {jobPostings.length.toLocaleString('en-US')} posting{jobPostings.length === 1 ? '' : 's'} loaded
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <RefreshEligibilityListsButton />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {eligibilityLists.length.toLocaleString('en-US')} eligibility list{eligibilityLists.length === 1 ? '' : 's'} loaded
            </span>
          </div>
          {hasData && (
            <button
              onClick={clearAll}
              style={{
                marginLeft: 'auto', alignSelf: 'flex-start',
                padding: '6px 12px', height: 30,
                border: '1px solid var(--border)', borderRadius: 14,
                background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Clear scraped data
            </button>
          )}
        </div>
      </div>

      {/* Backup proxy settings + manual-paste fallback (both collapsed by default) */}
      <WorkerUrlSettings />
      <PasteDhrPanel />
    </>
  );
}
