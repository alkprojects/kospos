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
import type { BfmPositionRow, ObiPayrollRow, PsHcmPpRow, PsHcmEeAddlPayRow } from '../../importers/types';
import { buildPayrollSnapshots, pickLatestSnapshot } from '../../payroll';
import { buildBudgetSnapshot } from '../../budget';
import { buildAdditionalPay, indexByEmplId } from '../../additional-pay';
import type { PositionAdditionalPay } from '../../additional-pay';
import { matchesNeedle } from '../../search/needle';
import { Badge, CopyButton, rowButtonProps, Stat } from '../../ui';
import { PositionDetail } from './PositionDetail';
import { usePositionsScope } from './scope-store';

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

/** Normalize a job code for cross-source equality (the Eligibility rollup
 *  code vs the P&P position's job code): trim + uppercase. SF job codes are
 *  short alphanumerics (e.g. "0922", "Q002"); this guards against stray
 *  whitespace / case divergence between the two upstream feeds. */
function normJobCode(s: string): string {
  return s.trim().toUpperCase();
}

export function PositionsView({ onViewPayroll }: {
  /** Fires after "View payroll" sets the labor scope, so the App shell can
   *  switch tabs. The scope is already set by PositionDetail before this fires. */
  onViewPayroll?: () => void;
} = {}) {
  const loadedRows = useAppStore(s => s.loadedRows);
  const userNotes = usePositionNotes(s => s.notes);

  // Cross-tab nav: a job code set from the Eligibility tab filters this list.
  // Persists in its own store (mirrors useLaborScope) so it survives this
  // view's remount-on-tab-switch; cleared via the banner's "Clear filter".
  const scopedJobCode = usePositionsScope(s => s.jobCode);
  const clearScope = usePositionsScope(s => s.clearScope);

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

  // Latest BudgetSnapshot — used to surface Budget vs Actual on Position
  // Detail. BFM eturns don't stamp an asOf date on their rows themselves,
  // so we read the date from the app store's lastBfmImportAt field (set by
  // the upload pipeline) and fall back to "" when not present.
  const lastBfmImportAt = useAppStore(s => s.lastBfmImportAt);
  const latestBudget = useMemo(() => {
    const bfmRows = loadedRows.filter(
      (r): r is BfmPositionRow => r._source === 'bfm-position',
    );
    if (bfmRows.length === 0) return null;
    return buildBudgetSnapshot(bfmRows, { asOfDate: lastBfmImportAt ?? '' });
  }, [loadedRows, lastBfmImportAt]);

  // EE Additional Pay, indexed by employee id — used to surface a person's
  // acting / supervisory differentials on Position Detail. Null when the
  // source isn't loaded.
  const additionalPayByEmplId = useMemo(() => {
    const eeRows = loadedRows.filter(
      (r): r is PsHcmEeAddlPayRow => r._source === 'ps-hcm-ee-addl-pay',
    );
    if (eeRows.length === 0) return null;
    return indexByEmplId(buildAdditionalPay(eeRows));
  }, [loadedRows]);

  // Global "is this data source loaded anywhere?" flags. Distinct from the
  // per-position resolution above — needed so Position Detail can tell the
  // difference between "no BI Payroll loaded" and "BI Payroll loaded but this
  // position has no rows in it" (e.g., a brand-new vacancy). Same for BFM.
  const obiLoaded = latestPayroll !== null;
  const bfmLoaded = latestBudget !== null;

  const deptGroups = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) {
      const g = p.effectiveDept.node?.deptGroup;
      if (g) set.add(g);
    }
    return [...set].sort();
  }, [positions]);

  const filtered = useMemo(() => {
    const scopedNorm = scopedJobCode ? normJobCode(scopedJobCode) : null;
    return positions.filter(p => {
      // Cross-tab job-code scope (from Eligibility) — exact, normalized match.
      if (scopedNorm && normJobCode(p.jobCode ?? '') !== scopedNorm) return false;
      if (fillFilter === 'filled'  && p.fillStatus !== 'FILLED') return false;
      if (fillFilter === 'vacant'  && p.fillStatus !== 'VACANT') return false;
      if (fillFilter === 'partial' && p.fillStatus !== 'PARTIALLY FILLED') return false;
      if (fillFilter === 'over'    && p.fillStatus !== 'OVER FILLED') return false;
      if (deptGroupFilter !== 'all' && p.effectiveDept.node?.deptGroup !== deptGroupFilter) return false;
      if (tempOnly && !p.appointment?.cat1718) return false;
      // Global needle: every whitespace-separated term must appear in some
      // string/numeric leaf on the Position record. Covers all the
      // previously-hardcoded fields (displayNumber, jobCode, dept name/code,
      // incumbent name) AND every other field — RTF status, roster, vice,
      // appointment.salaryStep, etc.
      if (!matchesNeedle(p, search)) return false;
      return true;
    });
  }, [positions, scopedJobCode, fillFilter, deptGroupFilter, tempOnly, search]);

  // Positions matching the scoped job code alone (ignoring the local fill /
  // dept / search filters) — drives the banner's class-title label and the
  // job-code-aware empty-state copy so "no match" can distinguish "no such
  // job code in this snapshot" from "hidden by the other active filters".
  const scopedMatches = useMemo(() => {
    if (!scopedJobCode) return null;
    const n = normJobCode(scopedJobCode);
    return positions.filter(p => normJobCode(p.jobCode ?? '') === n);
  }, [positions, scopedJobCode]);
  const scopedDescription =
    scopedMatches?.find(p => p.jobCodeDescription)?.jobCodeDescription ?? '';

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
  const selectedBudget = selected && latestBudget
    ? latestBudget.byPosition.get(selected.id) ?? null
    : null;
  // Additional pay for the people on the selected position: the incumbent and
  // any vice, each tagged with its role. Empty when the source isn't loaded or
  // nothing joined by emplId.
  const selectedAdditionalPay: PositionAdditionalPay[] = [];
  if (selected && additionalPayByEmplId) {
    const people: Array<{ role: 'Incumbent' | 'Vice'; emplId: string; name: string }> = [];
    if (selected.appointment?.emplId) {
      people.push({ role: 'Incumbent', emplId: selected.appointment.emplId, name: selected.appointment.name });
    }
    if (selected.vice1?.emplId) {
      people.push({ role: 'Vice', emplId: selected.vice1.emplId, name: selected.vice1.name });
    }
    for (const { role, emplId, name } of people) {
      for (const item of additionalPayByEmplId.get(emplId) ?? []) {
        selectedAdditionalPay.push({ role, personName: name || item.displayName, item });
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {selected && (
        <PositionDetail
          position={selected}
          additionalPay={selectedAdditionalPay}
          chartfields={selectedChartfields}
          ytdActuals={selectedYtd}
          ytdAsOfDate={latestPayroll?.asOfDate}
          budget={selectedBudget}
          budgetAsOfDate={latestBudget?.asOfDate}
          obiLoaded={obiLoaded}
          bfmLoaded={bfmLoaded}
          onClose={() => setSelectedId(null)}
          onViewPayroll={() => { setSelectedId(null); onViewPayroll?.(); }}
        />
      )}

      {/* Cross-tab scope banner — shown when filtered to a job code from the
          Eligibility tab. Mirrors the Labor view's "Scoped to" banner. */}
      {scopedJobCode && (
        <div className="card" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--accent-soft)', border: '1px solid var(--accent)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
            Filtered to job code:
          </span>
          <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
            {scopedJobCode}
          </span>
          {scopedDescription && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{scopedDescription}</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>· from Eligibility</span>
          <button
            onClick={clearScope}
            style={{
              marginLeft: 'auto', fontSize: 11, padding: '3px 10px',
              border: '1px solid var(--accent)', borderRadius: 12,
              background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Clear filter
          </button>
        </div>
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
          placeholder="Search any field (position #, job, name, dept, RTF, step, roster, vice…)"
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
                {...rowButtonProps(() => setSelectedId(p.id))}
                aria-label={`Open details for position ${p.displayNumber}`}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                  {p.displayNumber}
                  <CopyButton value={p.displayNumber} label="Position number" />
                </td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>
                  {p.jobCode}
                  {p.jobCode && <CopyButton value={p.jobCode} label="Job code" />}
                </td>
                <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                  {p.jobCodeDescription || <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {p.effectiveDept.code || '—'}
                  </span>
                  {p.effectiveDept.code && (
                    <CopyButton value={p.effectiveDept.code} label="Department code" />
                  )}
                  {p.effectiveDept.name && (
                    <span style={{ marginLeft: 6, color: 'var(--muted)', fontSize: 12 }}>
                      {p.effectiveDept.name}
                    </span>
                  )}
                </td>
                <td style={{ padding: '7px 12px' }}>{p.fte.toFixed(2)}</td>
                <td style={{ padding: '7px 12px' }}>
                  {p.fillStatus === 'FILLED'           && <Badge tone="success">Filled</Badge>}
                  {p.fillStatus === 'VACANT'           && <Badge color="var(--caution)" bg="#f4e8d4">Vacant</Badge>}
                  {p.fillStatus === 'PARTIALLY FILLED' && <Badge tone="accent">Partial</Badge>}
                  {p.fillStatus === 'OVER FILLED'      && <Badge tone="danger">Over</Badge>}
                  {!p.fillStatus                       && <span style={{ color: 'var(--muted)' }}>—</span>}
                  {' '}
                  {p.appointment?.cat1718 && <Badge color="#6b21a8" bg="#f3e8ff">{`Cat ${p.appointment.cat1718.category}`}</Badge>}
                  {hasDeptMismatch(p) && <Badge tone="caution">Dept ≠</Badge>}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  {p.appointment?.name
                    ? <>{p.appointment.name}<CopyButton value={p.appointment.name} label="Incumbent name" /></>
                    : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '7px 12px', color: 'var(--muted)', fontSize: 11 }}>
                  {p.userNotes ? '●' : ''}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {scopedJobCode && scopedMatches?.length === 0
                    ? `No positions in the loaded P&P snapshot have job code ${scopedJobCode}.`
                    : scopedJobCode
                      ? `No job-code ${scopedJobCode} positions match the other active filters.`
                      : 'No positions match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
