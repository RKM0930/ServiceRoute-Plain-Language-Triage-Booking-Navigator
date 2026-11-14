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

## Existing ledger compatibility

`Code.gs` exclusively opens spreadsheet
`19zT6nogw6NIJq-lYtMEJgJz1J4MPMUzlbFg3RPmRkvw`, worksheet **Intake**.
It never creates a replacement worksheet or rewrites historical records.

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
cannot poison later attempts. Valid retries update only R on new-protocol rows,
never staff statuses/notes or historical rows. R retains the most recent 64
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
  new inquiry/contact/minute. Same-payload retries bypass these limits.
- The public endpoint is not authenticated. Cache limits/honeypots are not strong
  bot prevention; Google quotas and denial-of-service risks still apply.
- Protect Sheet/Apps Script access. Never share the clinical ledger publicly.
  Code checks cannot replace staff access controls or retention operations.

## Deployment and owner requirements

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for exact same-URL deployment steps and the
read-only diagnostic. The supplied deployment currently lacks `doGet` and must
be updated before the new browser can confirm receipts. No production ledger
test records were inserted by these tests.

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
