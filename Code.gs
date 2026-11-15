/** ServiceRoute receiver. Never creates a worksheet or rewrites historical business fields. */
const PRIVACY_VERSION = "2026-11-15.1";
const SUPPORTED_PRIVACY_VERSIONS = ["2026-11-15", PRIVACY_VERSION];
const SPREADSHEET_ID = "19zT6nogw6NIJq-lYtMEJgJz1J4MPMUzlbFg3RPmRkvw";
const SHEET_NAME = "Intake";
const LEDGER_HEADERS = [
  "timestamp", "preferred_name", "client_type", "goal", "format", "schedule",
  "schedule_notes", "recommended_service", "contact", "referral",
  "Status", "Handled By / Notes", "Submission ID"
];
const METADATA_HEADERS = ["consent", "privacy_version", "consent_recorded_at", "Request fingerprint", "Receipt attempts"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RECEIPT_PROTOCOL = "serviceroute-receipt-v1";

function output(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

// Keep these pure rules identical to app.js; parity is regression-tested.
function normalizeContact(value) {
  if (typeof value !== "string") return null;
  const contact = value.trim();
  if (!contact || contact.length > 254) return null;
  if (contact.includes("@")) {
    const parts = contact.split("@");
    if (parts.length !== 2) return null;
    const [local, domain] = parts;
    if (!local || local.length > 64 || !/^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~.-]+$/u.test(local) ||
        local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
    const labels = domain.split(".");
    if (labels.length < 2 || labels.some((label) =>
      !/^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u.test(label)) ||
      labels[labels.length - 1].length < 2 || !/\p{L}/u.test(labels[labels.length - 1])) return null;
    return local + "@" + domain.toLowerCase();
  }
  let digits;
  if (/^09\d{9}$/.test(contact)) digits = contact;
  else if (/^(?:\+63|63)9\d{9}$/.test(contact)) digits = "0" + contact.replace(/^\+?63/, "");
  else if (/^09\d{2}([ -])\d{3}\1\d{4}$/.test(contact)) digits = contact.replace(/[ -]/g, "");
  else if (/^(?:\+63|63)([ -])9\d{2}\1\d{3}\1\d{4}$/.test(contact)) {
    digits = "0" + contact.replace(/^\+?63/, "").replace(/[ -]/g, "");
  } else return null;
  return digits.slice(0, 4) + "-" + digits.slice(4, 7) + "-" + digits.slice(7);
}

function normalizePreferredName(value, preserveCase = false) {
  const name = String(value ?? "").trim().replace(/\s+/gu, " ");
  if (preserveCase || name !== name.toLowerCase()) return name;
  const formatted = name.replace(/(^|[\s'’\-‐‑])(\p{L})/gu, (_, boundary, letter) => boundary + letter.toUpperCase());
  return formatted.length <= 80 ? formatted : name;
}

function canonicalInquiry(data) {
  return {
    ...data,
    contact: normalizeContact(data.contact),
    preferred_name: normalizePreferredName(data.preferred_name, data.name_case === "preserve") || "Anonymous"
  };
}

function validateInquiry(data, legacyRetry = false) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid inquiry");
  const text = (key, max, required) => {
    if (typeof data[key] !== "string" || data[key].length > max ||
        (required && !data[key].trim())) throw new Error("Invalid " + key);
  };
  text("inquiry_id", 36, true);
  if (!UUID_PATTERN.test(data.inquiry_id) || typeof data.attempt_id !== "string" || !UUID_PATTERN.test(data.attempt_id)) {
    throw new Error("Invalid inquiry ID");
  }
  text("preferred_name", 80, false);
  text("contact", 254, true);
  text("schedule_notes", 300, false);
  const enums = {
    client_type: ["adult", "minor", "couple_family"],
    goal: ["counseling", "clearance", "assessment"],
    format: ["online", "f2f"],
    schedule: ["asap", "weekend", "flexible"],
    referral: ["instagram", "facebook", "tiktok", "referral", "other", "unspecified"]
  };
  Object.keys(enums).forEach((key) => {
    if (!enums[key].includes(data[key])) throw new Error("Invalid " + key);
  });
  // Only a matching, already-stored legacy fingerprint can bypass the new format
  // rule. No new row ever uses this exemption.
  if (!legacyRetry && !normalizeContact(data.contact)) throw new Error("Invalid contact");
  if (data.name_case !== undefined && !["auto", "preserve"].includes(data.name_case)) throw new Error("Invalid name policy");
  if (data.consent !== true || !SUPPORTED_PRIVACY_VERSIONS.includes(data.privacy_version) || data.website !== "") {
    throw new Error("Consent or bot check failed");
  }
}

function recommend(data) {
  if (data.goal === "clearance") return "Psychological Evaluation for Official Clearance";
  if (data.goal === "assessment") return "Full Psychological Assessment & Testing Battery";
  if (data.client_type === "couple_family") return "Couples / Family Counseling";
  return "Individual Counseling / Talk Therapy";
}

function safeCell(value) {
  // Always write untrusted text as literal text, including leading zeroes.
  return "'" + String(value == null ? "" : value);
}

function fingerprint(data) {
  // Client timestamps and client-computed recommendations are not authoritative.
  const keys = ["inquiry_id", "preferred_name", "client_type", "goal", "format",
    "schedule", "schedule_notes", "contact", "referral", "consent", "privacy_version"];
  const raw = JSON.stringify(keys.map((key) => key === "contact" ? data[key].trim() : data[key]));
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw));
}

function ledger(extendHeaders) {
  // Stale properties must fail closed rather than silently route elsewhere.
  const properties = PropertiesService.getScriptProperties();
  const configuredId = properties.getProperty("SPREADSHEET_ID");
  const configuredName = properties.getProperty("SHEET_NAME");
  if ((configuredId && configuredId !== SPREADSHEET_ID) ||
      (configuredName && configuredName !== SHEET_NAME)) throw new Error("Destination mismatch");
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() > 18) throw new Error("Ledger missing or incompatible");
  const base = sheet.getRange(1, 1, 1, 13).getValues()[0];
  if (LEDGER_HEADERS.some((header, index) => base[index] !== header)) throw new Error("Ledger schema mismatch");
  const width = Math.min(5, Math.max(0, sheet.getMaxColumns() - 13));
  const metadata = width ? sheet.getRange(1, 14, 1, width).getValues()[0] : [];
  for (let index = 0; index < METADATA_HEADERS.length; index++) {
    const header = metadata[index] === undefined ? "" : metadata[index];
    if (header !== "" && header !== METADATA_HEADERS[index]) throw new Error("Metadata schema mismatch");
    if (header === "" && index < width && sheet.getLastRow() > 1 &&
        sheet.getRange(2, 14 + index, sheet.getLastRow() - 1, 1).getValues()
          .some((row) => row[0] !== "")) throw new Error("Unlabeled metadata");
  }
  if (extendHeaders && METADATA_HEADERS.some((header, index) => metadata[index] !== header)) {
    if (sheet.getMaxColumns() < 18) sheet.insertColumnsAfter(sheet.getMaxColumns(), 18 - sheet.getMaxColumns());
    // Header row only. Historical consent cells are intentionally left blank.
    sheet.getRange(1, 14, 1, 5).setValues([METADATA_HEADERS]);
  }
  return sheet;
}

function storedRow(sheet, id) {
  if (sheet.getLastRow() < 2) return null;
  const matches = sheet.getRange(2, 13, sheet.getLastRow() - 1, 1).createTextFinder(id)
    .matchEntireCell(true).matchCase(true).findAll();
  if (matches.length > 1) throw new Error("Duplicate ledger IDs");
  if (!matches.length) return null;
  const row = sheet.getRange(matches[0].getRow(), 1, 1, Math.min(18, sheet.getMaxColumns())).getValues()[0];
  row.ledgerRow = matches[0].getRow();
  return row;
}

function receipt(id, status, timestamp) {
  const result = { protocol: RECEIPT_PROTOCOL, inquiry_id: id, status };
  if (status === "confirmed") result.received_at = timestamp;
  return result;
}

function validStoredReceipt(row) {
  return row && receiptAttempts(row).length > 0 && row[13] === "true" && row[14] && row[15] === row[0] &&
    /^(?:v2:)?[A-Za-z0-9_-]{43}=?$/.test(row[16]) &&
    typeof row[0] === "string" && Number.isFinite(Date.parse(row[0])) &&
    row[16] === (row[16].startsWith("v2:") ? "v2:" : "") + fingerprint({
      inquiry_id: row[12], preferred_name: row[1], client_type: row[2], goal: row[3],
      format: row[4], schedule: row[5], schedule_notes: row[6], contact: row[8],
      referral: row[9], consent: true, privacy_version: row[14]
    });
}

function receiptAttempts(row) {
  try {
    const attempts = JSON.parse(row[17]);
    return Array.isArray(attempts) && attempts.length > 0 && attempts.length <= 64 &&
      attempts.every((id) => typeof id === "string" && UUID_PATTERN.test(id)) ? attempts : [];
  } catch (_) {
    return [];
  }
}

function rejectionKey(id, attempt) {
  return "rejected:" + id + ":" + attempt;
}

function reject(data, code) {
  // No payload/contact data is stored in the transient rejection cache.
  if (data && UUID_PATTERN.test(data.inquiry_id) && UUID_PATTERN.test(data.attempt_id)) {
    CacheService.getScriptCache().put(rejectionKey(data.inquiry_id, data.attempt_id), code, 300);
  }
  return output({ ok: false, code });
}

function doPost(e) {
  let lock;
  let data;
  try {
    if (!e || !e.postData || e.postData.contents.length > 8192) return output({ ok: false });
    data = JSON.parse(e.postData.contents);
    try {
      validateInquiry(data, true);
    } catch (_) {
      return reject(data, "rejected");
    }
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return output({ ok: false, code: "busy" });
    const sheet = ledger(false);
    const existing = storedRow(sheet, data.inquiry_id);
    const legacyRetry = Boolean(existing && typeof existing[16] === "string" && !existing[16].startsWith("v2:"));
    try {
      validateInquiry(data, legacyRetry);
    } catch (_) {
      return reject(data, "rejected");
    }
    const accepted = legacyRetry ? data : canonicalInquiry(data);
    const hash = (legacyRetry ? "" : "v2:") + fingerprint(accepted);
    if (existing) {
      if (existing[16] !== hash) return reject(data, "id_conflict");
      if (!validStoredReceipt(existing)) throw new Error("Incomplete existing record");
      const attempts = receiptAttempts(existing);
      if (!attempts.includes(data.attempt_id)) {
        // Only receipt metadata on this new-protocol row changes, never staff fields.
        sheet.getRange(existing.ledgerRow, 18, 1, 1)
          .setValues([[JSON.stringify([...attempts.slice(-63), data.attempt_id])]]);
        SpreadsheetApp.flush();
      }
      const verified = storedRow(sheet, data.inquiry_id);
      if (!validStoredReceipt(verified) || !receiptAttempts(verified).includes(data.attempt_id)) {
        throw new Error("Retry not verified");
      }
      return output(receipt(data.inquiry_id, "confirmed", existing[0]));
    }

    // Best-effort quota protection. Cache entries may be evicted by Google.
    const cache = CacheService.getScriptCache();
    const contactHash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, accepted.contact.toLowerCase()
    ));
    const globalKey = "volume:" + Math.floor(Date.now() / 3600000);
    const contactKey = "contact:" + contactHash;
    const count = Number(cache.get(globalKey) || 0);
    if (count >= 60 || cache.get(contactKey)) return reject(data, "rate_limited");
    cache.put(globalKey, String(count + 1), 3600);
    cache.put(contactKey, "1", 60);

    ledger(true);
    const receivedAt = new Date().toISOString();
    const values = [
      receivedAt, accepted.preferred_name, data.client_type, data.goal, data.format,
      data.schedule, data.schedule_notes, recommend(data), accepted.contact, data.referral,
      "Pending", "", data.inquiry_id, "true", data.privacy_version, receivedAt, hash,
      JSON.stringify([data.attempt_id])
    ];
    sheet.appendRow(values.map(safeCell));
    SpreadsheetApp.flush();
    const persisted = storedRow(sheet, data.inquiry_id);
    if (!persisted || values.some((value, index) => persisted[index] !== value)) throw new Error("Write not verified");
    return output(receipt(data.inquiry_id, "confirmed", receivedAt));
  } catch (_) {
    // Do not expose payloads, spreadsheet identifiers, or exception details.
    return output({ ok: false, code: "invalid_or_unavailable" });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

/** Read-only JSONP: no contacts, choices, fingerprints, tokens or server secrets. */
function doGet(e) {
  const params = e && e.parameter || {};
  if (params.action === "health") {
    return output({ protocol: RECEIPT_PROTOCOL, receipt_lookup: true, normalization: "v2", privacy_version: PRIVACY_VERSION });
  }
  const callback = params.callback || "";
  if (params.action !== "receipt" || !UUID_PATTERN.test(params.id || "") ||
      !UUID_PATTERN.test(params.attempt || "") ||
      !/^__serviceRouteReceipt_[a-f0-9]{32}$/.test(callback)) return output({ ok: false });
  let result = receipt(params.id, "unverified");
  let lock;
  try {
    lock = LockService.getScriptLock();
    if (lock.tryLock(5000)) {
      const sheet = ledger(false);
      const row = storedRow(sheet, params.id);
      const rejected = CacheService.getScriptCache().get(rejectionKey(params.id, params.attempt));
      if (rejected === "id_conflict") result = receipt(params.id, "failed");
      else if (validStoredReceipt(row) && receiptAttempts(row).includes(params.attempt)) {
        result = receipt(params.id, "confirmed", row[0]);
      } else if (rejected) result = receipt(params.id, "failed");
    }
  } catch (_) {
    // Missing permissions, incompatible schema and unknown writes remain unverified.
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
  return ContentService.createTextOutput('if(typeof ' + callback + '==="function"){' + callback + "(" + JSON.stringify(result) + ");}")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/** Owner-only editor diagnostic. Read-only; never returns contact data. */
function inspectIntake() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("Ledger busy; retry later");
  try {
    const sheet = ledger(false);
    const result = {
      spreadsheet_id: SPREADSHEET_ID, worksheet: SHEET_NAME,
      existing_submissions: sheet.getLastRow() - 1, schema_compatible: true,
      receipt_protocol: RECEIPT_PROTOCOL
    };
    console.log(JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

/** Owner-only, read-only supplement to Intake View. No contact data in output/logs. */
function reviewRecentInquiries(nowMs = Date.now()) {
  if (!Number.isFinite(nowMs)) throw new Error("Invalid review time");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("Ledger busy; retry later");
  let rows;
  try {
    const sheet = ledger(false);
    rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues() : [];
  } finally {
    lock.releaseLock();
  }
  // Work on the snapshot without holding up incoming submissions.
  const groups = new Map();
  let unreadableTimestamps = 0;
  rows.forEach((row, index) => {
    // Do not guess locale-specific historical date strings.
    const isDate = Object.prototype.toString.call(row[0]) === "[object Date]";
    const timestamp = isDate ? row[0].getTime()
      : /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(String(row[0])) ? Date.parse(row[0]) : NaN;
    if (!Number.isFinite(timestamp)) { unreadableTimestamps++; return; }
    if (timestamp > nowMs || nowMs - timestamp > 24 * 60 * 60 * 1000) return;
    const contact = normalizeContact(String(row[8]));
    if (!contact) return;
    const notes = String(row[6]).trim().replace(/\s+/gu, " ");
    const key = JSON.stringify([
      contact.toLowerCase(), row[2], row[3], row[4], row[5],
      notes === "None specified" ? "" : notes
    ]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index + 2);
  });
  const result = {
    review_window_hours: 24,
    candidate_rows: Array.from(groups.values()).filter((rows) => rows.length > 1),
    unreadable_timestamps: unreadableTimestamps
  };
  return result;
}

/** Presentation only. Never use this string in the ledger or public receipts. */
function formatManilaTimestamp(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(iso)) return "";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 19) !== iso.slice(0, 19)) return "";
  const local = new Date(parsed.getTime() + 8 * 60 * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hour = local.getUTCHours();
  return local.getUTCDate() + " " + months[local.getUTCMonth()] + " " + local.getUTCFullYear() +
    ", " + (hour % 12 || 12) + ":" + String(local.getUTCMinutes()).padStart(2, "0") + (hour >= 12 ? " PM" : " AM");
}

function intakeViewTimestampFormula() {
  // Explicit numeric UTC components, English month names, and UTC+8. No DATEVALUE
  // or locale-sensitive month parsing; malformed/empty cells render blank.
  return 'MAP(Intake!A2:A,LAMBDA(raw,IFERROR(IF(raw="","",IF(REGEXMATCH(raw,' +
    '"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?Z$"),' +
    'LET(y,VALUE(LEFT(raw,4)),mo,VALUE(MID(raw,6,2)),d,VALUE(MID(raw,9,2)),' +
    'h,VALUE(MID(raw,12,2)),mi,VALUE(MID(raw,15,2)),s,VALUE(MID(raw,18,2)),' +
    'utc,DATE(y,mo,d)+TIME(h,mi,s),local,utc+8/24,' +
    'IF(AND(YEAR(utc)=y,MONTH(utc)=mo,DAY(utc)=d,h<24,mi<60,s<60),' +
    'DAY(local)&" "&CHOOSE(MONTH(local),"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")&' +
    '" "&YEAR(local)&", "&IF(MOD(HOUR(local),12)=0,12,MOD(HOUR(local),12))&":"&TEXT(MINUTE(local),"00")&' +
    '" "&IF(HOUR(local)>=12,"PM","AM"),"")),"")),"")))';
}

/** Owner-supplied A1:F2 structure; exact expressions prevent guessing row mappings. */
function intakeViewSixColumnSpec() {
  return {
    headers: ["Date & Time (PHT)", "Preferred Name", "Contact", "Recommended Service", "Status", "Staff Notes"],
    formulas: [
      '=ARRAYFORMULA(IF(Intake!A2:A="","",IFERROR(IF(ISNUMBER(Intake!A2:A),TEXT(Intake!A2:A,"dd mmm yyyy, h:mm AM/PM"),TEXT(DATEVALUE(LEFT(Intake!A2:A,10))+TIMEVALUE(MID(Intake!A2:A,12,8))+TIME(8,0,0),"dd mmm yyyy, h:mm AM/PM")),Intake!A2:A)))',
      '=ARRAYFORMULA(IF(Intake!A2:A="","",IF(Intake!B2:B="","",PROPER(Intake!B2:B))))',
      '=ARRAYFORMULA(IF(Intake!A2:A="","",IF(REGEXMATCH(TO_TEXT(Intake!I2:I),"^[0-9+(). -]+$"),IF(REGEXMATCH(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^09[0-9]{9}$"),REGEXREPLACE(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^([0-9]{4})([0-9]{3})([0-9]{4})$","$1-$2-$3"),IF(REGEXMATCH(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^[0-9]{10}$"),REGEXREPLACE(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^([0-9]{3})([0-9]{3})([0-9]{4})$","$1-$2-$3"),IF(REGEXMATCH(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^639[0-9]{9}$"),REGEXREPLACE(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^63([0-9]{3})([0-9]{3})([0-9]{4})$","+63-$1-$2-$3"),TO_TEXT(Intake!I2:I)))),TO_TEXT(Intake!I2:I))))',
      '=ARRAYFORMULA(IF(Intake!A2:A="","",Intake!H2:H))',
      '=ARRAYFORMULA(IF(Intake!A2:A="","",Intake!K2:K))',
      '=ARRAYFORMULA(IF(Intake!A2:A="","",Intake!L2:L))'
    ],
    nameFormula: '=ARRAYFORMULA(IF(Intake!A2:A="","",IF(Intake!B2:B="","",Intake!B2:B)))'
  };
}

function intakeViewSnapshot() {
  const source = ledger(false);
  const view = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Intake View");
  if (!view || view.getMaxColumns() < 6) throw new Error("Existing Intake View is missing or incompatible");
  const spec = intakeViewSixColumnSpec();
  const sixHeaders = view.getRange(1, 1, 1, 6).getValues()[0];
  if (spec.headers.every((header, index) => sixHeaders[index] === header)) {
    const formulas = view.getRange(1, 1, 2, 6).getFormulas();
    const desired = "=" + intakeViewTimestampFormula();
    if (formulas[0].some(Boolean) || formulas[1].some((formula, index) =>
      formula !== spec.formulas[index] &&
      !(index === 0 && formula === desired) &&
      !(index === 1 && formula === spec.nameFormula))) {
      throw new Error("Unsupported six-column view formula; no changes made");
    }
    for (const anchor of ["A2", "B2", "C2", "D2", "E2", "F2"]) {
      if (/^#/.test(view.getRange(anchor).getDisplayValue())) {
        throw new Error("Existing view has a formula/spill error; inspect it before setup");
      }
    }
    return {
      source, view, layout: "six-column", target: "A2", current: formulas[1][0], desired,
      changes: [
        { target: "A2", current: formulas[1][0], desired },
        { target: "B2", current: formulas[1][1], desired: spec.nameFormula }
      ]
    };
  }
  if (view.getMaxColumns() < 18) throw new Error("View headers differ; no changes made");
  const formulas = view.getRange(1, 1, 2, 18).getFormulas();
  const normalize = (formula) => formula.replace(/\s+/g, "").replace(/'Intake'/g, "Intake").toUpperCase();
  const a1 = normalize(formulas[0][0]);
  if (/^#(?:REF!|VALUE!|ERROR!|N\/A)/.test(view.getRange("A1").getDisplayValue()) ||
      /^#(?:REF!|VALUE!|ERROR!|N\/A)/.test(view.getRange("A2").getDisplayValue())) {
    throw new Error("Existing view has a formula/spill error; inspect it before setup");
  }
  const managed = '={Intake!A1:R1;HSTACK(' + intakeViewTimestampFormula() + ',Intake!B2:R)}';
  const identity = ["=ARRAYFORMULA(INTAKE!A:R)", "=ARRAYFORMULA(INTAKE!A1:R)", "=INTAKE!A1:R"];
  if (formulas[0][0] === managed || identity.includes(a1)) {
    if (formulas.flat().some((formula, index) => index !== 0 && formula)) throw new Error("Unexpected formulas inside identity view");
    return { source, view, target: "A1", current: formulas[0][0], desired: managed };
  }
  // Column-specific views are supported only when every other column has the
  // same identity row mapping. Never guess SORT/QUERY/FILTER output ordering.
  const headers = view.getRange(1, 1, 1, 18).getValues()[0];
  const expected = [...LEDGER_HEADERS, ...METADATA_HEADERS];
  if (expected.some((header, index) => headers[index] !== header)) throw new Error("View headers differ");
  for (let col = 1; col < 18; col++) {
    const letter = String.fromCharCode(65 + col);
    if (normalize(formulas[1][col]) !== `=ARRAYFORMULA(INTAKE!${letter}2:${letter})`) {
      throw new Error("Unsupported view mapping; inspect existing formulas before changing anything");
    }
  }
  const desired = "=" + intakeViewTimestampFormula();
  if (formulas[1][0] !== desired && normalize(formulas[1][0]) !== "=ARRAYFORMULA(INTAKE!A2:A)") {
    throw new Error("Unsupported timestamp formula; no changes made");
  }
  return { source, view, target: "A2", current: formulas[1][0], desired };
}

/** Owner-only read-only preflight. Inspect returned formulas privately; no cell data logged. */
function inspectIntakeViewFormatting() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("Ledger busy; retry later");
  try {
    const snapshot = intakeViewSnapshot();
    return {
      timestamp_storage: "ISO literal text; A/P unchanged",
      timestamp_types: intakeTimestampTypes(snapshot.source),
      target: snapshot.target, current_formula: snapshot.current,
      proposed_formula: snapshot.desired,
      layout: snapshot.layout || "identity",
      planned_changes: (snapshot.changes || [snapshot])
        .filter((change) => change.current !== change.desired)
        .map((change) => ({
          target: change.target, current_formula: change.current, proposed_formula: change.desired
        })),
      capacity_ready: snapshot.view.getMaxRows() >= snapshot.source.getMaxRows()
    };
  } finally { lock.releaseLock(); }
}

function intakeTimestampTypes(source) {
  const types = { iso_text: 0, blank: 0, unsupported: 0 };
  if (source.getLastRow() > 1) {
    source.getRange(2, 1, source.getLastRow() - 1, 1).getValues().forEach(([value]) => {
      if (value === "") types.blank++;
      else if (formatManilaTimestamp(value)) types.iso_text++;
      else types.unsupported++;
    });
  }
  return types;
}

/** Run once as owner AFTER inspecting the existing view. Never called by doPost/doGet. */
function ensureIntakeViewFormatting() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("Ledger busy; retry later");
  try {
    const snapshot = intakeViewSnapshot();
    if (intakeTimestampTypes(snapshot.source).unsupported) {
      throw new Error("Unsupported historical timestamp cell types; no changes made");
    }
    if (snapshot.view.getMaxRows() < snapshot.source.getMaxRows()) {
      throw new Error("View needs at least as many grid rows as Intake; no changes made");
    }
    const changes = (snapshot.changes || [snapshot]).filter((change) => change.current !== change.desired);
    if (!changes.length) return { changed: false, target: snapshot.target, targets: [] };
    const attempted = [];
    try {
      for (const change of changes) {
        const target = snapshot.view.getRange(change.target);
        attempted.push(change);
        target.setFormula(change.desired);
        SpreadsheetApp.flush();
        if (target.getFormula() !== change.desired || /^#/.test(target.getDisplayValue())) {
          throw new Error("View formula was not accepted");
        }
      }
    } catch (_) {
      for (const change of attempted.reverse()) {
        snapshot.view.getRange(change.target).setFormula(change.current);
      }
      SpreadsheetApp.flush();
      throw new Error("Timestamp setup failed; original view formula restored");
    }
    return { changed: true, target: snapshot.target, targets: changes.map((change) => change.target) };
  } finally { lock.releaseLock(); }
}
