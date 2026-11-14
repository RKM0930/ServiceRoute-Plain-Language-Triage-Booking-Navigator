import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createReceiver, inquiry, HEADERS, SHEET_ID } from "./support/receiver.mjs";

test("maps new submissions onto the existing Intake ledger and preserves both historical records", () => {
  const r = createReceiver();
  const historical = structuredClone(r.rows.slice(1));
  const result = r.send(inquiry({ recommended_service: "untrusted", timestamp: "untrusted" }));
  assert.equal(result.status, "confirmed");
  assert.equal(r.rows.length, 4);
  assert.deepEqual(r.rows.slice(1, 3), historical);
  assert.deepEqual(r.rows[0].slice(0, 13), HEADERS);
  assert.deepEqual(r.rows[0].slice(13), ["consent", "privacy_version", "consent_recorded_at", "Request fingerprint", "Receipt attempts"]);
  const row = r.rows[3];
  assert.equal(row[7], "Individual Counseling / Talk Therapy");
  assert.equal(row[8], "09171234567");
  assert.equal(row[10], "Pending");
  assert.equal(row[11], "");
  assert.equal(row[12], result.inquiry_id);
  assert.deepEqual(row.slice(13, 16), ["true", "2026-11-15", result.received_at]);
  assert.equal(row[0], result.received_at);
  assert.equal(r.locked(), false);
  assert.equal(r.openedId(), SHEET_ID);
});

test("UUID retries return the stored receipt without adding rows or changing staff statuses", () => {
  const r = createReceiver();
  const data = inquiry();
  const first = r.send(data);
  r.rows[3][10] = "Contacted";
  r.rows[3][11] = "Handled by staff";
  const before = structuredClone(r.rows);
  assert.deepEqual(r.send({ ...data, attempt_id: randomUUID() }), first);
  assert.deepEqual(r.rows.map((row) => row.slice(0, 17)), before.map((row) => row.slice(0, 17)));
});

test("only durably accepted attempt IDs can confirm; retry metadata is bounded", () => {
  const r = createReceiver();
  const data = inquiry();
  r.send(data);
  const neverAccepted = { ...data, attempt_id: randomUUID() };
  assert.equal(r.lookup(neverAccepted).status, "unverified");
  let latest;
  for (let index = 0; index < 65; index++) {
    latest = { ...data, attempt_id: randomUUID() };
    assert.equal(r.send(latest).status, "confirmed");
  }
  assert.equal(JSON.parse(r.rows[3][17]).length, 64);
  assert.equal(r.lookup(data).status, "unverified");
  assert.equal(r.lookup(latest).status, "confirmed");
  assert.equal(r.rows.length, 4);
});

test("changed data with the same ID fails rather than overwriting a submission", () => {
  const r = createReceiver();
  const data = inquiry();
  r.send(data);
  const attempt = { ...data, attempt_id: randomUUID(), contact: "other@example.invalid" };
  assert.equal(r.send(attempt).code, "id_conflict");
  assert.equal(r.lookup(attempt).status, "failed");
  r.cache.clear();
  assert.equal(r.lookup(attempt).status, "unverified");
  assert.equal(r.rows.length, 4);
});

test("receipt confirms durable storage, not cache entries or HTTP completion", () => {
  const r = createReceiver();
  const data = inquiry();
  assert.equal(r.lookup(data).status, "unverified");
  const result = r.send(data);
  r.cache.clear();
  assert.deepEqual(r.lookup(data), {
    protocol: "serviceroute-receipt-v1", inquiry_id: data.inquiry_id,
    status: "confirmed", received_at: result.received_at
  });
  assert.equal(r.rows.length, 4);
  const receipt = JSON.stringify(r.lookup(data));
  for (const sensitive of ["09171234567", "Test", "contact", "consent", "fingerprint", "counseling"]) {
    assert.equal(receipt.includes(sensitive), false);
  }
});

