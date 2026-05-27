/**
 * SeparationDetail — full editor for one PendingSeparation. Opens as a
 * modal over the Separations workspace when the user clicks a row.
 *
 * Mirrors PlannedActionDetail's pattern: fixed-overlay (no Portal / no
 * headless-ui dep), Esc + backdrop click to close, `role="dialog"` +
 * `aria-modal="true"`. Save / Cancel / Delete footer.
 *
 * Status workflow: dropdown of the 4 `SeparationStatus` values. The
 * `isAllowedSeparationStatusTransition` guard from build.ts gates the
 * dropdown — when the picked target is rejected, a "Force override
 * (logged)" checkbox + reason text input appear; saving with override
 * checked + reason filled passes the reason to `updateSeparation`, which
 * appends it to the history audit log on the status entry.
 *
 * Cross-link picker: lists the user's `'separation'`-type PlannedActions
 * (manual rows only — derived rows can't be linked to since they don't
 * carry a stable id once converted). Choosing one sets `linkedActionId`;
 * the Hiring Plan side picks this up and surfaces a "Tracked in
 * Separations" indicator on the matching Separations-section row.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  CONFIDENCE_LEVEL_ORDER,
  SEPARATION_STATUS_ORDER,
  isAllowedSeparationStatusTransition,
  useSeparations,
} from '../../separations';
import type {
  ConfidenceLevel,
  PendingSeparation,
  SeparationStatus,
} from '../../separations';
import { useStaffingPlan } from '../../staffing-plan';
import type { Position } from '../../positions';

interface SeparationDetailProps {
  separation: PendingSeparation;
  /** Loaded positions for the cross-link picker + position lookup. May be
   *  empty if no P&P snapshot is loaded — picker still works, the field
   *  just becomes plain text. */
  positions: Position[];
  onClose: () => void;
}

interface DraftState {
  employeeName: string;
  employeeId: string;
  positionDisplayNumber: string;
  jobCode: string;
  status: SeparationStatus;
  confidence: ConfidenceLevel;
  expectedSeparationDate: string;
  separationReason: string;
  notes: string;
  linkedActionId: string;
}

function draftFrom(s: PendingSeparation): DraftState {
  return {
    employeeName: s.employeeName,
    employeeId: s.employeeId ?? '',
    positionDisplayNumber: s.positionDisplayNumber ?? '',
    jobCode: s.jobCode ?? '',
    status: s.status,
    confidence: s.confidence,
    expectedSeparationDate: s.expectedSeparationDate ?? '',
    separationReason: s.separationReason ?? '',
    notes: s.notes,
    linkedActionId: s.linkedActionId ?? '',
  };
}

