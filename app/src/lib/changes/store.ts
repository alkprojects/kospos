/**
 * Stub Zustand store for proposed changes.
 * No UI yet — just the store shape. Modules will use this in Phase 8+.
 */

import { create } from 'zustand';
import type { ProposedChange } from './types';

interface ChangesState {
  changes: ProposedChange[];
  /** Change Mode is off by default; toggling it enables edit recording. */
  changeModeActive: boolean;
  toggleChangeMode: () => void;
  addChange: (change: ProposedChange) => void;
  removeChange: (id: string) => void;
  clearAll: () => void;
}

export const useChangesStore = create<ChangesState>((set) => ({
  changes: [],
  changeModeActive: false,
  toggleChangeMode: () =>
    set(state => ({ changeModeActive: !state.changeModeActive })),
  addChange: (change) =>
    set(state => ({ changes: [...state.changes, change] })),
  removeChange: (id) =>
    set(state => ({ changes: state.changes.filter(c => c.id !== id) })),
  clearAll: () => set({ changes: [] }),
}));
