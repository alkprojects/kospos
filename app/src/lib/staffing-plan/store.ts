/**
 * Staffing Plan Zustand store — in-memory CRUD over PlannedActions.
 *
 * Mirrors `lib/positions/notes.ts:usePositionNotes` shape (Map-backed,
 * v1-in-memory, persistence deferred). Same caveat: notes/actions are lost
 * on page reload until Phase 2.2.33 `snapshots/` adds IndexedDB durability.
 *
 * The store keys actions by their own `id`, not by `positionId`, so the
 * multi-action-per-position pattern (Marco Jacobo TX case) works without
 * special-casing. Filter via `actionsForPosition()` in `build.ts` when you
 * need the per-position slice.
 *
 * History tracking: every `updateAction` call diffs the patch against the
 * existing action and appends one `PlannedActionHistory` entry per changed
 * top-level field. v1 only logs the field name + before/after; v2 (when
 * auth lands) will add `user`. The history list is append-only and never
 * pruned by the store itself — Restated Q #10's "18 months with summary
 * roll-up" retention policy lives downstream of the entity layer.
 */

import { create } from 'zustand';
import { normalizePositionKey } from '../chartfields/resolve';
import { newActionId } from './build';
import type {
  PlannedAction,
  PlannedActionHistory,
  PlannedActionType,
} from './types';

/** Patch shape — every PlannedAction field except `id`, `plannedAt`, and
 *  `history`, all optional. The store appends history entries automatically
 *  on update; callers don't supply them. */
export type PlannedActionPatch = Partial<Omit<PlannedAction, 'id' | 'plannedAt' | 'history'>>;

/** Initial-creation shape — `type` + `positionId` are required; everything
 *  else has sensible defaults that match Tab 24's "Not started" baseline. */
export interface NewPlannedActionInput {
  positionId: string;
  type: PlannedActionType;
  /** Original (display) form — auto-derived to be the same as `positionId`
   *  when omitted. */
  displayNumber?: string;
  /** Optional initial values for the more-common fields. */
  status?: PlannedAction['status'];
  notes?: string;
  basis?: PlannedAction['basis'];
  actionMode?: PlannedAction['actionMode'];
  separationConfidence?: PlannedAction['separationConfidence'];
  startPpe?: string;
  holdReason?: string;
}

interface StaffingPlanState {
  /** All actions keyed by id. */
  actions: Map<string, PlannedAction>;
  /** Add a new action. Returns the generated id. */
  addAction: (input: NewPlannedActionInput) => string;
  /** Update an existing action; appends history entries for changed
   *  fields. No-op when the id isn't in the map. */
  updateAction: (id: string, patch: PlannedActionPatch) => void;
  /** Delete an action by id. Returns true if a row was removed. */
  deleteAction: (id: string) => boolean;
  /** Snapshot of all actions as an array (in insertion order). */
  toArray: () => PlannedAction[];
  /** Reset to empty state. */
  clearAll: () => void;
}

/**
 * Diff two values and produce a PlannedActionHistory entry. Returns null
 * when the values are deeply equal (so we don't log no-op updates).
 *
 * The deep-equality check uses JSON serialization — fine for the
 * scalar-and-string fields PlannedAction carries; if we add a Map or Date
 * field later we'll switch to a smarter comparer.
 */
function diffField(field: string, before: unknown, after: unknown, at: string): PlannedActionHistory | null {
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  return { at, field, before: before ?? null, after: after ?? null };
}

export const useStaffingPlan = create<StaffingPlanState>((set, get) => ({
  actions: new Map<string, PlannedAction>(),

  addAction: (input) => {
    const id = newActionId();
    const positionId = normalizePositionKey(input.positionId);
    const now = new Date().toISOString();
    const action: PlannedAction = {
      id,
      positionId,
      displayNumber: input.displayNumber ?? input.positionId,
      type: input.type,
      status: input.status ?? (input.type === 'active-hire' ? 'not-started' : null),
      basis: input.basis ?? null,
      notes: input.notes ?? '',
      actionMode: input.actionMode,
      separationConfidence: input.separationConfidence,
      startPpe: input.startPpe,
      holdReason: input.holdReason,
      plannedAt: now,
      history: [{ at: now, field: '__created', before: null, after: input.type }],
    };
    set(state => {
      const next = new Map(state.actions);
      next.set(id, action);
      return { actions: next };
    });
    return id;
  },

  updateAction: (id, patch) => {
    set(state => {
      const cur = state.actions.get(id);
      if (!cur) return state;
      const at = new Date().toISOString();
      const newHistory: PlannedActionHistory[] = [];

      // Walk the patch and diff each provided field against current.
      const merged: PlannedAction = { ...cur };
      for (const k of Object.keys(patch) as Array<keyof PlannedActionPatch>) {
        const before = cur[k as keyof PlannedAction];
        const after = patch[k];
        const entry = diffField(String(k), before, after, at);
        if (entry) {
          newHistory.push(entry);
          // Apply the change. The cast is safe — `patch[k]` is typed against
          // PlannedAction[k]'s union via PlannedActionPatch.
          (merged as unknown as Record<string, unknown>)[k as string] = after;
        }
      }

      // If nothing actually changed, leave the map unchanged so React
      // doesn't see a new reference and re-render.
      if (newHistory.length === 0) return state;

      merged.history = [...cur.history, ...newHistory];
      const next = new Map(state.actions);
      next.set(id, merged);
      return { actions: next };
    });
  },

  deleteAction: (id) => {
    const cur = get().actions.get(id);
    if (!cur) return false;
    set(state => {
      const next = new Map(state.actions);
      next.delete(id);
      return { actions: next };
    });
    return true;
  },

  toArray: () => [...get().actions.values()],

  clearAll: () => set({ actions: new Map() }),
}));
