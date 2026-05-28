/**
 * useAutoSessionPersistence — Phase 2.2.q PR 1.
 *
 * React hook that wires together:
 *
 *   1. **Auto-load on app open.** On first mount, reads the snapshot
 *      from IDB (if any), re-validates it via `parseSessionFile`, and
 *      fans the payload back into all six Zustand stores (appStore,
 *      staffingPlan, separations, probations, positionNotes, scrapers).
 *      Per Alex's S40 design pick: auto-load silently — no prompt — and
 *      surface the loaded data via the Landing tab's data-dashboard.
 *
 *   2. **Auto-save on state change.** After the initial load (and only
 *      after — we don't want the load itself to trigger a save), every
 *      meaningful Zustand state change debounces a 500ms timer; on
 *      timer fire, the current state is serialized to a SessionFile +
 *      written to IDB. Debounce coalesces bulk imports (10k+ rows) into
 *      one IDB write rather than 10k.
 *
 *   3. **Status tracking.** Returns `{ status, lastSavedAt, lastError }`
 *      so the Landing page can show "Snapshot from 2026-05-28 14:35
 *      (auto-saved)" + any IDB errors (private browsing, quota).
 *
 * Lifecycle:
 *   - Mount → set status to 'loading' → IDB load → restore or skip →
 *     subscribe to stores → status 'idle' (or 'loaded'/'empty').
 *   - On every store change → debounce 500ms → write → status 'saving'
 *     → success → status 'saved' + lastSavedAt timestamp.
 *   - Unmount → cancel timer + unsubscribe.
 *
 * Why one hook for all six stores rather than per-store:
 *   - The snapshot is a single envelope — we save / load atomically so
 *     stale partial states don't appear after a crashed save.
 *   - One debounce timer means a multi-store change (e.g. addRows that
 *     triggers a quality rules run that updates issues) only writes once.
 *
 * Pure logic lives in helper functions exported for unit testing; the
 * hook itself is a thin React adapter.
 */

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useStaffingPlan } from '../staffing-plan';
import { useSeparations } from '../separations';
import { useProbations } from '../probation';
import { usePositionNotes } from '../positions/notes';
import { useScrapers } from '../scrapers/store';
import {
  buildSessionFile,
  parseSessionFile,
  type SessionFile,
} from './snapshot';
import {
  loadSnapshotFromIdb,
  saveSnapshotToIdb,
} from './idb-persistence';

/** Public status enum surfaced through the hook. */
export type AutoPersistenceStatus =
  | 'init'        // before first mount
  | 'loading'    // IDB read in flight
  | 'empty'       // no snapshot in IDB
  | 'loaded'      // snapshot loaded successfully
  | 'load-error' // IDB read or parse failed
  | 'saving'    // IDB write in flight
  | 'saved'       // last write succeeded
  | 'save-error'; // last write failed

export interface AutoPersistenceState {
  status: AutoPersistenceStatus;
  /** ISO timestamp of the last successful save. Empty when never saved. */
  lastSavedAt: string;
  /** Last error message; empty when no error. Surfaced to the user via
   *  the Landing dashboard. */
  lastError: string;
  /** ISO timestamp of the loaded snapshot's `savedAt` field. Empty when
   *  no snapshot loaded. Surfaced as "Snapshot from <date>" on Landing. */
  loadedSnapshotSavedAt: string;
}

/** Debounce window for the auto-save timer. 500ms coalesces bulk
 *  operations (e.g. addRows that calls runRules then setIssues) into
 *  one IDB write. Tuned by hand; if the user types fast on a per-position
 *  note and the cursor lags, drop to 300ms. */
const SAVE_DEBOUNCE_MS = 500;

/**
 * Restore the parsed payload into the six Zustand stores. Pure function
 * over the store-restoration helpers — exported for unit tests so we
 * don't have to spin up the real hook to verify the wiring.
 */
export function restoreStoresFromPayload(file: SessionFile): void {
  const { payload } = file;
  useAppStore.getState().restoreFromSession(
    payload.loadedRows,
    payload.lastBfmImportAt,
  );
  useStaffingPlan.getState().restoreFromSession(
    payload.staffingPlanActions,
    payload.staffingPlanDerivedRemoved,
  );
  usePositionNotes.getState().restoreFromSession(payload.positionNotes);
  useSeparations.getState().restoreFromSession(payload.pendingSeparations ?? []);
  useProbations.getState().restoreFromSession(payload.probations ?? []);
  useScrapers.getState().restoreFromSession({
    jobPostings: payload.jobPostings ?? [],
    jobPostingsRefreshedAt: payload.jobPostingsRefreshedAt ?? '',
    eligibilityLists: payload.eligibilityLists ?? [],
    eligibilityListsRefreshedAt: payload.eligibilityListsRefreshedAt ?? '',
    pdfCache: Object.fromEntries(payload.pdfCache ?? []),
  });
}

/**
 * Build a SessionFile from the live store state. Reads from each
 * store's `getState()` so the snapshot is consistent with the moment
 * of capture (no race vs React re-renders).
 */
