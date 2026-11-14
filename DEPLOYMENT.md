# Deployment verification and remaining owner steps

## Observed state

- Repository baseline: `43092eb`; fetched remote matched that baseline before edits.
- Browser endpoint (unchanged):
  `https://script.google.com/macros/s/AKfycbxCx0FCf-1i4HyBMHZ3WHiyhpQW_8LxbEAsMnNwgUQIXw6le92YVlCXis6dZMGUjY8tjg/exec`
- A read-only GET to that URL with `?action=health` returned Google's HTML error:
  **“Hindi mahanap ang script function: doGet”** (script function `doGet` not found).
  This is not a compatible receipt response. An HTTP 200 error page is not success.
- No Apps Script editor/deployment credentials or `clasp` CLI access are available
  in this workspace. Execute-as identity, “Anyone” access, OAuth authorization,
  spreadsheet permissions, actual headers and historical row contents could not
  be inspected from an authenticated Google session.
- The code's fixed spreadsheet ID and `Intake` mapping match the owner-supplied
  destination/schema. Historical preservation is verified against two synthetic
  fixture records, not claimed as a production audit.

No production POSTs, synthetic ledger rows, worksheet creation or schema changes
were made remotely. Tests use local Apps Script/Sheets mocks.

## Update the existing deployment without changing its URL

1. Open the [existing spreadsheet](https://docs.google.com/spreadsheets/d/19zT6nogw6NIJq-lYtMEJgJz1J4MPMUzlbFg3RPmRkvw/edit),
   then **Extensions → Apps Script**. Confirm this is the project owning the
   existing deployment above. A different project cannot update that deployment.
2. Keep an owner-controlled backup/version of the ledger. Do not publish it.
   Verify `Intake` still contains the two existing submissions and staff statuses.
3. Replace the receiver source with the current `Code.gs`. Keep other unrelated
   project files. Remove obsolete duplicate definitions of `doGet`/`doPost` if any.
4. In **Project Settings → Script Properties**, remove stale `SPREADSHEET_ID` /
   `SHEET_NAME` values or set them exactly to:

   ```text
   SPREADSHEET_ID=19zT6nogw6NIJq-lYtMEJgJz1J4MPMUzlbFg3RPmRkvw
   SHEET_NAME=Intake
   ```

   The constants in code are authoritative. Mismatched properties intentionally
   fail, rather than silently redirect submissions. No receiver secret is used.
5. Run **`inspectIntake`** from the editor as the owner. Authorize Google Sheets
   access if prompted. It is read-only and logs only destination/schema, row count
   and protocol, never names or contacts. It must report `schema_compatible: true`
   and the expected existing submission count. If it fails, inspect header
   spelling/order and permissions; do not delete or rearrange historical data.
6. Choose **Deploy → Manage deployments**, select the existing web app deployment,
   **Edit → Version: New version → Deploy**. Verify **Execute as: Me** (an owner
   with ledger access) and **Who has access: Anyone**, including signed-out users.
   Do **not** use New deployment if you want to preserve the existing `/exec` URL.
7. In a signed-out/private browser, open the unchanged URL with `?action=health`.
   The new response must be JSON:

   ```json
   {"protocol":"serviceroute-receipt-v1","receipt_lookup":true}
   ```

   This verifies the deployed protocol, not a successful write or permissions.
   The editor's saved source or `/dev` URL alone does not verify the `/exec` version.
8. Publish the updated static `app.js` and `privacy.html` through your existing
   host and refresh cached assets. No server/framework/hosting migration is needed.
   If the host has a CSP, permit script loads from `https://script.google.com` and
   `https://script.googleusercontent.com` and POST connections to those origins.
   Receipt script requests use `no-referrer`; do not add names/contacts to page URLs.

## End-to-end acceptance without artificial production records

Use a **separate test spreadsheet**, copying only the `Intake` header row and
synthetic fixture data. Use a separate test Apps Script project/deployment; in its
test copy only, change the spreadsheet constant and the test frontend's endpoint.
Do not change the production constants or point synthetic tests at production.

Verify:

1. Valid synthetic form → one new row in `Intake`, UUID in M, consent in N–P,
   fingerprint in Q, accepted attempt IDs in R, `Pending` in K and blank L;
   browser shows Confirmed.
2. Double-click, retry and simultaneous same-ID requests → still one row.
   Staff statuses/notes and the two synthetic historical records stay unchanged.
3. Lost POST response followed by a working receipt → Confirmed after readback.
4. Rejected valid-ID request → Failed; changing attempt ID avoids stale rejection.
5. Offline, lost receipt script, old deployment, busy lock and permissions/schema
   errors → Unverified, never false confirmation.
6. Receipt JSONP response includes no contact, service choices, fingerprint or secrets.
   There are no writes on GET, including health/receipt/invalid-callback requests.

Only an owner-authorized **real inquiry** should exercise the production ledger.
Compare its UUID and server timestamp with the stored row and confirm a
same-ID retry creates no extra row. Until this happens, production storage and
browser receipt behavior remain **not end-to-end verified**.

## Privacy/readiness blockers (owner action)

- Publish the actual clinic privacy contact / accountable office and an approved
  retention schedule for inquiries, metadata, exports and provider logs.
- Confirm restricted staff access, backups, expiry/deletion ownership, identity
  verification for access/correction/withdrawal/deletion requests, and guardian
  authorization handling.
- Review Google and website-host processing, international transfers, quotas and
  technical log retention. This app does not install an automated deletion process.
- Confirm service rates, response expectations and emergency contact information.
- Do not claim that code validation, consent checkboxes or RA 10173 references
  alone establish legal compliance.
