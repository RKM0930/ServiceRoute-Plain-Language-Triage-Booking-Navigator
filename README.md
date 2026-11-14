# ServiceRoute

Administrative intake and service matching for Kahilom Psychological Services.
The original static HTML/CSS/JavaScript architecture is preserved: the browser
sends inquiries **directly to Google Apps Script**. No Netlify, application
server, environment variables, API proxy, or runtime npm dependencies are needed.

## Run

Open `index.html`, or serve the directory:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. You can use your existing static website host.
Only publish `index.html`, `style.css`, `app.js`, and `privacy.html`, not repository
snapshots or receiver source. An optional `npm run build` copies those four files
to `public/`; it is not required to run the app.

## Google Apps Script connection

The deployment URL supplied by the owner is already configured as `SCRIPT_URL`
at the top of `app.js`:

```text
https://script.google.com/macros/s/AKfycbxCx0FCf-1i4HyBMHZ3WHiyhpQW_8LxbEAsMnNwgUQIXw6le92YVlCXis6dZMGUjY8tjg/exec
```

The payload includes the original fields and a compatible `timestamp`, so an
original receiver can still accept it. The safeguards below require deploying
the updated `Code.gs`; editing this repository does not update Google's copy.

### Update the receiver

1. In your target Google Sheet, open **Extensions → Apps Script**.
2. Replace the receiver code with `Code.gs`.
3. Choose **Deploy → Manage deployments → Edit → New version → Deploy** to update
   the existing deployment and keep the same URL.
4. Execute as **Me** and allow access to **Anyone**.
5. The updated receiver automatically creates a worksheet named
   **ServiceRoute Inquiries**. Existing sheets and records are left untouched.
6. Submit a synthetic inquiry and check that it appears in that worksheet.

No shared secret or Script Properties are required for a spreadsheet-bound
project. If using a standalone script instead, set `SPREADSHEET_ID` in Script
Properties. Optionally set `SHEET_NAME` to another destination name. The selected
sheet must be empty or match the updated schema; incompatible headers are
rejected rather than overwritten.

If you deployed the earlier secret-protected receiver from this repository,
**redeploy this updated receiver**: it no longer requires `RECEIVER_SECRET`.
Do not place secrets in frontend code.

## What the delivery messages mean

The browser uses `fetch` with `mode: "no-cors"` and a simple `text/plain` JSON
body, as supported by the original Apps Script integration. Google's response
is opaque: the browser cannot read the HTTP status or the receiver's JSON.

- **Inquiry Sent**: the browser completed the request. This is **not** proof that
  Google Sheets stored it, nor an appointment confirmation.
- **We Couldn't Complete Sending**: the request failed or timed out. It might
  still have reached Google. Users can copy details or retry the original payload.
- Retry keeps the same inquiry ID. The updated receiver deduplicates it; an older
  receiver may create duplicate rows.
- Deployment access errors, validation failures, schema errors, throttling and
  Google quota errors may be invisible to the browser. Verify the worksheet
  during setup and follow up with the clinic if no response arrives.

There is no fake “received” confirmation and no promise of follow-up without
clinic acknowledgment. No live inquiry is sent by the automated tests.

## Improvements retained

- Four-step deterministic service matching with persistent emergency resources
  and an urgent-scheduling safety reminder.
- Answer review/editing, preference summary and online-testing compatibility notices.
- Required contact and explicit consent; bounded optional name/scheduling fields.
- Native keyboard-accessible referral radios, focus management, visible progress,
  mobile action-dock spacing and reduced-motion support.
- Complete reset of names, contacts, scheduling notes and consent.
- Inquiry IDs, same-payload retry and transparent delivery states.
- Updated receiver: validation, server-calculated recommendation, server receipt
  and consent recording timestamps, literal-text spreadsheet writes, named-sheet
  targeting, locking and durable duplicate detection.
- Best-effort throttling: 60 new inquiries/hour globally and one/contact/minute.
  Same-ID retries return the previous receipt without adding another row.

The Apps Script URL is public by design. Validation, throttling and a honeypot
provide basic abuse resistance, not authenticated access or guaranteed bot
protection. Google's cache can evict rate-limit entries, and Google quotas apply.
Monitor the sheet; do not log contact payloads unnecessarily.

## Privacy before launch

Review `privacy.html` and publish the clinic's verified privacy contact and
approved retention period. Restrict Sheet/Apps Script access to authorized staff,
review Google and website-host processing terms, and establish an actual
deletion process for expired inquiries and exports. No automatic deletion job
is installed. Confirm minor/guardian handling with an appropriate privacy adviser.

Consent records and references to RA 10173 alone do not establish legal
compliance. State stays in page memory; this app does not store contact details
in local storage, cookies or analytics. The updated receiver records more
consent metadata than the original receiver.

## Tests

Node.js 22+ is needed only for development tests and the optional build:

```sh
npm test
npm run check
npm run build
```

Tests mock browser/Google services. They cover all 54 routing combinations,
navigation, validation, consent, direct Apps Script request settings, opaque
responses, retry, reset, spreadsheet validation, deduplication and throttling.

Before releasing, check keyboard/screen-reader behavior and narrow mobile
layouts, ASAP dialog closing/reopening, answer edits, form reset, offline
behavior, and a synthetic submission in the **actual Google Sheet**.

## Matching rules

1. Clearance → Psychological Evaluation for Official Clearance.
2. Assessment → Full Psychological Assessment & Testing Battery.
3. Couple/family + counseling → Couples / Family Counseling.
4. Otherwise → Individual Counseling / Talk Therapy.

Format and timing are preferences, not guaranteed availability. This tool
provides administrative routing, not clinical triage or diagnosis.
