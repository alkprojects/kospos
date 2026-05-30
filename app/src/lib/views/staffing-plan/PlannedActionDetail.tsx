/**
 * PlannedActionDetail — full editor for one PlannedAction. Opens as a modal
 * over the Staffing Plan workspace when the user clicks a row.
 *
 * Edit mode: receives a manual `PlannedAction` from the store. Save calls
 * `updateAction(id, patch)` with the diff; the store's history-diffing logic
 * appends one audit entry per changed field.
 *
 * Convert mode: receives a `DerivedAction` (virtual row). The editor seeds
 * its draft state from the derive-spec + `defaultBasisForPosition` of the
 * underlying position. Save calls `addAction(...)`, materializing the
 * derived row as a manual action.
 *
 * Status workflow: dropdown of all `HiringStatus` values. The
 * `isAllowedStatusTransition` guard from build.ts gates the dropdown — when
 * the picked target is not allowed, a "Force override (logged)" checkbox
 * appears; saving with override checked records an audit entry via the
 * normal updateAction diff path (the guard isn't enforced at the store
 * layer — UI-only — keeping the store free of policy).
 *
 * Delta-pay view: when the position has an incumbent and the basis is
 * complete enough to price, renders three stats — incumbent / planned /
 * delta. Powers the "separation of PCS at Step 5 → backfill TX at Step 1"
 * sensitivity reference per the S30 CostInput-scope pick.
 */

import { useEffect, useMemo, useState } from 'react';
import { Modal, ModalFooter, CloseButton, inputStyle } from '../../ui';
import type { CostInput } from '../../cost';
import type { Position } from '../../positions';
import type {
  ActionMode,
  DerivedAction,
  HiringStatus,
  PlannedAction,
  PlannedActionType,
  SeparationConfidence,
  UnifiedAction,
} from '../../staffing-plan';
import {
  ACTION_TYPE_ORDER,
  DEFAULT_FY,
  defaultBasisForPosition,
  deltaCost,
  isAllowedStatusTransition,
  isCostInputComplete,
  useStaffingPlan,
} from '../../staffing-plan';
import { CostInputEditor } from './CostInputEditor';
import { fmtMoney, fmtSignedMoney } from '../../format';

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<PlannedActionType, string> = {
  'active-hire':   'Active',
  'separation':    'Separations',
  'pending':       'Pending',
  'temp-tracking': 'TEMP',
  'unfunded':      'Unfunded',
};

const STATUS_ORDER: HiringStatus[] = [
  'not-started',
  'posted',
  'list',
  'exam',
  'interviews',
  'offer',
  'final',
  'csc-hold',
  'finished',
];

const ACTION_MODES: ActionMode[] = ['backfill', 'new-growth', 'temp-conversion', 'transfer'];
const SEPARATION_CONFIDENCES: SeparationConfidence[] = [
  'rumored', 'confirmed', 'paperwork-filed',
];

// ---------------------------------------------------------------------------
// Draft state — the shape the editor mutates locally before Save
// ---------------------------------------------------------------------------

interface DraftState {
  type: PlannedActionType;
  status: HiringStatus | null;
  actionMode?: ActionMode;
  separationConfidence?: SeparationConfidence;
  startPpe: string;
  notes: string;
  holdReason: string;
  basis: Partial<CostInput>;
}

/**
 * Initialize editor draft from an existing manual action.
 */
function draftFromManual(a: PlannedAction): DraftState {
  return {
    type: a.type,
    status: a.status,
    actionMode: a.actionMode,
    separationConfidence: a.separationConfidence,
    startPpe: a.startPpe ?? '',
    notes: a.notes ?? '',
    holdReason: a.holdReason ?? '',
    basis: a.basis ? { ...a.basis } : {},
  };
}

/**
 * Initialize editor draft from a derived (virtual) row. Pre-fills basis from
 * the position so the user can immediately see step/range options without
 * re-typing the job code.
 */
