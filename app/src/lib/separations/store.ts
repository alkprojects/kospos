/**
 * PendingSeparation Zustand store — in-memory CRUD over PendingSeparations.
 *
 * Mirrors `lib/staffing-plan/store.ts:useStaffingPlan` shape — Map-keyed
 * by id, history-audit-on-update, `restoreFromSession` helper for the
 * `lib/session/snapshot.ts` roundtrip. Persisted since Phase 2.2.q: rows
 * are captured into the session snapshot, auto-saved to IndexedDB and
 * restored on app open (`lib/session/use-auto-persistence.ts`), and ride
 * along in a session-file save / Cloudflare publish.
 *
 * History tracking: every `updateSeparation` call diffs the patch against
 * the existing row and appends one `SeparationHistoryEntry` per changed
 * top-level field. An optional `overrideReason` argument flows into the
 * audit entry — but only on the `status` field, since other fields don't
 * have a guard to override. v1 doesn't track `user`; v2 will when auth
 * lands. The history list is append-only.
 */

import { create } from 'zustand';
import { normalizePositionKey } from '../chartfields/resolve';
import { newSeparationId } from './build';
import type {
  ConfidenceLevel,
  PendingSeparation,
  SeparationHistoryEntry,
  SeparationStatus,
} from './types';

/** Patch shape — every PendingSeparation field except `id`, `createdAt`,
 *  and `history`, all optional. The store appends history entries
 *  automatically on update; callers don't supply them. */
export type SeparationPatch = Partial<Omit<PendingSeparation, 'id' | 'createdAt' | 'history'>>;

/** Initial-creation shape — only `employeeName` is required; everything
 *  else has sensible defaults (status=`rumored`, confidence=`medium`,
 *  notes=``). */
export interface NewSeparationInput {
  employeeName: string;
  employeeId?: string;
  positionId?: string;
  positionDisplayNumber?: string;
  jobCode?: string;
  status?: SeparationStatus;
  confidence?: ConfidenceLevel;
  expectedSeparationDate?: string;
  separationReason?: string;
  notes?: string;
  linkedActionId?: string;
}

interface SeparationsState {
  /** All separations keyed by id. */
  separations: Map<string, PendingSeparation>;
  /** Add a new separation. Returns the generated id. */
  addSeparation: (input: NewSeparationInput) => string;
  /**
   * Update an existing separation; appends history entries for changed
   * fields. No-op when the id isn't in the map.
   *
   * `overrideReason` is logged on the `status` field's history entry only
   * (other fields don't have a guard to override). The status-transition
   * guard itself lives in `build.ts:isAllowedSeparationStatusTransition`;
   * the store doesn't enforce it (keeps policy out of the store layer —
   * the UI is responsible for offering or hiding the override affordance).
   */
  updateSeparation: (id: string, patch: SeparationPatch, overrideReason?: string) => void;
  /** Delete a separation by id. Returns true if a row was removed. */
  deleteSeparation: (id: string) => boolean;
  /** Snapshot of all separations as an array (in insertion order). */
  toArray: () => PendingSeparation[];
  /** Reset to empty state. */
  clearAll: () => void;
  /** Replace `separations` wholesale from a session-snapshot restore.
   *  Used by `lib/session/snapshot.ts`. */
  restoreFromSession: (separations: ReadonlyArray<readonly [string, PendingSeparation]>) => void;
}

/**
 * Diff two values and produce a SeparationHistoryEntry. Returns null when
 * the values are deeply equal (so we don't log no-op updates).
 *
 * The deep-equality check uses JSON serialization — fine for the
 * scalar-and-string fields PendingSeparation carries; if we add a Map or
 * Date field later we'll switch to a smarter comparer.
 */
function diffField(
  field: string,
  before: unknown,
  after: unknown,
  at: string,
  overrideReason?: string,
): SeparationHistoryEntry | null {
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  const entry: SeparationHistoryEntry = { at, field, before: before ?? null, after: after ?? null };
  if (overrideReason) entry.overrideReason = overrideReason;
  return entry;
}

export const useSeparations = create<SeparationsState>((set, get) => ({
  separations: new Map<string, PendingSeparation>(),

  addSeparation: (input) => {
    const id = newSeparationId();
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
    const status: SeparationStatus = input.status ?? 'rumored';
    const sep: PendingSeparation = {
      id,
      employeeName: input.employeeName,
      employeeId: input.employeeId,
      positionId,
      positionDisplayNumber,
      jobCode: input.jobCode,
      status,
      confidence: input.confidence ?? 'medium',
      expectedSeparationDate: input.expectedSeparationDate,
      separationReason: input.separationReason,
      notes: input.notes ?? '',
      linkedActionId: input.linkedActionId,
      history: [{ at: now, field: '__created', before: null, after: status }],
      createdAt: now,
    };
    set(state => {
      const next = new Map(state.separations);
      next.set(id, sep);
      return { separations: next };
    });
    return id;
  },

  updateSeparation: (id, patch, overrideReason) => {
    set(state => {
      const cur = state.separations.get(id);
      if (!cur) return state;
      const at = new Date().toISOString();
      const newHistory: SeparationHistoryEntry[] = [];

      // Walk the patch and diff each provided field against current.
      const merged: PendingSeparation = { ...cur };
      for (const k of Object.keys(patch) as Array<keyof SeparationPatch>) {
        const before = cur[k as keyof PendingSeparation];
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
      const next = new Map(state.separations);
      next.set(id, merged);
      return { separations: next };
    });
  },

  deleteSeparation: (id) => {
    const cur = get().separations.get(id);
    if (!cur) return false;
    set(state => {
      const next = new Map(state.separations);
      next.delete(id);
      return { separations: next };
    });
    return true;
  },

  toArray: () => [...get().separations.values()],
  clearAll: () => set({ separations: new Map() }),
  restoreFromSession: (separations) => set({ separations: new Map(separations) }),
}));
