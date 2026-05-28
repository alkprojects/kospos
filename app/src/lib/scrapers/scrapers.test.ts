/**
 * Unit tests for the scraper layer.
 *
 * Covers the pure helpers (extractJobCodeFromName, normalizePosting,
 * parseDhrExamHtml, normalizeDateString, isListActive, buildJobCodeRollups,
 * filterRollups) + the fetcher's pagination + error paths via a mocked
 * fetch impl.
 */

import { describe, it, expect } from 'vitest';
import {
  extractJobCodeFromName,
  normalizePosting,
  userFacingUrl,
  fetchJobPostings,
  FetchJobPostingsError,
} from './sf-careers/fetch';
import {
  parseDhrExamHtml,
  normalizeDateString,
  isListActive,
} from './sf-dhr-exam/parse';
import {
  applyEligibilityFilters,
  buildJobCodeRollups,
  collectDepartments,
  EMPTY_ELIGIBILITY_FILTERS,
  filterRollups,
  summarizeRollup,
} from './build';
import type { EligibilityFilters } from './build';
import type { EligibilityList, JobCodeRollup, JobPosting } from './types';

// ---------------------------------------------------------------------------
// extractJobCodeFromName
// ---------------------------------------------------------------------------

describe('extractJobCodeFromName', () => {
  it('pulls the 4-digit code + title from a standard posting name', () => {
    expect(extractJobCodeFromName(
      'Physician Director of Jail Health Services (0943 Manager VIII) - Department of Public Health - EXEMPT',
    )).toEqual({ jobCode: '0943', classTitle: 'Manager VIII' });
  });

  it('returns empty when no parenthesized 4-digit pattern exists', () => {
    expect(extractJobCodeFromName('Some random title')).toEqual({ jobCode: '', classTitle: '' });
  });

  it('returns empty for an empty input', () => {
    expect(extractJobCodeFromName('')).toEqual({ jobCode: '', classTitle: '' });
  });

  it('matches the first 4-digit group when titles have nested parens', () => {
    expect(extractJobCodeFromName(
      'Junior Admin Analyst (1820 Junior Admin Analyst (Job Sharing)) - Department',
    )).toEqual({ jobCode: '1820', classTitle: 'Junior Admin Analyst (Job Sharing' });
  });

  it('extracts code from (NNNN) with no title attached (Pattern 2)', () => {
    expect(extractJobCodeFromName(
      'Dietetic Technician (2622) - Department of Public Health - (EXEMPT)',
    )).toEqual({ jobCode: '2622', classTitle: '' });
  });

  it('extracts code from "NNNN-title" prefix (Pattern 3: e.g. LATERAL 8530-Deputy Probation Officer)', () => {
    expect(extractJobCodeFromName(
      'LATERAL 8530-Deputy Probation Officer (SFERS)',
    )).toEqual({ jobCode: '8530', classTitle: '' });
  });

  it('Pattern 1 wins over Pattern 2 when both could apply', () => {
    expect(extractJobCodeFromName(
      'Some Role (1234 Real Title) - Dept (5678)',
    )).toEqual({ jobCode: '1234', classTitle: 'Real Title' });
  });
});

// ---------------------------------------------------------------------------
// normalizePosting
// ---------------------------------------------------------------------------

describe('normalizePosting', () => {
  it('maps SmartRecruiters fields to KosPos shape', () => {
    const out = normalizePosting({
      id: '12345',
      name: 'Project Manager (5320 Senior Engineer) - DPW - EXEMPT',
      department: { id: '1', label: 'Public Works' },
      location: { city: 'San Francisco', region: 'CA', country: 'US' },
      releasedDate: '2026-05-01T00:00:00Z',
    });
    expect(out).toEqual({
      id: '12345',
      name: 'Project Manager (5320 Senior Engineer) - DPW - EXEMPT',
      jobCode: '5320',
      classTitle: 'Senior Engineer',
      department: 'Public Works',
      location: 'San Francisco, CA, US',
      releasedDate: '2026-05-01T00:00:00Z',
      url: 'https://jobs.smartrecruiters.com/CityAndCountyOfSanFrancisco1/12345',
    });
  });

  it('handles missing fields gracefully', () => {
    const out = normalizePosting({ id: '999' });
    expect(out.jobCode).toBe('');
    expect(out.classTitle).toBe('');
    expect(out.department).toBe('');
    expect(out.location).toBe('');
    expect(out.releasedDate).toBe('');
    expect(out.url).toBe('https://jobs.smartrecruiters.com/CityAndCountyOfSanFrancisco1/999');
  });
});

