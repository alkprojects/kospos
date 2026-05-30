/**
 * Job Postings table — a Data-tab sub-view (Phase 2.2.u).
 *
 * A read-only table of the open SF Careers postings currently in the
 * scrapers store (`useScrapers.jobPostings`, from the SmartRecruiters
 * Posting API). Sibling of the Eligibility Lists table under the Data tab;
 * Alex's S45 ask was "eligibility lists and job postings as separate tables."
 *
 * Data acquisition (the Refresh job-postings button) lives on the Load Reports
 * tab (ScrapeSourcesPanel) — same split as the Eligibility view. This is a
 * pure view: summary stats + a search box + the table, newest posting first.
 *
 * The per-job-code "active posting / active list" rollup still lives on the
 * Eligibility Lists sub-view (it joins postings + lists); this sub-view is the
 * flat, every-posting table.
 */

import { useMemo, useState } from 'react';
import { CopyButton, Stat } from '../../ui';
import { useScrapers } from '../../scrapers';
import type { JobPosting } from '../../scrapers';

// ---------------------------------------------------------------------------
// Display helpers (timeAgo mirrors EligibilityView's; the Stat card is shared from lib/ui)
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'never';
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

/** SmartRecruiters releasedDate is a full ISO timestamp; show the UTC date
 *  (slice avoids the local-timezone day-shift a Date round-trip can cause). */
function releasedDate(iso: string): string {
  if (!iso) return '—';
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : iso;
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function JobPostingsView() {
  const jobPostings = useScrapers(s => s.jobPostings);
  const jobPostingsRefreshedAt = useScrapers(s => s.jobPostingsRefreshedAt);

  const [search, setSearch] = useState('');

  const distinctJobCodes = useMemo(
    () => new Set(jobPostings.map(p => p.jobCode).filter(Boolean)).size,
    [jobPostings],
  );
  const distinctDepartments = useMemo(
    () => new Set(jobPostings.map(p => p.department).filter(Boolean)).size,
    [jobPostings],
  );

  const filtered = useMemo<JobPosting[]>(() => {
    const q = search.trim().toLowerCase();
    const rows = q === ''
      ? jobPostings
      : jobPostings.filter(p =>
          p.jobCode.toLowerCase().includes(q) ||
          p.classTitle.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q));
    // Newest posting first; stable for equal dates.
    return [...rows].sort((a, b) => b.releasedDate.localeCompare(a.releasedDate));
  }, [jobPostings, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header — top-aligned so the stat values share a baseline. */}
      <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Stat label="Open postings" value={jobPostings.length.toLocaleString('en-US')} />
        <Stat label="Job codes" value={distinctJobCodes.toLocaleString('en-US')} />
        <Stat label="Departments" value={distinctDepartments.toLocaleString('en-US')} />
        <Stat
          label="Last refreshed"
          value={jobPostingsRefreshedAt ? timeAgo(jobPostingsRefreshedAt) : 'never'}
        />
      </div>

      {/* Search */}
      <div className="card">
        <input
          type="search"
          placeholder="Search by job code, class title, posting name, or department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search job postings"
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
              {['Job code', 'Class title', 'Department', 'Released', ''].map(h => (
                <th key={h} style={{
                  padding: '7px 10px', textAlign: 'left',
                  fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
                  color: 'var(--accent)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {jobPostings.length === 0
                    ? 'No job postings loaded — refresh job postings from the Load Reports tab.'
                    : 'No postings match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {p.jobCode || <span style={{ color: 'var(--muted)' }}>—</span>}
                    {p.jobCode && (
                      <span style={{ display: 'inline-flex' }}>
                        <CopyButton value={p.jobCode} label="Job code" />
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 10px' }} title={p.name || undefined}>
                    {p.classTitle || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {p.department || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {releasedDate(p.releasedDate)}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}
                      >
                        Posting ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Open postings from SF Careers (SmartRecruiters Posting API). Refresh them
        from the Load Reports tab. Job codes are parsed from the posting title; a
        blank job code means the parser couldn't find one (the posting still
        lists here). The per-job-code "active posting / active list" rollup is on
        the Eligibility Lists tab.
      </div>
    </div>
  );
}