test("receipt lookup is read-only, preserves old records, and does not add metadata headers", () => {
  const r = createReceiver();
  const before = structuredClone(r.rows);
  assert.equal(r.lookup(inquiry()).status, "unverified");
  assert.deepEqual(r.rows, before);
});

test("historical UUID rows are never overwritten or retrospectively marked as consented", () => {
  const r = createReceiver();
  const data = inquiry();
  r.rows[1][12] = data.inquiry_id;
  const historical = structuredClone(r.rows.slice(1));
  assert.equal(r.lookup(data).status, "unverified");
  assert.equal(r.send(data).code, "id_conflict");
  assert.deepEqual(r.rows.slice(1), historical);
});

test("a receipt cannot confirm a row whose recorded payload no longer matches its fingerprint", () => {
  const r = createReceiver();
  const data = inquiry();
  r.send(data);
  r.rows[3][8] = "changed@example.invalid";
  assert.equal(r.lookup(data).status, "unverified");
});

test("invalid contact, consent, enums, lengths, UUIDs and honeypots cannot append rows", () => {
  const r = createReceiver();
  const before = structuredClone(r.rows);
  for (const overrides of [
    { consent: false }, { privacy_version: "old" }, { website: "bot" },
    { contact: "bad" }, { client_type: "invalid" }, { goal: "invalid" },
    { schedule: "invalid" }, { format: "invalid" }, { referral: "invalid" },
    { preferred_name: "x".repeat(81) }, { schedule_notes: "x".repeat(301) },
    { inquiry_id: "=FORMULA()" }, { attempt_id: "not-a-uuid" }
  ]) {
    const data = inquiry(overrides);
    assert.equal(r.send(data).ok, false);
    if (!overrides.inquiry_id && !overrides.attempt_id) assert.equal(r.lookup(data).status, "failed");
  }
  assert.deepEqual(r.rows, before);
});

test("rejected attempts cannot poison later retries with a fresh attempt ID", () => {
  const r = createReceiver();
  const data = inquiry({ contact: "bad" });
  r.send(data);
  assert.equal(r.lookup(data).status, "failed");
  const retry = { ...data, contact: "valid@example.invalid", attempt_id: randomUUID() };
  assert.equal(r.lookup(retry).status, "unverified");
  assert.equal(r.send(retry).status, "confirmed");
  assert.equal(r.lookup(retry).status, "confirmed");
});

test("simultaneous same-ID submissions respect the lock and converge to one row", () => {
  const r = createReceiver();
  const data = inquiry();
  let concurrent;
  r.onAppend(() => { concurrent = r.send({ ...data, attempt_id: randomUUID() }); });
  assert.equal(r.send(data).status, "confirmed");
  assert.equal(concurrent.code, "busy");
  assert.equal(r.send({ ...data, attempt_id: randomUUID() }).status, "confirmed");
  assert.equal(r.rows.length, 4);
  assert.equal(r.locked(), false);
});

test("simultaneous different IDs cannot write while another request owns the lock", () => {
  const r = createReceiver();
  const second = inquiry({ contact: "second@example.invalid" });
  r.onAppend(() => { assert.equal(r.send(second).code, "busy"); });
  r.send(inquiry());
  assert.equal(r.send(second).status, "confirmed");
  assert.equal(r.rows.length, 5);
});

test("receipt checks during an in-flight write are Unverified until the lock is released", () => {
  const r = createReceiver();
  const data = inquiry();
  r.onAppend(() => { assert.equal(r.lookup(data).status, "unverified"); });
  r.send(data);
  assert.equal(r.lookup(data).status, "confirmed");
});

test("evicted rejection cache yields Unverified rather than a fabricated result", () => {
  const r = createReceiver();
  const data = inquiry({ consent: false });
  r.send(data);
  assert.equal(r.lookup(data).status, "failed");
  r.cache.clear();
  assert.equal(r.lookup(data).status, "unverified");
});

