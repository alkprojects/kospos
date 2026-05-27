/**
 * Separations workspace — Tab 14 surface. Phase 2.2.i (2.2.26).
 *
 * The third leg of the vacancy-planning trio (Hiring Plan ⋈ Inactive ⋈
 * Separations). Tracks rumored / pending separations the user hears about
 * before they show up on Tab 24 Staffing Plan as a formal PlannedAction.
 *
 * Layout mirrors InactiveView + StaffingPlanView:
 *   - Summary header: total count + 4-status rollup chips
 *   - Add-separation form: employee name required, position cross-link optional
 *   - Filter bar: needle search + status-chip radiogroup
 *   - Table: name / position / status / confidence / expected date / reason
 *   - Detail modal opens on row click
 *
 * No upstream importer — KosPos is the system of record. Works even with
 * no P&P loaded (the position field is optional in v1).
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { buildPositions } from '../../positions';
import type { Position } from '../../positions';
import { DEFAULT_DEPT_TREE } from '../../reference/dept-tree';
import type { PsHcmPpRow } from '../../importers/types';
import { matchesNeedle } from '../../search/needle';
import {
  SEPARATION_STATUS_ORDER,
  rollupByStatus,
  useSeparations,
} from '../../separations';
import type {
  ConfidenceLevel,
  PendingSeparation,
  SeparationStatus,
} from '../../separations';
import { SeparationDetail } from './SeparationDetail';

// ---------------------------------------------------------------------------
// Display constants
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<SeparationStatus, string> = {
  'rumored':         'Rumored',
  'confirmed':       'Confirmed',
  'paperwork-filed': 'Paperwork filed',
  'cleared':         'Cleared',
};

const STATUS_COLOR: Record<SeparationStatus, [string, string]> = {
  // [text, background]
  'rumored':         ['#7a4b1a', '#fde68a'], // yellow — uncertain
  'confirmed':       ['#b35a00', '#fed7aa'], // orange — firming up
  'paperwork-filed': ['#1f5fbf', '#e7f0fb'], // blue   — in-flight
  'cleared':         ['#1a7a3c', '#d4f4e3'], // green  — done
};

const CONFIDENCE_COLOR: Record<ConfidenceLevel, [string, string]> = {
  'low':    ['#6b7280', '#f3f4f6'],
  'medium': ['#1f5fbf', '#e7f0fb'],
  'high':   ['#1a7a3c', '#d4f4e3'],
};

function StatusChip({ status }: { status: SeparationStatus }) {
  const [color, bg] = STATUS_COLOR[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '1px 7px', borderRadius: 10,
      color, background: bg, whiteSpace: 'nowrap',
    }}>{STATUS_LABEL[status]}</span>
  );
}

function ConfidenceChip({ confidence }: { confidence: ConfidenceLevel }) {
  const [color, bg] = CONFIDENCE_COLOR[confidence];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      padding: '1px 6px', borderRadius: 8,
      color, background: bg, whiteSpace: 'nowrap',
      textTransform: 'uppercase', letterSpacing: 0.3,
    }}>{confidence}</span>
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

// ---------------------------------------------------------------------------
// Add-separation form
// ---------------------------------------------------------------------------

/**
 * Inline form to add a new PendingSeparation. Only `employeeName` is
 * required; the rest of the fields can be filled later via the detail
 * editor. Datalist autocompletes position numbers from the loaded P&P.
 */
