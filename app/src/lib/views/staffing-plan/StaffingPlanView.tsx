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
  computeDerivedActions,
  computeExpectedCost,
  computeOmittedDerivedActions,
  netCostImpact,
  pricingDiagnostic,
  rollupByType,
  useStaffingPlan,
} from '../../staffing-plan';
import type {
  DerivedAction,
  PlannedAction,
  PlannedActionType,
  UnifiedAction,
} from '../../staffing-plan';
import { useSeparations } from '../../separations';
import { PlannedActionDetail } from './PlannedActionDetail';
import { matchesNeedle } from '../../search/needle';
import { Badge, CopyButton, rowButtonProps } from '../../ui';
import { fmtSignedMoney } from '../../format';

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
  'active-hire':   { fg: 'var(--success)', bg: 'var(--success-soft)' }, // green — gains
  'separation':    { fg: 'var(--danger)', bg: 'var(--danger-soft)' }, // red   — losses
  'pending':       { fg: 'var(--accent)', bg: 'var(--accent-soft)' }, // blue  — paused
  'temp-tracking': { fg: '#6b21a8', bg: '#f3e8ff' }, // purple — temp
  'unfunded':      { fg: 'var(--caution)', bg: 'var(--caution-soft)' }, // yellow — caution
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

/**
 * Single-row in a section's table. Cost is computed live; unpriced rows
 * show a "—" + small unpriced badge.
 *
 * Manual vs derived dispatch:
 *   - source === 'manual' → "Delete" button (removes the PlannedAction)
 *   - source === 'derived' → "Hide" button (adds to derivedRemoved); the
 *     row displays a small auto-chip badge so the user can tell at a glance
 *     this isn't something they typed.
 */
