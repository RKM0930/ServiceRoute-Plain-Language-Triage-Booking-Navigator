# UI/content audit and normalization handoff

## Inspection

Source and rendered baseline `8f45838` were inspected before application edits.
The branch was clean and matched the fetched remote. All four steps, ASAP dialog,
recommendations, complete form, consent, three receipt states, retry/edit/copy/reset
and privacy notice were reviewed with mocked Google requests. Requested widths:
320, 375, 480, 768 and 1440px. No production inquiry was sent.

## Findings and revisions

| Location | Original wording/behavior | Issue | Implemented revision | Priority |
| --- | --- | --- | --- | --- |
| Contact, both layers | Phone-like text with 7–15 digits | Invalid local/international formats accepted | Explicit PH mobile and email grammar, canonical dashed phones, frontend/backend parity tests | P0 |
| Receipt fingerprint | Exact original name/contact hash | Retroactive normalization would break old receipts | Original hash retained; only new rows get `v2:` hashes in Q | P0 |
| Timing option | “Ngayong linggo na (Urgent / ASAP)”; “Priority request” | Priority/same-week implication | “Sa lalong madaling panahon”; no guaranteed slot/priority, emergency reminder retained | P0 |
| Video format | “Secure na video call mula sa iyong tahanan” | Security/platform guarantee not independently verified | Clinic confirms platform and requirements | P1 |
| Services | “50-minute”, “75-to-90-minute”, “licensed relationship counselor”, standardized interview/in-person testing/signed document guarantees | Operational/clinical facts not independently verified | Administrative descriptions without durations/qualifications/document guarantees; online testing requires clinic confirmation | P1 |
| Rates | Bare prices per session | Could look like a current verified quote | Original amounts retained as “Tinatayang singil”; confirm current price with clinic | P1 |
| Error | “Pakilagay ang wastong mobile number o email address”; 10.5px; disappeared on any edit | Too broad, small, and premature clearing | Specific 11-digit PH example; 13px, border and associated error; remains invalid until corrected | P1 |
| Contact blur (implementation QA) | First implementation inserted a new error before button click | Regression caught by the new browser suite: button moved during pointer-down and swallowed the first click | Fixed before completion: new errors revealed on submit, valid formatting/existing-error updates on blur | P1 |
| Name | Raw value with no formatting boundary | Inconsistent names; repeated title casing would damage intentional case | Conservative first-blur default; later manual case preserved and sent immutably | P1 |
| Form/actions | “Send your inquiry”, “Submit Inquiry”, “Review / Edit Answers”, “Start Over” amid Filipino questions | Language inconsistency | “Ipadala ang inquiry”, “Baguhin ang mga sagot”, “Magsimula ulit”; familiar service names/state terms retained | P1 |
| Result/states | Long English explanations | Receipt vs appointment distinction harder to understand | Short Filipino explanations; Confirmed/Failed/Unverified meanings unchanged | P1 |
| Loading | Busy controls/spinner only | Weak ongoing announcement | Persistent polite live status for sending/checking and outcome | P1 |
| Contact cooldown | Raw formatting hashed | Equivalent representations could bypass throttling | Canonical contact keys; email comparison case-folded for abuse prevention | P1 |
| Staff review | Owner reports repeated contacts in Intake View | Broad warning is not identity; actual view rules unavailable | Retain view; optional owner-only 24-hour canonical/context review returns row numbers, not contacts | P1 |
| Focus/mobile text | Input outline removed; 15px input; very muted disabled text | Weak focus, possible mobile autozoom, poor disabled-label readability | Strong input/card focus, 16px input, clearer muted disabled text, slightly larger hints/consent | P1 |
| Metadata | Netlify image URL; “60-second, confidential navigator” | Obsolete host and unsupported promises | Remove image/domain assumption and timing/confidentiality claim; keep host-neutral OG/Twitter metadata | P2 |
| Structure/progress | No h1 or visible step count | Weak orientation despite ARIA progress | Same-looking brand h1, visible “Hakbang … sa 4”, focusable skip target | P2 |
| Privacy | English operational caveats | Language mismatch; normalization/review not disclosed | Filipino notice revision 2026-11-15.1, truthful normalization/review disclosures; owner gaps retained | P1 |

## Facts requiring owner confirmation

No verified clinic source was provided for the following existing claims:

- Individual session 50 minutes; couples/family 75–90 minutes.
- Specific professional qualifications/assignment and available service scope.
- Standardized interview, in-person testing battery, signed clearance documents,
  comprehensive report scope and video-platform security arrangements.
- Quoted code amounts: clearance ₱3,500–₱5,000; couples/family ₱2,000–₱2,800;
  individual ₱1,200–₱1,800; assessment has custom rates. Amounts are **not changed**
  or independently certified by this work.
- Response expectations, hotline details/availability, and current appointment slots.

Actual service titles and matching precedence are unchanged. No additional
clinical capability, appointment guarantee, or confidentiality guarantee was invented.

Privacy contact, approved retention periods, authorized staff access, deletion/
exports/backups, provider logs/international processing, guardian authorization
and privacy-request handling remain owner decisions. RA 10173 references and a
checkbox alone are not a compliance certification.

## Test boundaries

Automated assertions cover source rules, backend persistence, legacy receipt
fixtures, contact/name parity, cooldown/duplicate scenarios, and owner-only review.
The optional `tests/browser.mjs` exercises actual Chromium DOM/focus/keyboard/
clipboard/scrolling with the real app source and mocked Google handlers. It checks
all 54 routes and the five widths, including inline errors and three outcome
states, and runs axe WCAG A/AA checks. No runtime dependencies were added.

This is not a human screen-reader evaluation, cross-browser certification, live
Sheet formatting audit, or production end-to-end storage verification. A health
response alone cannot establish those outcomes. Deployment steps and isolated
acceptance scenarios are in `DEPLOYMENT.md`.

## Verified results for this change

- `npm run check`: passed, including the optional browser runner's syntax.
- `npm test`: 211 passed, 0 failed, 0 skipped; all original regression cases retained.
- `npm run build`: passed.
- `npm run test:browser` with external Playwright/Chromium and axe paths:
  54 routing combinations passed; all five requested widths checked through steps,
  results, errors, urgent dialog, privacy and all three outcome states.
- 42 automated WCAG A/AA scans: zero reported violations; zero uncaught browser
  errors. Keyboard, privacy-link/consent separation, focus, loading/double submit,
  manual name edits, clipboard, reset, lost-response and same-ID retry checks passed.
- `git diff --check`: passed. No production POST, push, merge or deployment performed.