function AddSeparationForm({ positions }: { positions: Position[] }) {
  const addSeparation = useSeparations(s => s.addSeparation);
  const [employeeName, setEmployeeName] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const positionByDisplay = useMemo(
    () => new Map(positions.map(p => [p.displayNumber, p])),
    [positions],
  );

  function submit() {
    const name = employeeName.trim();
    if (name === '') {
      setError('Employee name is required.');
      return;
    }
    const matched = positionInput.trim()
      ? positionByDisplay.get(positionInput.trim())
      : undefined;
    addSeparation({
      employeeName: name,
      positionId: matched?.id ?? (positionInput.trim() || undefined),
      positionDisplayNumber: positionInput.trim() || undefined,
      jobCode: matched?.jobCode,
    });
    setEmployeeName('');
    setPositionInput('');
    setError(null);
  }

  return (
    <div className="card" style={{
      display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
    }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Employee name <span style={{ color: '#b91c1c' }}>*</span>
        </span>
        <input
          type="text"
          value={employeeName}
          onChange={e => setEmployeeName(e.target.value)}
          placeholder="e.g. Smith, A."
          aria-label="Employee name"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
            width: 220,
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Position # (optional)</span>
        <input
          type="search"
          list="separations-add-positions-datalist"
          value={positionInput}
          onChange={e => setPositionInput(e.target.value)}
          placeholder="e.g. 50001"
          aria-label="Position number"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'monospace',
            background: 'var(--surface)', color: 'inherit',
            width: 140,
          }}
        />
        <datalist id="separations-add-positions-datalist">
          {positions.map(p => (
            <option key={p.id} value={p.displayNumber}>{p.jobCode} — {p.jobCodeDescription}</option>
          ))}
        </datalist>
      </label>
      <button
        onClick={submit}
        style={{
          padding: '5px 16px', height: 30,
          border: '1px solid var(--accent)', borderRadius: 14,
          background: 'var(--accent)', color: '#fff', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        }}
      >
        Add separation
      </button>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        Status defaults to <strong>rumored</strong> · confidence to <strong>medium</strong> · edit details on the row
      </span>
      {error && (
        <div style={{
          flexBasis: '100%', fontSize: 12, color: '#7f1d1d',
          background: '#fecaca', border: '1px solid #dc2626', borderRadius: 4,
          padding: '4px 10px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | SeparationStatus;

export function SeparationsView() {
  const loadedRows = useAppStore(s => s.loadedRows);
  const separationsMap = useSeparations(s => s.separations);

  const positions = useMemo<Position[]>(() => {
    const ppRows = loadedRows.filter((r): r is PsHcmPpRow => r._source === 'ps-hcm-pp');
    if (ppRows.length === 0) return [];
    return buildPositions(ppRows, DEFAULT_DEPT_TREE);
  }, [loadedRows]);

  const positionsById = useMemo(
    () => new Map(positions.map(p => [p.id, p])),
    [positions],
  );

  const separations = useMemo<PendingSeparation[]>(
    () => [...separationsMap.values()].sort((a, b) =>
      // Newest first (additions tend to be the most-actionable).
      b.createdAt.localeCompare(a.createdAt),
    ),
    [separationsMap],
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let out = separations;
    if (statusFilter !== 'all') {
      out = out.filter(s => s.status === statusFilter);
    }
    if (search.trim() !== '') {
      out = out.filter(s => matchesNeedle(s, search));
    }
    return out;
  }, [separations, statusFilter, search]);

  const rollups = useMemo(() => rollupByStatus(separations), [separations]);

  const selectedSeparation = useMemo(
    () => selectedId ? separationsMap.get(selectedId) ?? null : null,
    [selectedId, separationsMap],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header */}
      <div className="card" style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Stat
          label="Pending separations"
          value={filtered.length.toLocaleString('en-US')}
          hint={filtered.length !== separations.length
            ? `of ${separations.length.toLocaleString('en-US')} total`
            : undefined}
        />
        {rollups.map(r => (
          <Stat
            key={r.status}
            label={STATUS_LABEL[r.status]}
            value={String(r.count)}
          />
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          {positions.length === 0
            ? 'No P&P loaded — position cross-link disabled'
            : `${positions.length.toLocaleString('en-US')} positions available for linking`}
        </div>
      </div>

      {/* Add form */}
      <AddSeparationForm positions={positions} />

      {/* Filter bar */}
      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search any field (name, position #, job code, reason, notes…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 260px',
            padding: '4px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
          aria-label="Search separations"
        />
        <div role="radiogroup" aria-label="Filter by status" style={{ display: 'flex', gap: 6 }}>
          {(['all', ...SEPARATION_STATUS_ORDER] as const).map(s => {
            const isActive = statusFilter === s;
            const count = s === 'all'
              ? separations.length
              : (rollups.find(r => r.status === s)?.count ?? 0);
            const label = s === 'all' ? `All · ${count}` : `${STATUS_LABEL[s]} · ${count}`;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
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
        {(search || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
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
              {['Employee', 'Position', 'Job', 'Status', 'Conf', 'Expected', 'Reason', 'Link'].map(h => (
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
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {separations.length === 0
                    ? 'No pending separations yet — add one above to start tracking rumored and pending separations.'
                    : 'No pending separations match the current filters.'}
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  aria-label={`Open details for separation ${s.employeeName}`}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <td style={{ padding: '5px 10px', fontWeight: 600 }}>
                    {s.employeeName}
                    {s.employeeId && (
                      <span style={{ marginLeft: 6, color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                        {s.employeeId}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>
                    {s.positionDisplayNumber || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {s.jobCode || <span style={{ color: 'var(--muted)' }}>—</span>}
                    {s.positionId && positionsById.get(s.positionId)?.jobCodeDescription && (
                      <span style={{ color: 'var(--muted)', fontFamily: 'inherit' }}>
                        {' '}{positionsById.get(s.positionId)!.jobCodeDescription}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '5px 10px' }}><StatusChip status={s.status} /></td>
                  <td style={{ padding: '5px 10px' }}><ConfidenceChip confidence={s.confidence} /></td>
                  <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {s.expectedSeparationDate || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '5px 10px', color: 'var(--muted)' }}>
                    {s.separationReason || <span>—</span>}
                  </td>
                  <td style={{ padding: '5px 10px' }}>
                    {s.linkedActionId
                      ? <span title={`Linked to PlannedAction ${s.linkedActionId}`} style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '1px 6px', borderRadius: 8,
                          color: '#6b21a8', background: '#f3e8ff',
                        }}>🔗 Linked</span>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selectedSeparation && (
        <SeparationDetail
          separation={selectedSeparation}
          positions={positions}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Track rumored and pending separations before they're formally entered as
        PlannedActions in the Hiring Plan. Link a row to a Hiring Plan Separation
        action via the detail editor — the link surfaces a reciprocal indicator on
        the Hiring Plan side. Rows are in-memory; persistence to IndexedDB lands in
        Phase 2.2.33 snapshots/. Session JSON save/load preserves the list across
        page reloads.
      </div>
    </div>
  );
}