function ActionRow({ action, position, linkedSeparationCount, onDelete, onHide, onOpen }: {
  action: UnifiedAction;
  position: Position | undefined;
  /** Number of PendingSeparation rows whose `linkedActionId` matches this
   *  action. > 0 → render the "Tracked in Separations" chip per Phase 2.2.i
   *  cross-link design. */
  linkedSeparationCount: number;
  onDelete: (id: string) => void;
  onHide: (positionId: string) => void;
  onOpen: (action: UnifiedAction) => void;
}) {
  const cost = computeExpectedCost(action);
  const jobLabel = position
    ? `${position.jobCode}${position.jobCodeDescription ? ' ' + position.jobCodeDescription : ''}`
    : '—';
  const isDerived = action.source === 'derived';

  // Row click → open detail editor. Clicks on per-row action buttons stop
  // propagation so Hide / Delete don't also fire the detail open.
  return (
    <tr
      {...rowButtonProps(() => onOpen(action))}
      style={{
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}
      aria-label={`Open details for position ${action.displayNumber}`}
    >
      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
        {action.displayNumber}
        <CopyButton value={action.displayNumber} label="Position number" />
        {isDerived && (
          <span title="Auto-populated from P&P data — Hide to suppress" style={{
            marginLeft: 6,
            fontSize: 9, fontWeight: 600,
            padding: '1px 5px', borderRadius: 8,
            color: '#6b21a8', background: '#f3e8ff',
            textTransform: 'uppercase', letterSpacing: 0.3,
          }}>auto</span>
        )}
      </td>
      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
        {jobLabel}
      </td>
      <td style={{ padding: '6px 10px', fontSize: 11 }}>
        {isDerived
          ? <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>{action.derivedReason}</span>
          : (action.status ?? <span style={{ color: 'var(--muted)' }}>—</span>)}
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
        {linkedSeparationCount > 0 && (
          <span
            title={`${linkedSeparationCount} pending separation${linkedSeparationCount === 1 ? '' : 's'} linked to this row — open the Separations tab to manage.`}
            style={{
              marginLeft: 6,
              fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 8,
              color: '#6b21a8', background: '#f3e8ff',
              whiteSpace: 'nowrap',
            }}
          >
            🔗 Tracked in Separations
          </span>
        )}
      </td>
      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
        {isDerived ? (
          <button
            onClick={e => { e.stopPropagation(); onHide(action.positionId); }}
            aria-label={`Hide auto-populated row for position ${action.displayNumber}`}
            title="Hide this auto-populated row. It will reappear in the Manual user changes section below."
            style={{
              border: '1px solid var(--border)', borderRadius: 12,
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
              fontSize: 10, padding: '2px 8px', fontFamily: 'inherit',
            }}
          >
            Hide
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onDelete(action.id); }}
            aria-label={`Delete action for position ${action.displayNumber}`}
            style={{
              border: '1px solid var(--border)', borderRadius: 12,
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
              fontSize: 10, padding: '2px 8px', fontFamily: 'inherit',
            }}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

/**
 * One section block — header + table + empty state. Mirrors the 5-section
 * stack from Tab 24 but with the position-id duplication eliminated (multi-
 * action positions render once per action with the same positionId visible).
 *
 * Accepts UnifiedAction (manual + derived mixed); the row renderer dispatches
 * on `source` for the Hide vs Delete button.
 */
function Section({ type, actions, positionsById, linkedSeparationCounts, onDelete, onHide, onOpen }: {
  type: PlannedActionType;
  actions: UnifiedAction[];
  positionsById: Map<string, Position>;
  /** Map of action id → count of PendingSeparation rows linking back to it. */
  linkedSeparationCounts: Map<string, number>;
  onDelete: (id: string) => void;
  onHide: (positionId: string) => void;
  onOpen: (action: UnifiedAction) => void;
}) {
  const sectionActions = actions.filter(a => a.type === type);
  const color = TYPE_COLORS[type];
  const diag = pricingDiagnostic(sectionActions);
  const derivedCount = sectionActions.filter(a => a.source === 'derived').length;
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
        <Badge color={color.fg} bg={color.bg}>{`${TYPE_LABELS[type]} · ${sectionActions.length}`}</Badge>
        {derivedCount > 0 && (
          <span title="Derived rows are auto-populated from the P&P data — Pending = vacant + no manual plan; TEMP = Cat 17/18 + no manual plan. Hide a row to suppress it; it'll move to the Manual user changes section below." style={{
            fontSize: 11, color: '#6b21a8',
          }}>
            {derivedCount} auto
          </span>
        )}
        {diag.unpriced > 0 && (
          <span style={{ fontSize: 11, color: 'var(--caution)' }} title="Actions without a cost basis aren't summed into the section total.">
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
                  linkedSeparationCount={linkedSeparationCounts.get(a.id) ?? 0}
                  onDelete={onDelete}
                  onHide={onHide}
                  onOpen={onOpen}
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
 * "Manual user changes" section — derived rows the user explicitly hid via
 * the Hide button. Shown below the 5 main sections so the workspace stays
 * clean while keeping the omissions visible + reversible.
 *
 * Auto-pruned at view time when the derive rule no longer fires (e.g. a
 * previously-vacant position got filled): the omission row vanishes from
 * this section but stays in the store, so re-introducing the rule trigger
 * preserves the user's hide intent.
 */
function ManualOmissionsSection({ omissions, positionsById, onRestore }: {
  omissions: DerivedAction[];
  positionsById: Map<string, Position>;
  onRestore: (positionId: string) => void;
}) {
  if (omissions.length === 0) return null;
  return (
    <section className="card" style={{ padding: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Badge color="#444" bg="#e7e7e7">{`Manual user changes · ${omissions.length}`}</Badge>
        <span style={{ fontSize: 11, color: 'var(--muted)' }} title="Auto-populated rows you hid. Restore brings them back into their auto-derived section (Pending or TEMP).">
          Hidden auto rows — Restore to bring back
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)' }}>
              {['Position #', 'Job', 'Reason', 'Would be', ''].map(h => (
                <th key={h} style={{
                  padding: '7px 10px',
                  textAlign: h === '' ? 'right' : 'left',
                  fontWeight: 600, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  color: 'var(--accent)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {omissions.map(o => {
              const p = positionsById.get(o.positionId);
              const jobLabel = p
                ? `${p.jobCode}${p.jobCodeDescription ? ' ' + p.jobCodeDescription : ''}`
                : '—';
              const color = TYPE_COLORS[o.type];
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {o.displayNumber}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {jobLabel}
                  </td>
                  <td style={{ padding: '6px 10px', fontStyle: 'italic', color: 'var(--muted)' }}>
                    {o.derivedReason}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <Badge color={color.fg} bg={color.bg}>{TYPE_LABELS[o.type]}</Badge>
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    <button
                      onClick={() => onRestore(o.positionId)}
                      aria-label={`Restore auto-populated row for position ${o.displayNumber}`}
                      style={{
                        border: '1px solid var(--accent)', borderRadius: 12,
                        background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
                        fontSize: 10, padding: '2px 10px', fontFamily: 'inherit',
                      }}
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
          flexBasis: '100%', fontSize: 12, color: 'var(--danger)',
          background: 'var(--danger-soft)', border: '1px solid #dc2626', borderRadius: 4,
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
  const hideDerivedAction = useStaffingPlan(s => s.hideDerivedAction);
  const restoreDerivedAction = useStaffingPlan(s => s.restoreDerivedAction);
  const derivedRemoved = useStaffingPlan(s => s.derivedRemoved);
  const separationsMap = useSeparations(s => s.separations);

  // Row-click → open PlannedActionDetail modal. State carries the action's
  // id (manual) or `derived-${positionId}` (derived). When the underlying
  // action disappears from the actions/derived list (e.g. user deletes it),
  // the modal auto-closes via `selectedAction === undefined`.
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  // Global needle search across all action fields + the underlying position
  // (so the user can search by job code / incumbent name / dept even though
  // those live on the Position, not the PlannedAction).
  const [search, setSearch] = useState('');

  const positions = useMemo<Position[]>(() => {
    const ppRows = loadedRows.filter((r): r is PsHcmPpRow => r._source === 'ps-hcm-pp');
    if (ppRows.length === 0) return [];
    return buildPositions(ppRows, DEFAULT_DEPT_TREE);
  }, [loadedRows]);

  const positionsById = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);

  // Manual actions (stored). Convert the store's Map to an array — useMemo
  // over the size so React re-derives when actions are added/removed.
  const manualActions = useMemo<PlannedAction[]>(
    () => [...actionsMap.values()],
    [actionsMap],
  );
  const manualPositionIds = useMemo(
    () => new Set(manualActions.map(a => a.positionId)),
    [manualActions],
  );

  // Derived actions (virtual — computed at view time per Bug 3 S29 design).
  const derivedActions = useMemo(
    () => computeDerivedActions(positions, manualPositionIds, derivedRemoved),
    [positions, manualPositionIds, derivedRemoved],
  );
  const omittedDerived = useMemo(
    () => computeOmittedDerivedActions(positions, manualPositionIds, derivedRemoved),
    [positions, manualPositionIds, derivedRemoved],
  );

  // Unified array for rendering. Manual rows get a `source: 'manual'` tag
  // so the Section + ActionRow components can dispatch on it.
  const allActions = useMemo<UnifiedAction[]>(
    () => [
      ...manualActions.map(a => ({ ...a, source: 'manual' as const })),
      ...derivedActions,
    ],
    [manualActions, derivedActions],
  );

  // Apply the search needle across both the action itself + the underlying
  // position record, so the user can find rows by job code / dept / incumbent
  // name even though those fields live on Position, not PlannedAction.
  const actions = useMemo<UnifiedAction[]>(() => {
    if (search.trim() === '') return allActions;
    return allActions.filter(a => {
      const p = positionsById.get(a.positionId);
      return matchesNeedle({ action: a, position: p }, search);
    });
  }, [allActions, positionsById, search]);

  const rollups   = useMemo(() => rollupByType(actions), [actions]);
  const net       = useMemo(() => netCostImpact(actions), [actions]);
  const diag      = useMemo(() => pricingDiagnostic(actions), [actions]);

  // Cross-link count: how many PendingSeparation rows link back to each
  // PlannedAction.id? Drives the "Tracked in Separations" indicator on
  // Separation-section rows (Phase 2.2.i cross-link design). Map computed
  // once per separationsMap change to avoid per-row scans during render.
  const linkedSeparationCounts = useMemo<Map<string, number>>(() => {
    const out = new Map<string, number>();
    for (const sep of separationsMap.values()) {
      if (!sep.linkedActionId) continue;
      out.set(sep.linkedActionId, (out.get(sep.linkedActionId) ?? 0) + 1);
    }
    return out;
  }, [separationsMap]);

  /** The action currently being edited in the detail modal, if any. Looked
   *  up off the unified actions array so the same selection survives across
   *  store updates (e.g. saving a derived-to-manual conversion preserves
   *  the underlying positionId; the new manual replaces the derived row in
   *  the list, and the modal closes on save). */
  const selectedAction = useMemo<UnifiedAction | undefined>(() => {
    if (!selectedActionId) return undefined;
    return actions.find(a => a.id === selectedActionId);
  }, [actions, selectedActionId]);

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
            color: net.annual > 0 ? 'var(--danger)' : net.annual < 0 ? 'var(--success)' : 'var(--muted)',
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

      {/* Search */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="search"
          placeholder="Search any field (position #, job code, name, dept, notes, status, hold reason…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 auto',
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
          aria-label="Search planned actions"
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
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
        <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {search.trim()
            ? `${actions.length} of ${allActions.length} match`
            : `${actions.length} action${actions.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* 5 sections */}
      {ACTION_TYPE_ORDER.map(t => (
        <Section
          key={t}
          type={t}
          actions={actions}
          positionsById={positionsById}
          linkedSeparationCounts={linkedSeparationCounts}
          onDelete={deleteAction}
          onHide={hideDerivedAction}
          onOpen={a => setSelectedActionId(a.id)}
        />
      ))}

      {/* Manual user changes — derived rows the user explicitly hid */}
      <ManualOmissionsSection
        omissions={omittedDerived}
        positionsById={positionsById}
        onRestore={restoreDerivedAction}
      />

      {/* Footer */}
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Planning workspace · {actions.length} action{actions.length === 1 ? '' : 's'}
        {' '}({manualActions.length} manual · {derivedActions.length} auto-derived)
        {omittedDerived.length > 0 && ` · ${omittedDerived.length} hidden`}
        {' · '}{positions.length} positions
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

      {/* Detail editor modal — open when a row is clicked. */}
      {selectedAction && (
        <PlannedActionDetail
          action={selectedAction}
          position={positionsById.get(selectedAction.positionId)}
          onClose={() => setSelectedActionId(null)}
        />
      )}
    </div>
  );
}
