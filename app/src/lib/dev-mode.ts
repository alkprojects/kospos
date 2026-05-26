/**
 * Dev-mode gate — hides budget-dev / importer surfaces from the production
 * `/kospos/` shell until a Phase 2.2 sub-phase promotes them to user-facing.
 *
 * Visiting `/kospos/?dev=1` turns dev mode on and persists a localStorage flag
 * so it survives reloads. `/kospos/?dev=0` (or the in-app "Disable dev mode"
 * button) turns it back off.
 *
 * See docs/ROADMAP.md § Phase 2.1 and docs/SESSION_HANDOFF.md.
 */

const STORAGE_KEY = 'kospos:dev-mode';

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStored(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — gate degrades
    // to URL-only, which is acceptable for a developer escape hatch.
  }
}

/**
 * Resolves dev-mode state from the current URL + localStorage. Call once on
 * app init.
 *
 *   ?dev=1   → turns on, persists to localStorage
 *   ?dev=0   → turns off, clears localStorage
 *   no flag  → reads from localStorage
 */
export function resolveDevMode(): boolean {
  const flag = new URLSearchParams(window.location.search).get('dev');
  if (flag === '1') { writeStored(true);  return true;  }
  if (flag === '0') { writeStored(false); return false; }
  return readStored();
}

/** Turns dev mode off: clears localStorage and strips `?dev=` from the URL. */
export function disableDevMode(): void {
  writeStored(false);
  const url = new URL(window.location.href);
  url.searchParams.delete('dev');
  window.history.replaceState({}, '', url.toString());
}
