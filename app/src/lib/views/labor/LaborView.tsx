/**
 * Labor view — Tab 7 BI Payroll drill-down. Phase 2.2.17.
 *
 * Per-position per-PP table on top of the rollup cube shipped in PR #66. The
 * cube exposes YTD totals; this view exposes the underlying rows that feed
 * those totals so a user can verify any projection number against the OBI
 * export it came from.
 *
 * Two entry paths:
 *   - User opens the tab directly → shows all rows across the latest snapshot
 *     (filterable by earnings code / account / PP range).
 *   - User clicks "View payroll" on Position Detail → the scope store is set
 *     to that position id; the view filters to that position and surfaces a
 *     "scoped to" banner with a Clear button.
 *
 * Per labor-report.md § Tab 7 § KosPos UI sketch #2: PPE × Earnings Code ×
 * Account × Fund × Hours × Amount table, quick-aggregates header (YTD
 * regular / OT / RPO / Premium / Temp LSP), row-click traces to the source
 * row's full 39-column shape (the "Trace to source" affordance).
 */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store';
import { buildPositions } from '../../positions';
import { DEFAULT_DEPT_TREE } from '../../reference/dept-tree';
import { buildPayrollSnapshots, pickLatestSnapshot } from '../../payroll';
import { normalizePositionKey } from '../../chartfields/resolve';
import type { ObiPayrollRow, PsHcmPpRow } from '../../importers/types';
import {
  EMPTY_FILTERS, aggregate, applyFilters, bucketOf, distinctValues,
} from './aggregate';
import type { LaborFilters } from './aggregate';
import { coverageStats, findNearbyPositions } from './payroll-diagnostic';
import { useLaborScope } from './scope-store';
import { matchesNeedle } from '../../search/needle';

/**
 * Diagnostic for the "scoped to a position with 0 matching OBI rows" case.
 * Surfaces what the snapshot does contain so the user can tell whether the
 * absence is a real no-pay case, a normalize-key mismatch (e.g. internal
 * whitespace the regex doesn't strip), or an OBI/HCM identifier divergence
 * (TX history, position renumber).
 *
 * Reported by Alex S28 for position 1106950. PR #82 shipped a first cut
 * (same-4-digit-prefix nearby chips); the chip output showed only 1 nearby
 * candidate (1106348) for 1106950, which on its own was hard to interpret
 * — the snapshot in Alex's environment covers only 234 distinct positions
 * across 42k rows, so 1106950 was almost certainly never in OBI. This
 * upgrade adds:
 *   - **Progressive prefix fallback** (4 → 3 → 2 digits) so the chip net
 *     catches more renumber / TX-history candidates when the dept prefix is
 *     sparsely represented in the OBI snapshot.
 *   - **Coverage-gap stat** ("OBI covers 234 of 587 P&P positions; this
 *     position is one of the 353 in P&P but not in OBI") so the user can
 *     tell "expected empty" (P&P knows the position; OBI's snapshot is
 *     narrower) from "unexpected empty" (P&P has it, OBI should too).
 *   - **Snapshot meta line** (FY + asOf) so the user can confirm they
 *     loaded the right OBI cut.
 */
