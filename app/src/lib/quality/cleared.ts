/**
 * Cleared-findings store — lets the user dismiss a quality finding as
 * "not an error" with a written explanation, so the noisy rules stay usable.
 *
 * Keyed on ruleId + positionNumber + emplId — NOT sourceRows. Sheet row
 * numbers renumber on every re-import, but a finding's identity (this rule,
 * this position, this employee) is stable, so a clear survives a fresh import
 * and re-suppresses the same finding when it fires again.
 *
 * Storage mirrors [usePositionNotes] (`lib/positions/notes.ts`): a zustand
 * slice captured into the session snapshot, auto-saved to IndexedDB (the light
 * `planning` record) + carried in a session-file save / Cloudflare publish, so
 * a clear survives a reload and a published snapshot.
 */

import { create } from 'zustand';

export interface ClearedFinding {
  /** The user's explanation of why this finding isn't a real error. */
  reason: string;
  /** ISO timestamp the finding was cleared. */
  clearedAt: string;
}

/**
 * Stable identity for a finding across re-imports: rule + position + employee.
 * Deliberately excludes `sourceRows` (1-based sheet rows), which renumber on
 * every import. Two findings that share a (rule, position, employee) tuple are
 * cleared together — acceptable, since they describe the same underlying item.
 */
export function clearedKey(ruleId: string, positionNumber?: string, emplId?: string): string {
  return `${ruleId}|${positionNumber ?? ''}|${emplId ?? ''}`;
}

interface ClearedState {
  cleared: Map<string, ClearedFinding>;
  /** Mark a finding cleared (or update its reason). Stamps `clearedAt` now. */
  setCleared: (key: string, reason: string) => void;
  /** Un-clear a finding — it returns to the active list. No-op if absent. */
  restore: (key: string) => void;
  clearAll: () => void;
  /** Replace `cleared` wholesale from a session-snapshot restore. Used by
   *  `lib/session/snapshot.ts` via the auto-persistence restore path. */
  restoreFromSession: (entries: ReadonlyArray<readonly [string, ClearedFinding]>) => void;
}

export const useClearedFindings = create<ClearedState>((set) => ({
  cleared: new Map<string, ClearedFinding>(),
  setCleared: (key, reason) =>
    set(state => {
      const next = new Map(state.cleared);
      next.set(key, { reason, clearedAt: new Date().toISOString() });
      return { cleared: next };
    }),
  restore: (key) =>
    set(state => {
      if (!state.cleared.has(key)) return state;
      const next = new Map(state.cleared);
      next.delete(key);
      return { cleared: next };
    }),
  clearAll: () => set({ cleared: new Map() }),
  restoreFromSession: (entries) => set({ cleared: new Map(entries) }),
}));
