/**
 * Probation workspace — Tab 10 surface. Phase 2.2.j (2.2.25).
 *
 * KosPos is the system of record for probation tracking (no upstream PS
 * HCM source for DBI). Replaces the workbook's 26-row × 11-col hand-
 * maintained Probation tab.
 *
 * Layout mirrors SeparationsView + InactiveView + StaffingPlanView:
 *   - Summary header: total count + 5-status rollup chips + alert counts
 *     for `approaching-end` and `past-end-without-completion` derived flags
 *   - Add-probation form: employee name + hours + start date required
 *   - Filter bar: needle search + status-chip radiogroup + alert-only toggle
 *   - Table: name / position / hours / start / current end / status / supervisor / alerts
 *   - Detail modal opens on row click
 *
 * No upstream importer — works without P&P loaded (the position field is
 * optional in v1).
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { buildPositions, buildPeopleIndex } from '../../positions';
import type { Position, PersonRef } from '../../positions';
import { DEFAULT_DEPT_TREE } from '../../reference/dept-tree';
import type { PsHcmPpRow } from '../../importers/types';
import { matchesNeedle } from '../../search/needle';
import { CopyButton } from '../../ui';
import {
  PROBATION_STATUS_ORDER,
  currentEndDate,
  isApproachingEnd,
  isPastEndWithoutCompletion,
  rollupByStatus,
  useProbations,
} from '../../probation';
import type {
  Probation,
  ProbationStatus,
  ProbationaryPeriodHours,
} from '../../probation';
import { ProbationDetail } from './ProbationDetail';

// ---------------------------------------------------------------------------
// Supervisor resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the displayed supervisor name for a probation row.
 *
 * Priority:
 *   1. `probation.supervisor` (free-text, manually entered) — wins if set.
 *   2. The linked Position's `reportsTo.managerFirstName + managerLastName` —
 *      auto-resolved from the P&P snapshot.
 *   3. Neither — return empty.
 *
 * The auto-resolved path is annotated as `source: 'auto'` so the UI can
 * surface a subtle "(auto)" hint, signalling the value is data-driven and
 * may change when a new P&P is loaded. Manual values render verbatim.
 */
function resolveSupervisor(
  p: Probation,
  positionsById: Map<string, Position>,
): { name: string; source: 'manual' | 'auto' | 'none' } {
  if (p.supervisor && p.supervisor.trim() !== '') {
    return { name: p.supervisor.trim(), source: 'manual' };
  }
  if (p.positionId) {
    const pos = positionsById.get(p.positionId);
    const mfn = pos?.reportsTo?.managerFirstName ?? '';
    const mln = pos?.reportsTo?.managerLastName ?? '';
    const joined = `${mfn} ${mln}`.trim();
    if (joined !== '') return { name: joined, source: 'auto' };
  }
  return { name: '', source: 'none' };
}

// ---------------------------------------------------------------------------
// Display constants
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<ProbationStatus, string> = {
  'open':     'Open',
  'extended': 'Extended',
  'cleared':  'Cleared',
  'failed':   'Failed',
  'resigned': 'Resigned',
};

const STATUS_COLOR: Record<ProbationStatus, [string, string]> = {
  // [text, background]
  'open':     ['#1f5fbf', '#e7f0fb'], // blue   — in progress
  'extended': ['#b35a00', '#fed7aa'], // orange — needs attention
  'cleared':  ['#1a7a3c', '#d4f4e3'], // green  — passed
  'failed':   ['#7f1d1d', '#fecaca'], // red    — didn't pass
  'resigned': ['#6b7280', '#f3f4f6'], // gray   — left
};

function StatusChip({ status }: { status: ProbationStatus }) {
  const [color, bg] = STATUS_COLOR[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '1px 7px', borderRadius: 10,
      color, background: bg, whiteSpace: 'nowrap',
    }}>{STATUS_LABEL[status]}</span>
  );
}

