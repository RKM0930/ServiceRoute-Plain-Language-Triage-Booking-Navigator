/** ServiceRoute public, spreadsheet-bound Google Apps Script receiver. */
const PRIVACY_VERSION = "2026-11-15";
const COLUMNS = [
  "inquiry_id", "received_at", "preferred_name", "client_type", "goal", "format",
  "schedule", "schedule_notes", "recommended_service", "contact", "referral",
  "consent", "privacy_version", "consent_recorded_at", "Status", "Handled By / Notes"
];

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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.inquiry_id)) {
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
  const raw = JSON.stringify(keys.map((key) => data[key]));
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw));
}

function doPost(e) {
  let lock;
  try {
    const properties = PropertiesService.getScriptProperties();
    if (!e || !e.postData || e.postData.contents.length > 8192) return output({ ok: false });
    const data = JSON.parse(e.postData.contents);
    validateInquiry(data);

    const sheetId = properties.getProperty("SPREADSHEET_ID");
    const sheetName = properties.getProperty("SHEET_NAME") || "ServiceRoute Inquiries";
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return output({ ok: false, code: "busy" });
    const spreadsheet = sheetId
      ? SpreadsheetApp.openById(sheetId)
      : SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error("Bind this script to a spreadsheet");
    // Use a separate named sheet; never overwrite/migrate an existing intake sheet.
    const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
    const headers = [...COLUMNS, "Request fingerprint"];
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
    const actualHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (headers.some((header, index) => actualHeaders[index] !== header)) {
      throw new Error("Sheet schema mismatch");
    }

    // Durable deduplication: find an existing ID before applying rate limits.
    const lastRow = sheet.getLastRow();
    const existing = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(data.inquiry_id)
        .matchEntireCell(true).findNext()
      : null;
    const hash = fingerprint(data);
    if (existing) {
      const values = sheet.getRange(existing.getRow(), 1, 1, headers.length).getValues()[0];
      if (values[headers.length - 1] !== hash) return output({ ok: false, code: "id_conflict" });
      return output({
        ok: true, inquiry_id: data.inquiry_id, received_at: values[1],
        recommended_service: values[8]
      });
    }

    // Best-effort quota protection. Cache entries may be evicted by Google.
    const cache = CacheService.getScriptCache();
    const contactHash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, data.contact.trim().toLowerCase()
    ));
    const globalKey = "volume:" + Math.floor(Date.now() / 3600000);
    const contactKey = "contact:" + contactHash;
    const count = Number(cache.get(globalKey) || 0);
    if (count >= 60 || cache.get(contactKey)) return output({ ok: false, code: "rate_limited" });
    cache.put(globalKey, String(count + 1), 3600);
    cache.put(contactKey, "1", 60);

    const receivedAt = new Date().toISOString();
    const record = Object.assign({}, data, {
      contact: data.contact.trim(), received_at: receivedAt,
      consent_recorded_at: receivedAt, recommended_service: recommend(data),
      consent: "true", Status: "Pending", "Handled By / Notes": ""
    });
    sheet.appendRow([...COLUMNS.map((key) => safeCell(record[key])), hash]);
    SpreadsheetApp.flush();
    return output({
      ok: true, inquiry_id: data.inquiry_id, received_at: receivedAt,
      recommended_service: record.recommended_service
    });
  } catch (_) {
    // Do not expose payloads, spreadsheet identifiers, or exception details.
    return output({ ok: false, code: "invalid_or_unavailable" });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
