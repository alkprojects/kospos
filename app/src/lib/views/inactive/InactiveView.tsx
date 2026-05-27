/**
 * Inactive view — Tab 13 INACTIVE replacement. Phase 2.2.20.
 *
 * Lists positions paid in the latest OBI snapshot that are NOT in the active
 * P&P roster — i.e., positions with orphan FYTD spend that the workbook used
 * to require a manual paste into Report Data's INACTIVATED 7-slot block.
 * KosPos surfaces them as a live query with no cap; the spend rolls up into
 * downstream views automatically.
 *
 * Layout mirrors LaborView / StaffingPlanView:
 *   - Summary header: count + total inactive FYTD spend + 5-bucket totals
 *   - Filter bar: needle search + reason-hint pill filter
 *   - Table: position / job / dept / last incumbent / last PPE / FYTD bucket
 *     breakdown / reason chip
 *
 * The reason hint is informational, not authoritative — the real separation
 * reason lives in PS HCM, not BI Payroll. See `inferReason` in build.ts.
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { buildPositions } from '../../positions';
import { DEFAULT_DEPT_TREE } from '../../reference/dept-tree';
import { buildPayrollSnapshots, pickLatestSnapshot } from '../../payroll';
import type { PsHcmPpRow, ObiPayrollRow } from '../../importers/types';
import { matchesNeedle } from '../../search/needle';
import { CopyButton } from '../../ui';
import { buildInactiveSummary } from './build';
import type { InactiveReasonHint } from './build';

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });
}

const REASON_LABEL: Record<InactiveReasonHint, string> = {
  'retirement-payout':   'Retirement payout',
  'temp-lumpsum-payoff': 'Temp lump-sum',
  'wages-only':          'Wages only',
};

const REASON_COLOR: Record<InactiveReasonHint, [string, string]> = {
  // [text, background]
  'retirement-payout':   ['#6b21a8', '#f3e8ff'],
  'temp-lumpsum-payoff': ['#7f1d1d', '#fecaca'],
  'wages-only':          ['#1f5fbf', '#e7f0fb'],
};

function ReasonChip({ hint }: { hint: InactiveReasonHint }) {
  const [color, bg] = REASON_COLOR[hint];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '1px 7px', borderRadius: 10,
      color, background: bg, whiteSpace: 'nowrap',
    }}>{REASON_LABEL[hint]}</span>
  );
}

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

type ReasonFilter = 'all' | InactiveReasonHint;

export function InactiveView() {
  const loadedRows = useAppStore(s => s.loadedRows);

  const ppRows = useMemo(
    () => loadedRows.filter((r): r is PsHcmPpRow => r._source === 'ps-hcm-pp'),
    [loadedRows],
  );
  const obiRows = useMemo(
    () => loadedRows.filter((r): r is ObiPayrollRow => r._source === 'obi-payroll'),
    [loadedRows],
  );

  const positions = useMemo(
    () => ppRows.length === 0 ? [] : buildPositions(ppRows, DEFAULT_DEPT_TREE),
    [ppRows],
  );

  const snapshot = useMemo(() => {
    if (obiRows.length === 0) return null;
    return pickLatestSnapshot(buildPayrollSnapshots(obiRows));
  }, [obiRows]);

  const summaries = useMemo(
    () => buildInactiveSummary(positions, snapshot),
    [positions, snapshot],
  );

  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');

  const filtered = useMemo(() => {
    let out = summaries;
    if (reasonFilter !== 'all') {
      out = out.filter(s => s.reasonHint === reasonFilter);
    }
    if (search.trim() !== '') {
      out = out.filter(s => matchesNeedle(s, search));
    }
    return out;
  }, [summaries, search, reasonFilter]);

  // Roll-up across the filtered set so the summary stats track what's in the
  // table — easier to scan than always showing global totals.
  const rollup = useMemo(() => {
    let total = 0, regular = 0, overtime = 0, rpo = 0, premium = 0, tempLsp = 0;
    for (const s of filtered) {
      total += s.total; regular += s.regular; overtime += s.overtime;
      rpo += s.rpo;     premium += s.premium; tempLsp += s.tempLsp;
    }
    return { total, regular, overtime, rpo, premium, tempLsp };
  }, [filtered]);

  // Empty states — message depends on which side is missing.
  if (loadedRows.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          No data loaded
        </div>
        <div style={{ fontSize: 13 }}>
          Enable dev mode (<code>?dev=1</code>) and visit <strong>Load Reports</strong> to
          import both a PS HCM P&amp;P snapshot and an OBI BI Payroll export.
        </div>
      </div>
    );
  }
  if (obiRows.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          No BI Payroll loaded
        </div>
        <div style={{ fontSize: 13 }}>
          Load an OBI BI Payroll <code>.xlsx</code> export via Load Reports — Inactive
          positions are computed by joining BI Payroll FYTD spend against the P&amp;P
          active roster.
        </div>
      </div>
    );
  }
  if (ppRows.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          No P&amp;P loaded
        </div>
        <div style={{ fontSize: 13 }}>
          Load a PS HCM P&amp;P snapshot via Load Reports — without it, every BI
          Payroll position would show as &quot;inactive&quot; (nothing to compare against).
        </div>
      </div>
    );
  }

  const counts: Record<InactiveReasonHint, number> = {
    'retirement-payout':   0,
    'temp-lumpsum-payoff': 0,
    'wages-only':          0,
  };
  for (const s of summaries) counts[s.reasonHint]++;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <Stat
          label="Inactive positions"
          value={filtered.length.toLocaleString('en-US')}
          hint={filtered.length !== summaries.length
            ? `of ${summaries.length.toLocaleString('en-US')} total`
            : undefined}
        />
        <Stat label="FYTD spend"   value={fmtMoney(rollup.total)} />
        {rollup.regular  !== 0 && <Stat label="Regular"  value={fmtMoney(rollup.regular)} />}
        {rollup.overtime !== 0 && <Stat label="Overtime" value={fmtMoney(rollup.overtime)} />}
        {rollup.rpo      !== 0 && <Stat label="RPO"      value={fmtMoney(rollup.rpo)} />}
        {rollup.premium  !== 0 && <Stat label="Premium"  value={fmtMoney(rollup.premium)} />}
        {rollup.tempLsp  !== 0 && <Stat label="Temp LSP" value={fmtMoney(rollup.tempLsp)} />}
        {snapshot && (
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
            Snapshot asOf <span style={{ fontFamily: 'monospace' }}>{snapshot.asOfDate}</span>
            {' · '}FY <span style={{ fontFamily: 'monospace' }}>{snapshot.fiscalYear}</span>
          </div>
        )}
      </div>

      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search any field (name, dept, job code, position #…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 260px',
            padding: '4px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
          aria-label="Search inactive positions"
        />
        <div role="radiogroup" aria-label="Filter by reason" style={{ display: 'flex', gap: 6 }}>
          {(['all', 'retirement-payout', 'temp-lumpsum-payoff', 'wages-only'] as const).map(r => {
            const isActive = reasonFilter === r;
            const label = r === 'all'
              ? `All · ${summaries.length}`
              : `${REASON_LABEL[r]} · ${counts[r]}`;
            return (
              <button
                key={r}
                onClick={() => setReasonFilter(r)}
                role="radio"
                aria-checked={isActive}
                style={{
                  fontSize: 11, padding: '3px 10px',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                  borderRadius: 12,
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {(search || reasonFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setReasonFilter('all'); }}
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

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
              {['Position', 'Job', 'Dept', 'Last incumbent', 'Last PPE',
                'FYTD', 'Reg', 'OT', 'RPO', 'Prm', 'TLS', 'Reason'].map(h => (
                <th key={h} style={{
                  padding: '7px 10px',
                  textAlign: ['FYTD','Reg','OT','RPO','Prm','TLS'].includes(h) ? 'right' : 'left',
                  fontWeight: 600, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  color: 'var(--accent)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map(s => (
              <tr key={s.positionId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>
                  {s.displayNumber}
                  <CopyButton value={s.displayNumber} label="Position number" />
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {s.jobCode}
                  {s.jobCode && <CopyButton value={s.jobCode} label="Job code" />}
                  {' '}<span style={{ color: 'var(--muted)', fontFamily: 'inherit' }}>{s.jobDescription}</span>
                </td>
                <td style={{ padding: '5px 10px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {s.departmentName || s.departmentCode || '—'}
                </td>
                <td style={{ padding: '5px 10px' }}>
                  {s.lastIncumbent || <span style={{ color: 'var(--muted)' }}>(no name)</span>}
                  {s.lastIncumbent && <CopyButton value={s.lastIncumbent} label="Last incumbent" />}
                  {s.lastEmplId && (
                    <>
                      <span style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                        {' '}· {s.lastEmplId}
                      </span>
                      <CopyButton value={s.lastEmplId} label="Employee ID" />
                    </>
                  )}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{s.lastPpe}</td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 600 }}>
                  {fmtMoney(s.total)}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                  {s.regular ? fmtMoney(s.regular) : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                  {s.overtime ? fmtMoney(s.overtime) : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                  {s.rpo ? fmtMoney(s.rpo) : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                  {s.premium ? fmtMoney(s.premium) : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                  {s.tempLsp ? fmtMoney(s.tempLsp) : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '5px 10px' }}><ReasonChip hint={s.reasonHint} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {summaries.length === 0
                    ? 'No inactive positions in this snapshot — every FYTD-paid position is in the active P&P roster.'
                    : 'No inactive positions match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 500 && (
          <div style={{
            padding: '10px 12px', fontSize: 11, color: 'var(--muted)',
            borderTop: '1px solid var(--border)', textAlign: 'center',
          }}>
            Showing first 500 of {filtered.length.toLocaleString('en-US')} positions. Apply
            filters to narrow the view.
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Each row is a position with FYTD spend in BI Payroll but no row in the loaded
        P&amp;P active roster — typically a separated employee&apos;s last paychecks
        (regular wages, retirement payout, temp lump-sum). The reason chip is
        inferred from which bucket(s) carry spend; PS HCM has the authoritative
        separation reason.
      </div>
    </div>
  );
}
