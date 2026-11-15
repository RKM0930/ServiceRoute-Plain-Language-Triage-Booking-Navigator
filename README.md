# ServiceRoute

Lightweight administrative intake for Kahilom Psychological Services. Static
HTML/CSS/JavaScript posts directly to Google Apps Script. No application server,
framework, paid service, or runtime dependency is required.

## Run and test

```sh
python3 -m http.server 8000
```

Development checks (Node.js 22+):

```sh
npm run check
npm test
npm run build
```

The optional build copies the four browser assets to `public/`. It does not
deploy Apps Script. Publish only `index.html`, `style.css`, `app.js`, and
`privacy.html` through your existing host.

### Optional browser regression suite

`tests/browser.mjs` uses externally installed Playwright/Chromium and axe-core
test tools, not application dependencies. It fails explicitly if the tools are
missing; it does not silently skip accessibility checks.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
AXE_SCRIPT=/absolute/path/to/axe-core/axe.min.js \
npm run test:browser
```

Run `npm run build` first. The runner serves `public/` on loopback and intercepts
every Google request using the receiver mock. All other non-local requests are
blocked. It never sends production submissions. Optional screenshots can be
saved outside the repository using `BROWSER_ARTIFACTS_DIR`.

## Contact and preferred-name policy

Frontend and backend independently use the same tested rules for **new** inquiries:

- Philippine mobiles: compact `09xxxxxxxxx`, `+639xxxxxxxxx`, `639xxxxxxxxx`;
  grouped local `0917-123-4567` / `0917 123 4567`; grouped country code with
  consistent spaces or hyphens, e.g. `+63 917 123 4567` / `63-917-123-4567`.
- Exactly 11 digits in the local representation, beginning `09`. No carrier
  allocation list, phone ownership, or active-number claim.
- Surrounding whitespace is removed. Mixed/repeated separators, embedded
  letters, parentheses, periods, internal tabs/newlines, arbitrary international
  numbers and invalid prefixes/lengths are rejected—not stripped into validity.
- Every accepted mobile is displayed and stored as `0917-123-4567`, as literal text.
- Email: surrounding whitespace removed; local part case preserved, domain
  lowercased. Ordinary dot-atom addresses, plus tags, apostrophes, Unicode letters
  and IDN domains are accepted. Dot errors, spaces, invalid domain labels and
  obviously malformed addresses are rejected. Quoted local parts/domain literals
  are outside this intake's supported syntax. Deliverability/ownership is not checked.
- Names remain optional. Whitespace is trimmed/collapsed; a simple all-lowercase
  name gets initial capitals after spaces, apostrophes and hyphens on its first
  nonblank blur (or initial submit boundary). Existing mixed/all-uppercase
  spelling is preserved, including accents and combining marks.
- Later edits preserve the user's capitalization, even intentional lowercase.
  The browser sends `name_case: "preserve"` with the finalized value. The backend
  always cleans whitespace; without that directive it uses the conservative
  lowercase default. Name inputs are not restricted to a Latin-letter whitelist.
- Formatting never truncates a name. If uppercase expansion would exceed the
  existing 80-character limit, the whitespace-cleaned spelling is kept. Requests
  exceeding the raw 80-character limit are rejected independently by the backend.

The payload is frozen before the first POST. Retries keep its values and UUID;
only the transport's attempt UUID changes.

## Existing ledger compatibility

`Code.gs` exclusively opens spreadsheet
`19zT6nogw6NIJq-lYtMEJgJz1J4MPMUzlbFg3RPmRkvw`, worksheet **Intake**.
It never creates a replacement worksheet or rewrites historical business data.

| Columns | Existing ledger mapping |
| --- | --- |
| A–J | `timestamp, preferred_name, client_type, goal, format, schedule, schedule_notes, recommended_service, contact, referral` |
| K–L | `Status, Handled By / Notes` |
| M | `Submission ID` (new submissions use UUID v4) |
| N–R | `consent, privacy_version, consent_recorded_at, Request fingerprint, Receipt attempts` |

Only missing metadata **headers** are added, under a script lock, after validating
the whole schema and ensuring unlabelled columns contain no data. Existing
consent cells remain blank: historical consent is never fabricated. New rows
use a server-generated UTC timestamp in A and P, `Pending` in K, and blank L.

Missing/renamed worksheets, incompatible headers, unexpected additional columns,
unlabelled metadata, stale destination properties, or duplicate existing UUIDs
fail closed. No automatic migration or historical backfill occurs.

### Fingerprint compatibility

The original `fingerprint()` algorithm is deliberately unchanged. Old, unprefixed
Q fingerprints and stored names/contacts are verified **exactly as saved**.
An exact legacy retry may retain a contact accepted by the old validator even if
it would fail today's rules. This exemption can never insert a new inquiry or
accept changed legacy payload contents.

New rows use `v2:<hash>` in the existing Q cell, computed from canonical name and
contact values. Receipt checks recompute from the actual stored fields, without
retroactive normalization. A valid retry may append its attempt UUID only in R;
A–Q, the original timestamp, staff status/notes and fingerprint remain unchanged.
No columns are added beyond the established 18-column contract.

## Confirmation protocol

1. The browser creates a stable `inquiry_id` and an immutable retry payload.
2. Each POST attempt has a fresh `attempt_id`. Both are random UUID v4 values.
3. The public receiver validates the request, locks the ledger, checks column M
   for duplicates, appends at most one row, flushes and reads it back. Accepted
   attempt IDs are recorded in R, binding verification to an actual accepted POST.
4. Because a `no-cors` POST response is opaque, it is **never** treated as proof.
5. The browser makes up to three read-only JSONP receipt checks, with a strict,
   randomly generated callback. Apps Script's JavaScript ContentService response
   works cross-origin and through Google's content redirect, without a proxy.

This follows Google's documented [read-only JSONP ContentService pattern](https://developers.google.com/apps-script/guides/content#serve_jsonp_in_web_pages).

Receipt requests contain only submission/attempt UUIDs, callback name and cache
buster. Responses contain only protocol, submission ID, status, and server
timestamp for confirmed records. No names, contacts, service choices, request
fingerprints, credentials, or secrets are returned. JSONP is restricted to this
read-only, non-contact-data endpoint; it is never used to submit an inquiry.
Google's endpoint is trusted to serve script, as required by JSONP.

- **Confirmed:** the server found a complete matching ledger record and verified
  its internal fingerprint. This confirms storage, **not an appointment**.
- **Failed:** the server explicitly rejected this attempt, for example validation,
  throttling or an ID conflict. Only generic status is exposed.
- **Unverified:** no authoritative result is available—network/receipt timeout,
  old deployment, busy lock, missing permissions, schema or server error, missing
  row, or expired rejection cache. It does not mean “not saved.”

Rejections are cached for five minutes by submission **and attempt** ID, with no
contact data. Cache eviction changes an unknown rejection to Unverified, never
Confirmed. Confirmation requires both the stored row and an accepted attempt ID,
so even an evicted ID-conflict rejection cannot confirm the wrong request. Retries retain
submission data and the same ID, but use a new attempt ID so stale rejections
cannot poison later attempts. Valid retries update only R on matching stored submissions,
never A–Q, including staff statuses/notes. R retains the most recent 64
accepted attempts; checks for older attempts conservatively become Unverified.
Existing records with no matching fingerprint
cannot be overwritten or retrospectively confirmed by this protocol.

The UUIDs are correlation identifiers, not clinic credentials. A person who
already knows both IDs can query their receipt status; the endpoint is not a private
client portal. Do not publish IDs. Request logs may retain IDs and receipt
timestamps. Only the POST carries contact details. A browser reload clears
in-memory retries; copy the inquiry summary before leaving if needed.

## Receiver safeguards and limits

- Server validation for lengths, allowed choices, contact, consent and honeypot.
- Authoritative service matching; client timestamps/recommendations are ignored.
- All new spreadsheet values are literal text, protecting formulas and phone zeroes.
- Script locking serializes schema checks, duplicate detection, writes and receipt
  reads. Busy/time-limited operations remain retryable and Unverified.
- Durable fingerprint detects different payloads reusing an ID. Retries never
  change existing staff statuses or notes.
- Best-effort Google-cache throttling: 60 new inquiries/hour globally and one
  new inquiry/contact/minute. Canonical phone variants share the same cooldown;
  emails are case-folded for cooldown only, not for stored local-part spelling.
  Same-payload retries bypass these limits. Cache eviction/expiry is expected:
  this is not a durable uniqueness rule.
- The public endpoint is not authenticated. Cache limits/honeypots are not strong
  bot prevention; Google quotas and denial-of-service risks still apply.
- Protect Sheet/Apps Script access. Never share the clinical ledger publicly.
  Code checks cannot replace staff access controls or retention operations.

## Administrative duplicate review

**Submission ID is the technical identity.** Identical retries never add a row;
conflicting contents under an existing ID are rejected. A new ID is not rejected
just because the person has used that contact before (apart from the brief
anti-abuse cooldown). Shared family numbers, different services and returning
clients are legitimate. Names alone are never treated as identity.

The owner reports an existing **Intake View** tab with repeated-contact
conditional-format warnings. These are broad staff prompts, not proof of
duplication. The repository contains no view formulas or formatting rules, and
authenticated Sheet access is unavailable: the live rules remain owner-verified.
No code alters that view or overwrites K/L to add warnings.

For canonical equivalence with historical contact formats and a bounded review
window, `reviewRecentInquiries()` is an optional **owner-only, read-only** editor
diagnostic. It returns candidate **row-number groups only**, comparing normalized
contact (case-folded), client type, goal, format, schedule and whitespace-cleaned
scheduling notes within the last 24 hours. It ignores names. It does not log
contacts, create columns, change rows, reject inquiries, or merge/delete records.
No public route invokes it.
Blank notes and the application's default `None specified` count as the same
preference. Computation uses a read-only snapshot after releasing the script lock.

Only timestamp cells that are actual dates or explicit timezone-bearing ISO
strings are interpreted. Ambiguous historical date strings are counted as
unreadable and require manual review; their values are never rewritten. Unsupported
historical contact formats also require manual review. Review
the referenced rows privately in `Intake View`/`Intake`; different people can
still have identical preferences and shared contacts.

## Deployment and owner requirements

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for exact same-URL deployment steps and the
read-only diagnostics. A read-only health check now reports receipt protocol v1,
but not the new normalization capability. This release still needs an owner-
authorized same-URL deployment. Health alone proves neither storage nor permissions.
No production ledger test records were inserted.

`privacy.html` still requires the owner's verified privacy contact, approved
retention policy, staff access/deletion procedures, provider/log review, and
guardian/privacy-request process. These facts are not invented or certified by
this repository. There is no automatic deletion job.

## Matching and UI

The existing design and matching precedence are unchanged:
clearance → clearance evaluation; assessment → assessment battery;
couple/family counseling → couples/family; otherwise → individual counseling.
Format/timing remain preferences. This is administrative routing, not clinical
triage or diagnosis. An inquiry is not a confirmed appointment.

See [UI-AUDIT.md](UI-AUDIT.md) for original wording, implemented revisions,
rendered test coverage and clinic facts still awaiting owner confirmation.
