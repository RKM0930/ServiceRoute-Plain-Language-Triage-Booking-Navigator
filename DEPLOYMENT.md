# Deployment verification and remaining owner steps

## Observed state

- Repository baseline: `2e72226`; fetched remote matched that baseline before edits.
- Browser endpoint (unchanged):
  `https://script.google.com/macros/s/AKfycbxCx0FCf-1i4HyBMHZ3WHiyhpQW_8LxbEAsMnNwgUQIXw6le92YVlCXis6dZMGUjY8tjg/exec`
- The owner reports the normalization-v2 receiver is deployed, advertising
  receipt protocol v1 and notice version `2026-11-15.1`. Health alone does not
  establish storage/permission readiness or install the new view presentation.
- The owner reports existing submissions were cleared, leaving headers, view
  formulas and validation intact. Do not restore synthetic examples or repopulate
  production. Use the actual current record count, not an old expected count.
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
   Verify the current records (if any), headers, validations and staff statuses.
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
   The 18-column A–R contract is unchanged. Do not recalculate Q, reformat old
   contacts/names, or backfill N–P. New fingerprints use a `v2:` prefix in Q;
   the code continues to verify old unprefixed values without rewriting them.
6. Choose **Deploy → Manage deployments**, select the existing web app deployment,
   **Edit → Version: New version → Deploy**. Verify **Execute as: Me** (an owner
   with ledger access) and **Who has access: Anyone**, including signed-out users.
   Do **not** use New deployment if you want to preserve the existing `/exec` URL.
7. In a signed-out/private browser, open the unchanged URL with `?action=health`.
   The new response must be JSON:

   ```json
   {"protocol":"serviceroute-receipt-v1","receipt_lookup":true,"normalization":"v2","privacy_version":"2026-11-15.1"}
   ```

   This verifies the deployed protocol, not a successful write or permissions.
   The editor's saved source or `/dev` URL alone does not verify the `/exec` version.
8. Publish **all five browser files**: `index.html`, `style.css`, `app.js`,
   **`i18n.js`**, and `privacy.html`, through your existing host, and refresh cached
   assets. Keep the existing deployment URL. Publish the translation script along
   with both pages; it is a local asset, not a server dependency.
   The notice version and receipt protocol are unchanged. Old clients remain
   compatible; the new UI can also use the existing normalization-v2 receiver.
   Prefer backend update first, then frontend, to complete both enhancements.
   No server/framework/hosting migration is needed.
   If the host has a CSP, permit script loads from `https://script.google.com` and
   `https://script.googleusercontent.com` and POST connections to those origins.
   Receipt script requests use `no-referrer`; do not add names/contacts to page URLs.

### One-time timestamp presentation setup (owner only)

1. After saving `Code.gs`, run/debug `inspectIntakeViewFormatting()` privately in
   the owner editor. Inspect `layout`, `planned_changes`, `current_formula`, `proposed_formula`,
   `timestamp_types` and `capacity_ready`. Also inspect the actual `Intake View`
   formula bar. This workspace did not have authenticated access to those formulas.
2. For the supplied six-column view, expect `layout: "six-column"` and planned
   changes at A2 (timestamp) and B2 (preferred name), or only the remaining legacy
   anchor if partially upgraded. C2:F2 must match the owner-supplied expressions
   exactly. Legacy A1 whole-identity and A2 per-column identity views remain supported.
   If recognized,
   source cells are ISO text (or blank), and capacity is sufficient, run
   validate the proposed formulas in an isolated workbook first (step 5), then run
   `ensureIntakeViewFormatting()` **once as owner**. This changes only A2/B2 in the
   six-column view; it does not change Intake, raw A/P cells, or stored names.
3. Re-run setup to verify `changed: false`. Preserve every other formula, validation
   and conditional-format rule. No trigger or per-row formatting is required.
4. If preflight reports an unknown mapping (especially a sorted/filtered QUERY),
   stop. Do not clear the view, edit ledger timestamps, or replace the formula by
   hand with a guessed identity formula. The actual existing formula is required
    for a safe targeted adaptation. Formula errors restore all attempted anchors.
5. Test in an isolated workbook: UTC midnight/month/year rollovers, empty ledger,
   new rows and cleared rows. Source `2026-11-15T01:48:00.000Z` should display
   `15 Nov 2026, 9:48 AM`; raw A/P and receipt output must remain the ISO string.
6. Keep the view's grid at least as tall as Intake's grid (normal Sheet capacity
   management, not per-row timestamp formatting). Open-ended formulas cover future
   rows within that capacity. No grid or tab is recreated by the setup.

