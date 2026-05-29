/**
 * Dev-mode gate — hides budget-dev / importer surfaces from the production
 * `/kospos/` shell until a Phase 2.2 sub-phase promotes them to user-facing.
 *
 * Primary control is the in-app gear toggle in the header (enableDevMode /
 * disableDevMode), which persists a localStorage flag so it survives reloads.
 * The `/kospos/?dev=1` URL flag is kept as a bookmark / test-harness escape
 * hatch; `/kospos/?dev=0` forces it back off.
 *
 * No authentication yet — a plain toggle during development. See
 * docs/ROADMAP.md § Phase 8+ for the eventual tiered-permissions model.
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

/** Turns dev mode on: persists the localStorage flag so it survives reloads.
 *  Mirror of disableDevMode — backs the in-app gear toggle (the primary
 *  affordance now; the `?dev=1` URL flag stays as a harness / bookmark hatch). */
export function enableDevMode(): void {
  writeStored(true);
}

/** Turns dev mode off: clears localStorage and strips `?dev=` from the URL. */
export function disableDevMode(): void {
  writeStored(false);
  const url = new URL(window.location.href);
  url.searchParams.delete('dev');
  window.history.replaceState({}, '', url.toString());
}