describe('userFacingUrl', () => {
  it('builds the jobs.smartrecruiters.com URL', () => {
    expect(userFacingUrl('555')).toBe('https://jobs.smartrecruiters.com/CityAndCountyOfSanFrancisco1/555');
  });
});

// ---------------------------------------------------------------------------
// fetchJobPostings (with mocked fetch)
// ---------------------------------------------------------------------------

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    headers: new Headers(),
  } as Response;
}

describe('fetchJobPostings', () => {
  it('paginates until a short page + flattens all postings', async () => {
    let call = 0;
    const fetchImpl = async () => {
      call += 1;
      if (call === 1) {
        return mockResponse({
          offset: 0, limit: 100, totalFound: 130,
          content: Array.from({ length: 100 }, (_, i) => ({ id: `p${i}`, name: `T (1820 X)` })),
        });
      }
      return mockResponse({
        offset: 100, limit: 100, totalFound: 130,
        content: Array.from({ length: 30 }, (_, i) => ({ id: `q${i}`, name: `T (2080 Y)` })),
      });
    };
    const all = await fetchJobPostings({ fetchImpl, maxPages: 5 });
    expect(call).toBe(2);
    expect(all).toHaveLength(130);
    expect(all[0].jobCode).toBe('1820');
    expect(all[100].jobCode).toBe('2080');
  });

  it('throws FetchJobPostingsError on non-OK response', async () => {
    const fetchImpl = async () => mockResponse({}, false, 500);
    await expect(fetchJobPostings({ fetchImpl })).rejects.toBeInstanceOf(FetchJobPostingsError);
  });

  it('throws FetchJobPostingsError when fetch itself throws', async () => {
    const fetchImpl = async () => { throw new TypeError('Failed to fetch'); };
    await expect(fetchJobPostings({ fetchImpl })).rejects.toBeInstanceOf(FetchJobPostingsError);
  });

  it('calls onProgress per page', async () => {
    const fetchImpl = async () => mockResponse({
      offset: 0, limit: 100, totalFound: 5,
      content: [{ id: 'a', name: 'T (1820 X)' }],
    });
    const progressCalls: Array<{ page: number; postingsSoFar: number }> = [];
    await fetchJobPostings({
      fetchImpl,
      onProgress: info => progressCalls.push({ page: info.page, postingsSoFar: info.postingsSoFar }),
    });
    expect(progressCalls).toEqual([{ page: 1, postingsSoFar: 1 }]);
  });
});

// ---------------------------------------------------------------------------
// normalizeDateString
// ---------------------------------------------------------------------------

