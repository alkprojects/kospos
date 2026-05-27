/**
 * ProbationDetail — full editor for one Probation. Opens as a modal over
 * the Probations workspace when the user clicks a row.
 *
 * Mirrors SeparationDetail's pattern: fixed-overlay (no Portal / no
 * headless-ui dep), Esc + backdrop click to close, `role="dialog"` +
 * `aria-modal="true"`. Save / Cancel / Delete footer.
 *
 * Status workflow: dropdown of the 5 `ProbationStatus` values. The
 * `isAllowedProbationStatusTransition` guard from build.ts gates the
 * dropdown — when the picked target is rejected (e.g. cleared → open,
 * or extended → open), a "Force override (logged)" checkbox + reason
 * text input appear; saving with override checked + reason filled passes
 * the reason to `updateProbation`, which appends it to the history audit
 * log on the status entry.
 *
 * Extensions section — separate from the patch flow. Add Extension button
 * inline-prompts for a new end date + optional reason; submission calls
 * `addExtension` (not `updateProbation`), which logs a meaningful
 * "extended to YYYY-MM-DD" history entry rather than an array diff.
 * Auto-transitions `open` → `extended` on first extension.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  PROBATIONARY_PERIOD_HOURS,
  PROBATION_STATUS_ORDER,
  computeBaseEndDate,
  currentEndDate,
  isAllowedProbationStatusTransition,
  useProbations,
} from '../../probation';
import type {
  Probation,
  ProbationStatus,
  ProbationaryPeriodHours,
} from '../../probation';
import type { Position, PersonRef } from '../../positions';

interface ProbationDetailProps {
  probation: Probation;
  /** Loaded positions for the cross-link picker + position lookup. May be
   *  empty if no P&P snapshot is loaded — picker still works, the field
   *  just becomes plain text. */
  positions: Position[];
  /** Lookup by name → person ref. Drives the employee-name autocomplete +
   *  the auto-fill of employee # / position when a known name is picked. */
  peopleByName: Map<string, PersonRef>;
  /** Lookup by emplId → person ref. Drives the employee-# autocomplete +
   *  the auto-fill of name / position when a known emplId is picked. */
  peopleByEmplId: Map<string, PersonRef>;
  /** Alphabetical list for the datalist options. */
  peopleList: PersonRef[];
  onClose: () => void;
}

interface DraftState {
  employeeName: string;
  employeeId: string;
  positionDisplayNumber: string;
  jobCode: string;
  probationaryPeriodHours: ProbationaryPeriodHours;
  startWorkDate: string;
  baseEndDate: string;
  status: ProbationStatus;
  supervisor: string;
  completionDate: string;
  notes: string;
}

function draftFrom(p: Probation): DraftState {
  return {
    employeeName: p.employeeName,
    employeeId: p.employeeId ?? '',
    positionDisplayNumber: p.positionDisplayNumber ?? '',
    jobCode: p.jobCode ?? '',
    probationaryPeriodHours: p.probationaryPeriodHours,
    startWorkDate: p.startWorkDate,
    baseEndDate: p.baseEndDate ?? '',
    status: p.status,
    supervisor: p.supervisor ?? '',
    completionDate: p.completionDate ?? '',
    notes: p.notes,
  };
}

