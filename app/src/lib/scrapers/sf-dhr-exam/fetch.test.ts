/**
 * Unit tests for `fetchDhrExamResults` — exercises the proxy chain,
 * pagination + termination, dedupe, and the Worker-URL extension.
 *
 * Strategy: inject a mock `fetchImpl` + a mock proxy chain so we can
 * script per-page / per-proxy success and failure. Real DOMParser is
 * available in the test env via happy-dom (configured in vitest.config).
 */

import { describe, it, expect, vi } from 'vitest';
import { fetchDhrExamResults, FetchDhrError, DEFAULT_PROXIES } from './fetch';

/** Build a minimal DHR-shaped page HTML with N rows. row.jobCode is
 *  derived from the index so each row has a stable key. */
function buildPageHtml(rows: Array<{ postDate: string; listId: string; jobCode: string; classTitle?: string }>): string {
  const trs = rows.map(r => `
    <tr>
      <td>${r.postDate}</td>
      <td>${r.listId}</td>
      <td><a href="/sites/default/files/documents/Score-Reports/2026/${r.jobCode}-${r.listId}-05142026.pdf">${r.jobCode} - ${r.classTitle ?? 'Class Title'}</a></td>
    </tr>
  `).join('');
  return `<!DOCTYPE html><html><body><table><tbody>${trs}</tbody></table></body></html>`;
}

function makeResponse(body: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(body),
  } as Response;
}

