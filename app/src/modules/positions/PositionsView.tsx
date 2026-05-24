import { useMemo, useState } from 'react';
import { useAppStore } from '../../lib/store';
import { resolvePositionChartfields } from '../../lib/chartfields/resolve';
import type { ResolvedChartfields } from '../../lib/chartfields/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

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

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

function PositionDetail({ pos, onClose }: { pos: ResolvedChartfields; onClose: () => void }) {
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
          maxWidth: 560,
          width: '90vw',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>Position {pos.positionNumber}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{pos.jobCodeDescription || pos.jobCode}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{pos.departmentName || pos.departmentCode}</div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--muted)', padding: '0 4px',
          }}>✕</button>
        </div>

        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Posting Chartfields
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {[
                ['Fund',      pos.fund],
                ['Dept',      pos.departmentCode],
                ['Authority', pos.authority],
                ['Project',   pos.project],
                ['Activity',  pos.activity],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 0', color: 'var(--muted)', width: 100 }}>{label}</td>
                  <td style={{ padding: '5px 0', fontFamily: 'monospace', fontWeight: 600 }}>
                    {value || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {pos.hasComboOverride && (
          <div style={{
            background: '#fffbea',
            border: '1px solid #f0c020',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            marginBottom: 16,
          }}>
            <strong>Combo Code override:</strong> {pos.comboCodeOverride}
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>
              This position's Fund / Dept / Authority will post to the combo code definition instead of the BFM defaults. Load a Combo Codes reference file to expand this.
            </div>
          </div>
        )}

        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Position Info
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {[
                ['Job Code',   pos.jobCode],
                ['FTE',        pos.fte.toFixed(2)],
                ['Status',     pos.positionStatus],
                ['Fill',       pos.fillStatus || '—'],
                ['YTD Actuals', pos.ytdActuals !== 0 ? fmt(pos.ytdActuals) : '—'],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 0', color: 'var(--muted)', width: 100 }}>{label}</td>
                  <td style={{ padding: '5px 0' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Sources: {pos.dataSources.join(', ')}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

type FillFilter = 'all' | 'filled' | 'vacant';
type SourceFilter = 'all' | 'bfm' | 'hcm' | 'matched';

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function PositionsView() {
  const loadedRows = useAppStore(s => s.loadedRows);
  const [selected, setSelected] = useState<ResolvedChartfields | null>(null);
  const [fillFilter, setFillFilter] = useState<FillFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [comboOnly, setComboOnly] = useState(false);
  const [search, setSearch] = useState('');

  const resolved = useMemo(() => resolvePositionChartfields(loadedRows), [loadedRows]);

  const filtered = useMemo(() => {
    return resolved.filter(r => {
      if (fillFilter === 'filled' && r.fillStatus !== 'FILLED') return false;
      if (fillFilter === 'vacant' && r.fillStatus !== 'VACANT') return false;
      if (sourceFilter === 'bfm'     && !r.dataSources.includes('bfm')) return false;
      if (sourceFilter === 'hcm'     && !r.dataSources.includes('hcm')) return false;
      if (sourceFilter === 'matched' && !(r.dataSources.includes('bfm') && r.dataSources.includes('hcm'))) return false;
      if (comboOnly && !r.hasComboOverride) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.positionNumber.toLowerCase().includes(q) &&
          !r.jobCode.toLowerCase().includes(q) &&
          !r.jobCodeDescription.toLowerCase().includes(q) &&
          !r.departmentName.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [resolved, fillFilter, sourceFilter, comboOnly, search]);

  const ytdTotal = useMemo(() => filtered.reduce((s, r) => s + r.ytdActuals, 0), [filtered]);

  if (loadedRows.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        No data loaded. Go to <strong>Load Reports</strong> and import a BFM Position eturn or PS HCM P&amp;P file.
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        Loaded data contains no position rows. Import a BFM Position eturn or PS HCM P&amp;P file.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {selected && <PositionDetail pos={selected} onClose={() => setSelected(null)} />}

      {/* Summary bar */}
      <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <Stat label="Positions" value={String(resolved.length)} />
        <Stat label="Shown" value={String(filtered.length)} />
        <Stat label="Combo overrides" value={String(resolved.filter(r => r.hasComboOverride).length)} />
        <Stat label="YTD actuals (shown)" value={ytdTotal !== 0 ? fmt(ytdTotal) : '—'} />
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search position #, job code, name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 200px',
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
            { value: 'all',    label: 'All' },
            { value: 'filled', label: 'Filled' },
            { value: 'vacant', label: 'Vacant' },
          ]}
          onChange={v => setFillFilter(v as FillFilter)}
        />
        <FilterGroup
          label="Source"
          value={sourceFilter}
          options={[
            { value: 'all',     label: 'All' },
            { value: 'matched', label: 'BFM + HCM' },
            { value: 'bfm',     label: 'BFM only' },
            { value: 'hcm',     label: 'HCM only' },
          ]}
          onChange={v => setSourceFilter(v as SourceFilter)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={comboOnly} onChange={e => setComboOnly(e.target.checked)} />
          Combo overrides only
        </label>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
              {['Position #', 'Job Code', 'Description', 'Fund', 'Auth', 'Proj', 'Act', 'FTE', 'Fill', 'YTD Actuals', ''].map(h => (
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
            {filtered.map(r => (
              <tr
                key={r.positionNumber}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setSelected(r)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{r.positionNumber}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{r.jobCode}</td>
                <td style={{ padding: '7px 12px' }}>{r.jobCodeDescription || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{r.fund || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{r.authority || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{r.project || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{r.activity || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                <td style={{ padding: '7px 12px' }}>{r.fte}</td>
                <td style={{ padding: '7px 12px' }}>
                  {r.fillStatus === 'FILLED'  && badge('Filled',  '#1a7a3c', '#d4f4e3')}
                  {r.fillStatus === 'VACANT'  && badge('Vacant',  '#7a4b1a', '#f4e8d4')}
                  {!r.fillStatus              && <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                  {r.ytdActuals !== 0 ? fmt(r.ytdActuals) : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  {r.hasComboOverride && badge('Combo', '#6b21a8', '#f3e8ff')}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
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

// ---------------------------------------------------------------------------
// Small helper components
// ---------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
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