describe('normalizeDateString', () => {
  it('converts "May 14, 2026" to ISO', () => {
    expect(normalizeDateString('May 14, 2026')).toBe('2026-05-14');
  });
  it('converts "May 1, 2026" (single digit day)', () => {
    expect(normalizeDateString('May 1, 2026')).toBe('2026-05-01');
  });
  it('returns empty on unparseable input', () => {
    expect(normalizeDateString('not a date')).toBe('');
  });
  it('returns empty on empty input', () => {
    expect(normalizeDateString('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseDhrExamHtml
// ---------------------------------------------------------------------------

describe('parseDhrExamHtml', () => {
  const SAMPLE = `
    <table>
      <tr><th>Post date</th><th>List ID</th><th>Class & Job Title</th></tr>
      <tr>
        <td>May 14, 2026</td>
        <td>161040</td>
        <td><a href="/sites/default/files/documents/Score-Reports/2026/0932-161040-05142026.pdf">0932 - Manager IV</a></td>
      </tr>
      <tr>
        <td>May 13, 2026</td>
        <td>A00026</td>
        <td><a href="/sites/default/files/documents/Score-Reports/2026/2708-A00026-05132026.pdf">2708 - Custodian</a></td>
      </tr>
      <tr>
        <td>May 01, 2026</td>
        <td>X00018</td>
        <td><a href="/sites/default/files/documents/Eligible-Lists/2026/Q002-X00018-05012026.pdf">Q002 - Police Officer</a></td>
      </tr>
    </table>
  `;

  it('parses standard DHR table rows', () => {
    const out = parseDhrExamHtml(SAMPLE);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({
      jobCode: '0932',
      classTitle: 'Manager IV',
      listId: '161040',
      postDate: '2026-05-14',
      fileUrl: 'https://sfdhr.org/sites/default/files/documents/Score-Reports/2026/0932-161040-05142026.pdf',
      type: 'score-report',
    });
  });

  it('classifies Eligible-Lists URLs as type=eligible-list', () => {
    const out = parseDhrExamHtml(SAMPLE);
    const policeRow = out.find(r => r.classTitle === 'Police Officer');
    expect(policeRow?.type).toBe('eligible-list');
  });

  it('returns [] on empty input', () => {
    expect(parseDhrExamHtml('')).toEqual([]);
  });

  it('returns [] when no <tr> rows are present', () => {
    expect(parseDhrExamHtml('<div>not a table</div>')).toEqual([]);
  });

  it('skips rows missing the link target', () => {
    const out = parseDhrExamHtml(`
      <table><tr>
        <td>May 1, 2026</td><td>NULL</td><td>no link here</td>
      </tr></table>
    `);
    expect(out).toEqual([]);
  });

  it('extracts jobCode from the URL when the link text format is unexpected', () => {
    const out = parseDhrExamHtml(`
      <table><tr>
        <td>May 1, 2026</td>
        <td>X1</td>
        <td><a href="https://sfdhr.org/sites/default/files/documents/Score-Reports/2026/1234-X1-05012026.pdf">unusual link text</a></td>
      </tr></table>
    `);
    expect(out).toHaveLength(1);
    expect(out[0].jobCode).toBe('1234');
    expect(out[0].classTitle).toBe(''); // not extractable from "unusual link text"
  });

  it('parses letter-prefixed uniformed-rank codes (e.g. Q002 Police Officer)', () => {
    const out = parseDhrExamHtml(`
      <table><tr>
        <td>May 1, 2026</td>
        <td>X00018</td>
        <td><a href="/sites/default/files/documents/Eligible-Lists/2026/Q002-X00018-05012026.pdf">Q002 - Police Officer</a></td>
      </tr></table>
    `);
    expect(out).toHaveLength(1);
    expect(out[0].jobCode).toBe('Q002');
    expect(out[0].classTitle).toBe('Police Officer');
    expect(out[0].type).toBe('eligible-list');
  });
});

// ---------------------------------------------------------------------------
// isListActive
// ---------------------------------------------------------------------------

describe('isListActive', () => {
  const today = '2026-05-27';

  it('returns true for a list posted within the window', () => {
    expect(isListActive(
      { jobCode: '0932', classTitle: '', listId: 'L', postDate: '2026-01-01', fileUrl: '', type: 'score-report' },
      today,
      730,
    )).toBe(true);
  });

  it('returns false for a list past the window', () => {
    expect(isListActive(
      { jobCode: '0932', classTitle: '', listId: 'L', postDate: '2023-01-01', fileUrl: '', type: 'score-report' },
      today,
      730,
    )).toBe(false);
  });

  it('returns false when postDate is empty', () => {
    expect(isListActive(
      { jobCode: '0932', classTitle: '', listId: 'L', postDate: '', fileUrl: '', type: 'score-report' },
      today,
      730,
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildJobCodeRollups
// ---------------------------------------------------------------------------

describe('buildJobCodeRollups', () => {
  const today = '2026-05-27';

  it('groups postings + lists by jobCode and sorts within each bucket newest first', () => {
    const postings = [
      { id: '1', name: 'A', jobCode: '1820', classTitle: 'A', department: 'D', location: '', releasedDate: '2026-04-01', url: '' },
      { id: '2', name: 'B', jobCode: '1820', classTitle: 'A', department: 'D', location: '', releasedDate: '2026-05-01', url: '' },
      { id: '3', name: 'C', jobCode: '2708', classTitle: 'C', department: 'D', location: '', releasedDate: '2026-05-15', url: '' },
    ];
    const lists = [
      { jobCode: '1820', classTitle: 'A', listId: 'L1', postDate: '2026-01-01', fileUrl: '', type: 'score-report' as const },
      { jobCode: '1820', classTitle: 'A', listId: 'L2', postDate: '2023-01-01', fileUrl: '', type: 'score-report' as const },
    ];
    const out = buildJobCodeRollups(postings, lists, today);
    expect(out).toHaveLength(2);
    const r1820 = out.find(r => r.jobCode === '1820')!;
    expect(r1820.postings.map(p => p.id)).toEqual(['2', '1']); // newest first
    expect(r1820.activeLists.map(l => l.listId)).toEqual(['L1']);
    expect(r1820.expiredLists.map(l => l.listId)).toEqual(['L2']);
  });

  it('drops postings + lists with empty jobCode from the rollup', () => {
    const out = buildJobCodeRollups(
      [{ id: 'x', name: 'no code', jobCode: '', classTitle: '', department: '', location: '', releasedDate: '2026-05-01', url: '' }],
      [{ jobCode: '', classTitle: '', listId: 'L', postDate: '2026-05-01', fileUrl: '', type: 'score-report' }],
      today,
    );
    expect(out).toEqual([]);
  });

  it('returns rollups sorted alphabetically by jobCode', () => {
    const out = buildJobCodeRollups(
      [
        { id: 'a', name: '', jobCode: '2080', classTitle: 'A', department: '', location: '', releasedDate: '', url: '' },
        { id: 'b', name: '', jobCode: '1040', classTitle: 'B', department: '', location: '', releasedDate: '', url: '' },
        { id: 'c', name: '', jobCode: '5320', classTitle: 'C', department: '', location: '', releasedDate: '', url: '' },
      ],
      [],
      today,
    );
    expect(out.map(r => r.jobCode)).toEqual(['1040', '2080', '5320']);
  });
});

// ---------------------------------------------------------------------------
// filterRollups
// ---------------------------------------------------------------------------

describe('filterRollups', () => {
  const rollups: JobCodeRollup[] = [
    { jobCode: '1820', classTitle: 'Junior Admin Analyst', postings: [], activeLists: [], expiredLists: [] },
    { jobCode: '2708', classTitle: 'Custodian',            postings: [], activeLists: [], expiredLists: [] },
    { jobCode: '0932', classTitle: 'Manager IV',           postings: [], activeLists: [], expiredLists: [] },
  ];

  it('returns all rollups for an empty needle', () => {
    expect(filterRollups(rollups, '')).toHaveLength(3);
  });

  it('filters by jobCode substring', () => {
    expect(filterRollups(rollups, '1820').map(r => r.jobCode)).toEqual(['1820']);
  });

  it('filters by classTitle substring, case-insensitive', () => {
    expect(filterRollups(rollups, 'manager').map(r => r.jobCode)).toEqual(['0932']);
  });

  it('returns empty when nothing matches', () => {
    expect(filterRollups(rollups, 'xyz')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// summarizeRollup
// ---------------------------------------------------------------------------

describe('summarizeRollup', () => {
  function mkPosting(over: Partial<JobPosting> = {}): JobPosting {
    return {
      id: 'p',
      name: '',
      jobCode: '1820',
      classTitle: '',
      department: '',
      location: '',
      releasedDate: '2026-05-01',
      url: '',
      ...over,
    };
  }
  function mkList(over: Partial<EligibilityList> = {}): EligibilityList {
    return {
      jobCode: '1820',
      classTitle: '',
      listId: 'L',
      postDate: '2026-05-01',
      fileUrl: '',
      type: 'score-report',
      ...over,
    };
  }

  it('returns zeros for an empty rollup', () => {
    const s = summarizeRollup({
      jobCode: '1820', classTitle: '',
      postings: [], activeLists: [], expiredLists: [],
    });
    expect(s).toEqual({
      activeCount: 0,
      expiredCount: 0,
      postingCount: 0,
      newestPostingDate: '',
      oldestActivePostDate: '',
      newestActivePostDate: '',
      departments: [],
      listTypes: [],
      citywideHint: false,
    });
  });

  it('picks newest posting + oldest/newest active list dates (lists arrive newest-first)', () => {
    const s = summarizeRollup({
      jobCode: '1820', classTitle: '',
      postings: [
        mkPosting({ id: '2', releasedDate: '2026-05-15' }),
        mkPosting({ id: '1', releasedDate: '2026-04-01' }),
      ],
      // build.ts sorts these newest-first; reflect that in test input.
      activeLists: [
        mkList({ listId: 'L-new', postDate: '2026-05-01' }),
        mkList({ listId: 'L-mid', postDate: '2025-08-15' }),
        mkList({ listId: 'L-old', postDate: '2024-12-01' }),
      ],
      expiredLists: [
        mkList({ listId: 'L-exp', postDate: '2023-01-01' }),
      ],
    });
    expect(s.activeCount).toBe(3);
    expect(s.expiredCount).toBe(1);
    expect(s.postingCount).toBe(2);
    expect(s.newestPostingDate).toBe('2026-05-15');
    expect(s.newestActivePostDate).toBe('2026-05-01');
    expect(s.oldestActivePostDate).toBe('2024-12-01');
  });

  it('collects distinct departments alphabetically', () => {
    const s = summarizeRollup({
      jobCode: '1820', classTitle: '',
      postings: [
        mkPosting({ id: 'a', department: 'Public Health' }),
        mkPosting({ id: 'b', department: 'Building Inspection' }),
        mkPosting({ id: 'c', department: 'Public Health' }), // dupe
        mkPosting({ id: 'd', department: '' }),              // empty dropped
      ],
      activeLists: [], expiredLists: [],
    });
    expect(s.departments).toEqual(['Building Inspection', 'Public Health']);
  });

  it('extracts list types across active + expired in stable score-report-first order', () => {
    const s = summarizeRollup({
      jobCode: '1820', classTitle: '',
      postings: [],
      activeLists: [mkList({ type: 'eligible-list' })],
      expiredLists: [mkList({ type: 'score-report' })],
    });
    expect(s.listTypes).toEqual(['score-report', 'eligible-list']);
  });

  it('citywideHint is true when lists exist but no postings (list-only)', () => {
    const s = summarizeRollup({
      jobCode: '1820', classTitle: '',
      postings: [],
      activeLists: [mkList()],
      expiredLists: [],
    });
    expect(s.citywideHint).toBe(true);
  });

  it('citywideHint is true when postings span 2+ departments', () => {
    const s = summarizeRollup({
      jobCode: '1820', classTitle: '',
      postings: [
        mkPosting({ id: 'a', department: 'DBI' }),
        mkPosting({ id: 'b', department: 'DPH' }),
      ],
      activeLists: [], expiredLists: [],
    });
    expect(s.citywideHint).toBe(true);
  });

  it('citywideHint is false for a single-department posting with no lists', () => {
    const s = summarizeRollup({
      jobCode: '1820', classTitle: '',
      postings: [mkPosting({ id: 'a', department: 'DBI' })],
      activeLists: [], expiredLists: [],
    });
    expect(s.citywideHint).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyEligibilityFilters
// ---------------------------------------------------------------------------

describe('applyEligibilityFilters', () => {
  function mkPosting(over: Partial<JobPosting> = {}): JobPosting {
    return {
      id: 'p', name: '', jobCode: '1820', classTitle: '',
      department: '', location: '', releasedDate: '2026-05-01', url: '',
      ...over,
    };
  }
  function mkList(over: Partial<EligibilityList> = {}): EligibilityList {
    return {
      jobCode: '1820', classTitle: '', listId: 'L',
      postDate: '2026-05-01', fileUrl: '', type: 'score-report',
      ...over,
    };
  }

  // 4 rollups covering all 4 combinations of (has-posting × has-list).
  const rollups: JobCodeRollup[] = [
    {
      // Active list + posting in DBI (score-report)
      jobCode: '1820', classTitle: 'Junior Admin Analyst',
      postings: [mkPosting({ jobCode: '1820', department: 'Building Inspection' })],
      activeLists: [mkList({ jobCode: '1820', type: 'score-report' })],
      expiredLists: [],
    },
    {
      // Expired only + no posting (eligible-list)
      jobCode: 'Q002', classTitle: 'Police Officer',
      postings: [],
      activeLists: [],
      expiredLists: [mkList({ jobCode: 'Q002', type: 'eligible-list', postDate: '2022-01-01' })],
    },
    {
      // Posting only — DPH (no lists)
      jobCode: '2622', classTitle: 'Dietetic Technician',
      postings: [mkPosting({ jobCode: '2622', department: 'Public Health' })],
      activeLists: [], expiredLists: [],
    },
    {
      // Active list only — no postings (score-report)
      jobCode: '0932', classTitle: 'Manager IV',
      postings: [],
      activeLists: [mkList({ jobCode: '0932', type: 'score-report' })],
      expiredLists: [],
    },
  ];

  function withOverrides(over: Partial<EligibilityFilters>): EligibilityFilters {
    return { ...EMPTY_ELIGIBILITY_FILTERS, ...over };
  }

  it('passes everything for the empty filter', () => {
    expect(applyEligibilityFilters(rollups, EMPTY_ELIGIBILITY_FILTERS)).toHaveLength(4);
  });

  it('search needle matches jobCode + classTitle', () => {
    expect(applyEligibilityFilters(rollups, withOverrides({ search: 'manager' }))
      .map(r => r.jobCode)).toEqual(['0932']);
    expect(applyEligibilityFilters(rollups, withOverrides({ search: 'Q002' }))
      .map(r => r.jobCode)).toEqual(['Q002']);
  });

  it('status=active keeps only rollups with at least 1 active list', () => {
    expect(applyEligibilityFilters(rollups, withOverrides({ status: 'active' }))
      .map(r => r.jobCode)).toEqual(['1820', '0932']);
  });

  it('status=expired excludes rollups that also have active lists', () => {
    expect(applyEligibilityFilters(rollups, withOverrides({ status: 'expired' }))
      .map(r => r.jobCode)).toEqual(['Q002']);
  });

  it('status=list-only keeps rollups with lists but zero postings', () => {
    expect(applyEligibilityFilters(rollups, withOverrides({ status: 'list-only' }))
      .map(r => r.jobCode)).toEqual(['Q002', '0932']);
  });

  it('status=posting-only keeps rollups with postings but zero lists', () => {
    expect(applyEligibilityFilters(rollups, withOverrides({ status: 'posting-only' }))
      .map(r => r.jobCode)).toEqual(['2622']);
  });

  it('examTypes set restricts to rollups with at least one matching list', () => {
    expect(applyEligibilityFilters(rollups, withOverrides({
      examTypes: new Set(['eligible-list']),
    })).map(r => r.jobCode)).toEqual(['Q002']);
  });

  it('departments set restricts to rollups with a posting in the dept', () => {
    expect(applyEligibilityFilters(rollups, withOverrides({
      departments: new Set(['Building Inspection']),
    })).map(r => r.jobCode)).toEqual(['1820']);
  });

  it('citywideOnly keeps rollups where summary.citywideHint is true', () => {
    // Q002 (list-only, no postings) and 0932 (list-only) both hint
    // citywide; 1820 (single dept) and 2622 (single dept, no lists) do not.
    expect(applyEligibilityFilters(rollups, withOverrides({ citywideOnly: true }))
      .map(r => r.jobCode)).toEqual(['Q002', '0932']);
  });

  it('axes combine with AND across', () => {
    // search "manager" → only 0932; status=active → 0932 + 1820;
    // intersection → 0932.
    expect(applyEligibilityFilters(rollups, withOverrides({
      search: 'manager',
      status: 'active',
    })).map(r => r.jobCode)).toEqual(['0932']);
  });
});

// ---------------------------------------------------------------------------
// collectDepartments
// ---------------------------------------------------------------------------

describe('collectDepartments', () => {
  function mkPosting(over: Partial<JobPosting>): JobPosting {
    return {
      id: 'p', name: '', jobCode: '1820', classTitle: '',
      department: '', location: '', releasedDate: '', url: '',
      ...over,
    };
  }

  it('returns sorted, distinct departments across all rollups', () => {
    const rollups: JobCodeRollup[] = [
      {
        jobCode: '1820', classTitle: '',
        postings: [
          mkPosting({ department: 'Public Health' }),
          mkPosting({ department: 'Building Inspection' }),
        ],
        activeLists: [], expiredLists: [],
      },
      {
        jobCode: '2622', classTitle: '',
        postings: [mkPosting({ department: 'Public Health' })], // dupe across rollups
        activeLists: [], expiredLists: [],
      },
    ];
    expect(collectDepartments(rollups)).toEqual(['Building Inspection', 'Public Health']);
  });

  it('drops empty department strings', () => {
    const rollups: JobCodeRollup[] = [{
      jobCode: '1820', classTitle: '',
      postings: [mkPosting({ department: '' })],
      activeLists: [], expiredLists: [],
    }];
    expect(collectDepartments(rollups)).toEqual([]);
  });

  it('returns an empty array when no rollups have postings', () => {
    expect(collectDepartments([])).toEqual([]);
  });
});
