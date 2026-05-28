/**
 * Unit tests for the Phase 2.2.o lazy PDF text extraction layer.
 *
 * Two test surfaces:
 *
 *   - Pure field matchers (matchCertRule, matchListDepartment,
 *     matchExamSubType, extractPdfFields) — exercised against synthetic
 *     text fixtures that mirror the cover-sheet layouts seen on real
 *     DHR PDFs. These are the highest-leverage tests because the matcher
 *     chain is where regressions would show up first.
 *
 *   - The fetchAndExtractPdfFields entry point — exercised with a stubbed
 *     fetch + a stubbed extractTextImpl so we don't touch the network or
 *     pdfjs from jsdom. Covers the proxy-chain fallthrough, the PDF-magic
 *     sniff, and the never-throws-always-returns-PdfExtract contract.
 *
 * What is NOT covered here:
 *
 *   - The pdfjs integration itself — would need real PDF fixtures + a
 *     non-jsdom Worker environment. Exercised by the preview-MCP live
 *     walkthrough against real DHR PDFs at task 7 instead.
 */

import { describe, it, expect } from 'vitest';
import {
  extractLabeledField,
  extractPdfFields,
  fetchAndExtractPdfFields,
  matchCertRule,
  matchDuration,
  matchExamSubType,
  matchExamType,
  matchListDepartment,
} from './sf-dhr-exam/pdf-parse';
import type { CorsProxy } from './sf-dhr-exam/fetch';

// A real DHR score-report page-1 text dump, captured via preview-MCP
// against `0932-161040-05142026.pdf` during Phase 2.2.o verification.
// pdfjs flattens the labeled-table layout into one space-separated run.
const DHR_FIXTURE = 'City and County of San Francisco Department of Human Resources Eligible List Score Report List ID:   161040   Exam Type:   PBT Class:   0932-Manager IV   Scope:   PUC Working Title:   Manager IV   List Type:   CPE Job Specialty:   None Post:   2026-05-14   Cert Rule:   Rule of the List   Duration:   12 Months Inspection Start:   2026-05-14';

// Variant with CTW (Citywide-shorthand) Scope — exercises the
// normalization rule. From `0932-E10187-04012026.pdf`.
const DHR_CITYWIDE_FIXTURE = 'City and County of San Francisco Department of Human Resources Eligible List Score Report List ID:   E10187   Exam Type:   ETP Class:   0932-Manager IV   Scope:   CTW Working Title:   Manager IV   List Type:   CPE Job Specialty:   None Post:   2026-03-26   Cert Rule:   Rule of the List   Duration:   6 Months';

// ---------------------------------------------------------------------------
// extractLabeledField — Tier-1 label-based extraction (Phase 2.2.o real-
// PDF format). Boundary-aware: captures the value between `<label>:` and
// the next known DHR label or ISO date.
// ---------------------------------------------------------------------------

describe('extractLabeledField', () => {
  it('extracts the Scope value from a real DHR fixture', () => {
    expect(extractLabeledField(DHR_FIXTURE, 'Scope')).toBe('PUC');
  });

  it('extracts the List Type value', () => {
    expect(extractLabeledField(DHR_FIXTURE, 'List Type')).toBe('CPE');
  });

  it('extracts the Exam Type value', () => {
    expect(extractLabeledField(DHR_FIXTURE, 'Exam Type')).toBe('PBT');
  });

  it('extracts the Cert Rule value stopping at the next label', () => {
    expect(extractLabeledField(DHR_FIXTURE, 'Cert Rule')).toBe('Rule of the List');
  });

  it('extracts the Duration value', () => {
    expect(extractLabeledField(DHR_FIXTURE, 'Duration')).toBe('12 Months');
  });

  it('extracts the List ID value (numeric)', () => {
    expect(extractLabeledField(DHR_FIXTURE, 'List ID')).toBe('161040');
  });

  it('extracts a value stopping at an ISO date boundary', () => {
    // Post: 2026-05-14 — boundary is the date itself for the NEXT label.
    expect(extractLabeledField(DHR_FIXTURE, 'Post')).toBe('2026-05-14');
  });

  it('returns undefined for a label that is not present', () => {
    expect(extractLabeledField(DHR_FIXTURE, 'Not A Real Label')).toBeUndefined();
  });

  it('handles compound labels (multi-word)', () => {
    expect(extractLabeledField(DHR_FIXTURE, 'Working Title')).toBe('Manager IV');
  });
});

