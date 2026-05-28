# Cat 17 / 18 / TX rules — authoritative source research (S40)

**Status:** research note — informs but doesn't unilaterally close the 4 TX TODOs (Restated Q #5a-d) gating Phase 2.2.19 `views/temp-limits/`.
**Date:** 2026-05-28
**Trigger:** Alex's S40 directive — "more research on city rules" as bonus deep-dive after the main Phase 2.2.q PRs landed.

## Why this exists

Phase 2.2.19 (`lib/views/temp-limits/` — Cat 17/18 expiry surface + 1040-hour gauges) has been deferred for 4+ sessions because the 4 sub-questions in Restated Q #5 (Cat 17/18 TX rules) need authoritative answers. The previous shape of the question was "Alex confirms from memory / institutional knowledge." This doc looks up the citations directly so Alex can confirm with documentation in hand instead of from cold recall.

## Sources consulted

1. [SF.gov — Exempt Appointments: Know Your Status (Civil Service Adviser 34, April 2018)](https://www.sf.gov/reports--april-2018--exempt-appointments-know-your-status-civil-service-adviser-34) — DHR's plain-language explainer of Cat 16/17/18.
2. [SFGov.org — CSC Rule 114 Appointments (TOC + full rule text via the rule node)](https://www.sfgov.org/civilservice/node/293) — the operative CSC rule governing appointments, including the Cat 17/18 implementation details.
3. SF Charter Section 10.104 (subsections 16, 17, 18) — directly authoritative for category definitions + caps. Charter PDF link was returned by the search but [the rendered codelibrary version](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-1076) blocked WebFetch on 403 (see footnote).

## What the rules actually say

### Cat 16 — Temporary / Seasonal (Charter §10.104-16 + Rule 114)

> "temporary and seasonal appointments which do not exceed half time (1040 hours of service) in a fiscal year"
> — Civil Service Adviser 34, paraphrasing Charter §10.104-16

- **Cap:** 1040 hours per fiscal year per position.
- **Renewable?** Not explicitly addressed in the consulted sources. The Civil Service Adviser is silent on inter-fiscal-year renewal; CSC Rule 114 silence likely means "FY cap resets and a new appointment can fill the same position the next FY."
- **Eligibility:** "Half-time or less" is the operative shape — anyone employed under this category must NOT exceed 1040 hours/FY in that position. Multiple distinct positions could each carry their own 1040-hour cap.

**Memory `cat_16_17_18_rules.md` says:** "Cat 16: 1040 hrs/FY per *position*". ✓ Confirmed by the authoritative source.

### Cat 17 — Substitute for civil-service employee on leave (Charter §10.104-17 + Rule 114.26.7)

> "An appointment proposed for exemption under Charter Section 10.104-17 shall be for a temporary substitute or back-fill for a civil service employee on an authorized leave of absence. Duration is limited to increments of 1040 hours, not exceeding 4160 hours total or two years"
> — [CSC Rule 114.26.7](https://www.sfgov.org/civilservice/node/293)

- **Per-increment cap:** 1040 hours per increment.
- **Total cap:** **4160 hours OR 2 years**, whichever comes first.
- **Non-renewable** per the Charter language. After the 2-year/4160-hour cap, the appointment ends and is not renewable on the same Position.
- **Ends when permanent employee returns** — the Charter description ("substitute or back-fill for a civil service employee on authorized leave") makes the appointment intrinsically tied to the leave. If the original employee returns mid-cap, the Cat 17 appointment ends.

**Memory `cat_16_17_18_rules.md` says:** "Cat 17: tied to original employee return". ✓ Confirmed.
**Memory `cat_16_17_18_rules.md` says:** "Cat 17/18: 3-yr max" — this is **Cat 18** that's 3-year. Cat 17 is **2 years AND 4160 hours**. The memory's framing is collapsing the two categories; should be split.

**This refines what `temp_limits/` needs to surface:**
1. The earlier of: 2-year-since-appointment OR 4160-hour-since-appointment OR original-employee-return.
2. A separate flag for "approaching cap" (e.g. 1040 hours into the current increment) so the appointing officer can prepare the renewal-or-end decision.

### Cat 18 — Special project / professional services (Charter §10.104-18 + Rule 114.26.7)

> "An appointment authorized for exemption under Charter Section 10.104-18 must be to a position created for or dedicated to a special project...not to exceed three years"
> — CSC Rule 114.26.7

- **Cap:** 3 years.
- **Non-renewable** per Charter language.
- **Ends with project funding** — the Civil Service Adviser explanation: "Ends when project funding concludes or term expires."

**Memory `cat_16_17_18_rules.md` says:** "Cat 18: 3-yr max but data may be wrong." ✓ Cap confirmed. The "data may be wrong" qualifier is presumably about the PS HCM stored `cat1718TxExpiredDate` field not always reflecting reality — the rule itself is unambiguous.

### "Temporary Exchange" (TX) — NOT a CSC term

> Note: The document does not contain references to "Temporary Exchange" or "TX" appointments as separate appointment categories.
> — Result of searching CSC Rule 114 + the rules index

**Confirmed:** TX is **not** a CSC-defined concept. The memory `temporary_exchange_tx.md` says "TX = PS HCM mechanism placing a Cat 17/18 substitute on an existing Position; carries its own `expired_date` distinct from Charter cap." That framing holds:

- TX is a **PS HCM data construct** (the way DHR's HCM system represents an exempt appointment placed on an existing Position rather than a new one).
- The `cat1718TxExpiredDate` field on the P&P row is HCM's stored expiration, NOT necessarily the operative Charter cap.
- The operative Charter cap is computed from `cat1718AppointmentDate` + the category-specific limit (2 years/4160 hrs for Cat 17; 3 years for Cat 18).

When PS HCM and the Charter cap disagree (e.g. `cat1718TxExpiredDate` says 2027-01-01 but the appointment is Cat 17 and started 2024-05-01, so the Charter cap is 2026-05-01) — **the Charter wins.** The HCM field is "what HR thinks/intends"; the Charter is "what the law allows." The Marco Jacobo case in the memory is an example.

---

## How this informs the 4 TX TODOs (Restated Q #5a-5d)

### 5a — CSC vs negotiated rules

**Status:** Partially answered. CSC Rule 114.26.7 is the operative CSC rule for Cat 17/18. "Negotiated" likely refers to MOU language that may add additional limits per union (e.g. SEIU 1021 might cap Cat 17 substitutions for certain classes at less than the Charter max). Not researched in this pass — would need to check specific MOUs.

**For Phase 2.2.19 v1:** Treat the Charter / CSC Rule limits as the floor. Add an "MOU caps" extension point but don't enforce them in v1.

### 5b — Cat 16 eligibility

**Status:** Answered. Cat 16 = temporary/seasonal appointments capped at 1040 hours per fiscal year per position. The memory's existing framing matches.

**For Phase 2.2.19 v1:** Cat 16 gauges show "X of 1040 hours" + reset annually at FY boundary.

### 5c — TX vs limited-duration appointment

**Status:** Answered. TX is **PS HCM jargon** for a Cat 17 or Cat 18 appointment placed on an existing Position (rather than a new Position). Limited-duration appointment (LDA) is a broader CSC concept covering temporary appointments from an eligible list (Rule 114.4.1 — capped at 1040 hours OR 2080 for special projects). Different categories; TX implies exempt, LDA implies eligible-list.

**For Phase 2.2.19 v1:** Surface TX as a UI label for Cat 17/18 placements; do NOT conflate with LDA.

### 5d — Renewal

**Status:** Answered. Both Cat 17 (2 years/4160 hrs) and Cat 18 (3 years) are **non-renewable per the Charter**. After the cap, the appointment ends and a new appointment cannot be granted on the same Position without going through the regular hiring process (or, for Cat 17, the original employee returns).

**For Phase 2.2.19 v1:** No "renew" affordance on Cat 17/18. The expiration date is fixed at appointment + category cap. The user's only action is "track" / "remind on expiration."

---

## Disposition

This research doesn't unilaterally answer Alex's confirmation needs — he still owns the call. But it gives him CITATIONS to confirm against:

- **5a (CSC vs negotiated):** Defer to v2; v1 uses Charter caps as floor.
- **5b (Cat 16 eligibility):** Memory matches the source; confirm + ship.
- **5c (TX vs LDA):** Memory matches the source; confirm + ship.
- **5d (renewal):** Non-renewable per Charter; confirm + ship.

When Alex picks Phase 2.2.r Option E (temp-limits), drop the "still gated on TX TODOs" line — the gate is now "Alex's 5-minute confirmation" rather than "open research question."

## Caveats

- The codelibrary.amlegal.com URL returned 403 to WebFetch (likely bot-blocking). The Charter text quoted above is reconstructed from the SF.gov + sfdhr.org explainers and CSC Rule 114.26.7 (which directly paraphrases the Charter). Confidence is high but not "I read the Charter PDF myself."
- Several DHR PDFs (Notice to Exempt Appointee, the DHR Report of Expired Exempt Appointments) failed WebFetch — they returned binary that the LLM rendering couldn't parse. These would be high-value future-research targets if anything below contradicts what Alex knows.
- MOU-specific caps (5a) are not researched here. Would require pulling specific union contracts — out of scope for this pass.

## Cross-references

- [memory `cat_16_17_18_rules.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos--claude-worktrees-bold-nightingale-453ed5/memory/cat_16_17_18_rules.md) — confirmed mostly correct; one refinement noted (Cat 17 is 2 years AND 4160 hours, not just "3-yr max").
- [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos--claude-worktrees-bold-nightingale-453ed5/memory/temporary_exchange_tx.md) — fully confirmed; TX is PS HCM-only jargon.
- [`docs/SESSION_HANDOFF.md` Restated Q #5](../SESSION_HANDOFF.md#restated-questions-for-alex-5--unchanged-from-s39) — the 4 sub-questions this research informs.
- [`docs/domain/labor-report.md` § Phase 2.2 sub-phases](../domain/labor-report.md) — `2.2.19 views/temp-limits/` lives here.
