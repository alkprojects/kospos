/**
 * Positions view — the spine. Phase 2.2.16.
 *
 * Replaces the chartfields-centric placeholder at modules/positions/. Consumes
 * Position entities built from P&P data + the dept tree; surfaces the
 * three-dept distinction; renders Position Detail with userNotes inline edit.
 *
 * When BFM data is also loaded, the Position Detail modal joins to it via
 * `resolvePositionChartfields` so the posting Fund / Authority / Project /
 * Activity show through. Without BFM, those fields show a "load BFM" hint.
 * When BI Payroll is also loaded, the modal shows the per-position YTD
 * actuals broken into the 5 special-class buckets — see lib/payroll/.
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { buildPositions, hasDeptMismatch, usePositionNotes } from '../../positions';
import type { Position } from '../../positions';
import { DEFAULT_DEPT_TREE } from '../../reference/dept-tree';
import { resolvePositionChartfields, normalizePositionKey } from '../../chartfields/resolve';
import type { ObiPayrollRow, PsHcmPpRow } from '../../importers/types';
import { buildPayrollSnapshots, pickLatestSnapshot } from '../../payroll';
import { PositionDetail } from './PositionDetail';

function badge(label: string, color: string, bg: string) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 10,
      color,
      background: bg,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function FilterGroup({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 4 }}>{label}:</span>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '3px 10px',
            border: '1px solid',
            borderColor: value === o.value ? 'var(--accent)' : 'var(--border)',
            borderRadius: 12,
            background: value === o.value ? 'var(--accent-soft)' : 'transparent',
            color: value === o.value ? 'var(--accent)' : 'var(--muted)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
            fontWeight: value === o.value ? 600 : 400,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type FillFilter = 'all' | 'filled' | 'vacant' | 'partial' | 'over';
type DeptGroupFilter = 'all' | string;

export function PositionsView({ onViewPayroll }: {
  /** Fires after "View payroll" sets the labor scope, so the App shell can
   *  switch tabs. The scope is already set by PositionDetail before this fires. */
  onViewPayroll?: () => void;
} = {}) {
  const loadedRows = useAppStore(s => s.loadedRows);
  const userNotes = usePositionNotes(s => s.notes);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fillFilter, setFillFilter] = useState<FillFilter>('all');
  const [deptGroupFilter, setDeptGroupFilter] = useState<DeptGroupFilter>('all');
  const [tempOnly, setTempOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Build positions from loaded P&P rows.
  const positions = useMemo<Position[]>(() => {
    const ppRows = loadedRows.filter(
      (r): r is PsHcmPpRow => r._source === 'ps-hcm-pp',
    );
    if (ppRows.length === 0) return [];
    return buildPositions(ppRows, DEFAULT_DEPT_TREE, { userNotes });
  }, [loadedRows, userNotes]);

  // Resolved chartfields for the detail modal — built only when we need it
  // to avoid recomputing on every keystroke in the search box.
  const resolvedChartfieldsMap = useMemo(() => {
    if (loadedRows.length === 0) return new Map<string, ReturnType<typeof resolvePositionChartfields>[number]>();
    const resolved = resolvePositionChartfields(loadedRows);
    return new Map(
      resolved.map(r => [normalizePositionKey(r.positionNumber), r] as const),
    );
  }, [loadedRows]);

  // Latest PayrollSnapshot — used to surface YTD actuals on Position Detail.
  // Most-recent asOfDate wins when multiple snapshots are loaded.
  const latestPayroll = useMemo(() => {
    const obiRows = loadedRows.filter(
      (r): r is ObiPayrollRow => r._source === 'obi-payroll',
    );
    if (obiRows.length === 0) return null;
    return pickLatestSnapshot(buildPayrollSnapshots(obiRows));
  }, [loadedRows]);

  const deptGroups = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) {
      const g = p.effectiveDept.node?.deptGroup;
      if (g) set.add(g);
    }
    return [...set].sort();
  }, [positions]);

  const filtered = useMemo(() => {
    return positions.filter(p => {
      if (fillFilter === 'filled'  && p.fillStatus !== 'FILLED') return false;
      if (fillFilter === 'vacant'  && p.fillStatus !== 'VACANT') return false;
      if (fillFilter === 'partial' && p.fillStatus !== 'PARTIALLY FILLED') return false;
      if (fillFilter === 'over'    && p.fillStatus !== 'OVER FILLED') return false;
      if (deptGroupFilter !== 'all' && p.effectiveDept.node?.deptGroup !== deptGroupFilter) return false;
      if (tempOnly && !p.appointment?.cat1718) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          p.displayNumber, p.jobCode, p.jobCodeDescription,
          p.effectiveDept.name, p.effectiveDept.code,
          p.budgetedDept.name, p.budgetedDept.code,
          p.appointment?.name ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [positions, fillFilter, deptGroupFilter, tempOnly, search]);

  const totals = useMemo(() => ({
    total:    positions.length,
    filled:   positions.filter(p => p.fillStatus === 'FILLED').length,
    vacant:   positions.filter(p => p.fillStatus === 'VACANT').length,
    cat1718:  positions.filter(p => p.appointment?.cat1718).length,
    mismatch: positions.filter(hasDeptMismatch).length,
  }), [positions]);

  // Empty state — no data loaded.
  if (loadedRows.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          No data loaded
        </div>
        <div style={{ fontSize: 13 }}>
          Enable dev mode (<code>?dev=1</code>) and visit <strong>Load Reports</strong> to
          import a PS HCM P&amp;P file (the &ldquo;Active Labor&rdquo; CSV).
        </div>
      </div>
    );
  }

  // P&P-not-loaded state — data is present but no spine source.
  if (positions.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        Loaded data has no PS HCM P&amp;P rows. The Positions view needs a P&amp;P snapshot.
      </div>
    );
  }

  const selected = selectedId
    ? positions.find(p => p.id === selectedId) ?? null
    : null;
  const selectedChartfields = selected
    ? resolvedChartfieldsMap.get(selected.id) ?? null
    : null;
  const selectedYtd = selected && latestPayroll
    ? latestPayroll.byPosition.get(selected.id) ?? null
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {selected && (
        <PositionDetail
          position={selected}
          chartfields={selectedChartfields}
          ytdActuals={selectedYtd}
          ytdAsOfDate={latestPayroll?.asOfDate}
          onClose={() => setSelectedId(null)}
          onViewPayroll={() => { setSelectedId(null); onViewPayroll?.(); }}
        />
      )}

      {/* Summary bar */}
      <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <Stat label="Positions"    value={String(totals.total)} />
        <Stat label="Shown"        value={String(filtered.length)} />
        <Stat label="Filled"       value={String(totals.filled)} />
        <Stat label="Vacant"       value={String(totals.vacant)} />
        <Stat label="Cat 17/18"    value={String(totals.cat1718)} />
        <Stat label="Dept mismatch" value={String(totals.mismatch)} />
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search position #, job code, name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 240px',
            padding: '5px 10px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 13,
            fontFamily: 'inherit',
            background: 'var(--surface)',
            color: 'inherit',
          }}
        />
        <FilterGroup
          label="Fill"
          value={fillFilter}
          options={[
            { value: 'all',     label: 'All' },
            { value: 'filled',  label: 'Filled' },
            { value: 'vacant',  label: 'Vacant' },
            { value: 'partial', label: 'Partial' },
            { value: 'over',    label: 'Over' },
          ]}
          onChange={v => setFillFilter(v as FillFilter)}
        />
        {deptGroups.length > 1 && (
          <FilterGroup
            label="Dept group"
            value={deptGroupFilter}
            options={[
              { value: 'all', label: 'All' },
              ...deptGroups.map(g => ({ value: g, label: g })),
            ]}
            onChange={v => setDeptGroupFilter(v)}
          />
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={tempOnly} onChange={e => setTempOnly(e.target.checked)} />
          Cat 17/18 only
        </label>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
              {['Position #', 'Job Code', 'Description', 'Effective Dept', 'FTE', 'Fill', 'Incumbent', 'Notes'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px',
                  textAlign: 'left',
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
            {filtered.map(p => (
              <tr
                key={p.id}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setSelectedId(p.id)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                  {p.displayNumber}
                </td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{p.jobCode}</td>
                <td style={{ padding: '7px 12px' }}>
                  {p.jobCodeDescription || <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {p.effectiveDept.code || '—'}
                  </span>
                  {p.effectiveDept.name && (
                    <span style={{ marginLeft: 6, color: 'var(--muted)', fontSize: 12 }}>
                      {p.effectiveDept.name}
                    </span>
                  )}
                </td>
                <td style={{ padding: '7px 12px' }}>{p.fte.toFixed(2)}</td>
                <td style={{ padding: '7px 12px' }}>
                  {p.fillStatus === 'FILLED'           && badge('Filled',   '#1a7a3c', '#d4f4e3')}
                  {p.fillStatus === 'VACANT'           && badge('Vacant',   '#7a4b1a', '#f4e8d4')}
                  {p.fillStatus === 'PARTIALLY FILLED' && badge('Partial',  '#1f5fbf', '#e7f0fb')}
                  {p.fillStatus === 'OVER FILLED'      && badge('Over',     '#7f1d1d', '#fecaca')}
                  {!p.fillStatus                       && <span style={{ color: 'var(--muted)' }}>—</span>}
                  {' '}
                  {p.appointment?.cat1718 && badge(`Cat ${p.appointment.cat1718.category}`, '#6b21a8', '#f3e8ff')}
                  {hasDeptMismatch(p) && badge('Dept ≠', '#7a4b1a', '#fde68a')}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  {p.appointment?.name || <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '7px 12px', color: 'var(--muted)', fontSize: 11 }}>
                  {p.userNotes ? '●' : ''}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  No positions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