// ---------------------------------------------------------------------------
// matchCertRule
// ---------------------------------------------------------------------------

describe('matchCertRule', () => {
  it('matches "Rule of the List"', () => {
    expect(matchCertRule('Certification Rule: Rule of the List')).toBe('Rule of the List');
  });

  it('matches "Rule of 3 Names"', () => {
    expect(matchCertRule('Certification: Rule of 3 Names')).toBe('Rule of 3 Names');
  });

  it('matches "Rule of 5 Names" inside a longer sentence', () => {
    expect(matchCertRule('See Rule of 5 Names per CSC 412'))
      .toBe('Rule of 5 Names');
  });

  it('matches "Rule of 1 Name" (singular)', () => {
    expect(matchCertRule('Rule of 1 Name')).toBe('Rule of 1 Name');
  });

  it('matches "Rule of 3 Scores"', () => {
    expect(matchCertRule('Rule of 3 Scores')).toBe('Rule of 3 Scores');
  });

  it('normalizes the singular form even when input is "Name"', () => {
    // Source PDF says "Rule of 3 Name" → normalize to plural "Names"
    expect(matchCertRule('Rule of 3 Name')).toBe('Rule of 3 Names');
  });

  it('is case-insensitive', () => {
    expect(matchCertRule('rule of the list')).toBe('Rule of the List');
  });

  it('tolerates extra whitespace', () => {
    expect(matchCertRule('Rule   of   the   List')).toBe('Rule of the List');
  });

  it('returns undefined when no match', () => {
    expect(matchCertRule('No certification info here.')).toBeUndefined();
  });

  it('Tier-1: extracts from real DHR `Cert Rule:` label', () => {
    expect(matchCertRule(DHR_FIXTURE)).toBe('Rule of the List');
  });
});

// ---------------------------------------------------------------------------
// matchListDepartment
// ---------------------------------------------------------------------------

describe('matchListDepartment', () => {
  it('matches "Citywide" anywhere in text', () => {
    expect(matchListDepartment('Eligible List: Citywide certification'))
      .toBe('Citywide');
  });

  it('matches labeled "Examination Department: <Name>"', () => {
    expect(matchListDepartment('Examination Department: Public Health'))
      .toBe('Public Health');
  });

  it('matches labeled "Hiring Department: <Name>"', () => {
    expect(matchListDepartment('Hiring Department: Building Inspection'))
      .toBe('Building Inspection');
  });

  it('matches labeled "Department: <Name>" (bare)', () => {
    expect(matchListDepartment('Department: Department of Public Works'))
      .toBe('Department of Public Works');
  });

  it('matches narrative "Department of <Name>"', () => {
    expect(matchListDepartment('exam for the Department of Public Health'))
      .toBe('Department of Public Health');
  });

  it('matches SF department codes from the whitelist (DBI / DPH / MTA / etc.)', () => {
    expect(matchListDepartment('Posted by DBI for the next biennium'))
      .toBe('DBI');
    expect(matchListDepartment('SFPD exam')).toBe('SFPD');
  });

  it('does not match an arbitrary uppercase token outside the whitelist', () => {
    expect(matchListDepartment('XYZ examination type')).toBeUndefined();
  });

  it('prefers Citywide over Department-of when both appear', () => {
    expect(matchListDepartment('Citywide list with Department of Health affected'))
      .toBe('Citywide');
  });

  it('returns undefined when no chain step matches', () => {
    expect(matchListDepartment('Random body text with no dept info.'))
      .toBeUndefined();
  });

  it('Tier-1: extracts the Scope value from a real DHR fixture', () => {
    expect(matchListDepartment(DHR_FIXTURE)).toBe('PUC');
  });

  it('Tier-1: normalizes Scope "CTW" to "Citywide"', () => {
    expect(matchListDepartment(DHR_CITYWIDE_FIXTURE)).toBe('Citywide');
  });

  it('Tier-2 narrative fallback skips the "Department of Human Resources" issuing-body boilerplate', () => {
    // Without the Scope label or a whitelist dept code, the only
    // Department-of-X in a DHR cover sheet is the issuing-body header
    // — should return undefined, not the boilerplate name.
    const onlyBoilerplate = 'City and County of San Francisco Department of Human Resources Eligible List Score Report';
    expect(matchListDepartment(onlyBoilerplate)).toBeUndefined();
  });

  it('Tier-2 narrative fallback returns the first non-Human-Resources Department-of match', () => {
    // Two "Department of" mentions; first is the boilerplate, second
    // is the actual list dept. Matcher should skip the first + return
    // the second.
    const twoMentions = 'Department of Human Resources Eligible List for Department of Public Works';
    expect(matchListDepartment(twoMentions)).toBe('Department of Public Works');
  });
});