function ScopedEmptyDiagnostic({
  scopedPositionId, snapshotRows,
  pAndPPositionIds, snapshotMeta,
}: {
  scopedPositionId: string;
  snapshotRows: ObiPayrollRow[];
  pAndPPositionIds: readonly string[];
  snapshotMeta: { fiscalYear: string; asOfDate: string };
}) {
  const distinctPositions = useMemo(() => {
    const set = new Set<string>();
    for (const r of snapshotRows) {
      const k = normalizePositionKey(r.positionIdentifier);
      if (k) set.add(k);
    }
    return [...set];
  }, [snapshotRows]);

  const nearby = useMemo(
    () => findNearbyPositions(scopedPositionId, distinctPositions),
    [scopedPositionId, distinctPositions],
  );

  const coverage = useMemo(
    () => coverageStats(scopedPositionId, pAndPPositionIds, distinctPositions),
    [scopedPositionId, pAndPPositionIds, distinctPositions],
  );

  // Render the coverage affirmation in plain English. Branches by the
  // scoped position's classification — each branch tells the user
  // unambiguously whether this empty result is expected or worth chasing.
  let coverageMessage: ReactNode;
  if (coverage.totalPAndP === 0) {
    // P&P not loaded — can't compute the gap. Fall back to the legacy
    // "common causes" explainer.
    coverageMessage = (
      <>
        Snapshot has{' '}
        <strong>{snapshotRows.length.toLocaleString('en-US')}</strong> rows
        across <strong>{coverage.totalObi.toLocaleString('en-US')}</strong>{' '}
        distinct positionIdentifiers. Common causes: (a) a positionIdentifier
        mismatch (whitespace, internal punctuation, OBI vs HCM digit-format
        divergence), (b) the position was renumbered and OBI still uses the
        old identifier, or (c) the row is in a different fiscal-year snapshot
        than the one loaded.
      </>
    );
  } else if (coverage.scopedStatus === 'orphan') {
    coverageMessage = (
      <>
        Position <span style={{ fontFamily: 'monospace' }}>{scopedPositionId}</span> is
        in neither the loaded P&amp;P snapshot ({coverage.totalPAndP.toLocaleString('en-US')}{' '}
        positions) nor the OBI snapshot ({coverage.totalObi.toLocaleString('en-US')}{' '}
        positions). Likely a stale URL or a typo in the position number.
      </>
    );
  } else if (coverage.scopedStatus === 'p-and-p-only') {
    coverageMessage = (
      <>
        Position <span style={{ fontFamily: 'monospace' }}>{scopedPositionId}</span> is
        in the loaded P&amp;P snapshot, but <strong>not</strong> in the OBI snapshot.
        OBI covers <strong>{coverage.inBoth.toLocaleString('en-US')}</strong> of
        the <strong>{coverage.totalPAndP.toLocaleString('en-US')}</strong> P&amp;P
        positions; this is one of the{' '}
        <strong>{coverage.pAndPOnly.toLocaleString('en-US')}</strong> P&amp;P-only
        positions in this loaded pair. Typically this means no posted payroll
        in the FY covered by the loaded OBI cut — confirm the snapshot meta
        below matches the FY you expect.
      </>
    );
  } else {
    // scopedStatus === 'in-both' shouldn't happen here (we got 0 rows for
    // a position that IS in distinctPositions). Defensive fallback.
    coverageMessage = (
      <>
        Position <span style={{ fontFamily: 'monospace' }}>{scopedPositionId}</span> is
        in both snapshots but the active filters yielded 0 rows. Try resetting
        filters or widening the PPE range.
      </>
    );
  }

  return (
    <div style={{ textAlign: 'left', display: 'inline-block', maxWidth: 560 }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        No payroll rows match position{' '}
        <span style={{ fontFamily: 'monospace' }}>{scopedPositionId}</span>.
      </div>
      <div style={{ marginBottom: 8 }}>
        {coverageMessage}
      </div>
      {nearby.matches.length > 0 && (
        <div style={{ fontSize: 11, marginTop: 6 }}>
          Nearby positionIdentifiers in snapshot (same{' '}
          <span style={{ fontFamily: 'monospace' }}>{nearby.prefix}</span> prefix):
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {nearby.matches.map(p => (
              <span key={p} style={{
                padding: '2px 7px', borderRadius: 10,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                fontFamily: 'monospace', fontSize: 11,
              }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 10 }}>
        OBI snapshot · FY{' '}
        <span style={{ fontFamily: 'monospace' }}>{snapshotMeta.fiscalYear || '—'}</span>
        {' '}· asOf{' '}
        <span style={{ fontFamily: 'monospace' }}>{snapshotMeta.asOfDate || '—'}</span>
        {' '}·{' '}
        <strong>{snapshotRows.length.toLocaleString('en-US')}</strong> rows ·{' '}
        <strong>{coverage.totalObi.toLocaleString('en-US')}</strong> distinct
        positionIdentifiers
      </div>
    </div>
  );
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });
}

function fmtNumber(n: number, fractionDigits = 1): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
  });
}

function bucketBadge(b: ReturnType<typeof bucketOf>) {
  const map: Record<ReturnType<typeof bucketOf>, [string, string, string]> = {
    regular:  ['Reg', '#1a7a3c', '#d4f4e3'],
    overtime: ['OT',  '#7a4b1a', '#fde68a'],
    rpo:      ['RPO', '#6b21a8', '#f3e8ff'],
    premium:  ['Prm', '#1f5fbf', '#e7f0fb'],
    tempLsp:  ['TLS', '#7f1d1d', '#fecaca'],
  };
  const [label, color, bg] = map[b];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '1px 6px', borderRadius: 10,
      color, background: bg, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
      {hint && (
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{hint}</span>
      )}
    </div>
  );
}

