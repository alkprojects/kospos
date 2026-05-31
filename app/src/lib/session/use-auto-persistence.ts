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
 *   - One debounce timer + a dirty-group set means a multi-store change
 *     (e.g. addRows that triggers a quality rules run that updates
 *     issues) coalesces into one write pass.
 *   - That write pass is INCREMENTAL (Phase 2.2.aa): each store maps to a
 *     per-store IDB record group (`rows` / `scrapers` / `planning`), and
 *     only the groups that actually went dirty are rewritten. A note edit
 *     rewrites the small `planning` record, never the ~375 MB `rows` one
 *     — see `idb-persistence.ts`. The load path reassembles the groups.
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
import { useClearedFindings } from '../quality/cleared';
import { useScrapers } from '../scrapers/store';
import {
  buildSessionFile,
  parseSessionFileFromValue,
  type SessionFile,
} from './snapshot';
import {
  loadSnapshotFromIdb,
  saveGroupsToIdb,
  type StoreGroup,
} from './idb-persistence';
import {
  fetchPublishedSnapshot,
  readCloudflareConfig,
} from './cloudflare-publish';

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
  /** Source the loaded snapshot came from (Phase 2.2.q PR 2). 'idb' =
   *  local browser only. 'cloudflare' = published shared snapshot.
   *  '' when no snapshot loaded. */
  loadedSnapshotSource: '' | 'idb' | 'cloudflare';
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
  useClearedFindings.getState().restoreFromSession(payload.clearedFindings ?? []);
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
  const cleared = useClearedFindings.getState();
  const scrapers = useScrapers.getState();
  return buildSessionFile({
    loadedRows: app.loadedRows,
    lastBfmImportAt: app.lastBfmImportAt,
    staffingPlanActions: sp.actions,
    staffingPlanDerivedRemoved: sp.derivedRemoved,
    positionNotes: notes.notes,
    pendingSeparations: seps.separations,
    probations: probs.probations,
    clearedFindings: cleared.cleared,
    jobPostings: scrapers.jobPostings,
    jobPostingsRefreshedAt: scrapers.jobPostingsRefreshedAt,
    eligibilityLists: scrapers.eligibilityLists,
    eligibilityListsRefreshedAt: scrapers.eligibilityListsRefreshedAt,
    pdfCache: scrapers.pdfCache,
  });
}

/**
 * Validate a loaded snapshot envelope WITHOUT restoring stores. Returns
 * the validated envelope or `null` on validation failure. Used by the
 * load path to compare IDB vs Cloudflare envelopes before deciding
 * which to restore.
 *
 * Why we validate even though the source returns the typed object: the
 * value could be from an older app version that wrote a different
 * envelope shape (different schemaVersion, missing `kind`, etc.). The
 * same validator we use for user-uploaded JSON files protects against
 * stale data after an app upgrade.
 *
 * Validates IN PLACE (no JSON.stringify + JSON.parse round-trip). The
 * earlier implementation re-parsed via parseSessionFile(JSON.stringify(value))
 * which on a 375 MB Cloudflare-restored envelope (S41 real-world data)
 * took several seconds and reliably tripped Chrome's "page unresponsive"
 * dialog. parseSessionFileFromValue applies the same checks to the
 * already-parsed value directly.
 */
export function validateOnly(value: unknown): SessionFile | null {
  const result = parseSessionFileFromValue(value);
  return result.ok ? result.file : null;
}

/**
 * Validate + restore a loaded snapshot. Returns the restored envelope
 * (so the hook can surface `savedAt`) or `null` on validation failure.
 *
 * Kept for back-compat with the auto-persistence.test.ts surface; new
 * code in the hook itself uses `validateOnly` + a separate
 * `restoreStoresFromPayload` call.
 */
