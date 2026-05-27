# DHR data scraping — feasibility plan

**Status:** research / planning only — no implementation in this session.
**Date:** 2026-05-28 (Session 33)
**Driver:** Alex's S33 prompt:

> figure out a plan to get eligibility list / examination results for all
> job classes from the dhr website (https://sfdhr.org/examination-results)
> and a plan to get job postings from the dhr website
> (https://careers.sf.gov/) so kospos can link to job postings and knows
> which positions have active eligibility lists. how realistic is it to
> add a button that kicks off a manual scrape of everything

This doc captures what was learned from a 10-minute reconnaissance of
both sites + a search of the upstream platform docs, then frames the
realistic options for a "manual scrape" button in KosPos. It's a plan,
not a build — picking an option is Alex's call when he returns.

---

## Constraint 1 — KosPos's architecture

KosPos is a **static client-side React app** on GitHub Pages. It has:

- ❌ No backend / no server
- ❌ No cron / no scheduled jobs
- ❌ No server-side `fetch` capability
- ✅ Browser `fetch` — but cross-origin requests are subject to CORS

CORS matters because most government-website hosts don't set the
`Access-Control-Allow-Origin: *` header that a browser-only client
needs to read the response. The hosting page can still make the
request, but the browser silently discards the response body.

Three categories of workaround:

1. **Use a public API that has CORS** — best case. SmartRecruiters
   (the SF Careers platform) probably qualifies; sfdhr.org probably
   doesn't.
2. **Use a CORS proxy** — third-party (e.g. allorigins.win) or
   self-hosted serverless (Cloudflare Worker). Free tier; rate-limited;
   adds an external dependency.
3. **Manual paste flow** — user opens the source page in a browser tab,
   copies the table HTML or text, pastes into a KosPos textarea, KosPos
   parses. Slowest UX; zero infrastructure.

The "manual scrape button" Alex asked about is doable; **how** doable
depends on which option works per source.

---

## Source 1 — Job postings (careers.sf.gov)

### What's there

The careers.sf.gov frontend is a custom UI built over
**SmartRecruiters** (the ATS / applicant tracking system used by CCSF).
Confirmed from page markup: a reference to
`jobs.smartrecruiters.com/my-applications/CityAndCountyOfSanFrancisco1`.

The careers page itself shows:

- 1000+ job classes filterable via the UI
- 50+ departments filterable via the UI
- Per-job permalinks: `careers.sf.gov/role/?id=<numeric_id>` —
  the `id` matches a SmartRecruiters posting id
- Standard filters: department, job class, career family
- Search box for free-text matches
- Pagination

### What's NOT directly visible

- RSS feed
- Sitemap.xml linking to all per-job pages
- JSON endpoint in the page markup (the UI fetches from SmartRecruiters
  in the background)

### SmartRecruiters public API

SmartRecruiters publishes a documented [Posting API](https://developers.smartrecruiters.com/docs/posting-api).
The listing endpoint:

```
GET https://api.smartrecruiters.com/v1/companies/CityAndCountyOfSanFrancisco1/postings?
  limit=100&offset=0
```

Returns JSON with `content[]` of Posting objects: `id`, `name`,
`uuid`, `jobAd`, `creator`, `function`, `industry`, `typeOfEmployment`,
`location`, `customField`, `releasedDate`, `ref`. The full listing
endpoint supports filtering by `department`, `city`, `country`,
`region` query params.

**Auth status — needs verification.** The official docs say:

> The Posting API supports only API Key authentication method. You must
> pass authentication token through X-SmartToken HTTP header.

BUT — many embedded careers widgets call SmartRecruiters from the browser
*without* a token, suggesting there's a public read-only flavor of the
endpoint. The next-step task is to test this from a browser console:

```js
fetch('https://api.smartrecruiters.com/v1/companies/CityAndCountyOfSanFrancisco1/postings?limit=10')
  .then(r => r.json())
  .then(console.log);
```

If it returns JSON without a token, KosPos can hit it directly. If it
returns 401, we need a token (Alex would have to obtain one from DHR /
SmartRecruiters admin) or a serverless proxy.

### Build estimate — IF the public endpoint works

**4–8 hours for a v1 manual-scrape button.** Breakdown:

| Task | Effort |
|---|---|
| Add `lib/scrapers/sf-careers/` module — fetch all pages (paginated by offset), normalize to `JobPosting[]` | 2 hr |
| Add `lib/scrapers/types.ts` — `JobPosting { id, jobCode, title, department, location, releasedDate, url }` | 1 hr |
| Add `lib/views/eligibility/` or extend Positions view — link a position to its open posting (if any) by jobCode | 1 hr |
| Wire scrape button into the Importer / Load Reports tab — "Refresh job postings" with loading indicator | 1 hr |
| Session JSON wiring — store last-scraped-at + the postings array | 1 hr |
| Tests | 1–2 hr |

### Build estimate — IF a token is required

Add 2–4 hours for serverless proxy setup (Cloudflare Worker, free
tier): write a worker that fronts the SmartRecruiters API + injects
the token, KosPos calls the worker instead. Adds a small operational
cost (re-issuing the token annually, monitoring the worker for
errors). Alex would need to obtain the token first.

### Realistic? **Yes — high confidence for v1.**

The data is clean (typed JSON, well-documented), the volume is small
(~1000 job classes × 1 posting each = ~1000 records, ~500 KB JSON),
and the cross-link to KosPos Positions is trivial (`jobCode` matches
already-loaded position records).

---

## Source 2 — Examination results (sfdhr.org/examination-results)

### What's there

Two-section landing page:

1. **Score Reports** — for miscellaneous civil-service classes
2. **Eligible Lists** — for uniformed police/fire ranks

The landing page itself has no data — it links to
[/past-examination-results](https://sfdhr.org/past-examination-results)
which is the actual results table.

### What `/past-examination-results` looks like

- Paginated HTML table — **66 pages** of results
- 3 columns per row: **Post date** · **List ID** · **Class & Job Title**
  (the title cell is a hyperlink to the PDF result file)
- File URL pattern (predictable):
  ```
  /sites/default/files/documents/Score-Reports/<YEAR>/<CLASS-CODE>-<LIST-ID>-<DATE>.pdf
  ```
  Example: `0932-161040-05142026.pdf`

### What KosPos actually needs

For the "which positions have active eligibility lists" question, the
**metadata** is what matters — class code, list ID, post date — not the
PDF contents (candidate names, scores). The metadata is in the HTML
table rows; no PDF parsing required.

For the "active" determination: a list is typically active for 1–2 years
from post date (CSC Rule 411A / 412 governs the rule). KosPos can
compute `isActive = (today - postDate) < expirationWindow` from the
post date alone. For a first cut, surface "list exists with post date
X" and let Alex assert active/expired manually until we wire the
expiration rule.

### CORS status

Untested but **likely blocked**. sfdhr.org runs on Drupal — most
Drupal sites don't set permissive CORS headers. Verifying:

```js
fetch('https://sfdhr.org/past-examination-results').then(r => r.text())
```

— if this works in a browser console without a CORS error, we're good.
If it returns "blocked by CORS policy," we need a workaround:

| Workaround | Cost | Friction |
|---|---|---|
| Public CORS proxy (allorigins.win, corsproxy.io) | free, rate-limited (10–50 req/min); 3rd party sees the URL | low |
| Self-hosted Cloudflare Worker | free tier covers this volume easily; ~$0/mo | low; one-time setup |
| Self-hosted Vercel function | similar; ~$0/mo | low |
| Manual paste (user copies HTML, pastes into textarea) | $0; no infra | high — user has to repeat the paste for 66 pages |

Recommended: **Cloudflare Worker** if the scrape becomes a recurring
need. Defer to v2; v1 ships with a CORS-proxy fallback or the manual
paste flow.

### Pagination — 66 pages

The `/past-examination-results` page is paginated with `?page=N` query
param (standard Drupal pattern — needs verification). The full crawl is
66 GET requests. At a polite 1-req/second rate to avoid spooking
sfdhr.org's WAF, the scrape completes in ~1 minute. Don't run more
than once per week — exam result postings are infrequent.

### Build estimate — assuming we use a CORS proxy

**8–16 hours for v1.** Breakdown:

| Task | Effort |
|---|---|
| Add `lib/scrapers/sf-dhr-exam/` — paginated HTML fetch + table-row parse (DOMParser in browser) | 3–5 hr |
| Add `lib/scrapers/types.ts` — `EligibilityList { jobCode, listId, postDate, fileUrl, isActive }` | 1 hr |
| Add `lib/views/eligibility/` — list view filterable by job code with cross-link to Positions for active lists | 2 hr |
| Wire scrape button with loading indicator + abort capability | 1–2 hr |
| Session JSON wiring + per-job-code lookup helper | 1 hr |
| Tests | 2–3 hr |
| Robustness: fragility if sfdhr.org changes the page HTML — needs a "parse error" surface for the user | 1–2 hr |

### Realistic? **Moderate — yes for v1 if Alex tolerates the CORS proxy + fragility tradeoffs.**

The data is structured enough that we don't need to parse PDFs. The
real risk is that sfdhr.org's HTML changes silently (Drupal theme
updates) — a parse can break without warning and we don't notice until
the next scrape returns 0 results.

Mitigations: emit a clear error when the table-row selector misses;
keep the last-known-good results in the session JSON so a parse failure
degrades to "stale data" rather than "no data."

---

## The "manual scrape button" UX

Whichever source (or both), the user-facing pattern is the same:

```
[Load Reports tab]
  ├─ Drop zone for .xlsx / .xlsm / .csv files       (existing)
  ├─ Save / Load session                            (existing)
  ├─ Loading indicator overlay during file parse    (PR #103)
  └─ NEW — Refresh DHR data
       ├─ [↻ Refresh job postings] (last refreshed: 2026-05-26 at 14:30; 1042 postings)
       └─ [↻ Refresh eligibility lists] (last refreshed: 2026-05-22; 410 lists)
```

Each refresh button:

1. Surfaces the LoadingOverlay (already shipped in PR #103) with
   per-stage status (e.g. "Page 3 of 66…")
2. Runs the fetch + parse
3. Writes the results into a Zustand store + the session JSON
4. Surfaces a success message + last-refreshed timestamp
5. Surfaces a clear error message if CORS / parse / network fails

The scrape is **on-demand**, not background — KosPos can't run a cron.
Alex controls when to refresh.

---

## Recommendation

**Pick a sequence based on Alex's appetite:**

| Priority | Pick this if… | Sub-phase id |
|---|---|---|
| 1 — Job postings first (4–8 hr) | Alex wants the cross-link to active postings shipped fast; willing to test SmartRecruiters CORS first. | `2.2.scraper-jobs` (new) |
| 2 — Exam results next (8–16 hr) | Alex's existing Tab 11 Eligibility Lists is hand-maintained; KosPos becomes system of record once we scrape. Maps to existing `2.2.10` `lib/reference/dhr-eligibility/` from the dependency graph. | `2.2.10` (existing) |
| 3 — Skip both for now | Alex prefers to stay on the labor-report focus and revisit when one of these becomes a blocker. | n/a |

**Suggested next-session action (when Alex returns):**

A 30-minute "verify CORS" test that answers two questions:

1. Does `fetch('https://api.smartrecruiters.com/v1/companies/CityAndCountyOfSanFrancisco1/postings?limit=10')` work without a token from a browser console?
2. Does `fetch('https://sfdhr.org/past-examination-results')` succeed (or get blocked by CORS)?

The answers determine whether we ship without a proxy (4-hr Job
Postings sub-phase) or with one (12-hr including the proxy setup).

---

## What this doc is NOT

- A commitment to build either scraper. Alex picks.
- An ADR. If we ship the scrapers, they get a Phase 2.4 ADR for the
  CORS / proxy decisions.
- A spec. It's a plan; the actual sub-phase scope gets written when
  Alex picks one.
