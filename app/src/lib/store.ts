/**
 * Global app state — loaded report data and computed quality issues.
 */

import { create } from 'zustand';
import type { ImportedRow } from './importers/types';
import type { Issue } from './quality/types';
import { ALL_RULES } from './quality';

interface AppState {
  /** All rows loaded from all uploaded files, across all report types. */
  loadedRows: ImportedRow[];
  /** Computed quality issues across all loaded data. Updated on every load. */
  issues: Issue[];
  addRows: (rows: ImportedRow[]) => void;
  clearAll: () => void;
}

function runRules(rows: ImportedRow[]): Issue[] {
  return ALL_RULES.flatMap(rule => rule.check(rows));
}

export const useAppStore = create<AppState>((set) => ({
  loadedRows: [],
  issues: [],
  addRows: (newRows) =>
    set(state => {
      const loadedRows = [...state.loadedRows, ...newRows];
      return { loadedRows, issues: runRules(loadedRows) };
    }),
  clearAll: () => set({ loadedRows: [], issues: [] }),
}));
