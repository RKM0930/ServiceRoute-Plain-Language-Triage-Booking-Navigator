import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import vm from "node:vm";

export const SHEET_ID = "19zT6nogw6NIJq-lYtMEJgJz1J4MPMUzlbFg3RPmRkvw";
export const HEADERS = [
  "timestamp", "preferred_name", "client_type", "goal", "format", "schedule",
  "schedule_notes", "recommended_service", "contact", "referral", "Status",
  "Handled By / Notes", "Submission ID"
];
export function inquiry(overrides = {}) {
  return {
    inquiry_id: randomUUID(), attempt_id: randomUUID(), preferred_name: "Test",
    client_type: "adult", goal: "counseling", format: "online", schedule: "flexible",
    schedule_notes: "", contact: "09171234567", referral: "unspecified",
    consent: true, privacy_version: "2026-11-15", website: "", ...overrides
  };
}

// Synthetic historical records only. Never reads or writes a production service.
export function createReceiver(options = {}) {
  const rows = [
    [...(options.headers || HEADERS), ...(options.metadata || [])],
    ["2026-01-01", "Historical fixture A", "adult", "counseling", "online", "weekend",
      "", "Individual", "fixture-a@example.invalid", "", "Contacted", "Staff note A", "legacy-a"],
    ["2026-01-02", "Historical fixture B", "minor", "assessment", "f2f", "flexible",
      "", "Assessment", "fixture-b@example.invalid", "", "Scheduled", "Staff note B", "legacy-b"]
  ];
  if (options.unlabeled) rows[1][13] = "existing unlabelled value";
  const cache = new Map();
  let locked = false;
  let maxColumns = options.maxColumns || 26;
  let onAppend;
  let rawAppend;
  let openedId;
  const sheet = {
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(...rows.map((row) => row.length)),
    getMaxColumns: () => maxColumns,
    insertColumnsAfter(after, count) {
      assert.equal(after, maxColumns);
      maxColumns += count;
    },
    appendRow(values) {
      assert.equal(locked, true, "writes must hold the script lock");
      if (options.failure === "append") throw new Error("private error");
      rawAppend = [...values];
      rows.push(Array.from(values, (value) => typeof value === "string" && value.startsWith("'") ? value.slice(1) : value));
      if (options.failure === "readback") rows.at(-1)[16] = "incomplete";
      const fn = onAppend;
      onAppend = undefined;
      fn?.();
    },
    getRange(start, col, count, width) {
      if (col + width - 1 > maxColumns) throw new Error("Out of range");
      return {
        getValues: () => Array.from({ length: count }, (_, r) =>
          Array.from({ length: width }, (_, c) => rows[start - 1 + r]?.[col - 1 + c] ?? "")),
        setValues(values) {
          assert.equal(locked, true);
          assert.ok(start === 1 || (start >= 4 && col === 18 && width === 1),
            "only headers or new-record receipt metadata may be updated");
          for (let r = 0; r < count; r++) for (let c = 0; c < width; c++) {
            rows[start - 1 + r][col - 1 + c] = values[r][c];
          }
        },
        createTextFinder(id) {
          return {
            matchEntireCell() { return this; }, matchCase() { return this; },
            findAll: () => rows.map((row, index) => ({ row, index }))
              .filter(({ row, index }) => index >= start - 1 && row[col - 1] === id)
              .map(({ index }) => ({ getRow: () => index + 1 }))
          };
        }
      };
    }
  };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key) => options.properties?.[key] || null
    }) },
    ContentService: {
      MimeType: { JSON: "json", JAVASCRIPT: "javascript" },
      createTextOutput: (body) => ({ setMimeType: (mime) => ({ body, mime }) })
    },
    LockService: { getScriptLock() {
      let owned = false;
      return {
        tryLock() { if (locked) return false; locked = owned = true; return true; },
        hasLock: () => owned,
        releaseLock() { assert.equal(owned, true); locked = owned = false; }
      };
    } },
    SpreadsheetApp: {
      openById(id) {
        openedId = id;
        assert.equal(id, SHEET_ID);
        return { getSheetByName(name) { assert.equal(name, "Intake"); return options.missingSheet ? null : sheet; } };
      },
      flush() { if (options.failure === "flush") throw new Error("private flush error"); }
    },
    CacheService: { getScriptCache: () => ({
      get: (key) => cache.get(key) || null, put: (key, value) => cache.set(key, value)
    }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (_, input) => createHash("sha256").update(input).digest(),
      base64EncodeWebSafe: (value) => Buffer.from(value).toString("base64url")
    }
  });
  vm.runInContext(readFileSync(new URL("../../Code.gs", import.meta.url), "utf8"), context);
  const sendRaw = (contents) => JSON.parse(context.doPost({ postData: { contents } }).body);
  const get = (parameter) => context.doGet({ parameter });
  return {
    context, rows, cache, sendRaw, get,
    send: (data) => sendRaw(JSON.stringify(data)),
    lookup(data) {
      let receipt;
      const callback = "__serviceRouteReceipt_" + randomUUID().replaceAll("-", "");
      const result = get({ action: "receipt", id: data.inquiry_id, attempt: data.attempt_id, callback });
      assert.equal(result.mime, "javascript");
      vm.runInNewContext(result.body, { [callback]: (value) => { receipt = JSON.parse(JSON.stringify(value)); } });
      return receipt;
    },
    locked: () => locked, openedId: () => openedId, maxColumns: () => maxColumns,
    onAppend(fn) { onAppend = fn; }, rawAppend: () => rawAppend
  };
}