describe('fetchDhrExamResults — happy path', () => {
  it('fetches a single page through the first proxy and stops when the next page has zero rows', async () => {
    const fetchImpl = vi.fn();
    // Page 0 → 2 rows; page 1 → 0 rows (empty page = end of data)
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
      { postDate: 'May 13, 2026', listId: 'L2', jobCode: '1820' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    const result = await fetchDhrExamResults({
      fetchImpl,
      pageDelayMs: 0,
    });
    expect(result).toHaveLength(2);
    expect(result[0].jobCode).toBe('0932');
    expect(result[1].jobCode).toBe('1820');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // First call wrapped through corsproxy.io (first in the default chain)
    expect(fetchImpl.mock.calls[0][0]).toContain('corsproxy.io');
    expect(fetchImpl.mock.calls[0][0]).toContain(encodeURIComponent('https://sfdhr.org/past-examination-results'));
    // Second call paginated with ?page=1
    expect(fetchImpl.mock.calls[1][0]).toContain(encodeURIComponent('https://sfdhr.org/past-examination-results?page=1'));
  });

  it('iterates pages until the empty-page sentinel', async () => {
    const fetchImpl = vi.fn();
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 13, 2026', listId: 'L2', jobCode: '1820' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 12, 2026', listId: 'L3', jobCode: '0922' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    const result = await fetchDhrExamResults({ fetchImpl, pageDelayMs: 0 });
    expect(result).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('respects maxPages as a safety cap', async () => {
    const fetchImpl = vi.fn();
    // Every page returns 1 row → would otherwise loop forever
    fetchImpl.mockImplementation(() =>
      Promise.resolve(makeResponse(buildPageHtml([
        { postDate: 'May 14, 2026', listId: `L${Math.random()}`, jobCode: '0932' },
      ]))),
    );
    const result = await fetchDhrExamResults({
      fetchImpl,
      pageDelayMs: 0,
      maxPages: 3,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('fetchDhrExamResults — proxy fallback', () => {
  it('falls back to the next proxy when the first one returns HTTP 500', async () => {
    const fetchImpl = vi.fn();
    // First proxy fails on page 0 with 500
    fetchImpl.mockResolvedValueOnce(makeResponse('error envelope', false, 500));
    // Second proxy succeeds
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
    ])));
    // Next page empty
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    const result = await fetchDhrExamResults({ fetchImpl, pageDelayMs: 0 });
    expect(result).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[0][0]).toContain('corsproxy.io');
    expect(fetchImpl.mock.calls[1][0]).toContain('allorigins.win');
  });

  it('falls back through network errors (TypeError: Failed to fetch)', async () => {
    const fetchImpl = vi.fn();
    fetchImpl.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchImpl.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    const result = await fetchDhrExamResults({ fetchImpl, pageDelayMs: 0 });
    expect(result).toHaveLength(1);
    expect(fetchImpl.mock.calls[2][0]).toContain('codetabs.com');
  });

  it('skips proxies that return non-HTML bodies (JSON error envelope)', async () => {
    const fetchImpl = vi.fn();
    // First proxy returns a JSON envelope ("rate limited") with 200 OK.
    fetchImpl.mockResolvedValueOnce(makeResponse('{"error":"rate limited"}', true, 200));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    const result = await fetchDhrExamResults({ fetchImpl, pageDelayMs: 0 });
    expect(result).toHaveLength(1);
  });

  it('throws FetchDhrError carrying per-proxy detail when every proxy fails on the first page', async () => {
    const fetchImpl = vi.fn();
    fetchImpl.mockResolvedValueOnce(makeResponse('', false, 500));
    fetchImpl.mockResolvedValueOnce(makeResponse('', false, 503));
    fetchImpl.mockResolvedValueOnce(makeResponse('', false, 429));

    await expect(fetchDhrExamResults({ fetchImpl, pageDelayMs: 0 })).rejects.toThrow(FetchDhrError);

    // Re-run to inspect the error payload
    let caught: unknown;
    try {
      await fetchDhrExamResults({
        fetchImpl: vi.fn()
          .mockResolvedValueOnce(makeResponse('', false, 500))
          .mockResolvedValueOnce(makeResponse('', false, 503))
          .mockResolvedValueOnce(makeResponse('', false, 429)),
        pageDelayMs: 0,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(FetchDhrError);
    const fe = caught as FetchDhrError;
    expect(fe.proxyAttempts).toHaveLength(3);
    expect(fe.proxyAttempts[0]).toEqual({ label: 'corsproxy.io', detail: 'HTTP 500' });
    expect(fe.proxyAttempts[1]).toEqual({ label: 'allorigins.win', detail: 'HTTP 503' });
    expect(fe.proxyAttempts[2]).toEqual({ label: 'codetabs.com', detail: 'HTTP 429' });
  });
});

describe('fetchDhrExamResults — Worker URL backup', () => {
  it('appends the worker URL as a last-resort proxy when set', async () => {
    const fetchImpl = vi.fn();
    // First 3 proxies fail; worker succeeds
    fetchImpl.mockResolvedValueOnce(makeResponse('', false, 500));
    fetchImpl.mockResolvedValueOnce(makeResponse('', false, 500));
    fetchImpl.mockResolvedValueOnce(makeResponse('', false, 500));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    const result = await fetchDhrExamResults({
      fetchImpl,
      pageDelayMs: 0,
      workerUrl: 'https://my-worker.example.workers.dev',
    });
    expect(result).toHaveLength(1);
    // The 4th call (after 3 default proxies failed) went to the worker
    expect(fetchImpl.mock.calls[3][0]).toContain('my-worker.example.workers.dev');
    expect(fetchImpl.mock.calls[3][0]).toContain('url=');
  });

  it('handles worker URLs that already have a query string', async () => {
    const fetchImpl = vi.fn();
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    // Use a proxies override with ONLY the worker entry to test URL building
    const customProxies = [{
      label: 'test-worker',
      wrap: (u: string) => `https://w.test/?token=abc&url=${encodeURIComponent(u)}`,
    }];
    const result = await fetchDhrExamResults({
      fetchImpl,
      pageDelayMs: 0,
      proxies: customProxies,
    });
    expect(result).toHaveLength(1);
    expect(fetchImpl.mock.calls[0][0]).toContain('token=abc');
    expect(fetchImpl.mock.calls[0][0]).toContain('url=');
  });
});

describe('fetchDhrExamResults — onProgress + dedupe', () => {
  it('fires onProgress per page with the proxy used', async () => {
    const fetchImpl = vi.fn();
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 13, 2026', listId: 'L2', jobCode: '1820' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    const events: Array<{ page: number; rowsSoFar: number; proxyUsed: string }> = [];
    await fetchDhrExamResults({
      fetchImpl,
      pageDelayMs: 0,
      onProgress: e => events.push({ page: e.page, rowsSoFar: e.rowsSoFar, proxyUsed: e.proxyUsed }),
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ page: 1, rowsSoFar: 1, proxyUsed: 'corsproxy.io' });
    expect(events[1]).toEqual({ page: 2, rowsSoFar: 2, proxyUsed: 'corsproxy.io' });
  });

  it('dedupes rows by (jobCode, listId, postDate) across pages', async () => {
    const fetchImpl = vi.fn();
    // Same row appears on page 1 + page 2 (duplicate from upstream pagination)
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([
      { postDate: 'May 14, 2026', listId: 'L1', jobCode: '0932' }, // dup
      { postDate: 'May 13, 2026', listId: 'L2', jobCode: '1820' },
    ])));
    fetchImpl.mockResolvedValueOnce(makeResponse(buildPageHtml([])));

    const result = await fetchDhrExamResults({ fetchImpl, pageDelayMs: 0 });
    expect(result).toHaveLength(2);
  });
});

describe('DEFAULT_PROXIES', () => {
  it('has the expected order and wrap behavior', () => {
    expect(DEFAULT_PROXIES.map(p => p.label)).toEqual([
      'corsproxy.io',
      'allorigins.win',
      'codetabs.com',
    ]);
    const wrapped = DEFAULT_PROXIES[0].wrap('https://example.com/x');
    expect(wrapped).toBe('https://corsproxy.io/?https%3A%2F%2Fexample.com%2Fx');
  });
});