function draftFromDerived(d: DerivedAction, position: Position | undefined): DraftState {
  return {
    type: d.type,
    status: null,
    startPpe: '',
    notes: '',
    holdReason: '',
    basis: position ? defaultBasisForPosition(position) : {},
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PlannedActionDetailProps {
  /** The action being edited. Manual rows (carrying `source: 'manual'`)
   *  update via store; derived rows (`source: 'derived'`) convert to manual
   *  on save. */
  action: UnifiedAction;
  /** Resolved position for delta-cost + display. */
  position: Position | undefined;
  /** Called when the modal should close (user clicked Cancel, Save success,
   *  or backdrop). */
  onClose: () => void;
}

export function PlannedActionDetail({ action, position, onClose }: PlannedActionDetailProps) {
  const addAction = useStaffingPlan(s => s.addAction);
  const updateAction = useStaffingPlan(s => s.updateAction);
  const deleteAction = useStaffingPlan(s => s.deleteAction);

  const isDerived = action.source === 'derived';

  // Draft mirror of the action's fields. Initialized once when the modal
  // opens; resets when the user opens a different action (action.id change).
  // We intentionally do NOT depend on the action object reference here —
  // store updates can re-create the reference while the user is in the
  // middle of editing, and wiping their draft on every keystroke elsewhere
  // would be hostile. If the underlying action's data changes via some
  // other path, the user can cancel + reopen to see the new state.
  const [draft, setDraft] = useState<DraftState>(() =>
    isDerived
      ? draftFromDerived(action as DerivedAction, position)
      : draftFromManual(action as PlannedAction & { source: 'manual' })
  );
  useEffect(() => {
    setDraft(
      isDerived
        ? draftFromDerived(action as DerivedAction, position)
        : draftFromManual(action as PlannedAction & { source: 'manual' })
    );
    setForceStatus(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.id]);

  /** "Force override" toggle for status transitions the guard rejects. */
  const [forceStatus, setForceStatus] = useState(false);

  // ---- Status guard ---------------------------------------------------------
  const currentStatus: HiringStatus | null = isDerived
    ? null
    : (action as PlannedAction).status;
  const statusAllowed = useMemo(
    () => isAllowedStatusTransition(currentStatus, draft.status),
    [currentStatus, draft.status],
  );
  const statusNeedsOverride = !statusAllowed;

  // ---- Cost basis completeness ---------------------------------------------
  const basisComplete = useMemo(() => isCostInputComplete(draft.basis), [draft.basis]);

  // ---- Delta-pay view -------------------------------------------------------
  const delta = useMemo(() => {
    if (!position) return null;
    // For the incumbent half to compute, we need retCode + ppStartDate from
    // the user — pull from the draft so the editor stays interactive.
    const retCode = draft.basis.retCode ?? '';
    const ppStartDate = draft.basis.ppStartDate ?? '';
    if (!retCode || !ppStartDate) return null;
    return deltaCost(
      position,
      // Synthesize a temporary action for cost computation — mirrors the
      // shape `computeExpectedCost` consumes. Only used here.
      {
        ...(isDerived
          ? action
          : (action as PlannedAction)),
        type: draft.type,
        basis: basisComplete ? (draft.basis as CostInput) : null,
      } as PlannedAction | DerivedAction,
      { retCode, ppStartDate, fiscalYear: draft.basis.fiscalYear ?? DEFAULT_FY },
    );
  }, [position, draft, basisComplete, isDerived, action]);

  // ---- Save -----------------------------------------------------------------
  const canSave = useMemo(() => {
    if (statusNeedsOverride && !forceStatus) return false;
    return true;
  }, [statusNeedsOverride, forceStatus]);

  function handleSave() {
    if (!canSave) return;
    const basisForStore: CostInput | null = basisComplete
      ? (draft.basis as CostInput)
      : null;
    if (isDerived) {
      // Convert: materialize as a manual action. Per-position manual-wins
      // makes the derived row disappear from the auto sections automatically.
      addAction({
        positionId: action.positionId,
        displayNumber: action.displayNumber,
        type: draft.type,
        status: draft.status ?? undefined,
        notes: draft.notes,
        basis: basisForStore,
        actionMode: draft.actionMode,
        separationConfidence: draft.separationConfidence,
        startPpe: draft.startPpe || undefined,
        holdReason: draft.holdReason || undefined,
      });
    } else {
      const id = (action as PlannedAction).id;
      updateAction(id, {
        type: draft.type,
        status: draft.status,
        notes: draft.notes,
        basis: basisForStore,
        actionMode: draft.actionMode,
        separationConfidence: draft.separationConfidence,
        startPpe: draft.startPpe || undefined,
        holdReason: draft.holdReason || undefined,
      });
    }
    onClose();
  }

  function handleDelete() {
    if (isDerived) return;
    deleteAction((action as PlannedAction).id);
    onClose();
  }

  // ---- History --------------------------------------------------------------
  const history = isDerived ? [] : (action as PlannedAction).history;

  // ---- Render ---------------------------------------------------------------
  const jobLabel = position
    ? `${position.jobCode}${position.jobCodeDescription ? ' ' + position.jobCodeDescription : ''}`
    : '—';

  return (
    <Modal onClose={onClose} ariaLabel="Planned action detail" maxWidth={720}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Position
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>
              {action.displayNumber}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{jobLabel}</div>
          </div>
          {isDerived && (
            <span title="Auto-derived from P&P data. Saving will materialize as a manual action." style={{
              fontSize: 10, fontWeight: 600,
              padding: '2px 8px', borderRadius: 10,
              color: '#6b21a8', background: '#f3e8ff',
              textTransform: 'uppercase', letterSpacing: 0.3,
            }}>
              Converting from auto
            </span>
          )}
          <CloseButton onClose={onClose} />
        </header>

        {/* Type + status + mode + timing */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 1 160px' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</span>
              <select
                value={draft.type}
                onChange={e => setDraft({ ...draft, type: e.target.value as PlannedActionType })}
                style={inputStyle()}
              >
                {ACTION_TYPE_ORDER.map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>

            {draft.type === 'active-hire' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 1 160px' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</span>
                <select
                  value={draft.status ?? ''}
                  onChange={e => setDraft({ ...draft, status: e.target.value as HiringStatus })}
                  style={{
                    ...inputStyle(),
                    border: `1px solid ${statusNeedsOverride ? 'var(--warn)' : 'var(--border)'}`,
                  }}
                  aria-invalid={statusNeedsOverride}
                  aria-describedby={statusNeedsOverride ? 'status-override-warn' : undefined}
                >
                  <option value="">—</option>
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {statusNeedsOverride && (
                  <label id="status-override-warn" style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 11, color: 'var(--warn)',
                  }}>
                    <input
                      type="checkbox"
                      checked={forceStatus}
                      onChange={e => setForceStatus(e.target.checked)}
                    />
                    Force override (skip {currentStatus ?? 'null'} → {draft.status} guard — logged)
                  </label>
                )}
              </label>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 1 160px' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mode</span>
              <select
                value={draft.actionMode ?? ''}
                onChange={e => setDraft({
                  ...draft,
                  actionMode: e.target.value === '' ? undefined : e.target.value as ActionMode,
                })}
                style={inputStyle()}
              >
                <option value="">—</option>
                {ACTION_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>

            {draft.type === 'separation' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 1 160px' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Confidence</span>
                <select
                  value={draft.separationConfidence ?? ''}
                  onChange={e => setDraft({
                    ...draft,
                    separationConfidence: e.target.value === ''
                      ? undefined
                      : e.target.value as SeparationConfidence,
                  })}
                  style={inputStyle()}
                >
                  <option value="">—</option>
                  {SEPARATION_CONFIDENCES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 1 160px' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Start PPE</span>
              <input
                type="date"
                value={draft.startPpe}
                onChange={e => setDraft({ ...draft, startPpe: e.target.value })}
                style={inputStyle()}
              />
            </label>
          </div>

          {/* Pending / Unfunded — surface holdReason */}
          {(draft.type === 'pending' || draft.type === 'unfunded') && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hold reason</span>
              <input
                type="text"
                value={draft.holdReason}
                onChange={e => setDraft({ ...draft, holdReason: e.target.value })}
                placeholder="Free-text — e.g. budget freeze, CSC pending, etc."
                style={inputStyle()}
              />
            </label>
          )}
        </section>

        {/* Cost basis */}
        <section style={{
          borderTop: '1px solid var(--border)', paddingTop: 12,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Cost basis</h3>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {basisComplete ? 'Complete — live projection below' : 'Fill all required fields to enable pricing'}
            </span>
          </div>
          <CostInputEditor
            value={draft.basis}
            onChange={basis => setDraft({ ...draft, basis })}
          />
        </section>

        {/* Delta-pay view */}
        {delta && (delta.incumbent || delta.planned) && (
          <section style={{
            borderTop: '1px solid var(--border)', paddingTop: 12,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Delta cost (vs current incumbent)</h3>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <DeltaStat label="Incumbent (current)" cost={delta.incumbent?.annual ?? null} />
              <DeltaStat label="Planned action" cost={delta.planned?.annual ?? null} />
              <DeltaStat
                label="Δ Annual"
                cost={delta.delta}
                emphasize
                signed
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Live COLA-aware projection · {delta.incumbent?.empOrg ?? delta.planned?.empOrg ?? ''}
            </div>
          </section>
        )}

        {/* Notes */}
        <section style={{
          borderTop: '1px solid var(--border)', paddingTop: 12,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</span>
            <textarea
              value={draft.notes}
              onChange={e => setDraft({ ...draft, notes: e.target.value })}
              placeholder="The why — context the data can't capture (multi-line)"
              rows={4}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--border)', borderRadius: 4,
                fontSize: 13, fontFamily: 'inherit',
                background: 'var(--surface)', color: 'inherit',
                resize: 'vertical',
              }}
            />
          </label>
        </section>

        {/* History */}
        {history.length > 0 && (
          <details style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              History · {history.length} entr{history.length === 1 ? 'y' : 'ies'}
            </summary>
            <ol style={{
              margin: '8px 0 0 0', padding: 0, listStyle: 'none',
              display: 'flex', flexDirection: 'column', gap: 4,
              fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)',
            }}>
              {history.slice().reverse().map((h, i) => (
                <li key={i} style={{
                  display: 'flex', gap: 8, padding: '4px 0',
                  borderBottom: '1px dashed var(--border)',
                }}>
                  <span style={{ flex: '0 0 130px' }}>{h.at.slice(0, 16).replace('T', ' ')}</span>
                  <span style={{ flex: '0 0 90px', fontWeight: 600 }}>{h.field}</span>
                  <span style={{ flex: '1 1 auto', wordBreak: 'break-all' }}>
                    {String(h.before ?? '∅')} → {String(h.after ?? '∅')}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}

        {/* Footer */}
        <ModalFooter
          onDelete={isDerived ? undefined : handleDelete}
          onCancel={onClose}
          onSave={handleSave}
          canSave={canSave}
          saveLabel={isDerived ? 'Save (convert to manual)' : 'Save'}
        />
    </Modal>
  );
}

function DeltaStat({ label, cost, signed, emphasize }: {
  label: string;
  cost: number | null;
  signed?: boolean;
  emphasize?: boolean;
}) {
  const color = cost == null
    ? 'var(--muted)'
    : emphasize && cost > 0
      ? 'var(--danger)'
      : emphasize && cost < 0
        ? 'var(--success)'
        : 'inherit';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{
        fontSize: emphasize ? 20 : 16,
        fontWeight: emphasize ? 700 : 600,
        fontFamily: 'monospace',
        color,
      }}>
        {cost == null
          ? '—'
          : signed
            ? fmtSignedMoney(cost)
            : fmtMoney(cost)}
      </span>
    </div>
  );
}