export function ProbationDetail({
  probation,
  positions,
  peopleByName,
  peopleByEmplId,
  peopleList,
  onClose,
}: ProbationDetailProps) {
  const updateProbation = useProbations(s => s.updateProbation);
  const deleteProbation = useProbations(s => s.deleteProbation);
  const addExtension = useProbations(s => s.addExtension);

  // Reset draft when the modal switches to a different probation.
  const [draft, setDraft] = useState<DraftState>(() => draftFrom(probation));
  useEffect(() => {
    setDraft(draftFrom(probation));
    setForceStatus(false);
    setOverrideReason('');
    setExtensionDraft({ newEndDate: '', reason: '' });
    setExtensionMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probation.id]);

  /** Force-override toggle for guard-rejected status transitions. */
  const [forceStatus, setForceStatus] = useState(false);
  /** Required reason text when the override is checked. */
  const [overrideReason, setOverrideReason] = useState('');

  /** Inline-prompt state for adding a new extension. */
  const [extensionMode, setExtensionMode] = useState(false);
  const [extensionDraft, setExtensionDraft] = useState<{ newEndDate: string; reason: string }>({
    newEndDate: '',
    reason: '',
  });

  const statusAllowed = useMemo(
    () => isAllowedProbationStatusTransition(probation.status, draft.status),
    [probation.status, draft.status],
  );
  const statusNeedsOverride = !statusAllowed;

  // Position display → position lookup for the datalist + jobCode fill.
  const positionByDisplay = useMemo(
    () => new Map(positions.map(p => [p.displayNumber, p])),
    [positions],
  );

  // Computed baseEndDate hint — shown next to the override input so the
  // user can compare their stored value to the FT-equivalent computation.
  const computedBaseEnd = useMemo(
    () => computeBaseEndDate(draft.startWorkDate, draft.probationaryPeriodHours),
    [draft.startWorkDate, draft.probationaryPeriodHours],
  );

  // Effective current end date — derived live from draft for the header
  // display (uses extensions from the persisted record + draft.baseEndDate).
  const liveCurrentEnd = useMemo(
    () => currentEndDate({
      ...probation,
      baseEndDate: draft.baseEndDate || undefined,
      probationaryPeriodHours: draft.probationaryPeriodHours,
      startWorkDate: draft.startWorkDate,
    }),
    [probation, draft.baseEndDate, draft.probationaryPeriodHours, draft.startWorkDate],
  );

  // ---- Save -----------------------------------------------------------------
  const canSave = useMemo(() => {
    if (draft.employeeName.trim() === '') return false;
    if (draft.startWorkDate === '') return false;
    if (statusNeedsOverride && (!forceStatus || overrideReason.trim() === '')) return false;
    return true;
  }, [draft.employeeName, draft.startWorkDate, statusNeedsOverride, forceStatus, overrideReason]);

  function handleSave() {
    if (!canSave) return;
    // Resolve the position picker to a normalized id when possible. Empty
    // string in draft → undefined in store (means "no position attached"
    // rather than "position with empty id").
    const matched = draft.positionDisplayNumber.trim()
      ? positionByDisplay.get(draft.positionDisplayNumber.trim())
      : undefined;
    updateProbation(
      probation.id,
      {
        employeeName: draft.employeeName.trim(),
        employeeId: draft.employeeId.trim() || undefined,
        positionId: matched?.id ?? (draft.positionDisplayNumber.trim() || undefined),
        positionDisplayNumber: draft.positionDisplayNumber.trim() || undefined,
        jobCode: (matched?.jobCode ?? draft.jobCode.trim()) || undefined,
        probationaryPeriodHours: draft.probationaryPeriodHours,
        startWorkDate: draft.startWorkDate,
        baseEndDate: draft.baseEndDate || undefined,
        status: draft.status,
        supervisor: draft.supervisor.trim() || undefined,
        completionDate: draft.completionDate || undefined,
        notes: draft.notes,
      },
      statusNeedsOverride && forceStatus ? overrideReason.trim() : undefined,
    );
    onClose();
  }

  function handleDelete() {
    deleteProbation(probation.id);
    onClose();
  }

  function handleAddExtension() {
    if (extensionDraft.newEndDate === '') return;
    addExtension(probation.id, {
      newEndDate: extensionDraft.newEndDate,
      reason: extensionDraft.reason.trim() || undefined,
    });
    setExtensionDraft({ newEndDate: '', reason: '' });
    setExtensionMode(false);
  }

  const history = probation.history;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Probation detail"
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
              Probation
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {probation.employeeName || <span style={{ color: 'var(--muted)' }}>(unnamed)</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Added {probation.createdAt.slice(0, 10)}
              {liveCurrentEnd && (
                <> · Current end <span style={{ fontFamily: 'monospace' }}>{liveCurrentEnd}</span></>
              )}
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
              list="probation-detail-people-name-datalist"
              value={draft.employeeName}
              onChange={e => {
                const v = e.target.value;
                const match = peopleByName.get(v.trim());
                if (match) {
                  setDraft({
                    ...draft,
                    employeeName: match.name,
                    employeeId: draft.employeeId.trim() === '' ? match.emplId : draft.employeeId,
                    positionDisplayNumber:
                      draft.positionDisplayNumber.trim() === ''
                        ? match.positionDisplayNumber
                        : draft.positionDisplayNumber,
                    jobCode: draft.jobCode.trim() === '' ? match.jobCode : draft.jobCode,
                  });
                } else {
                  setDraft({ ...draft, employeeName: v });
                }
              }}
              aria-label="Employee name"
              style={inputStyle()}
            />
            <datalist id="probation-detail-people-name-datalist">
              {peopleList.map(p => (
                <option key={p.emplId} value={p.name}>{p.emplId} — {p.jobCode}</option>
              ))}
            </datalist>
          </Field>
          <Field label="Employee #">
            <input
              type="text"
              list="probation-detail-people-id-datalist"
              value={draft.employeeId}
              onChange={e => {
                const v = e.target.value;
                const match = peopleByEmplId.get(v.trim());
                if (match) {
                  setDraft({
                    ...draft,
                    employeeId: match.emplId,
                    employeeName: draft.employeeName.trim() === '' ? match.name : draft.employeeName,
                    positionDisplayNumber:
                      draft.positionDisplayNumber.trim() === ''
                        ? match.positionDisplayNumber
                        : draft.positionDisplayNumber,
                    jobCode: draft.jobCode.trim() === '' ? match.jobCode : draft.jobCode,
                  });
                } else {
                  setDraft({ ...draft, employeeId: v });
                }
              }}
              placeholder="optional"
              aria-label="Employee number"
              style={{ ...inputStyle(), fontFamily: 'monospace', width: 120 }}
            />
            <datalist id="probation-detail-people-id-datalist">
              {peopleList.map(p => (
                <option key={p.emplId} value={p.emplId}>{p.name} — {p.jobCode}</option>
              ))}
            </datalist>
          </Field>
          <Field label="Position #">
            <input
              type="text"
              list="probations-positions-datalist"
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
            <datalist id="probations-positions-datalist">
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

        {/* Hours + dates */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <Field label="Hours">
            <select
              value={draft.probationaryPeriodHours}
              onChange={e => setDraft({ ...draft, probationaryPeriodHours: Number(e.target.value) as ProbationaryPeriodHours })}
              aria-label="Probationary period hours"
              style={inputStyle()}
            >
              {PROBATIONARY_PERIOD_HOURS.map(h => (
                <option key={h} value={h}>{h.toLocaleString('en-US')}</option>
              ))}
            </select>
          </Field>
          <Field label="Start date" required>
            <input
              type="date"
              value={draft.startWorkDate}
              onChange={e => setDraft({ ...draft, startWorkDate: e.target.value })}
              aria-label="Start work date"
              style={inputStyle()}
            />
          </Field>
          <Field label="Base end date">
            <input
              type="date"
              value={draft.baseEndDate}
              onChange={e => setDraft({ ...draft, baseEndDate: e.target.value })}
              aria-label="Base end date"
              style={inputStyle()}
            />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              Auto: <span style={{ fontFamily: 'monospace' }}>{computedBaseEnd || '—'}</span> (full-time)
            </span>
          </Field>
          <Field label="Supervisor">
            <input
              type="text"
              value={draft.supervisor}
              onChange={e => setDraft({ ...draft, supervisor: e.target.value })}
              placeholder="optional"
              aria-label="Supervisor"
              style={inputStyle()}
            />
          </Field>
        </section>

        {/* Status + completion */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <Field label="Status">
            <select
              value={draft.status}
              onChange={e => setDraft({ ...draft, status: e.target.value as ProbationStatus })}
              aria-label="Status"
              aria-invalid={statusNeedsOverride}
              style={{
                ...inputStyle(),
                borderColor: statusNeedsOverride ? '#b35a00' : 'var(--border)',
              }}
            >
              {PROBATION_STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Completion date">
            <input
              type="date"
              value={draft.completionDate}
              onChange={e => setDraft({ ...draft, completionDate: e.target.value })}
              aria-label="Completion date"
              style={inputStyle()}
            />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              For cleared / failed / resigned only
            </span>
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
              Force override (skip {probation.status} → {draft.status} guard — logged)
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

        {/* Extensions */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>Extensions</strong>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {probation.extensions.length === 0
                ? 'No extensions recorded'
                : `${probation.extensions.length} extension${probation.extensions.length === 1 ? '' : 's'} on record`}
            </span>
            {!extensionMode && (
              <button
                onClick={() => setExtensionMode(true)}
                style={{
                  marginLeft: 'auto',
                  padding: '3px 10px',
                  border: '1px solid var(--accent)', borderRadius: 12,
                  background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
                  fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                + Add extension
              </button>
            )}
          </div>

          {extensionMode && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end',
              background: 'var(--accent-soft)', borderRadius: 4, padding: 10, marginBottom: 8,
            }}>
              <Field label="New end date" required>
                <input
                  type="date"
                  value={extensionDraft.newEndDate}
                  onChange={e => setExtensionDraft({ ...extensionDraft, newEndDate: e.target.value })}
                  aria-label="Extension new end date"
                  style={inputStyle()}
                />
              </Field>
              <Field label="Reason" wide>
                <input
                  type="text"
                  value={extensionDraft.reason}
                  onChange={e => setExtensionDraft({ ...extensionDraft, reason: e.target.value })}
                  placeholder="Why was this extended?"
                  aria-label="Extension reason"
                  style={inputStyle()}
                />
              </Field>
              <button
                onClick={handleAddExtension}
                disabled={extensionDraft.newEndDate === ''}
                style={{
                  padding: '5px 12px', height: 30,
                  border: '1px solid var(--accent)', borderRadius: 12,
                  background: extensionDraft.newEndDate ? 'var(--accent)' : 'var(--surface)',
                  color: extensionDraft.newEndDate ? '#fff' : 'var(--muted)',
                  cursor: extensionDraft.newEndDate ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                Save extension
              </button>
              <button
                onClick={() => { setExtensionMode(false); setExtensionDraft({ newEndDate: '', reason: '' }); }}
                style={{
                  padding: '5px 12px', height: 30,
                  border: '1px solid var(--border)', borderRadius: 12,
                  background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                  fontSize: 12, fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {probation.extensions.length > 0 && (
            <ol style={{
              margin: 0, padding: 0, listStyle: 'none',
              display: 'flex', flexDirection: 'column', gap: 4,
              fontSize: 12,
            }}>
              {probation.extensions.map((ext, i) => (
                <li key={i} style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0',
                  borderBottom: '1px dashed var(--border)',
                }}>
                  <span style={{ flex: '0 0 50px', color: 'var(--muted)' }}>#{i + 1}</span>
                  <span style={{ flex: '0 0 120px', fontFamily: 'monospace' }}>{ext.newEndDate}</span>
                  <span style={{ flex: '0 0 130px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                    {ext.extendedAt.slice(0, 10)}
                  </span>
                  {ext.reason && (
                    <span style={{ flex: '1 1 200px', color: 'var(--muted)' }}>
                      {ext.reason}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
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
                  <span style={{ flex: '0 0 130px', fontWeight: 600 }}>{h.field}</span>
                  <span style={{ flex: '1 1 200px', wordBreak: 'break-all' }}>
                    {summarize(h.before)} → {summarize(h.after)}
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

function summarize(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '{…}';
  return String(value);
}

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
