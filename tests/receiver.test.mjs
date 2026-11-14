import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import vm from "node:vm";

function inquiry(overrides = {}) {
  return {
    inquiry_id: randomUUID(), preferred_name: "Test", client_type: "adult",
    goal: "counseling", format: "online", schedule: "flexible", schedule_notes: "",
    contact: "09171234567", referral: "unspecified", consent: true,
    privacy_version: "2026-11-15", website: "", ...overrides
  };
}

function receiver({ bound = false, missingSheet = false } = {}) {
  const rows = [];
  const cache = new Map();
  let locked = false;
  let flushes = 0;
  let inserted = false;
  const sheet = {
    getLastRow: () => rows.length,
    appendRow(row) { rows.push(row.map((v) => typeof v === "string" && v.startsWith("'") ? v.slice(1) : v)); },
    getRange(start, col, count, width) {
      return {
        getValues: () => rows.slice(start - 1, start - 1 + count).map((r) => r.slice(col - 1, col - 1 + width)),
        createTextFinder(id) {
          return { matchEntireCell() { return this; }, findNext() {
            const index = rows.findIndex((row, i) => i > 0 && row[0] === id);
            return index < 0 ? null : { getRow: () => index + 1 };
          } };
        }
      };
    }
  };
  const spreadsheet = {
    getSheetByName: (name) => {
      assert.equal(name, bound ? "ServiceRoute Inquiries" : "Inquiries");
      return missingSheet && !inserted ? null : sheet;
    },
    insertSheet: (name) => {
      assert.equal(name, bound ? "ServiceRoute Inquiries" : "Inquiries");
      inserted = true;
      return sheet;
    }
  };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key) => bound ? null : ({ SPREADSHEET_ID: "test", SHEET_NAME: "Inquiries" })[key]
    }) },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text) => ({ setMimeType() { return JSON.parse(text); } })
    },
    LockService: { getScriptLock: () => ({
      tryLock() { locked = true; return true; }, hasLock: () => locked,
      releaseLock() { locked = false; }
    }) },
    SpreadsheetApp: {
      openById: (id) => {
        assert.equal(id, "test");
        return spreadsheet;
      },
      getActiveSpreadsheet: () => spreadsheet,
      flush() { flushes++; }
    },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k), put: (k, v) => cache.set(k, v) }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (_, input) => createHash("sha256").update(input).digest(),
      base64EncodeWebSafe: (value) => Buffer.from(value).toString("base64url")
    }
  });
  vm.runInContext(readFileSync(new URL("../Code.gs", import.meta.url), "utf8"), context);
  return {
    send: (data) => context.doPost({ postData: { contents: JSON.stringify(data) } }),
    context, rows, cache, locked: () => locked, flushes: () => flushes,
    inserted: () => inserted
  };
}

test("valid inquiry writes server match, consent and timestamp to named sheet", () => {
  const r = receiver();
  const data = inquiry({ recommended_service: "untrusted", timestamp: "untrusted" });
  const receipt = r.send(data);
  assert.equal(receipt.ok, true);
  assert.equal(receipt.inquiry_id, data.inquiry_id);
  assert.equal(receipt.recommended_service, "Individual Counseling / Talk Therapy");
  assert.ok(Number.isFinite(Date.parse(receipt.received_at)));
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[1][9], "09171234567");
  assert.equal(r.rows[1][11], "true");
  assert.equal(r.rows[1][12], "2026-11-15");
  assert.equal(r.rows[1][13], receipt.received_at);
  assert.equal(r.flushes(), 1);
  assert.equal(r.locked(), false);
});

test("same ID returns original receipt once, modified payload conflicts", () => {
  const r = receiver();
  const data = inquiry();
  const first = r.send(data);
  assert.deepEqual(r.send(data), first);
  assert.equal(r.rows.length, 2);
  assert.equal(r.send({ ...data, contact: "other@example.com" }).code, "id_conflict");
  assert.equal(r.rows.length, 2);
});

test("reject invalid inputs, missing consent and honeypot bots", () => {
  const r = receiver();
  for (const overrides of [
    { consent: false }, { privacy_version: "old" },
    { website: "spam" }, { goal: "made-up" }, { format: "unknown" },
    { contact: "no" }, { preferred_name: "x".repeat(81) },
    { schedule_notes: "x".repeat(301) }, { inquiry_id: "=FORMULA()" },
    { referral: "invalid" }, { client_type: "invalid" }
  ]) assert.equal(r.send(inquiry(overrides)).ok, false);
  assert.equal(r.rows.length, 0);
});

test("spreadsheet-bound deployment works without secrets or Script Properties", () => {
  const r = receiver({ bound: true, missingSheet: true });
  assert.equal(r.send(inquiry()).ok, true);
  assert.equal(r.inserted(), true);
  assert.equal(r.rows.length, 2);
});

test("new inquiries throttle per contact but retries remain safe", () => {
  const r = receiver();
  const data = inquiry();
  assert.equal(r.send(data).ok, true);
  assert.equal(r.send(inquiry()).code, "rate_limited");
  assert.equal(r.send(data).ok, true);
  assert.equal(r.rows.length, 2);
});

test("global throttle and schema mismatch reject writes", () => {
  const r = receiver();
  r.cache.set("volume:" + Math.floor(Date.now() / 3600000), "60");
  assert.equal(r.send(inquiry()).code, "rate_limited");
  r.rows[0][0] = "old schema";
  r.cache.clear();
  assert.equal(r.send(inquiry()).ok, false);
  assert.equal(r.rows.length, 1);
  assert.equal(r.locked(), false);
});

test("safe cells neutralize formulas and preserve leading zeroes", () => {
  const r = receiver();
  for (const value of ["=IMPORTXML()", "+123", "-1", "@SUM()", "\t=1", "09171234567"]) {
    assert.equal(r.context.safeCell(value), "'" + value);
  }
});
