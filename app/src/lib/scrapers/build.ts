/**
 * Pure helpers over scraped JobPosting + EligibilityList collections.
 *
 * No DOM, no IO. Builds the per-jobCode rollup that EligibilityView
 * renders. Same input → same output. Tests call these directly.
 */

import type {
  EligibilityList,
  JobCodeRollup,
  JobPosting,
} from './types';
import { DEFAULT_ACTIVE_LIST_WINDOW_DAYS } from './types';
import { isListActive } from './sf-dhr-exam/parse';

/**
 * Group postings + lists by SF Job Code (the 4-digit class code). One
 * rollup row per jobCode that has at least one posting or list.
 * Postings/lists with empty jobCode are dropped from the rollup (they
 * stay in the raw lists for the all-postings / all-lists views).
 *
 * `today` is ISO `YYYY-MM-DD`; pinned by caller for determinism.
 * `windowDays` defaults to 2 years.
 *
 * Order: alphabetical by jobCode. Stable.
 */
export function buildJobCodeRollups(
  postings: JobPosting[],
  lists: EligibilityList[],
  today: string,
  windowDays: number = DEFAULT_ACTIVE_LIST_WINDOW_DAYS,
): JobCodeRollup[] {
  const byCode = new Map<string, JobCodeRollup>();

  function ensure(jobCode: string, classTitle: string): JobCodeRollup {
    let r = byCode.get(jobCode);
    if (!r) {
      r = {
        jobCode,
        classTitle,
        postings: [],
        activeLists: [],
        expiredLists: [],
      };
      byCode.set(jobCode, r);
    } else if (!r.classTitle && classTitle) {
      r.classTitle = classTitle;
    }
    return r;
  }

  for (const p of postings) {
    if (!p.jobCode) continue;
    ensure(p.jobCode, p.classTitle).postings.push(p);
  }

  for (const l of lists) {
    if (!l.jobCode) continue;
    const r = ensure(l.jobCode, l.classTitle);
    if (isListActive(l, today, windowDays)) {
      r.activeLists.push(l);
    } else {
      r.expiredLists.push(l);
    }
  }

  // Within each rollup: postings by releasedDate (newest first); lists
  // by postDate (newest first). Stable in document order if dates
  // collide.
  for (const r of byCode.values()) {
    r.postings.sort((a, b) => b.releasedDate.localeCompare(a.releasedDate));
    r.activeLists.sort((a, b) => b.postDate.localeCompare(a.postDate));
    r.expiredLists.sort((a, b) => b.postDate.localeCompare(a.postDate));
  }

  return [...byCode.values()].sort((a, b) => a.jobCode.localeCompare(b.jobCode));
}

/**
 * Filter rollups by needle — case-insensitive substring across jobCode
 * + classTitle. Returns rollups in original order.
 */
export function filterRollups(rollups: JobCodeRollup[], needle: string): JobCodeRollup[] {
  const q = needle.trim().toLowerCase();
  if (!q) return rollups;
  return rollups.filter(r =>
    r.jobCode.toLowerCase().includes(q) ||
    r.classTitle.toLowerCase().includes(q),
  );
}
