/**
 * Unit tests for `useScrapers` — focuses on the new Phase 2.2.l
 * `dhrWorkerUrl` setting + localStorage persistence + the clearAll
 * preservation rule. The existing scrape-data slices (jobPostings,
 * eligibilityLists, appendEligibilityLists) are covered in
 * scrapers.test.ts via the build-rollup tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useScrapers } from './store';

beforeEach(() => {
  // localStorage in happy-dom is real; clear between tests to avoid cross-
  // talk. The store reads on init, so we also reset the in-memory value.
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  useScrapers.setState({
    jobPostings: [],
    jobPostingsRefreshedAt: '',
    eligibilityLists: [],
    eligibilityListsRefreshedAt: '',
    dhrWorkerUrl: '',
  });
});

describe('useScrapers.setDhrWorkerUrl', () => {
  it('stores the URL in the in-memory state', () => {
    useScrapers.getState().setDhrWorkerUrl('https://my-worker.example.workers.dev');
    expect(useScrapers.getState().dhrWorkerUrl).toBe('https://my-worker.example.workers.dev');
  });

  it('persists the URL to localStorage', () => {
    useScrapers.getState().setDhrWorkerUrl('https://my-worker.example.workers.dev');
    expect(localStorage.getItem('kospos.scrapers.dhrWorkerUrl'))
      .toBe('https://my-worker.example.workers.dev');
  });

  it('trims whitespace before storing', () => {
    useScrapers.getState().setDhrWorkerUrl('  https://my-worker.example.workers.dev  ');
    expect(useScrapers.getState().dhrWorkerUrl).toBe('https://my-worker.example.workers.dev');
    expect(localStorage.getItem('kospos.scrapers.dhrWorkerUrl'))
      .toBe('https://my-worker.example.workers.dev');
  });

  it('removes the localStorage entry when set to empty', () => {
    useScrapers.getState().setDhrWorkerUrl('https://my-worker.example.workers.dev');
    expect(localStorage.getItem('kospos.scrapers.dhrWorkerUrl')).toBeTruthy();
    useScrapers.getState().setDhrWorkerUrl('');
    expect(useScrapers.getState().dhrWorkerUrl).toBe('');
    expect(localStorage.getItem('kospos.scrapers.dhrWorkerUrl')).toBeNull();
  });
});

describe('useScrapers.clearAll', () => {
  it('clears scrape data slices but preserves the worker URL setting', () => {
    useScrapers.getState().setDhrWorkerUrl('https://my-worker.example.workers.dev');
    useScrapers.getState().setJobPostings([
      { id: '1', name: 'X (1820 Title)', jobCode: '1820', classTitle: 'Title', department: '', location: '', releasedDate: '', url: '' },
    ]);
    useScrapers.getState().setEligibilityLists([
      { jobCode: '0932', classTitle: 'Manager IV', listId: 'L1', postDate: '2026-05-14', fileUrl: 'http://x', type: 'score-report' },
    ]);

    useScrapers.getState().clearAll();

    expect(useScrapers.getState().jobPostings).toEqual([]);
    expect(useScrapers.getState().eligibilityLists).toEqual([]);
    expect(useScrapers.getState().jobPostingsRefreshedAt).toBe('');
    expect(useScrapers.getState().eligibilityListsRefreshedAt).toBe('');
    // Worker URL is a setting, not scrape data — survives clearAll.
    expect(useScrapers.getState().dhrWorkerUrl).toBe('https://my-worker.example.workers.dev');
    expect(localStorage.getItem('kospos.scrapers.dhrWorkerUrl'))
      .toBe('https://my-worker.example.workers.dev');
  });
});
