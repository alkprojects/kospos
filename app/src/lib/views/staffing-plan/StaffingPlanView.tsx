/**
 * Staffing Plan view — the Tab 24 Hiring Plan workspace. Phase 2.2.e PR 2.
 *
 * The forward-looking workspace KosPos exists to enable (vacancy planning is
 * "a major function of KosPos" per [memory staffing_plan_types.md]). Renders
 * one section per PlannedActionType (Active / Separations / Pending / TEMP
 * / Unfunded) with a summary header, the "X of Y priced ⚠" diagnostic
 * (Restated Q #12 default), and an inline "Add planned action" form that
 * seeds the store from the loaded P&P spine.
 *
 * v1 scope intentionally narrow:
 *   - Read + delete + add-with-defaults
 *   - Live cost projection via `computeExpectedCost` (COLA-aware)
 *   - No status workflow UI (planned → posted → ... transitions land in v2
 *     once Alex's review confirms the transition guardrails per Tab 24 §
 *     Improvement #4 — state machine with RBAC)
 *   - No detailed PlannedAction editor — that's the v2 detail page; this
 *     view is the list overview only
 *   - No history view — the audit log is logged by the store but not yet
 *     surfaced (queued for the diff PR)
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { buildPositions } from '../../positions';
import type { Position } from '../../positions';
import { DEFAULT_DEPT_TREE } from '../../reference/dept-tree';
import type { PsHcmPpRow } from '../../importers/types';
import {
  ACTION_TYPE_ORDER,
  actionsForPosition,
  computeExpectedCost,
  netCostImpact,
  pricingDiagnostic,
  rollupByType,
  useStaffingPlan,
} from '../../staffing-plan';
import type {
  PlannedAction,
  PlannedActionType,
} from '../../staffing-plan';

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });
}

function fmtSignedMoney(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return sign + fmtMoney(Math.abs(n));
}

/** Plain-English label for each PlannedActionType. */
const TYPE_LABELS: Record<PlannedActionType, string> = {
  'active-hire':   'Active',
  'separation':    'Separations',
  'pending':       'Pending',
  'temp-tracking': 'TEMP',
  'unfunded':      'Unfunded',
};

/** Type-keyed color for the section header badge. Matches the Cat 17/18
 *  palette used elsewhere so the visual language stays consistent. */
const TYPE_COLORS: Record<PlannedActionType, { fg: string; bg: string }> = {
  'active-hire':   { fg: '#1a7a3c', bg: '#d4f4e3' }, // green — gains
  'separation':    { fg: '#7f1d1d', bg: '#fecaca' }, // red   — losses
  'pending':       { fg: '#1f5fbf', bg: '#e7f0fb' }, // blue  — paused
  'temp-tracking': { fg: '#6b21a8', bg: '#f3e8ff' }, // purple — temp
  'unfunded':      { fg: '#7a4b1a', bg: '#fde68a' }, // yellow — caution
};

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

/**
 * Single-row in a section's table. Cost is computed live; unpriced rows
 * show a "—" + small unpriced badge.
 */
