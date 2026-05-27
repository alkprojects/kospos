/**
 * Probation Zustand store — in-memory CRUD over Probations.
 *
 * Mirrors `lib/separations/store.ts:useSeparations` shape — Map-keyed by
 * id, history-audit-on-update, `restoreFromSession` helper for the
 * `lib/session/snapshot.ts` roundtrip. Same caveat applies: rows are lost
 * on page reload until Phase 2.2.33 `snapshots/` adds IndexedDB
 * durability; in the interim, save / load via the session JSON file.
 *
 * History tracking: every `updateProbation` call diffs the patch against
 * the existing row and appends one `ProbationHistoryEntry` per changed
 * top-level field. An optional `overrideReason` argument flows into the
 * audit entry — but only on the `status` field, since other fields don't
 * have a guard to override. v1 doesn't track `user`; v2 will when auth
 * lands. The history list is append-only.
 *
 * Extension events use a dedicated `addExtension` action (rather than
 * patching the `extensions` array directly) so the audit log records a
 * meaningful "extended to YYYY-MM-DD" entry rather than an array diff.
 */

import { create } from 'zustand';
import { normalizePositionKey } from '../chartfields/resolve';
import { newProbationId } from './build';
import type {
  Probation,
  ProbationExtension,
  ProbationHistoryEntry,
  ProbationStatus,
  ProbationaryPeriodHours,
} from './types';

/** Patch shape — every Probation field except `id`, `createdAt`,
 *  `history`, and `extensions`, all optional. Extensions are added via
 *  the dedicated `addExtension` action so the audit log records a useful
 *  extension event rather than an array diff. */
export type ProbationPatch = Partial<
  Omit<Probation, 'id' | 'createdAt' | 'history' | 'extensions'>
>;

/** Initial-creation shape — `employeeName`, `probationaryPeriodHours`,
 *  and `startWorkDate` are required; everything else has sensible defaults
 *  (status=`open`, notes=``, extensions=`[]`). */
export interface NewProbationInput {
  employeeName: string;
  probationaryPeriodHours: ProbationaryPeriodHours;
  startWorkDate: string;
  employeeId?: string;
  positionId?: string;
  positionDisplayNumber?: string;
  jobCode?: string;
  baseEndDate?: string;
  status?: ProbationStatus;
  supervisor?: string;
  deputy?: string;
  completionDate?: string;
  notes?: string;
}

interface ProbationsState {
  /** All probations keyed by id. */
  probations: Map<string, Probation>;
  /** Add a new probation. Returns the generated id. */
  addProbation: (input: NewProbationInput) => string;
  /**
   * Update an existing probation; appends history entries for changed
   * fields. No-op when the id isn't in the map.
   *
   * `overrideReason` is logged on the `status` field's history entry only
   * (other fields don't have a guard to override). The status-transition
   * guard itself lives in `build.ts:isAllowedProbationStatusTransition`;
   * the store doesn't enforce it (keeps policy out of the store layer —
   * the UI is responsible for offering or hiding the override affordance).
   */
  updateProbation: (id: string, patch: ProbationPatch, overrideReason?: string) => void;
  /**
   * Append a new extension to a probation. Sets status to `extended` if
   * the probation is currently `open`. Logs an `extensions` history entry.
   * No-op when the id isn't in the map.
   */
  addExtension: (id: string, extension: Omit<ProbationExtension, 'extendedAt'>) => void;
  /** Delete a probation by id. Returns true if a row was removed. */
  deleteProbation: (id: string) => boolean;
  /** Snapshot of all probations as an array (in insertion order). */
  toArray: () => Probation[];
  /** Reset to empty state. */
  clearAll: () => void;
  /** Replace `probations` wholesale from a session-snapshot restore.
   *  Used by `lib/session/snapshot.ts`. */
  restoreFromSession: (probations: ReadonlyArray<readonly [string, Probation]>) => void;
}

/**
 * Diff two values and produce a ProbationHistoryEntry. Returns null when
 * the values are deeply equal (so we don't log no-op updates).
 *
 * The deep-equality check uses JSON serialization — fine for the
 * scalar-and-string fields Probation carries; if we add a Map or Date
 * field later we'll switch to a smarter comparer.
 */
function diffField(
  field: string,
  before: unknown,
  after: unknown,
  at: string,
  overrideReason?: string,
): ProbationHistoryEntry | null {
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  const entry: ProbationHistoryEntry = { at, field, before: before ?? null, after: after ?? null };
  if (overrideReason) entry.overrideReason = overrideReason;
  return entry;
}

