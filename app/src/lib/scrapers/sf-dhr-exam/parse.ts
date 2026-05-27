/**
 * SF DHR Examination Results — pasted-HTML parser.
 *
 * Why parser-not-fetcher: as of S34 CORS verification (2026-05-27),
 * `fetch('https://sfdhr.org/past-examination-results')` from a browser
 * fails with `TypeError: Failed to fetch` — sfdhr.org doesn't send the
 * permissive `Access-Control-Allow-Origin: *` header that a static
 * client-side React app needs to read the response. Workaround per
 * the S33 research doc: **manual paste**. User opens the DHR page in
 * a browser tab, copies the whole page (or just the table), pastes
 * into a KosPos textarea, KosPos parses the markup with DOMParser.
 *
 * The fragility risk is that sfdhr.org's HTML changes silently (Drupal
 * theme updates) — a parse can break without warning. Mitigations:
 *   1. Emit a clear error when no rows are found (caller surfaces).
 *   2. The parser is forgiving — extra columns, missing columns, or
 *      reordered columns produce zero rows rather than wrong rows.
 *   3. The active-list / score-report distinction is encoded in the
 *      file URL, not the table heading — robust against page-section
 *      reorganization.
 *
 * The URL pattern (verified S34) is:
 *   /sites/default/files/documents/<Score-Reports|Eligible-Lists>/<YYYY>/<CCCC>-<LIST-ID>-<MMDDYYYY>.pdf
 * Class code is the 4-digit prefix; that's our SF Job Code join key.
 */

import type { EligibilityList } from '../types';

/**
 * Parse pasted HTML and extract eligibility-list rows.
 *
 * Accepts:
 *   - Full page HTML (the user's Ctrl+A → Ctrl+C path)
 *   - Just the `<table>...</table>` block
 *   - Multiple `<table>` blocks concatenated (Score Reports + Eligible
 *     Lists copy-paste)
 *
 * Returns rows in document order; caller can sort / filter / dedupe.
 *
 * Empty input → empty array (caller distinguishes "user pasted
 * nothing" from "user pasted something that didn't parse").
 */
export function parseDhrExamHtml(html: string): EligibilityList[] {
  if (!html || html.trim() === '') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const out: EligibilityList[] = [];

  // DHR's table rows are <tr> with three <td>s. We walk every <tr> in
  // the document — robust against multiple tables or non-table siblings.
  const rows = doc.querySelectorAll('tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) continue;
    // Column order per S34 verification: [post date | list ID | class+title link]
    const postDateText = (cells[0].textContent ?? '').trim();
    const listIdText = (cells[1].textContent ?? '').trim();
    const linkCell = cells[2];
    const link = linkCell.querySelector('a');
    if (!link) continue;
    const fileUrl = link.getAttribute('href') ?? '';
    if (!fileUrl) continue;
    const linkText = (link.textContent ?? '').trim();

    // Class code + class title come from the link text:
    //   "0932 - Manager IV"        (4-digit SF civil-service code)
    //   "Q002 - Police Officer"    (letter-prefixed uniformed rank)
    //   "H001 - Firefighter"       (letter-prefixed uniformed rank)
    //
    // Falls back to extraction from the URL when the link text is in an
    // unexpected format. The URL pattern is
    //   .../<TYPE>/<YYYY>/<CODE>-<LIST-ID>-<MMDDYYYY>.pdf
    // We anchor on the trailing `.pdf` to skip the YYYY directory segment
    // (`/2026/` would otherwise eat a 4-digit match).
    const linkMatch = linkText.match(/^([A-Z]?\d{3,4})\s*[-–—]\s*(.+)$/);
    const urlMatch = fileUrl.match(/\/([A-Z]?\d{3,4})-[^/]+\.pdf$/);
    const jobCode = linkMatch?.[1] ?? urlMatch?.[1] ?? '';
    const classTitle = linkMatch?.[2]?.trim() ?? '';

    // Date normalization — DHR's format is "May 14, 2026". Parse → ISO.
    const postDate = normalizeDateString(postDateText);

    // Type derives from the URL path segment.
    const type: EligibilityList['type'] = fileUrl.includes('/Eligible-Lists/')
      ? 'eligible-list'
      : 'score-report';

    // Skip rows where we couldn't pull a job code OR a list id — those
    // would be unusable downstream.
    if (!jobCode || !listIdText) continue;

    // Resolve relative URLs against the DHR origin so the link works
    // standalone (the user opens it in a new tab from KosPos).
    const absoluteUrl = fileUrl.startsWith('http')
      ? fileUrl
      : `https://sfdhr.org${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;

    out.push({
      jobCode,
      classTitle,
      listId: listIdText,
      postDate,
      fileUrl: absoluteUrl,
      type,
    });
  }
  return out;
}

/**
 * Normalize date strings DHR uses ("May 14, 2026") to ISO `YYYY-MM-DD`.
 * Returns empty string when parse fails so the caller can surface "—".
 */
export function normalizeDateString(s: string): string {
  if (!s) return '';
  // The JS Date constructor handles "May 14, 2026" reliably.
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  // Use UTC to avoid TZ rollover for dates near midnight.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Is an eligibility list still active? Default window is 2 years per
 * CSC Rule 411A/412. Lists may be extended beyond that in practice;
 * the active/expired split here is advisory — the user can review the
 * full list in KosPos and treat older lists as inactive if they want.
 */
export function isListActive(
  list: EligibilityList,
  today: string,
  windowDays: number,
): boolean {
  if (!list.postDate || !today) return false;
  const post = new Date(list.postDate + 'T00:00:00Z');
  const now = new Date(today + 'T00:00:00Z');
  if (Number.isNaN(post.getTime()) || Number.isNaN(now.getTime())) return false;
  const ageDays = Math.floor((now.getTime() - post.getTime()) / (24 * 60 * 60 * 1000));
  return ageDays >= 0 && ageDays <= windowDays;
}