export function captureCurrentSnapshot(): SessionFile {
  const app = useAppStore.getState();
  const sp = useStaffingPlan.getState();
  const seps = useSeparations.getState();
  const probs = useProbations.getState();
  const notes = usePositionNotes.getState();
  const scrapers = useScrapers.getState();
  return buildSessionFile({
    loadedRows: app.loadedRows,
    lastBfmImportAt: app.lastBfmImportAt,
    staffingPlanActions: sp.actions,
    staffingPlanDerivedRemoved: sp.derivedRemoved,
    positionNotes: notes.notes,
    pendingSeparations: seps.separations,
    probations: probs.probations,
    jobPostings: scrapers.jobPostings,
    jobPostingsRefreshedAt: scrapers.jobPostingsRefreshedAt,
    eligibilityLists: scrapers.eligibilityLists,
    eligibilityListsRefreshedAt: scrapers.eligibilityListsRefreshedAt,
    pdfCache: scrapers.pdfCache,
  });
}

/**
 * Validate + restore a loaded snapshot. Returns the restored envelope
 * (so the hook can surface `savedAt`) or `null` on validation failure.
 *
 * Why we re-parse even though IDB returns the typed object: the IDB
 * value could be from an older app version that wrote a different
 * envelope shape (different schemaVersion, missing `kind`, etc.). The
 * same validator we use for user-uploaded JSON files protects against
 * stale IDB data after an app upgrade.
 */
export function tryRestoreSnapshot(value: unknown): {
  ok: true;
  file: SessionFile;
} | {
  ok: false;
  error: string;
} {
  // Serialize through JSON to use the existing string-based parser. The
  // overhead is acceptable since we run this once per app open; reusing
  // parseSessionFile means one validation surface to maintain.
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'stringify failed' };
  }
  const result = parseSessionFile(raw);
  if (!result.ok) {
    const detail = (() => {
      switch (result.reason) {
        case 'invalid-json':
          return result.detail;
        case 'not-a-session-file':
          return result.detail;
        case 'schema-mismatch':
          return `schema v${result.got} (app expects v${result.expected})`;
      }
    })();
    return { ok: false, error: `IDB snapshot rejected: ${detail}` };
  }
  restoreStoresFromPayload(result.file);
  return { ok: true, file: result.file };
}

/**
 * The React hook.
 *
 * Returns the current `AutoPersistenceState`. The Landing view
 * subscribes to this to show the "Snapshot from <date>" banner.
 *
 * Pass `enabled: false` to disable the hook entirely (test environments
 * + the storybook-style cases where we don't want IDB writes leaking
 * between tests). Defaults to enabled.
 */
export function useAutoSessionPersistence(opts: { enabled?: boolean } = {}): AutoPersistenceState {
  const { enabled = true } = opts;
  const [state, setState] = useState<AutoPersistenceState>({
    status: 'init',
    lastSavedAt: '',
    lastError: '',
    loadedSnapshotSavedAt: '',
  });
  // Tracks whether the initial load has completed; auto-save is gated
  // on this so the load doesn't immediately trigger a redundant save.
  const loadCompleteRef = useRef(false);
  // Debounce timer handle for the save path.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState(s => ({ ...s, status: 'empty' }));
      return;
    }

    let cancelled = false;

    setState(s => ({ ...s, status: 'loading' }));

    // 1. Load + restore on mount.
    loadSnapshotFromIdb()
      .then(value => {
        if (cancelled) return;
        if (value === null) {
          loadCompleteRef.current = true;
          setState({
            status: 'empty',
            lastSavedAt: '',
            lastError: '',
            loadedSnapshotSavedAt: '',
          });
          return;
        }
        const result = tryRestoreSnapshot(value);
        loadCompleteRef.current = true;
        if (!result.ok) {
          setState({
            status: 'load-error',
            lastSavedAt: '',
            lastError: result.error,
            loadedSnapshotSavedAt: '',
          });
          return;
        }
        setState({
          status: 'loaded',
          lastSavedAt: '',
          lastError: '',
          loadedSnapshotSavedAt: result.file.savedAt,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        loadCompleteRef.current = true;
        setState({
          status: 'load-error',
          lastSavedAt: '',
          lastError: err instanceof Error ? err.message : String(err),
          loadedSnapshotSavedAt: '',
        });
      });

    // 2. Auto-save subscription. Each store's subscribe returns its own
    // unsubscriber; we collect them all + cleanup on unmount.
    const scheduleSave = () => {
      if (!loadCompleteRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setState(s => ({ ...s, status: 'saving' }));
        const file = captureCurrentSnapshot();
        saveSnapshotToIdb(file)
          .then(() => {
            setState(s => ({
              ...s,
              status: 'saved',
              lastSavedAt: file.savedAt,
              lastError: '',
            }));
          })
          .catch((err: unknown) => {
            setState(s => ({
              ...s,
              status: 'save-error',
              lastError: err instanceof Error ? err.message : String(err),
            }));
          });
      }, SAVE_DEBOUNCE_MS);
    };

    const unsubscribers = [
      useAppStore.subscribe(scheduleSave),
      useStaffingPlan.subscribe(scheduleSave),
      useSeparations.subscribe(scheduleSave),
      useProbations.subscribe(scheduleSave),
      usePositionNotes.subscribe(scheduleSave),
      useScrapers.subscribe(scheduleSave),
    ];

    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      for (const unsub of unsubscribers) unsub();
    };
  }, [enabled]);

  return state;
}
