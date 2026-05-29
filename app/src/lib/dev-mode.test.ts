import { describe, it, expect, beforeEach } from 'vitest';
import { resolveDevMode, disableDevMode, enableDevMode } from './dev-mode';

const STORAGE_KEY = 'kospos:dev-mode';

function setUrl(search: string): void {
  const q = search.startsWith('?') ? search : `?${search}`;
  window.history.replaceState({}, '', `/${q}`);
}

describe('dev-mode', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.history.replaceState({}, '', '/');
  });

  it('returns false when no URL flag and nothing in localStorage', () => {
    expect(resolveDevMode()).toBe(false);
  });

  it('turns on and persists when ?dev=1 is in the URL', () => {
    setUrl('?dev=1');
    expect(resolveDevMode()).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('turns off and clears storage when ?dev=0 is in the URL', () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setUrl('?dev=0');
    expect(resolveDevMode()).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('reads from localStorage when no URL flag is present', () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    expect(resolveDevMode()).toBe(true);
  });

  it('enableDevMode persists the flag so resolveDevMode reads true', () => {
    expect(resolveDevMode()).toBe(false);
    enableDevMode();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
    expect(resolveDevMode()).toBe(true);
  });

  it('disableDevMode clears storage and strips ?dev= from the URL', () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setUrl('?dev=1&other=keep');
    disableDevMode();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.location.search).toBe('?other=keep');
    expect(resolveDevMode()).toBe(false);
  });

  it('ignores non-1/0 values for ?dev=', () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setUrl('?dev=yes');
    expect(resolveDevMode()).toBe(true); // falls through to stored value
  });
});