export function tryRestoreSnapshot(value: unknown): {
  ok: true;
  file: SessionFile;
} | {
  ok: false;
  error: string;
} {
  // Validate in place (no stringify round-trip — same S41 perf concern
  // as validateOnly).
  const result = parseSessionFileFromValue(value);
  if (result.ok) {
    restoreStoresFromPayload(result.file);
    return { ok: true, file: result.file };
  }
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
    loadedSnapshotSource: '',
  });
  // Tracks whether the initial load has completed; auto-save is gated
  // on this so the load doesn't immediately trigger a redundant save.
  const loadCompleteRef = useRef(false);
  // Debounce timer handle for the save path.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState(s => ({ ...s, status: 'empty', loadedSnapshotSource: '' }));
      return;
    }

    let cancelled = false;

    setState(s => ({ ...s, status: 'loading' }));

    // 1. Load + restore on mount.
    //
    // Strategy (Phase 2.2.q PR 2):
    //   - Read IDB + Cloudflare in parallel.
    //   - Whichever envelope has the *newer* `savedAt` wins. Rationale:
    //     "saved data locally → published from another browser →
    //     returned to this browser" should prefer the published copy.
    //     The reverse is also covered: "published yesterday →
    //     auto-saved local edits today" prefers the local copy.
    //   - When only one source has data, that one wins.
    //   - When neither has data, status='empty'.
    //   - If Cloudflare is not configured (pagesUrl empty), the fetch
    //     short-circuits to `not-configured` and is treated as "no
    //     remote snapshot exists".
    //
    // Per Alex's S40 design pick: auto-load silently — no prompt. The
    // Landing dashboard surfaces what loaded + from where via the
    // `loadedSnapshotSource` field on AutoPersistenceState.
    Promise.all([
      loadSnapshotFromIdb().catch(() => null),
      fetchPublishedSnapshot(readCloudflareConfig())
        .then(r => r.ok ? r.file : null)
        .catch(() => null),
    ])
      .then(async ([idbValue, cloudflareFile]) => {
        if (cancelled) return;
        // S41 UX: yield between heavy phases so the browser can paint
        // the loading spinner + reset its "page unresponsive" timer.
        // On a 375 MB Cloudflare-restored envelope, JSON.parse already
        // blocked the main thread inside fetchPublishedSnapshot;
        // validation + Zustand restore add more sync work. Yielding
        // here gives the user visible progress between phases instead
        // of one long freeze.
        await new Promise(r => setTimeout(r, 0));
        // Validate both candidates through the same shape check so a
        // stale envelope (older app version) doesn't slip through.
        const idbValidated = idbValue !== null ? validateOnly(idbValue) : null;
        const cloudflareValidated = cloudflareFile !== null ? validateOnly(cloudflareFile) : null;

        let winner: SessionFile | null = null;
        let source: 'idb' | 'cloudflare' = 'idb';
        if (idbValidated && cloudflareValidated) {
          // Newer savedAt wins.
          if (cloudflareValidated.savedAt > idbValidated.savedAt) {
            winner = cloudflareValidated;
            source = 'cloudflare';
          } else {
            winner = idbValidated;
            source = 'idb';
          }
        } else if (idbValidated) {
          winner = idbValidated;
          source = 'idb';
        } else if (cloudflareValidated) {
          winner = cloudflareValidated;
          source = 'cloudflare';
        }

        if (!winner) {
          loadCompleteRef.current = true;
          setState({
            status: 'empty',
            lastSavedAt: '',
            lastError: '',
            loadedSnapshotSavedAt: '',
            loadedSnapshotSource: '',
          });
          return;
        }
        // Yield once more before the Zustand restore — multiple stores
        // setState() in quick succession trigger React batched
        // rerenders, more chances for the browser to repaint.
        await new Promise(r => setTimeout(r, 0));
        restoreStoresFromPayload(winner);
        // Mark load complete AFTER the restore, not before: the restore's
        // store mutations fire the auto-save subscribers, and we do NOT
        // want to immediately re-write the snapshot we just read. Under
        // the per-store-record model a post-load re-save would mark every
        // group dirty and rewrite the ~375 MB `rows` record on every page
        // load — that redundant write IS the post-refresh freeze this
        // sub-phase removes. Gating the subscribers until now drops it.
        loadCompleteRef.current = true;
        setState({
          status: 'loaded',
          lastSavedAt: '',
          lastError: '',
          loadedSnapshotSavedAt: winner.savedAt,
          loadedSnapshotSource: source,
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
          loadedSnapshotSource: '',
        });
      });

    // 2. Auto-save subscription. Each store maps to a per-store record
    // group; a change marks that group dirty and (re)arms one shared
    // debounce timer. On fire we write only the dirty groups, so a
    // planning edit never rewrites the heavy `rows` record. Each store's
    // subscribe returns its own unsubscriber; we collect + clean them up.
    const dirtyGroups = new Set<StoreGroup>();
    const scheduleSave = (group: StoreGroup) => {
      if (!loadCompleteRef.current) return;
      dirtyGroups.add(group);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        // Snapshot + clear the dirty set synchronously so changes that
        // arrive during the async write accumulate for the next pass.
        const groups = [...dirtyGroups];
        dirtyGroups.clear();
        if (groups.length === 0) return;
        setState(s => ({ ...s, status: 'saving' }));
        const file = captureCurrentSnapshot();
        saveGroupsToIdb(file, groups)
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
      useAppStore.subscribe(() => scheduleSave('rows')),
      useStaffingPlan.subscribe(() => scheduleSave('planning')),
      useSeparations.subscribe(() => scheduleSave('planning')),
      useProbations.subscribe(() => scheduleSave('planning')),
      usePositionNotes.subscribe(() => scheduleSave('planning')),
      useClearedFindings.subscribe(() => scheduleSave('planning')),
      useScrapers.subscribe(() => scheduleSave('scrapers')),
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