export const useProbations = create<ProbationsState>((set, get) => ({
  probations: new Map<string, Probation>(),

  addProbation: (input) => {
    const id = newProbationId();
    const now = new Date().toISOString();
    // Normalize the position id defensively. Empty string after
    // normalization → leave both id + displayNumber undefined so downstream
    // joins don't accidentally match on '' (which would be the wrong
    // signal — "no position attached" vs "position with empty id").
    const positionKey = input.positionId ? normalizePositionKey(input.positionId) : '';
    const positionId = positionKey || undefined;
    const positionDisplayNumber = positionId
      ? (input.positionDisplayNumber ?? input.positionId)
      : undefined;
    const status: ProbationStatus = input.status ?? 'open';
    const prob: Probation = {
      id,
      employeeName: input.employeeName,
      employeeId: input.employeeId,
      positionId,
      positionDisplayNumber,
      jobCode: input.jobCode,
      probationaryPeriodHours: input.probationaryPeriodHours,
      startWorkDate: input.startWorkDate,
      baseEndDate: input.baseEndDate,
      extensions: [],
      status,
      supervisor: input.supervisor,
      deputy: input.deputy,
      completionDate: input.completionDate,
      notes: input.notes ?? '',
      history: [{ at: now, field: '__created', before: null, after: status }],
      createdAt: now,
    };
    set(state => {
      const next = new Map(state.probations);
      next.set(id, prob);
      return { probations: next };
    });
    return id;
  },

  updateProbation: (id, patch, overrideReason) => {
    set(state => {
      const cur = state.probations.get(id);
      if (!cur) return state;
      const at = new Date().toISOString();
      const newHistory: ProbationHistoryEntry[] = [];

      // Walk the patch and diff each provided field against current.
      const merged: Probation = { ...cur };
      for (const k of Object.keys(patch) as Array<keyof ProbationPatch>) {
        const before = cur[k as keyof Probation];
        // If the caller supplied a positionId, normalize it before diff +
        // store. This keeps the join-key invariant intact: positionId is
        // always normalized, never the raw display form.
        let after: unknown = patch[k];
        if (k === 'positionId' && typeof after === 'string') {
          const norm = normalizePositionKey(after);
          after = norm || undefined;
        }
        // Override-reason is meaningful only on the `status` field — the
        // guard is a status-transition concept, no other field has a guard.
        const reason = (k === 'status' && overrideReason) ? overrideReason : undefined;
        const entry = diffField(String(k), before, after, at, reason);
        if (entry) {
          newHistory.push(entry);
          (merged as unknown as Record<string, unknown>)[k as string] = after;
        }
      }

      // If nothing actually changed, leave the map unchanged so React
      // doesn't see a new reference and re-render.
      if (newHistory.length === 0) return state;

      merged.history = [...cur.history, ...newHistory];
      const next = new Map(state.probations);
      next.set(id, merged);
      return { probations: next };
    });
  },

  addExtension: (id, extension) => {
    set(state => {
      const cur = state.probations.get(id);
      if (!cur) return state;
      const at = new Date().toISOString();
      const newExtension: ProbationExtension = {
        extendedAt: at,
        newEndDate: extension.newEndDate,
        reason: extension.reason,
      };
      const nextExtensions = [...cur.extensions, newExtension];
      const merged: Probation = { ...cur, extensions: nextExtensions };
      const history: ProbationHistoryEntry[] = [
        ...cur.history,
        {
          at,
          field: 'extensions',
          before: cur.extensions,
          after: nextExtensions,
        },
      ];
      // Auto-transition open → extended on first extension. Subsequent
      // extensions leave the status alone (extended → extended is no-op).
      if (cur.status === 'open') {
        merged.status = 'extended';
        history.push({
          at,
          field: 'status',
          before: 'open',
          after: 'extended',
        });
      }
      merged.history = history;
      const next = new Map(state.probations);
      next.set(id, merged);
      return { probations: next };
    });
  },

  deleteProbation: (id) => {
    const cur = get().probations.get(id);
    if (!cur) return false;
    set(state => {
      const next = new Map(state.probations);
      next.delete(id);
      return { probations: next };
    });
    return true;
  },

  toArray: () => [...get().probations.values()],
  clearAll: () => set({ probations: new Map() }),
  restoreFromSession: (probations) => set({ probations: new Map(probations) }),
}));