// ---------------------------------------------------------------------------
// matchExamSubType
// ---------------------------------------------------------------------------

describe('matchExamSubType', () => {
  it('matches "Promotional"', () => {
    expect(matchExamSubType('Promotional examination')).toBe('Promotional');
  });

  it('matches "Permanent Civil Service" → "PCS"', () => {
    expect(matchExamSubType('Permanent Civil Service exam')).toBe('PCS');
  });

  it('matches bare "PCS" abbreviation', () => {
    expect(matchExamSubType('Type: PCS')).toBe('PCS');
  });

  it('matches "Q&E"', () => {
    expect(matchExamSubType('Q&E examination')).toBe('Q&E');
  });

  it('matches "Q and E" → "Q&E"', () => {
    expect(matchExamSubType('Q and E')).toBe('Q&E');
  });

  it('matches "Qualifications and Experience" → "Q&E"', () => {
    expect(matchExamSubType('Qualifications and Experience')).toBe('Q&E');
  });

  it('matches "CBT"', () => {
    expect(matchExamSubType('CBT scoring')).toBe('CBT');
  });

  it('matches "Computer-Based Test" → "CBT"', () => {
    expect(matchExamSubType('Computer-Based Test format')).toBe('CBT');
  });

  it('prefers "Departmental Promotive" over plain "Departmental"', () => {
    expect(matchExamSubType('Departmental Promotive examination'))
      .toBe('Departmental Promotive');
  });

  it('falls back to "Departmental" when "Promotive" is not present', () => {
    expect(matchExamSubType('Departmental exam')).toBe('Departmental');
  });

  it('matches "Open-Competitive" → "Open Competitive"', () => {
    expect(matchExamSubType('Open-Competitive examination'))
      .toBe('Open Competitive');
  });

  it('matches "Entrance"', () => {
    expect(matchExamSubType('Entrance examination')).toBe('Entrance');
  });

  it('returns undefined when no match', () => {
    expect(matchExamSubType('Random text with no exam type.')).toBeUndefined();
  });

  it('Tier-1: extracts the List Type value (CPE) from a real DHR fixture', () => {
    expect(matchExamSubType(DHR_FIXTURE)).toBe('CPE');
  });

  it('Tier-1 result is returned verbatim — does not re-run Tier-2 normalization on labeled values', () => {
    // If DHR ever uses a List Type value not in the EXAM_SUB_TYPE_PATTERNS
    // whitelist, we should still return it (the label is authoritative).
    const fakeLabel = 'List Type:   NewType Job Specialty:   None';
    expect(matchExamSubType(fakeLabel)).toBe('NewType');
  });
});

// ---------------------------------------------------------------------------
// matchExamType — Phase 2.2.o (testing methodology, distinct from sub-type)
// ---------------------------------------------------------------------------

