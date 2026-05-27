/**
 * Position userNotes store — per [memory feedback_user_notes_per_position.md].
 *
 * Free-text notes keyed by normalized position id. Survive snapshot
 * replacements (the snapshot reload replaces rows but not notes — the user's
 * "Cat 18 set up for 5-year IS project per DHR override letter" context stays
 * attached to the position).
 *
 * v1 storage: in-memory zustand slice. Persistence to IndexedDB (`idb`) lands
 * in a follow-up PR — until then, notes are lost on page reload. This is
 * acceptable because the spine view will surface a banner reminding the user
 * notes aren't yet persisted; the schema is stable so persistence is purely
 * additive.
 */

import { create } from 'zustand';

interface NotesState {
  notes: Map<string, string>;
  setNote: (positionId: string, note: string) => void;
  clearAll: () => void;
  /** Replace `notes` wholesale from a session-snapshot restore. Used by
   *  `lib/session/snapshot.ts`. */
  restoreFromSession: (entries: ReadonlyArray<readonly [string, string]>) => void;
}

export const usePositionNotes = create<NotesState>((set) => ({
  notes: new Map<string, string>(),
  setNote: (positionId, note) =>
    set(state => {
      const next = new Map(state.notes);
      if (note.trim() === '') next.delete(positionId);
      else next.set(positionId, note);
      return { notes: next };
    }),
  clearAll: () => set({ notes: new Map() }),
  restoreFromSession: (entries) =>
    set({ notes: new Map(entries) }),
}));
