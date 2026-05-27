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
  /**
   * Last date a BFM Position eturn was imported. ISO yyyy-mm-dd. BFM eturns
   * don't carry a natural "as-of" timestamp on their rows the way OBI rows
   * do (via _asOfDate = MAX earningPeriodEnd), so the store stamps the
   * import wall-clock instead. Cleared by `clearAll`. Empty string when no
   * BFM has loaded yet.
   */
  lastBfmImportAt: string;
  addRows: (rows: ImportedRow[]) => void;
  clearAll: () => void;
  /**
   * Replace loadedRows + lastBfmImportAt wholesale from a session-snapshot
   * restore. Re-runs the quality rules so `issues` stays consistent. Used
   * by `lib/session/snapshot.ts`.
   */
  restoreFromSession: (loadedRows: ImportedRow[], lastBfmImportAt: string) => void;
}

function runRules(rows: ImportedRow[]): Issue[] {
  return ALL_RULES.flatMap(rule => rule.check(rows));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAppStore = create<AppState>((set) => ({
  loadedRows: [],
  issues: [],
  lastBfmImportAt: '',
  addRows: (newRows) =>
    set(state => {
      const loadedRows = [...state.loadedRows, ...newRows];
      // If any newly-added rows are BFM Position, stamp the import time so
      // BudgetSnapshot can surface a meaningful asOf.
      const hasBfm = newRows.some(r => r._source === 'bfm-position');
      return {
        loadedRows,
        issues: runRules(loadedRows),
        lastBfmImportAt: hasBfm ? todayISO() : state.lastBfmImportAt,
      };
    }),
  clearAll: () => set({ loadedRows: [], issues: [], lastBfmImportAt: '' }),
  restoreFromSession: (loadedRows, lastBfmImportAt) =>
    set({ loadedRows, lastBfmImportAt, issues: runRules(loadedRows) }),
}));