describe('matchExamType', () => {
  it('Tier-1: extracts PBT from a real DHR fixture', () => {
    expect(matchExamType(DHR_FIXTURE)).toBe('PBT');
  });

  it('Tier-1: extracts ETP from a Citywide DHR fixture', () => {
    expect(matchExamType(DHR_CITYWIDE_FIXTURE)).toBe('ETP');
  });

  it('Tier-2: matches PBT as a bare keyword', () => {
    expect(matchExamType('Type code: PBT only')).toBe('PBT');
  });

  it('Tier-2: matches CBT as a bare keyword', () => {
    expect(matchExamType('CBT scoring used')).toBe('CBT');
  });

  it('returns undefined when no match', () => {
    expect(matchExamType('No exam-type marker.')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// matchDuration — Phase 2.2.o (per-list duration; contradicts S37 constant-2yr assumption)
// ---------------------------------------------------------------------------

describe('matchDuration', () => {
  it('Tier-1: extracts "12 Months" from a real DHR fixture', () => {
    expect(matchDuration(DHR_FIXTURE)).toBe('12 Months');
  });

  it('Tier-1: extracts "6 Months" from the Citywide variant', () => {
    expect(matchDuration(DHR_CITYWIDE_FIXTURE)).toBe('6 Months');
  });

  it('returns undefined when Duration label is absent (no Tier-2 fallback by design)', () => {
    expect(matchDuration('No duration field here.')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// extractPdfFields — composite
// ---------------------------------------------------------------------------

describe('extractPdfFields', () => {
  it('extracts all 5 fields from a real DHR cover sheet (Tier-1)', () => {
    expect(extractPdfFields(DHR_FIXTURE)).toEqual({
      certRule: 'Rule of the List',
      listDepartment: 'PUC',
      examSubType: 'CPE',
      examType: 'PBT',
      duration: '12 Months',
    });
  });

  it('extracts all 5 fields from the Citywide DHR variant', () => {
    expect(extractPdfFields(DHR_CITYWIDE_FIXTURE)).toEqual({
      certRule: 'Rule of the List',
      listDepartment: 'Citywide',  // CTW → normalized
      examSubType: 'CPE',
      examType: 'ETP',
      duration: '6 Months',
    });
  });

  it('extracts 3 of 5 from a legacy non-DHR cover sheet (Tier-2 only)', () => {
    const text = `
      SAN FRANCISCO DEPARTMENT OF HUMAN RESOURCES
      Examination Announcement
      Job Code: 1820 Junior Administrative Analyst
      Examination Type: Promotional
      Certification Rule: Rule of 3 Names
      Hiring Department: Building Inspection
    `;
    expect(extractPdfFields(text)).toEqual({
      certRule: 'Rule of 3 Names',
      listDepartment: 'Building Inspection',
      examSubType: 'Promotional',
      examType: undefined,
      duration: undefined,
    });
  });

  it('extracts partial fields when only some are present', () => {
    const text = `Rule of the List · Citywide eligibility`;
    expect(extractPdfFields(text)).toEqual({
      certRule: 'Rule of the List',
      listDepartment: 'Citywide',
      examSubType: undefined,
      examType: undefined,
      duration: undefined,
    });
  });

  it('returns all undefined for empty text', () => {
    expect(extractPdfFields('')).toEqual({
      certRule: undefined,
      listDepartment: undefined,
      examSubType: undefined,
      examType: undefined,
      duration: undefined,
    });
  });
});

// ---------------------------------------------------------------------------
// fetchAndExtractPdfFields — entry point integration
// ---------------------------------------------------------------------------

// Make a Uint8Array starting with the "%PDF-" magic bytes; pads to a
// real-ish length so the magic check passes and the body is plausibly
// a PDF without us having to bundle a real one.
function mkPdfBuf(): ArrayBuffer {
  const buf = new Uint8Array(64);
  // %PDF-1.4
  buf.set([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34], 0);
  return buf.buffer;
}

const fakeProxy: CorsProxy = {
  label: 'fake',
  wrap: (u: string) => `https://fake.test/?u=${encodeURIComponent(u)}`,
};

describe('fetchAndExtractPdfFields', () => {
  it('returns success=true with all three fields populated on the happy path', async () => {
    const result = await fetchAndExtractPdfFields('https://x.pdf', {
      fetchImpl: async () => new Response(mkPdfBuf(), { status: 200 }),
      proxies: [fakeProxy],
      extractTextImpl: async () =>
        'Rule of 3 Names · Citywide · Promotional examination',
    });
    expect(result.success).toBe(true);
    expect(result.certRule).toBe('Rule of 3 Names');
    expect(result.listDepartment).toBe('Citywide');
    expect(result.examSubType).toBe('Promotional');
    expect(result.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.error).toBeUndefined();
  });

  it('returns success=true with undefined fields when text yields no matches', async () => {
    const result = await fetchAndExtractPdfFields('https://x.pdf', {
      fetchImpl: async () => new Response(mkPdfBuf(), { status: 200 }),
      proxies: [fakeProxy],
      extractTextImpl: async () => 'nothing useful in this body',
    });
    expect(result.success).toBe(true);
    expect(result.certRule).toBeUndefined();
    expect(result.listDepartment).toBeUndefined();
    expect(result.examSubType).toBeUndefined();
  });

  it('returns success=false when every proxy throws (network down)', async () => {
    const result = await fetchAndExtractPdfFields('https://x.pdf', {
      fetchImpl: async () => { throw new Error('network down'); },
      proxies: [fakeProxy],
      extractTextImpl: async () => '',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('All 1 CORS proxies failed');
    expect(result.error).toContain('network down');
  });

  it('returns success=false when body lacks %PDF- magic bytes', async () => {
    const result = await fetchAndExtractPdfFields('https://x.pdf', {
      fetchImpl: async () =>
        new Response('<html>404 Not Found</html>', { status: 200 }),
      proxies: [fakeProxy],
      extractTextImpl: async () => '',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('non-PDF body');
  });

  it('returns success=false when HTTP status is not 2xx', async () => {
    const result = await fetchAndExtractPdfFields('https://x.pdf', {
      fetchImpl: async () => new Response('Server Error', { status: 503 }),
      proxies: [fakeProxy],
      extractTextImpl: async () => '',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 503');
  });

  it('falls through to the next proxy when the first returns non-PDF', async () => {
    const calls: string[] = [];
    const failingProxy: CorsProxy = {
      label: 'fail',
      wrap: (u) => `https://fail.test/?u=${u}`,
    };
    const okProxy: CorsProxy = {
      label: 'ok',
      wrap: (u) => `https://ok.test/?u=${u}`,
    };
    const result = await fetchAndExtractPdfFields('https://x.pdf', {
      fetchImpl: async (url) => {
        calls.push(url);
        if (url.includes('fail.test')) {
          return new Response('not a pdf', { status: 200 });
        }
        return new Response(mkPdfBuf(), { status: 200 });
      },
      proxies: [failingProxy, okProxy],
      extractTextImpl: async () => 'Rule of the List',
    });
    expect(calls).toHaveLength(2);
    expect(result.success).toBe(true);
    expect(result.certRule).toBe('Rule of the List');
  });

  it('appends an optional workerUrl proxy to the chain', async () => {
    const calls: string[] = [];
    const result = await fetchAndExtractPdfFields('https://x.pdf', {
      fetchImpl: async (url) => {
        calls.push(url);
        // Fail the default proxy, succeed only on the worker URL.
        if (url.includes('worker.example')) {
          return new Response(mkPdfBuf(), { status: 200 });
        }
        return new Response('nope', { status: 200 });
      },
      proxies: [fakeProxy],
      workerUrl: 'https://worker.example/proxy',
      extractTextImpl: async () => 'PCS · Citywide',
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('fake.test');
    expect(calls[1]).toContain('worker.example');
    expect(result.success).toBe(true);
  });

  it('never throws — always returns a PdfExtract even on extractor error', async () => {
    const result = await fetchAndExtractPdfFields('https://x.pdf', {
      fetchImpl: async () => new Response(mkPdfBuf(), { status: 200 }),
      proxies: [fakeProxy],
      extractTextImpl: async () => { throw new Error('pdfjs blew up'); },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('pdfjs blew up');
  });
});