function TraceModal({ row, onClose }: { row: ObiPayrollRow; onClose: () => void }) {
  // The full 39-column shape, in source-column order, so a user can verify
  // against the raw OBI export row by row.
  const fields: Array<[string, string | number]> = [
    ['_source row', row._row],
    ['Fiscal Year',                row.fiscalYear],
    ['Dept Group Code',            row.departmentGroupCode],
    ['Fund Lvl 1 Code',            row.fundLvl1Code],
    ['Fund Lvl 1 Desc',            row.fundLvl1Description],
    ['Fund Control',               row.fundControl],
    ['Fund Code',                  row.fund],
    ['Fund Description',           row.fundDescription],
    ['Department Code',            row.departmentCode],
    ['Department Description',     row.departmentName],
    ['Project Code',               row.projectCode],
    ['Project Description',        row.projectDescription],
    ['Activity Code',              row.activityCode],
    ['Activity Description',       row.activityDescription],
    ['Authority Lvl 1 Code',       row.authorityLvl1Code],
    ['Authority Lvl 1 Description', row.authorityLvl1Description],
    ['Authority Code',             row.authority],
    ['Authority Description',      row.authorityDescription],
    ['Account Lvl 2 Description',  row.accountLvl2Description],
    ['Account Lvl 5 Name',         row.accountLvl5Name],
    ['Account Lvl 3 Description',  row.accountLvl3Description],
    ['Account Code',               row.accountCode],
    ['Account Description',        row.accountDescription],
    ['Earning Period Number',      row.earningPeriodNumber],
    ['Earning Period End Date',    row.earningPeriodEnd],
    ['Person Number',              row.personNumber],
    ['Person Full Name',           row.personFullName],
    ['Roster Code',                row.rosterCode],
    ['Earnings Code',              row.earningsCode],
    ['Earnings Code Description',  row.earningsDescription],
    ['Position Identifier',        row.positionIdentifier],
    ['Job Code',                   `${row.jobCode}${row.jobCodeSet ? ` (set ${row.jobCodeSet})` : ''}`],
    ['Job Description',            row.jobDescription],
    ['Assignment Number',          row.assignmentNumber],
    ['HR Appointment Type',        row.appointmentType],
    ['Is FTE Hours',               row.isFteHours],
    ['Earning Hours',              row.earningHours],
    ['Pay Period FTE',             row.payPeriodFTE],
    ['Balance Amount',             row.balanceAmount],
    ['_asOfDate (importer)',       row._asOfDate],
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 28,
          maxWidth: 640,
          width: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 18,
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>
              Source row · {row.earningPeriodEnd} · {row.earningsCode || '—'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {row.personFullName || '(no name)'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Position {row.positionIdentifier} · {fmtMoney(row.balanceAmount)} · {fmtNumber(row.earningHours)} hrs
            </div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--muted)', padding: '0 4px',
          }}>✕</button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {fields.map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '4px 8px 4px 0', color: 'var(--muted)', verticalAlign: 'top' }}>
                  {label}
                </td>
                <td style={{
                  padding: '4px 0',
                  fontFamily: typeof value === 'number' ? 'monospace' : 'inherit',
                  textAlign: typeof value === 'number' ? 'right' : 'left',
                }}>
                  {typeof value === 'number'
                    ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
                    : (value || <span style={{ color: 'var(--muted)' }}>—</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14 }}>
          39 columns from the OBI BI Payroll export. The 4 special-class account
          descriptions drive the bucket math in <code>lib/payroll/</code>.
        </div>
      </div>
    </div>
  );
}