function AlertChip({ kind }: { kind: 'approaching' | 'past-due' }) {
  const [color, bg, label, title] = kind === 'approaching'
    ? ['#7a4b1a', '#fde68a', '⏳ Approaching', 'Probation ends within 30 days']
    : ['#7f1d1d', '#fecaca', '⚠ Past due',   'Probation end date is today or past with no completion'];
  return (
    <span title={title} style={{
      fontSize: 10, fontWeight: 700,
      padding: '1px 6px', borderRadius: 8,
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
      {hint && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{hint}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Duration presets
// ---------------------------------------------------------------------------

/**
 * The selectable duration presets for the add-probation form + the inline
 * end-date editor. `custom` means "user types an arbitrary end date" and
 * stays the active preset for any non-canonical duration.
 *
 * Mapped to the underlying `ProbationaryPeriodHours` enum:
 *   - `6mo` + `1040h` → 1040 hours (half-time equivalent)
 *   - `1yr` + `2080h` → 2080 hours (full-time equivalent)
 *
 * The calendar vs hours-based presets land 1 day apart for the same
 * "duration" because months/years have variable day counts. We honor
 * the user's specific intent — picking "6 months" sets end = start +
 * 6 calendar months, while picking "1040 hours" sets end = start + 182
 * days. CSC Rule 117 is hours-tracked, not date-tracked, so the
 * difference is advisory either way.
 */
type DurationPreset = '6mo' | '1040h' | '1yr' | '2080h' | 'custom';

const PRESET_LABEL: Record<DurationPreset, string> = {
  '6mo':   '6 months',
  '1040h': '1040 hrs',
  '1yr':   '1 year',
  '2080h': '2080 hrs',
  'custom': 'Custom',
};

const PRESET_ORDER: readonly DurationPreset[] = ['6mo', '1040h', '1yr', '2080h', 'custom'];

/** Hours value the preset commits to (Custom preserves whatever was set). */
function presetHours(p: DurationPreset, fallback: ProbationaryPeriodHours): ProbationaryPeriodHours {
  if (p === '6mo' || p === '1040h') return 1040;
  if (p === '1yr' || p === '2080h') return 2080;
  return fallback;
}

/** Compute end date from start + preset. Returns '' when start is blank or
 *  invalid. Calendar presets add months; hours presets add days. */
function endDateForPreset(startWorkDate: string, preset: DurationPreset): string {
  if (!startWorkDate) return '';
  const start = new Date(startWorkDate + 'T00:00:00Z');
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getTime());
  if (preset === '6mo') {
    end.setUTCMonth(end.getUTCMonth() + 6);
  } else if (preset === '1yr') {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else if (preset === '1040h') {
    end.setUTCDate(end.getUTCDate() + 182);     // 1040 / 40 × 7 = 182 days
  } else if (preset === '2080h') {
    end.setUTCDate(end.getUTCDate() + 364);     // 2080 / 40 × 7 = 364 days
  } else {
    // custom — caller should preserve their own value
    return '';
  }
  return end.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Add-probation form
// ---------------------------------------------------------------------------

/**
 * Inline form to add a new Probation. `employeeName`,
 * `probationaryPeriodHours`, and `startWorkDate` are required; the rest
 * of the fields can be filled later via the detail editor. Datalist
 * autocompletes:
 *   - Employee name → all known people from the loaded P&P (alphabetical)
 *   - Employee #    → all known people from the loaded P&P (by emplId)
 *   - Position #    → all positions from the loaded P&P (by display number)
 *
 * Picking a known person from either Name or Employee # autocompletes the
 * *other* field plus position + job code (first position the person was
 * seen on, for at-a-glance triage).
 */
function AddProbationForm({
  positions,
  peopleByName,
  peopleByEmplId,
  peopleList,
}: {
  positions: Position[];
  peopleByName: Map<string, PersonRef>;
  peopleByEmplId: Map<string, PersonRef>;
  peopleList: PersonRef[];
}) {
  const addProbation = useProbations(s => s.addProbation);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [jobCodeFromMatch, setJobCodeFromMatch] = useState<string | undefined>(undefined);
  const [hours, setHours] = useState<ProbationaryPeriodHours>(2080);
  const [preset, setPreset] = useState<DurationPreset>('2080h');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [deputy, setDeputy] = useState('');
  const [error, setError] = useState<string | null>(null);

  /** Picking a preset: snap hours + recompute end date from current start.
   *  Custom keeps the user's typed end date / hours. */
  function pickPreset(p: DurationPreset) {
    setPreset(p);
    setHours(presetHours(p, hours));
    if (p !== 'custom' && startDate) {
      setEndDate(endDateForPreset(startDate, p));
    }
  }

  /** Typing a new start date: keep the current preset and recompute end. */
  function handleStartChange(v: string) {
    setStartDate(v);
    if (preset !== 'custom' && v) {
      setEndDate(endDateForPreset(v, preset));
    }
  }

  /** Manually typing in the end date drops the form into Custom mode so the
   *  hours stay as-was and the value doesn't get clobbered next time start
   *  changes. */
  function handleEndChange(v: string) {
    setEndDate(v);
    setPreset('custom');
  }

  const positionByDisplay = useMemo(
    () => new Map(positions.map(p => [p.displayNumber, p])),
    [positions],
  );

  /** Auto-fill from a matched person — picking a known name (or known emplId)
   *  is an explicit user choice ("I want THIS person"), so overwrite all
   *  related fields unconditionally. This is the fix for the
   *  "name changed but employee # stuck on the old person" bug: picking
   *  Smith, Jane after Smith, John was auto-filled now updates the # too.
   *
   *  An unmatched manual typing path doesn't trigger this — `handleNameChange`
   *  / `handleIdChange` only call this when the typed value resolves to a
   *  known person, so freeform typed-in identifiers are still preserved. */
  function applyPersonMatch(p: PersonRef) {
    setEmployeeName(p.name);
    setEmployeeId(p.emplId);
    setPositionInput(p.positionDisplayNumber || '');
    setJobCodeFromMatch(p.jobCode);
  }

  function handleNameChange(v: string) {
    setEmployeeName(v);
    const match = peopleByName.get(v.trim());
    if (match) applyPersonMatch(match);
  }

  function handleIdChange(v: string) {
    setEmployeeId(v);
    const match = peopleByEmplId.get(v.trim());
    if (match) applyPersonMatch(match);
  }

  function submit() {
    const name = employeeName.trim();
    if (name === '') {
      setError('Employee name is required.');
      return;
    }
    if (startDate === '') {
      setError('Start work date is required.');
      return;
    }
    const positionDisplay = positionInput.trim();
    const matchedPosition = positionDisplay
      ? positionByDisplay.get(positionDisplay)
      : undefined;
    addProbation({
      employeeName: name,
      employeeId: employeeId.trim() || undefined,
      probationaryPeriodHours: hours,
      startWorkDate: startDate,
      // Pass the explicit end date when set (preset or custom) so the
      // stored baseEndDate reflects the user's chosen duration rather
      // than the always-365-day default from computeBaseEndDate.
      baseEndDate: endDate.trim() || undefined,
      positionId: matchedPosition?.id ?? (positionDisplay || undefined),
      positionDisplayNumber: positionDisplay || undefined,
      jobCode: matchedPosition?.jobCode ?? jobCodeFromMatch,
      supervisor: supervisor.trim() || undefined,
      deputy: deputy.trim() || undefined,
    });
    setEmployeeName('');
    setEmployeeId('');
    setPositionInput('');
    setJobCodeFromMatch(undefined);
    setStartDate('');
    setEndDate('');
    setPreset('2080h');
    setHours(2080);
    setSupervisor('');
    setDeputy('');
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
          list="probations-add-people-name-datalist"
          value={employeeName}
          onChange={e => handleNameChange(e.target.value)}
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
        <datalist id="probations-add-people-name-datalist">
          {peopleList.map(p => (
            <option key={p.emplId} value={p.name}>{p.emplId} — {p.jobCode}</option>
          ))}
        </datalist>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Employee # (optional)</span>
        <input
          type="text"
          list="probations-add-people-id-datalist"
          value={employeeId}
          onChange={e => handleIdChange(e.target.value)}
          placeholder="e.g. 187518"
          aria-label="Employee number"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'monospace',
            background: 'var(--surface)', color: 'inherit',
            width: 140,
          }}
        />
        <datalist id="probations-add-people-id-datalist">
          {peopleList.map(p => (
            <option key={p.emplId} value={p.emplId}>{p.name} — {p.jobCode}</option>
          ))}
        </datalist>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Start date <span style={{ color: '#b91c1c' }}>*</span>
        </span>
        <input
          type="date"
          value={startDate}
          onChange={e => handleStartChange(e.target.value)}
          aria-label="Start work date"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>End date</span>
        <input
          type="date"
          value={endDate}
          onChange={e => handleEndChange(e.target.value)}
          aria-label="End date"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Duration <span style={{ color: '#b91c1c' }}>*</span>
        </span>
        <div role="radiogroup" aria-label="Duration preset" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PRESET_ORDER.map(p => {
            const active = preset === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickPreset(p)}
                style={{
                  fontSize: 11, padding: '4px 10px', height: 30,
                  border: '1px solid',
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  borderRadius: 14,
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {PRESET_LABEL[p]}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
          Hours stored: {hours.toLocaleString('en-US')}
        </span>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Position # (optional)</span>
        <input
          type="search"
          list="probations-add-positions-datalist"
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
        <datalist id="probations-add-positions-datalist">
          {positions.map(p => (
            <option key={p.id} value={p.displayNumber}>{p.jobCode} — {p.jobCodeDescription}</option>
          ))}
        </datalist>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Supervisor (optional)</span>
        <input
          type="text"
          value={supervisor}
          onChange={e => setSupervisor(e.target.value)}
          placeholder="auto from position.reportsTo when blank"
          aria-label="Supervisor"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
            width: 180,
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Deputy (optional)</span>
        <input
          type="text"
          value={deputy}
          onChange={e => setDeputy(e.target.value)}
          placeholder="e.g. section deputy"
          aria-label="Deputy"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
            width: 180,
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
        Add probation
      </button>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        Status defaults to <strong>open</strong> · pick a Duration preset or type a Custom end date · edit details on the row
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

type StatusFilter = 'all' | ProbationStatus;

export function ProbationsView() {
  const loadedRows = useAppStore(s => s.loadedRows);
  const probationsMap = useProbations(s => s.probations);

  const positions = useMemo<Position[]>(() => {
    const ppRows = loadedRows.filter((r): r is PsHcmPpRow => r._source === 'ps-hcm-pp');
    if (ppRows.length === 0) return [];
    return buildPositions(ppRows, DEFAULT_DEPT_TREE);
  }, [loadedRows]);

  const positionsById = useMemo(
    () => new Map(positions.map(p => [p.id, p])),
    [positions],
  );

  // People index for employee-name + employee-# autocomplete (shared with
  // Separations via `lib/positions/people.ts`).
  const peopleIndex = useMemo(() => buildPeopleIndex(positions), [positions]);

  const probations = useMemo<Probation[]>(
    () => [...probationsMap.values()].sort((a, b) =>
      // Newest first (additions tend to be the most-actionable).
      b.createdAt.localeCompare(a.createdAt),
    ),
    [probationsMap],
  );

  // Today's date pinned once per render — derived flags compute relative to
  // this. Browser-local because the user thinks in local-date terms.
  const todayIso = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, [probationsMap]);

  // Pre-compute derived flags per row so the table render is cheap and the
  // filter / summary can share the same values.
  const flagged = useMemo(() => {
    return probations.map(p => ({
      probation: p,
      currentEnd: currentEndDate(p),
      approaching: isApproachingEnd(p, todayIso),
      pastDue: isPastEndWithoutCompletion(p, todayIso),
    }));
  }, [probations, todayIso]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [alertOnly, setAlertOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Inline-edit state for the end-date cell — only one cell editable at a
   *  time. Clicking the cell sets this; blur/Enter clears it after save. */
  const [editingEndDateId, setEditingEndDateId] = useState<string | null>(null);
  const updateProbation = useProbations(s => s.updateProbation);

  const filtered = useMemo(() => {
    let out = flagged;
    if (statusFilter !== 'all') {
      out = out.filter(f => f.probation.status === statusFilter);
    }
    if (alertOnly) {
      out = out.filter(f => f.approaching || f.pastDue);
    }
    if (search.trim() !== '') {
      out = out.filter(f => matchesNeedle(f.probation, search));
    }
    return out;
  }, [flagged, statusFilter, alertOnly, search]);

  const rollups = useMemo(() => rollupByStatus(probations), [probations]);

  const alertCounts = useMemo(() => {
    let approaching = 0;
    let pastDue = 0;
    for (const f of flagged) {
      if (f.approaching) approaching += 1;
      if (f.pastDue) pastDue += 1;
    }
    return { approaching, pastDue };
  }, [flagged]);

  const selectedProbation = useMemo(
    () => selectedId ? probationsMap.get(selectedId) ?? null : null,
    [selectedId, probationsMap],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header */}
      <div className="card" style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Stat
          label="Probations"
          value={filtered.length.toLocaleString('en-US')}
          hint={filtered.length !== probations.length
            ? `of ${probations.length.toLocaleString('en-US')} total`
            : undefined}
        />
        {rollups.map(r => (
          <Stat
            key={r.status}
            label={STATUS_LABEL[r.status]}
            value={String(r.count)}
          />
        ))}
        <Stat
          label="⏳ Approaching"
          value={String(alertCounts.approaching)}
          hint="ending ≤30d"
        />
        <Stat
          label="⚠ Past due"
          value={String(alertCounts.pastDue)}
          hint="no completion"
        />
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          {positions.length === 0
            ? 'No P&P loaded — position cross-link disabled'
            : `${positions.length.toLocaleString('en-US')} positions available for linking`}
        </div>
      </div>

      {/* Add form */}
      <AddProbationForm
        positions={positions}
        peopleByName={peopleIndex.byName}
        peopleByEmplId={peopleIndex.byEmplId}
        peopleList={peopleIndex.list}
      />

      {/* Filter bar */}
      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search any field (name, position #, supervisor, notes…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 260px',
            padding: '4px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
          aria-label="Search probations"
        />
        <div role="radiogroup" aria-label="Filter by status" style={{ display: 'flex', gap: 6 }}>
          {(['all', ...PROBATION_STATUS_ORDER] as const).map(s => {
            const isActive = statusFilter === s;
            const count = s === 'all'
              ? probations.length
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <input
            type="checkbox"
            checked={alertOnly}
            onChange={e => setAlertOnly(e.target.checked)}
            aria-label="Show only alerted rows"
          />
          Alerted only ({alertCounts.approaching + alertCounts.pastDue})
        </label>
        {(search || statusFilter !== 'all' || alertOnly) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setAlertOnly(false); }}
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
              {['Employee', 'Position', 'Job', 'Hrs', 'Start', 'Current end', 'Status', 'Supervisor', 'Deputy', 'Alerts'].map(h => (
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
                <td colSpan={10} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {probations.length === 0
                    ? 'No probations yet — add one above to start tracking probationary employees.'
                    : 'No probations match the current filters.'}
                </td>
              </tr>
            ) : (
              filtered.map(({ probation: p, currentEnd, approaching, pastDue }) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  aria-label={`Open details for probation ${p.employeeName}`}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <td style={{ padding: '5px 10px', fontWeight: 600 }}>
                    {p.employeeName}
                    <CopyButton value={p.employeeName} label="Employee name" />
                    {p.employeeId && (
                      <>
                        <span style={{ marginLeft: 6, color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                          {p.employeeId}
                        </span>
                        <CopyButton value={p.employeeId} label="Employee ID" />
                      </>
                    )}
                  </td>
                  <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>
                    {p.positionDisplayNumber
                      ? <>{p.positionDisplayNumber}<CopyButton value={p.positionDisplayNumber} label="Position number" /></>
                      : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {p.jobCode || <span style={{ color: 'var(--muted)' }}>—</span>}
                    {p.positionId && positionsById.get(p.positionId)?.jobCodeDescription && (
                      <span style={{ color: 'var(--muted)', fontFamily: 'inherit' }}>
                        {' '}{positionsById.get(p.positionId)!.jobCodeDescription}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '5px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                    {p.probationaryPeriodHours.toLocaleString('en-US')}
                  </td>
                  <td style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {p.startWorkDate || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td
                    style={{ padding: '5px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}
                    onClick={e => {
                      // Don't open the detail modal when the user clicks
                      // to edit the end date inline. Extensions force the
                      // detail-modal flow since editing the base date
                      // doesn't help when an extension overrides it.
                      if (p.extensions.length === 0) {
                        e.stopPropagation();
                        setEditingEndDateId(p.id);
                      }
                    }}
                  >
                    {editingEndDateId === p.id && p.extensions.length === 0 ? (
                      <input
                        type="date"
                        autoFocus
                        defaultValue={currentEnd || ''}
                        aria-label={`End date for ${p.employeeName}`}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingEndDateId(null);
                        }}
                        onBlur={e => {
                          const v = e.target.value;
                          if (v && v !== currentEnd) {
                            updateProbation(p.id, { baseEndDate: v });
                          }
                          setEditingEndDateId(null);
                        }}
                        style={{
                          padding: '2px 4px',
                          border: '1px solid var(--accent)', borderRadius: 3,
                          fontSize: 12, fontFamily: 'monospace',
                          background: 'var(--surface)', color: 'inherit',
                          width: 130,
                        }}
                      />
                    ) : (
                      <>
                        <span title="Click to edit end date">
                          {currentEnd || <span style={{ color: 'var(--muted)' }}>—</span>}
                        </span>
                        {p.extensions.length > 0 && (
                          <span style={{ marginLeft: 6, color: 'var(--muted)', fontSize: 10 }}>
                            ({p.extensions.length} ext)
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td style={{ padding: '5px 10px' }}><StatusChip status={p.status} /></td>
                  <td style={{ padding: '5px 10px', color: 'var(--muted)' }}>
                    {(() => {
                      const resolved = resolveSupervisor(p, positionsById);
                      if (!resolved.name) return <span>—</span>;
                      return (
                        <span title={resolved.source === 'auto'
                          ? 'Auto-resolved from position.reportsTo'
                          : 'Manually entered supervisor'}>
                          {resolved.name}
                          {resolved.source === 'auto' && (
                            <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>
                              (auto)
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '5px 10px', color: 'var(--muted)' }}>
                    {p.deputy || <span>—</span>}
                  </td>
                  <td style={{ padding: '5px 10px' }}>
                    <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {pastDue && <AlertChip kind="past-due" />}
                      {approaching && !pastDue && <AlertChip kind="approaching" />}
                      {!approaching && !pastDue && <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selectedProbation && (
        <ProbationDetail
          probation={selectedProbation}
          positions={positions}
          peopleByName={peopleIndex.byName}
          peopleByEmplId={peopleIndex.byEmplId}
          peopleList={peopleIndex.list}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Track DBI's probationary employees. KosPos is the system of record —
        there is no upstream PS HCM source for probation. End-date auto-
        computes from start + hours (assuming full-time equivalence); override
        in the detail editor when FTE differs. Status workflow:
        open → extended → cleared / failed / resigned. Alerts:
        <strong> ⏳ Approaching</strong> = end date within 30 days;
        <strong> ⚠ Past due</strong> = end today or past with no completion.
        Rows are in-memory; persistence to IndexedDB lands in Phase 2.2.33 snapshots/.
        Session JSON save/load preserves the list across page reloads.
      </div>
    </div>
  );
}