View setup uses the newly saved editor source; it does not itself publish a new
web app version. Complete the existing-deployment New version step separately.
No frontend publication is needed for this six-column compatibility correction.

#### Exact six-column formula changes

A2 before (owner-supplied):
```excel
=ARRAYFORMULA(IF(Intake!A2:A="","",IFERROR(IF(ISNUMBER(Intake!A2:A),TEXT(Intake!A2:A,"dd mmm yyyy, h:mm AM/PM"),TEXT(DATEVALUE(LEFT(Intake!A2:A,10))+TIMEVALUE(MID(Intake!A2:A,12,8))+TIME(8,0,0),"dd mmm yyyy, h:mm AM/PM")),Intake!A2:A)))
```

A2 after (`"=" + intakeViewTimestampFormula()`; also returned in preflight):
```excel
=MAP(Intake!A2:A,LAMBDA(raw,IFERROR(IF(raw="","",IF(REGEXMATCH(raw,"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$"),LET(y,VALUE(LEFT(raw,4)),mo,VALUE(MID(raw,6,2)),d,VALUE(MID(raw,9,2)),h,VALUE(MID(raw,12,2)),mi,VALUE(MID(raw,15,2)),s,VALUE(MID(raw,18,2)),utc,DATE(y,mo,d)+TIME(h,mi,s),local,utc+8/24,IF(AND(YEAR(utc)=y,MONTH(utc)=mo,DAY(utc)=d,h<24,mi<60,s<60),DAY(local)&" "&CHOOSE(MONTH(local),"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")&" "&YEAR(local)&", "&IF(MOD(HOUR(local),12)=0,12,MOD(HOUR(local),12))&":"&TEXT(MINUTE(local),"00")&" "&IF(HOUR(local)>=12,"PM","AM"),"")),"")),"")))
```

This removes `DATEVALUE`/`TIMEVALUE` and locale-dependent month names. It is
intentionally restricted to the ledger's UTC ISO text, not guessed native dates;
preflight refuses non-ISO source cells. Local tests check conversion and formula
construction, not Google Sheets evaluation. Owner acceptance remains required.

B2 before:
```excel
=ARRAYFORMULA(IF(Intake!A2:A="","",IF(Intake!B2:B="","",PROPER(Intake!B2:B))))
```

B2 after:
```excel
=ARRAYFORMULA(IF(Intake!A2:A="","",IF(Intake!B2:B="","",Intake!B2:B)))
```

C2:F2, all six headers, validation and conditional formatting are not written.
`McDonald`, `de la Cruz` and `Juan Dela Cruz` retain their stored capitalization.

### Staff duplicate-review check

Confirm the owner-reported `Intake View` and its conditional-format rules still
exist and display repeated contacts without treating them as automatic duplicates.
Their live formulas/rules are not present in the repository and were not modified.
Check warning ranges include new rows and privately review differing historical
formats; never reformat historical Intake cells to make a warning match.

Optionally run/debug `reviewRecentInquiries()` in the owner editor and inspect its
returned report (candidate row numbers only). Use those row numbers in the
existing private view/ledger. It does not edit the view or any ledger cell and is
not exposed by `doGet`. `unreadable_timestamps` identifies records requiring
manual date review; it does not invent their timezone. The 24-hour window is a
review heuristic, not a client-identity or deletion policy.

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
7. Invalid mobiles (including mixed separators) are blocked in the browser and by
   a direct invalid test request. All supported local/+63 formats store the same
   dashed literal text and share the cooldown. Emails preserve local-part case.
8. Lowercase, hyphenated, apostrophe and accented names format at the first blur.
   Manual lowercase/mixed-case corrections remain exactly as edited.
9. A pre-upgrade fixture using the original raw fingerprint still confirms and
   retries without rewriting A–Q, including an old formerly accepted phone format.
   New IDs cannot use the legacy validation exemption.
10. After cooldown expiry, legitimate shared-number/different-service inquiries
    insert normally. Optional duplicate review returns row numbers only and never
    overwrites status/notes, merges records or creates another schema.
11. Switch Filipino/English on every step, on invalid inputs, in the safety dialog,
    during sending, and in all three receipt outcomes. Drafts/consent/selected enums
    and the inquiry ID must be unchanged. Copy summaries and privacy links must
    follow the selected language, with no personal information in URLs.

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
- Confirm the old session-duration, professional-qualification, testing/document
  and video-platform claims listed in `UI-AUDIT.md`. The UI no longer guarantees
  those unverified details, and retains quoted prices only with a confirmation caveat.
- Do not claim that code validation, consent checkboxes or RA 10173 references
  alone establish legal compliance.
