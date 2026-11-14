/** ServiceRoute receiver. Never creates a worksheet or edits historical rows. */
const PRIVACY_VERSION = "2026-11-15";
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

function validateInquiry(data) {
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
  const contact = data.contact.trim();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(contact);
  const digits = contact.replace(/\D/g, "").length;
  if (!email && !(/^\+?[\d\s().-]+$/.test(contact) && digits >= 7 && digits <= 15)) {
    throw new Error("Invalid contact");
  }
  if (data.consent !== true || data.privacy_version !== PRIVACY_VERSION || data.website !== "") {
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
    /^[A-Za-z0-9_-]{43}=?$/.test(row[16]) &&
    typeof row[0] === "string" && Number.isFinite(Date.parse(row[0])) &&
    row[16] === fingerprint({
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
      validateInquiry(data);
    } catch (_) {
      return reject(data, "rejected");
    }
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return output({ ok: false, code: "busy" });
    const sheet = ledger(true);
    const existing = storedRow(sheet, data.inquiry_id);
    const hash = fingerprint(data);
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
      Utilities.DigestAlgorithm.SHA_256, data.contact.trim().toLowerCase()
    ));
    const globalKey = "volume:" + Math.floor(Date.now() / 3600000);
    const contactKey = "contact:" + contactHash;
    const count = Number(cache.get(globalKey) || 0);
    if (count >= 60 || cache.get(contactKey)) return reject(data, "rate_limited");
    cache.put(globalKey, String(count + 1), 3600);
    cache.put(contactKey, "1", 60);

    const receivedAt = new Date().toISOString();
    const values = [
      receivedAt, data.preferred_name, data.client_type, data.goal, data.format,
      data.schedule, data.schedule_notes, recommend(data), data.contact.trim(), data.referral,
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
    return output({ protocol: RECEIPT_PROTOCOL, receipt_lookup: true });
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