function ActionRow({ action, position, onDelete }: {
  action: PlannedAction;
  position: Position | undefined;
  onDelete: () => void;
}) {
  const cost = computeExpectedCost(action);
  const jobLabel = position
    ? `${position.jobCode}${position.jobCodeDescription ? ' ' + position.jobCodeDescription : ''}`
    : '—';

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
        {action.displayNumber}
      </td>
      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
        {jobLabel}
      </td>
      <td style={{ padding: '6px 10px', fontSize: 11 }}>
        {action.status ?? <span style={{ color: 'var(--muted)' }}>—</span>}
      </td>
      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>
        {action.startPpe || <span style={{ color: 'var(--muted)' }}>—</span>}
      </td>
      <td style={{ padding: '6px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
        {cost ? fmtSignedMoney(cost.annual) : (
          <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>unpriced</span>
        )}
      </td>
      <td style={{ padding: '6px 10px', fontSize: 12, color: 'var(--muted)', maxWidth: 260 }}>
        {action.notes || <span>—</span>}
      </td>
      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
        <button
          onClick={onDelete}
          aria-label={`Delete action for position ${action.displayNumber}`}
          style={{
            border: '1px solid var(--border)', borderRadius: 12,
            background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
            fontSize: 10, padding: '2px 8px', fontFamily: 'inherit',
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

/**
 * One section block — header + table + empty state. Mirrors the 5-section
 * stack from Tab 24 but with the position-id duplication eliminated (multi-
 * action positions render once per action with the same positionId visible).
 */
function Section({ type, actions, positionsById, onDelete }: {
  type: PlannedActionType;
  actions: PlannedAction[];
  positionsById: Map<string, Position>;
  onDelete: (id: string) => void;
}) {
  const sectionActions = actions.filter(a => a.type === type);
  const color = TYPE_COLORS[type];
  const diag = pricingDiagnostic(sectionActions);
  const sectionCost = sectionActions.reduce<number>((acc, a) => {
    const c = computeExpectedCost(a);
    return c ? acc + c.annual : acc;
  }, 0);

  return (
    <section className="card" style={{ padding: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: sectionActions.length > 0 ? '1px solid var(--border)' : 'none',
      }}>
        {badge(`${TYPE_LABELS[type]} · ${sectionActions.length}`, color.fg, color.bg)}
        {diag.unpriced > 0 && (
          <span style={{ fontSize: 11, color: '#7a4b1a' }} title="Actions without a cost basis aren't summed into the section total.">
            ⚠ {diag.priced} of {diag.total} priced
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
          {sectionCost !== 0 ? fmtSignedMoney(sectionCost) : <span style={{ color: 'var(--muted)' }}>—</span>}
        </span>
      </div>
      {sectionActions.length === 0 ? (
        <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
          No {TYPE_LABELS[type].toLowerCase()} actions yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--accent-soft)' }}>
                {['Position #', 'Job', 'Status', 'Start PPE', 'Annual', 'Notes', ''].map(h => (
                  <th key={h} style={{
                    padding: '7px 10px',
                    textAlign: h === 'Annual' || h === '' ? 'right' : 'left',
                    fontWeight: 600, fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    color: 'var(--accent)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectionActions.map(a => (
                <ActionRow
                  key={a.id}
                  action={a}
                  position={positionsById.get(a.positionId)}
                  onDelete={() => onDelete(a.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Minimal inline "Add planned action" form. Mirrors the workbook's
 * row-insertion pattern: pick a position, pick a Type, optionally set
 * Status + Notes, click Add. Cost basis isn't editable here — the v2
 * detail editor will expose the full CostInput; v1 actions start unpriced
 * and surface in the "X of Y priced ⚠" chip so Alex can prioritize.
 */
function AddActionForm({ positions }: { positions: Position[] }) {
  const addAction = useStaffingPlan(s => s.addAction);
  const [positionInput, setPositionInput] = useState('');
  const [type, setType] = useState<PlannedActionType>('active-hire');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const positionsByDisplay = useMemo(() => {
    return new Map(positions.map(p => [p.displayNumber, p]));
  }, [positions]);

  function submit() {
    const match = positionsByDisplay.get(positionInput.trim());
    if (!match) {
      setError(`Position "${positionInput}" not in the loaded P&P snapshot.`);
      return;
    }
    addAction({
      positionId: match.id,
      displayNumber: match.displayNumber,
      type,
      notes: notes.trim(),
    });
    setPositionInput('');
    setNotes('');
    setError(null);
  }

  return (
    <div className="card" style={{
      display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
    }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Position #</span>
        <input
          type="search"
          list="staffing-plan-positions-datalist"
          placeholder="e.g. 50001"
          value={positionInput}
          onChange={e => setPositionInput(e.target.value)}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'monospace',
            background: 'var(--surface)', color: 'inherit',
            width: 140,
          }}
        />
        <datalist id="staffing-plan-positions-datalist">
          {/* All positions — browsers handle the long list. The 200-cap from
              the initial PR truncated positions whose displayNumber sorted
              after the 200th, hiding common cases (Alex flagged 1115135). */}
          {positions.map(p => (
            <option key={p.id} value={p.displayNumber}>{p.jobCode} — {p.jobCodeDescription}</option>
          ))}
        </datalist>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Type</span>
        <select
          value={type}
          onChange={e => setType(e.target.value as PlannedActionType)}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        >
          {ACTION_TYPE_ORDER.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Notes (optional)</span>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="The why — context the data can't capture"
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        />
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
        Add
      </button>
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

export function StaffingPlanView() {
  const loadedRows = useAppStore(s => s.loadedRows);
  const actionsMap = useStaffingPlan(s => s.actions);
  const deleteAction = useStaffingPlan(s => s.deleteAction);

  const positions = useMemo<Position[]>(() => {
    const ppRows = loadedRows.filter((r): r is PsHcmPpRow => r._source === 'ps-hcm-pp');
    if (ppRows.length === 0) return [];
    return buildPositions(ppRows, DEFAULT_DEPT_TREE);
  }, [loadedRows]);

  const positionsById = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);

  // Convert the store's Map to an array — useMemo over the size so React
  // re-derives when actions are added/removed without re-running on every
  // unrelated app-store update.
  const actions = useMemo(() => [...actionsMap.values()], [actionsMap]);

  const rollups   = useMemo(() => rollupByType(actions), [actions]);
  const net       = useMemo(() => netCostImpact(actions), [actions]);
  const diag      = useMemo(() => pricingDiagnostic(actions), [actions]);

  if (positions.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          No positions loaded
        </div>
        <div style={{ fontSize: 13 }}>
          Load a PS HCM P&amp;P snapshot via <strong>Load Reports</strong> to start
          planning hires + separations against real positions.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header */}
      <div className="card" style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Stat label="Actions" value={String(actions.length)}
              hint={diag.unpriced > 0 ? `${diag.priced} priced · ${diag.unpriced} unpriced` : undefined} />
        {rollups.map(r => (
          <Stat
            key={r.type}
            label={TYPE_LABELS[r.type]}
            value={String(r.count)}
            hint={r.annualCost !== 0 ? fmtSignedMoney(r.annualCost) : undefined}
          />
        ))}
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Net cost impact
          </div>
          <div style={{
            fontSize: 22, fontWeight: 700, fontFamily: 'monospace',
            color: net.annual > 0 ? '#7f1d1d' : net.annual < 0 ? '#1a7a3c' : 'var(--muted)',
          }}>
            {net.annual !== 0 ? fmtSignedMoney(net.annual) : '$0'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            COLA-aware annualized
          </div>
        </div>
      </div>

      {/* Add form */}
      <AddActionForm positions={positions} />

      {/* 5 sections */}
      {ACTION_TYPE_ORDER.map(t => (
        <Section
          key={t}
          type={t}
          actions={actions}
          positionsById={positionsById}
          onDelete={deleteAction}
        />
      ))}

      {/* Footer */}
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Planning workspace · {actions.length} action{actions.length === 1 ? '' : 's'} across {positions.length} positions
        {' · '}
        <span title="Each PlannedAction's expectedCost is computed live via lib/cost.ts — COLA-aware, COLA-weighted across the FY horizon (per memory feedback_projections_always_cola_aware.md).">
          live COLA-aware projection
        </span>
        {' · '}
        Actions are in-memory; persistence to IndexedDB lands in Phase 2.2.33 snapshots/.
      </div>

      {/* Hidden datum reused for testing: a position-grouped sanity readout */}
      {actions.length > 0 && (
        <details style={{ fontSize: 11, color: 'var(--muted)' }}>
          <summary style={{ cursor: 'pointer' }}>Multi-action positions (Marco Jacobo pattern)</summary>
          <ul style={{ marginTop: 6 }}>
            {[...new Set(actions.map(a => a.positionId))]
              .map(pid => ({ pid, slice: actionsForPosition(actions, pid) }))
              .filter(x => x.slice.length > 1)
              .map(({ pid, slice }) => (
                <li key={pid}>
                  Position{' '}
                  <span style={{ fontFamily: 'monospace' }}>
                    {positionsById.get(pid)?.displayNumber ?? pid}
                  </span>
                  {' · '}{slice.length} actions: {slice.map(a => TYPE_LABELS[a.type]).join(' + ')}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}