test("contact normalization retains durable retry and readback compatibility", () => {
  const r = createReceiver();
  const data = inquiry({ contact: "  valid@example.invalid  " });
  assert.equal(r.send(data).status, "confirmed");
  assert.equal(r.rows[3][8], "valid@example.invalid");
  assert.equal(r.lookup(data).status, "confirmed");
  assert.equal(r.send({ ...data, attempt_id: randomUUID() }).status, "confirmed");
  assert.equal(r.rows.length, 4);
});

test("missing Intake, mismatched schema/properties, duplicate IDs and unlabelled metadata fail safely", () => {
  for (const options of [
    { missingSheet: true }, { headers: ["wrong", ...HEADERS.slice(1)] },
    { properties: { SHEET_NAME: "ServiceRoute Inquiries" } },
    { properties: { SPREADSHEET_ID: "another-spreadsheet" } },
    { metadata: ["unrelated field"] }, { unlabeled: true }, { metadata: [0] },
    { metadata: ["consent", "privacy_version", "consent_recorded_at", "Request fingerprint", "Receipt attempts", "unexpected"] }
  ]) {
    const r = createReceiver(options);
    const before = structuredClone(r.rows);
    const data = inquiry();
    assert.equal(r.send(data).ok, false);
    assert.equal(r.lookup(data).status, "unverified");
    assert.deepEqual(r.rows, before);
    assert.equal(r.locked(), false);
  }
  const r = createReceiver();
  const data = inquiry();
  r.send(data);
  r.rows.push([...r.rows[3]]);
  assert.equal(r.send(data).ok, false);
  assert.equal(r.lookup(data).status, "unverified");
});

test("schema extension supports a sheet with only 13 physical columns", () => {
  const r = createReceiver({ maxColumns: 13 });
  assert.equal(r.send(inquiry()).status, "confirmed");
  assert.equal(r.maxColumns(), 18);
});

test("write/flush/readback failures never produce a false confirmation", () => {
  for (const failure of ["append", "flush", "readback"]) {
    const r = createReceiver({ failure });
    const data = inquiry();
    assert.equal(r.send(data).ok, false);
    const result = r.lookup(data);
    // A lost flush response may follow a completed write; a later lookup can prove it.
    assert.equal(result.status, failure === "flush" ? "confirmed" : "unverified");
  }
});

test("per-contact and global throttling reject new IDs but not durable retries", () => {
  const r = createReceiver();
  const data = inquiry();
  r.send(data);
  const limited = inquiry();
  assert.equal(r.send(limited).code, "rate_limited");
  assert.equal(r.lookup(limited).status, "failed");
  assert.equal(r.send({ ...data, attempt_id: randomUUID() }).status, "confirmed");
  r.cache.set("volume:" + Math.floor(Date.now() / 3600000), "60");
  assert.equal(r.send(inquiry({ contact: "different@example.invalid" })).code, "rate_limited");
});

test("formula protection writes every new cell as literal text including leading zeroes", () => {
  const r = createReceiver();
  for (const value of ["=IMPORTXML()", "+123", "-1", "@SUM()", "\t=1", "09171234567"]) {
    assert.equal(r.context.safeCell(value), "'" + value);
  }
  r.send(inquiry({ preferred_name: "=1+1", schedule_notes: "\t=1+1" }));
  assert.equal(r.rows[3][1], "=1+1");
  assert.ok(r.rawAppend().every((cell) => cell.startsWith("'")));
});

test("JSONP permits only generated callbacks and UUIDs; errors expose no exception details", () => {
  const r = createReceiver();
  const data = inquiry();
  for (const callback of ["alert(1)//", "foo.bar", "__proto__", "__serviceRouteReceipt_\""]) {
    const result = r.get({ action: "receipt", id: data.inquiry_id, attempt: data.attempt_id, callback });
    assert.equal(JSON.parse(result.body).ok, false);
    assert.equal(result.mime, "json");
  }
  assert.equal(JSON.parse(r.get({ action: "health" }).body).protocol, "serviceroute-receipt-v1");
  assert.equal(r.sendRaw("{broken").ok, false);
  assert.equal(r.sendRaw("x".repeat(8193)).ok, false);
});
