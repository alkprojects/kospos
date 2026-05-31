/**
 * useSessionSnapshot — shared session-snapshot plumbing.
 *
 * Extracted from SessionExportImport (Phase 2.2.u) so the local-file Save /
 * Load controls (now in the header top bar — `SessionSaveLoad`) and the
 * Publish + Cloudflare-settings panel (still on the Load Reports tab —
 * `SessionExportImport`) build the *exact same* snapshot from one place. No
 * risk of the two surfaces drifting as new session fields are added.
 *
 * Returns: the in-memory snapshot builder, the per-store `counts` for the
 * status summary, an `isEmpty` gate that disables Save/Publish, and the file
 * Save + Load actions. Each consumer renders its own status UI.
 */

import { useAppStore } from '../store';
import { useStaffingPlan } from '../staffing-plan';
import { useSeparations } from '../separations';
import { useProbations } from '../probation';
import { usePositionNotes } from '../positions/notes';
import { useClearedFindings } from '../quality/cleared';
import { useScrapers } from '../scrapers/store';
import {
  buildSessionFile,
  defaultSessionFilename,
  parseSessionFile,
} from './snapshot';
import { restoreStoresFromPayload } from './use-auto-persistence';

export interface SessionCounts {
  loadedRows: number;
  actions: number;
  hidden: number;
  notes: number;
  separations: number;
  probations: number;
  postings: number;
  eligibilityLists: number;
}

export type SessionLoadOutcome =
  | { ok: true; filename: string; rowCount: number }
  | { ok: false; message: string };

export interface UseSessionSnapshot {
  buildCurrentSnapshot: () => ReturnType<typeof buildSessionFile>;
  counts: SessionCounts;
  /** True when every store the snapshot reads is empty — gates Save + Publish. */
  isEmpty: boolean;
  /** Build + download the snapshot as a JSON file. Returns its filename + row count. */
  saveToFile: () => { filename: string; rowCount: number };
  /** Parse + restore a previously-saved session file. Replaces the current session. */
  loadFromFile: (file: File) => Promise<SessionLoadOutcome>;
}

export function useSessionSnapshot(): UseSessionSnapshot {
  const loadedRows = useAppStore(s => s.loadedRows);
  const lastBfmImportAt = useAppStore(s => s.lastBfmImportAt);

  const staffingActions = useStaffingPlan(s => s.actions);
  const staffingDerivedRemoved = useStaffingPlan(s => s.derivedRemoved);

  const pendingSeparations = useSeparations(s => s.separations);

  const probations = useProbations(s => s.probations);

  const notes = usePositionNotes(s => s.notes);

  const clearedFindings = useClearedFindings(s => s.cleared);

  // Per-field selectors (NOT an object-returning selector) so Zustand's
  // useSyncExternalStore doesn't see a fresh reference every render.
  const jobPostings = useScrapers(s => s.jobPostings);
  const jobPostingsRefreshedAt = useScrapers(s => s.jobPostingsRefreshedAt);
  const eligibilityLists = useScrapers(s => s.eligibilityLists);
  const eligibilityListsRefreshedAt = useScrapers(s => s.eligibilityListsRefreshedAt);
  const pdfCache = useScrapers(s => s.pdfCache);

  function buildCurrentSnapshot() {
    return buildSessionFile({
      loadedRows,
      lastBfmImportAt,
      staffingPlanActions: staffingActions,
      staffingPlanDerivedRemoved: staffingDerivedRemoved,
      positionNotes: notes,
      pendingSeparations,
      probations,
      clearedFindings,
      jobPostings,
      jobPostingsRefreshedAt,
      eligibilityLists,
      eligibilityListsRefreshedAt,
      pdfCache,
    });
  }

  const counts: SessionCounts = {
    loadedRows: loadedRows.length,
    actions: staffingActions.size,
    hidden: staffingDerivedRemoved.size,
    notes: notes.size,
    separations: pendingSeparations.size,
    probations: probations.size,
    postings: jobPostings.length,
    eligibilityLists: eligibilityLists.length,
  };

  const isEmpty =
    counts.loadedRows === 0 && counts.actions === 0 && counts.notes === 0 &&
    counts.hidden === 0 && counts.separations === 0 && counts.probations === 0 &&
    counts.postings === 0 && counts.eligibilityLists === 0;

  function saveToFile() {
    const file = buildCurrentSnapshot();
    const json = JSON.stringify(file, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = defaultSessionFilename(new Date());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { filename, rowCount: loadedRows.length };
  }

  async function loadFromFile(file: File): Promise<SessionLoadOutcome> {
    const text = await file.text();
    const result = parseSessionFile(text);
    if (!result.ok) {
      const message = (() => {
        switch (result.reason) {
          case 'invalid-json':
            return `Not a valid JSON file: ${result.detail}`;
          case 'not-a-session-file':
            return `This doesn't look like a KosPos session file. ${result.detail}`;
          case 'schema-mismatch':
            return `Schema version mismatch (file v${result.got}, app expects v${result.expected}). Save a fresh session in the current build.`;
        }
      })();
      return { ok: false, message };
    }
    const { payload } = result.file;
    // Restore through the SAME shared helper the IDB auto-restore path uses
    // (use-auto-persistence) so the two load paths can't drift. This restores
    // all six stores — including the scraper data (job postings / eligibility
    // lists / pdfCache) that an earlier version silently dropped on a manual
    // file-load (Phase 2.2.w / carry-forward M; the snapshot always *carried*
    // it via buildCurrentSnapshot — only this restore was missing it).
    // restoreFromSession defaults the back-compat-optional fields (separations
    // / probations / scrapers) to empty, and a load replaces the session
    // (existing in-memory rows are wiped).
    restoreStoresFromPayload(result.file);
    return { ok: true, filename: file.name, rowCount: payload.loadedRows.length };
  }

  return { buildCurrentSnapshot, counts, isEmpty, saveToFile, loadFromFile };
}