export function LaborView() {
  const loadedRows = useAppStore(s => s.loadedRows);
  const scopedPositionId = useLaborScope(s => s.positionId);
  const clearScope = useLaborScope(s => s.clearScope);

  const obiRows = useMemo(
    () => loadedRows.filter((r): r is ObiPayrollRow => r._source === 'obi-payroll'),
    [loadedRows],
  );
  const snapshot = useMemo(() => {
    if (obiRows.length === 0) return null;
    return pickLatestSnapshot(buildPayrollSnapshots(obiRows));
  }, [obiRows]);

  // Build a positionId → display label so the scoped banner can show a
  // human-readable position number + job code instead of just the bare id.
  // Also expose the P&P position id set for the empty-state coverage stat.
  const { positionLabels, pAndPPositionIds } = useMemo(() => {
    const ppRows = loadedRows.filter(
      (r): r is PsHcmPpRow => r._source === 'ps-hcm-pp',
    );
    if (ppRows.length === 0) {
      return {
        positionLabels: new Map<string, string>(),
        pAndPPositionIds: [] as string[],
      };
    }
    const positions = buildPositions(ppRows, DEFAULT_DEPT_TREE);
    return {
      positionLabels: new Map(positions.map(p => [
        p.id,
        `${p.displayNumber} · ${p.jobCode}${p.jobCodeDescription ? ` ${p.jobCodeDescription}` : ''}`,
      ])),
      pAndPPositionIds: positions.map(p => p.id),
    };
  }, [loadedRows]);

  const [earningsCode, setEarningsCode] = useState('');
  const [accountDescription, setAccountDescription] = useState('');
  const [pperStart, setPperStart] = useState('');
  const [pperEnd, setPperEnd] = useState('');
  const [search, setSearch] = useState('');
  const [traceRow, setTraceRow] = useState<ObiPayrollRow | null>(null);

  const snapshotRows = snapshot?.rows ?? [];
  const filters: LaborFilters = {
    positionId: scopedPositionId,
    earningsCode, accountDescription, pperStart, pperEnd,
  };

  // Filter pipeline: structured filters first (cheap, narrow the set), then
  // the global needle over the remaining rows. Same `matchesNeedle` helper
  // as Positions + Hiring Plan so all three surfaces match consistently.
  const structuralFiltered = useMemo(
    () => applyFilters(snapshotRows, filters), [snapshotRows, filters]
  );
  const filtered = useMemo(
    () => search.trim() === ''
      ? structuralFiltered
      : structuralFiltered.filter(r => matchesNeedle(r, search)),
    [structuralFiltered, search],
  );
  const agg = useMemo(() => aggregate(filtered), [filtered]);
  const totalAgg = useMemo(() => aggregate(snapshotRows), [snapshotRows]);

  const earningsCodes = useMemo(() => distinctValues(snapshotRows, 'earningsCode'), [snapshotRows]);
  const accounts = useMemo(() => distinctValues(snapshotRows, 'accountDescription'), [snapshotRows]);

  const resetFilters = () => {
    setEarningsCode(EMPTY_FILTERS.earningsCode);
    setAccountDescription(EMPTY_FILTERS.accountDescription);
    setPperStart(EMPTY_FILTERS.pperStart);
    setPperEnd(EMPTY_FILTERS.pperEnd);
    setSearch('');
  };

  // Empty state — no data loaded.
  if (loadedRows.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          No data loaded
        </div>
        <div style={{ fontSize: 13 }}>
          Enable dev mode (<code>?dev=1</code>) and visit <strong>Load Reports</strong> to
          import a BI Payroll <code>.xlsx</code> export.
        </div>
      </div>
    );
  }

  // Loaded-but-no-payroll state.
  if (!snapshot || obiRows.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          No BI Payroll loaded
        </div>
        <div style={{ fontSize: 13 }}>
          Load a BI Payroll <code>.xlsx</code> export via Load Reports to see the
          per-pay-period drill-down.
        </div>
      </div>
    );
  }

  const scopeLabel = scopedPositionId
    ? positionLabels.get(scopedPositionId) ?? `Position ${scopedPositionId}`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {traceRow && <TraceModal row={traceRow} onClose={() => setTraceRow(null)} />}

      {/* Scope banner — only when filtered to a single position */}
      {scopedPositionId && (
        <div className="card" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--accent-soft)', border: '1px solid var(--accent)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
            Scoped to:
          </span>
          <span style={{ fontSize: 13 }}>{scopeLabel}</span>
          <button
            onClick={clearScope}
            style={{
              marginLeft: 'auto', fontSize: 11, padding: '3px 10px',
              border: '1px solid var(--accent)', borderRadius: 12,
              background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Clear scope
          </button>
        </div>
      )}

      {/* Summary bar — YTD aggregates per Tab 7 UI sketch #2.
          Special-class buckets at $0 are hidden to reduce visual noise; the
          Total and Regular stats stay so the baseline is always anchored. */}
      <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <Stat label="Rows" value={agg.rowCount.toLocaleString('en-US')}
              hint={agg.rowCount !== totalAgg.rowCount
                ? `of ${totalAgg.rowCount.toLocaleString('en-US')} in snapshot`
                : undefined} />
        <Stat label="Total"    value={fmtMoney(agg.total)} />
        <Stat label="Regular"  value={fmtMoney(agg.regular)} />
        {agg.overtime !== 0 && <Stat label="Overtime" value={fmtMoney(agg.overtime)} />}
        {agg.rpo      !== 0 && <Stat label="RPO"      value={fmtMoney(agg.rpo)} />}
        {agg.premium  !== 0 && <Stat label="Premium"  value={fmtMoney(agg.premium)} />}
        {agg.tempLsp  !== 0 && <Stat label="Temp LSP" value={fmtMoney(agg.tempLsp)} />}
        <Stat label="Hours"    value={fmtNumber(agg.totalHours)} />
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          Snapshot asOf <span style={{ fontFamily: 'monospace' }}>{snapshot.asOfDate}</span>
          {' · '}FY <span style={{ fontFamily: 'monospace' }}>{snapshot.fiscalYear}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search any field (name, account desc, fund, project, person #…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 260px',
            padding: '4px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
          aria-label="Search payroll rows"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>Earnings:</span>
          <select
            value={earningsCode}
            onChange={e => setEarningsCode(e.target.value)}
            style={{
              padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 12, fontFamily: 'inherit',
              background: 'var(--surface)', color: 'inherit',
            }}
          >
            <option value="">All ({earningsCodes.length})</option>
            {earningsCodes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>Account:</span>
          <select
            value={accountDescription}
            onChange={e => setAccountDescription(e.target.value)}
            style={{
              padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 12, fontFamily: 'inherit', minWidth: 160,
              background: 'var(--surface)', color: 'inherit',
            }}
          >
            <option value="">All ({accounts.length})</option>
            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>PPE from:</span>
          <input
            type="date"
            value={pperStart}
            onChange={e => setPperStart(e.target.value)}
            style={{
              padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 12, fontFamily: 'inherit',
              background: 'var(--surface)', color: 'inherit',
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>to:</span>
          <input
            type="date"
            value={pperEnd}
            onChange={e => setPperEnd(e.target.value)}
            style={{
              padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 12, fontFamily: 'inherit',
              background: 'var(--surface)', color: 'inherit',
            }}
          />
        </label>
        {(earningsCode || accountDescription || pperStart || pperEnd || search) && (
          <button
            onClick={resetFilters}
            style={{
              fontSize: 11, padding: '3px 10px',
              border: '1px solid var(--border)', borderRadius: 12,
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
              {['PPE', 'Position', 'Earn', 'Description', 'Account', 'Fund', 'Hours', 'Amount', 'Bkt'].map(h => (
                <th key={h} style={{
                  padding: '7px 10px',
                  textAlign: h === 'Hours' || h === 'Amount' ? 'right' : 'left',
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'var(--accent)',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((r, i) => (
              <tr
                key={`${r._row}-${i}`}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setTraceRow(r)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {r.earningPeriodEnd}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>{r.positionIdentifier}</td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>{r.earningsCode || '—'}</td>
                <td style={{ padding: '5px 10px' }}>{r.earningsDescription || '—'}</td>
                <td style={{ padding: '5px 10px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {r.accountDescription || '—'}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {r.fund}{r.fundDescription ? <span style={{ color: 'var(--muted)' }}> {r.fundDescription}</span> : null}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                  {fmtNumber(r.earningHours)}
                </td>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                  {fmtMoney(r.balanceAmount)}
                </td>
                <td style={{ padding: '5px 10px' }}>{bucketBadge(bucketOf(r.accountDescription))}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {scopedPositionId ? (
                    <ScopedEmptyDiagnostic
                      scopedPositionId={scopedPositionId}
                      snapshotRows={snapshotRows}
                      pAndPPositionIds={pAndPPositionIds}
                      snapshotMeta={{
                        fiscalYear: snapshot.fiscalYear,
                        asOfDate: snapshot.asOfDate,
                      }}
                    />
                  ) : (
                    'No rows match the current filters.'
                  )}
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
            Showing first 500 of {filtered.length.toLocaleString('en-US')} rows. Apply filters
            (earnings code / account / PP range / position) to narrow the view.
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Row click opens the full 39-column source view (the "Trace to source" affordance).
        Bucket badges mirror the special-class math in <code>lib/payroll/</code>:
        Reg = regular labor · OT = Overtime - Scheduled Misc · RPO = Ret Payout - SP &amp; Vac - Misc
        · Prm = Premium Pay - Misc · TLS = Temp Misc LumpSum Payoff.
      </div>
    </div>
  );
}