export function SeparationDetail({ separation, positions, onClose }: SeparationDetailProps) {
  const updateSeparation = useSeparations(s => s.updateSeparation);
  const deleteSeparation = useSeparations(s => s.deleteSeparation);
  const actionsMap = useStaffingPlan(s => s.actions);

  // Reset draft when the modal switches to a different separation.
  const [draft, setDraft] = useState<DraftState>(() => draftFrom(separation));
  useEffect(() => {
    setDraft(draftFrom(separation));
    setForceStatus(false);
    setOverrideReason('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [separation.id]);

  /** Force-override toggle for backward status transitions. */
  const [forceStatus, setForceStatus] = useState(false);
  /** Required reason text when the override is checked. */
  const [overrideReason, setOverrideReason] = useState('');

  const statusAllowed = useMemo(
    () => isAllowedSeparationStatusTransition(separation.status, draft.status),
    [separation.status, draft.status],
  );
  const statusNeedsOverride = !statusAllowed;

  // Position display → position lookup for the datalist + jobCode fill.
  const positionByDisplay = useMemo(
    () => new Map(positions.map(p => [p.displayNumber, p])),
    [positions],
  );

  // Separation-type PlannedActions for the cross-link picker. Only manual
  // rows (derived actions don't have a stable id worth pinning to).
  const separationActions = useMemo(
    () => [...actionsMap.values()].filter(a => a.type === 'separation'),
    [actionsMap],
  );

  // ---- Save -----------------------------------------------------------------
  const canSave = useMemo(() => {
    if (draft.employeeName.trim() === '') return false;
    if (statusNeedsOverride && (!forceStatus || overrideReason.trim() === '')) return false;
    return true;
  }, [draft.employeeName, statusNeedsOverride, forceStatus, overrideReason]);

  function handleSave() {
    if (!canSave) return;
    // Resolve the position picker to a normalized id when possible. Empty
    // string in draft → undefined in store (means "no position attached"
    // rather than "position with empty id").
    const matched = draft.positionDisplayNumber.trim()
      ? positionByDisplay.get(draft.positionDisplayNumber.trim())
      : undefined;
    updateSeparation(
      separation.id,
      {
        employeeName: draft.employeeName.trim(),
        employeeId: draft.employeeId.trim() || undefined,
        positionId: matched?.id ?? (draft.positionDisplayNumber.trim() || undefined),
        positionDisplayNumber: draft.positionDisplayNumber.trim() || undefined,
        jobCode: (matched?.jobCode ?? draft.jobCode.trim()) || undefined,
        status: draft.status,
        confidence: draft.confidence,
        expectedSeparationDate: draft.expectedSeparationDate || undefined,
        separationReason: draft.separationReason.trim() || undefined,
        notes: draft.notes,
        linkedActionId: draft.linkedActionId || undefined,
      },
      statusNeedsOverride && forceStatus ? overrideReason.trim() : undefined,
    );
    onClose();
  }

  function handleDelete() {
    deleteSeparation(separation.id);
    onClose();
  }

  const history = separation.history;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pending separation detail"
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1000, overflow: 'auto', padding: '40px 20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{
        background: 'var(--surface)',
        width: '100%', maxWidth: 720,
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: 20,
      }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Pending separation
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {separation.employeeName || <span style={{ color: 'var(--muted)' }}>(unnamed)</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Added {separation.createdAt.slice(0, 10)}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: 'auto',
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 18, color: 'var(--muted)',
            }}
          >
            ✕
          </button>
        </header>

        {/* Identity */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Field label="Employee name" required>
            <input
              type="text"
              value={draft.employeeName}
              onChange={e => setDraft({ ...draft, employeeName: e.target.value })}
              aria-label="Employee name"
              style={inputStyle()}
            />
          </Field>
          <Field label="Employee #">
            <input
              type="text"
              value={draft.employeeId}
              onChange={e => setDraft({ ...draft, employeeId: e.target.value })}
              placeholder="optional"
              aria-label="Employee number"
              style={{ ...inputStyle(), fontFamily: 'monospace', width: 120 }}
            />
          </Field>
          <Field label="Position #">
            <input
              type="text"
              list="separations-positions-datalist"
              value={draft.positionDisplayNumber}
              onChange={e => {
                const v = e.target.value;
                const match = positionByDisplay.get(v.trim());
                setDraft({
                  ...draft,
                  positionDisplayNumber: v,
                  // Auto-fill jobCode from the matched position so the row
                  // carries useful triage context without manual entry.
                  jobCode: match?.jobCode ?? draft.jobCode,
                });
              }}
              placeholder="optional"
              aria-label="Position number"
              style={{ ...inputStyle(), fontFamily: 'monospace', width: 140 }}
            />
            <datalist id="separations-positions-datalist">
              {positions.map(p => (
                <option key={p.id} value={p.displayNumber}>{p.jobCode} — {p.jobCodeDescription}</option>
              ))}
            </datalist>
          </Field>
          <Field label="Job code">
            <input
              type="text"
              value={draft.jobCode}
              onChange={e => setDraft({ ...draft, jobCode: e.target.value })}
              placeholder="auto from position"
              aria-label="Job code"
              style={{ ...inputStyle(), fontFamily: 'monospace', width: 100 }}
            />
          </Field>
        </section>

        {/* Status + confidence + dates */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <Field label="Status">
            <select
              value={draft.status}
              onChange={e => setDraft({ ...draft, status: e.target.value as SeparationStatus })}
              aria-label="Status"
              aria-invalid={statusNeedsOverride}
              style={{
                ...inputStyle(),
                borderColor: statusNeedsOverride ? '#b35a00' : 'var(--border)',
              }}
            >
              {SEPARATION_STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Confidence">
            <select
              value={draft.confidence}
              onChange={e => setDraft({ ...draft, confidence: e.target.value as ConfidenceLevel })}
              aria-label="Confidence"
              style={inputStyle()}
            >
              {CONFIDENCE_LEVEL_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Expected date">
            <input
              type="date"
              value={draft.expectedSeparationDate}
              onChange={e => setDraft({ ...draft, expectedSeparationDate: e.target.value })}
              aria-label="Expected separation date"
              style={inputStyle()}
            />
          </Field>
          <Field label="Reason" wide>
            <input
              type="text"
              value={draft.separationReason}
              onChange={e => setDraft({ ...draft, separationReason: e.target.value })}
              placeholder="Free text — e.g. Retirement, new job, medical separation"
              aria-label="Separation reason"
              style={inputStyle()}
            />
          </Field>
        </section>

        {/* Status override row */}
        {statusNeedsOverride && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            background: '#fff8e6', border: '1px solid #d4a017', borderRadius: 4,
            padding: '8px 12px', fontSize: 12, color: '#5b4500',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={forceStatus}
                onChange={e => setForceStatus(e.target.checked)}
              />
              Force override (skip {separation.status} → {draft.status} guard — logged)
            </label>
            {forceStatus && (
              <input
                type="text"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Reason for override (required)"
                aria-label="Override reason"
                style={{
                  ...inputStyle(),
                  borderColor: overrideReason.trim() === '' ? '#b35a00' : 'var(--border)',
                }}
              />
            )}
          </div>
        )}

        {/* Cross-link */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <Field label="Linked Hiring Plan action">
            <select
              value={draft.linkedActionId}
              onChange={e => setDraft({ ...draft, linkedActionId: e.target.value })}
              aria-label="Linked Hiring Plan action"
              style={{ ...inputStyle(), width: '100%' }}
            >
              <option value="">— not linked —</option>
              {separationActions.map(a => (
                <option key={a.id} value={a.id}>
                  {a.displayNumber}
                  {a.notes ? ` · ${a.notes.slice(0, 40)}` : ''}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {separationActions.length === 0
                ? 'No Separation-type planned actions in the Hiring Plan yet — add one there to enable linking.'
                : 'Linking surfaces a "Tracked in Separations" indicator on the matching Hiring Plan row.'}
            </span>
          </Field>
        </section>

        {/* Notes */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <Field label="Notes" wide>
            <textarea
              value={draft.notes}
              onChange={e => setDraft({ ...draft, notes: e.target.value })}
              placeholder="The why — context the structured fields can't capture (multi-line)"
              rows={4}
              aria-label="Notes"
              style={{
                ...inputStyle(),
                resize: 'vertical',
              }}
            />
          </Field>
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
                  display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0',
                  borderBottom: '1px dashed var(--border)',
                }}>
                  <span style={{ flex: '0 0 130px' }}>{h.at.slice(0, 16).replace('T', ' ')}</span>
                  <span style={{ flex: '0 0 110px', fontWeight: 600 }}>{h.field}</span>
                  <span style={{ flex: '1 1 200px', wordBreak: 'break-all' }}>
                    {String(h.before ?? '∅')} → {String(h.after ?? '∅')}
                  </span>
                  {h.overrideReason && (
                    <span style={{ flex: '1 1 100%', color: '#b35a00', fontStyle: 'italic' }}>
                      override: {h.overrideReason}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </details>
        )}

        {/* Footer */}
        <footer style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          borderTop: '1px solid var(--border)', paddingTop: 12,
        }}>
          <button
            onClick={handleDelete}
            style={{
              marginRight: 'auto',
              padding: '5px 12px',
              border: '1px solid #b91c1c', borderRadius: 14,
              background: 'transparent', color: '#b91c1c', cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit',
            }}
          >
            Delete
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '5px 12px',
              border: '1px solid var(--border)', borderRadius: 14,
              background: 'transparent', color: 'inherit', cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '5px 16px',
              border: '1px solid var(--accent)', borderRadius: 14,
              background: canSave ? 'var(--accent)' : 'var(--surface)',
              color: canSave ? '#fff' : 'var(--muted)',
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function inputStyle(): React.CSSProperties {
  return {
    padding: '5px 10px',
    border: '1px solid var(--border)', borderRadius: 4,
    fontSize: 13, fontFamily: 'inherit',
    background: 'var(--surface)', color: 'inherit',
  };
}

function Field({ label, required, wide, children }: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      flex: wide ? '1 1 100%' : '0 1 160px',
    }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: '#b91c1c' }}> *</span>}
      </span>
      {children}
    </label>
  );
}
