import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import { createReceiver } from "./support/receiver.mjs";

// Lightweight DOM double: tests state transitions and rendered markup, not layout.
function app(fetchImpl = async () => { throw new Error("offline"); },
  receiptImpl = () => ({ status: "unverified" })) {
  const nodes = new Map();
  const receiptScripts = [];
  function element(id = "") {
    const attributes = new Map();
    let html = "";
    const node = {
      id, style: {}, dataset: {}, value: "", checked: false, hidden: false,
      disabled: false, open: false,
      classList: { toggle() {}, add() {}, remove() {} },
      setAttribute(key, value) { attributes.set(key, value); },
      getAttribute(key) { return attributes.get(key); },
      removeAttribute(key) { attributes.delete(key); },
      addEventListener() {}, insertAdjacentElement() {},
      querySelectorAll() { return []; }, closest() { return null; },
      focus() {}, scrollIntoView() {},
      remove() { this.removed = true; },
      showModal() { this.open = true; }, close() { this.open = false; },
      matches(selector) { return selector === `#${id}`; },
      get innerHTML() { return html; },
      set innerHTML(value) {
        html = value;
        for (const match of value.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
          const child = element(match[1]);
          child.value = /value="([^"]*)"/.exec(match[0])?.[1] || "";
          child.checked = /\bchecked\b/.test(match[0]);
          nodes.set(match[1], child);
        }
      }
    };
    return node;
  }
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes.set(match[1], element(match[1]));
  const crisisProceed = element();
  const document = {
    body: element(),
    head: {
      appendChild(script) {
        receiptScripts.push(script);
        const url = new URL(script.src);
        Promise.resolve().then(() => receiptImpl(url)).then((result) => {
          if (result === "timeout") return;
          if (result === "error") return script.onerror();
          if (result.javascript) {
            vm.runInNewContext(result.javascript, window);
            return;
          }
          window[url.searchParams.get("callback")]?.({
            protocol: "serviceroute-receipt-v1",
            inquiry_id: url.searchParams.get("id"), ...result
          });
        }).catch(() => script.onerror());
      }
    },
    getElementById: (id) => nodes.get(id) || null,
    createElement: () => element(),
    querySelector: (selector) => selector === "[data-crisis-proceed]" ? crisisProceed : element()
  };
  // Parse dynamically inserted dock controls too.
  document.createElement = () => element();
  const window = {
    scrollTo() {}, requestAnimationFrame(fn) { fn(); },
    setTimeout(fn, delay) { return setTimeout(fn, delay === 5000 ? 10 : delay === 20000 ? 100 : 0); },
    clearTimeout(timer) { clearTimeout(timer); },
    matchMedia() { return { matches: false }; }, confirm() { return true; }
  };
  let source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  source = source.replace("  init();", `  globalThis.hooks = {
    state, getRecommendation, isValidContact, advanceFromStep, goBack,
    showResult, editAnswers, resetIntake, handleInquirySubmit, postInquiry,
    handleOptionChange, buildCopySummary, renderResult, lookupReceipt
  }; init();`);
  const context = vm.createContext({
    document, window, console, crypto: { randomUUID }, AbortController,
    fetch: fetchImpl, navigator: {}, URL, URLSearchParams
  });
  vm.runInContext(source, context);
  return {
    ...context.hooks, nodes, crisisProceed, receiptScripts,
    pendingReceiptCallbacks: () => Object.keys(window).filter((key) => key.startsWith("__serviceRouteReceipt_"))
  };
}

function fill(hooks, overrides = {}) {
  Object.assign(hooks.state.answers, {
    client: "adult", goal: "counseling", format: "online", schedule: "flexible"
  }, overrides);
  hooks.showResult();
  hooks.nodes.get("contact-input").value = "09171234567";
  hooks.nodes.get("consent-checkbox").checked = true;
}

function submit(hooks) {
  return hooks.handleInquirySubmit({
    target: hooks.nodes.get("inquiry-form"), preventDefault() {}
  });
}

test("actual HTML IDs support startup and initial progress", () => {
  const hooks = app();
  assert.match(hooks.nodes.get("step-root").innerHTML, /Sino ang gagamit/);
  assert.equal(hooks.nodes.get("progress-track").getAttribute("aria-valuenow"), "25");
});

test("all 54 combinations match deterministic routing rules", () => {
  const hooks = app();
  for (const client of ["adult", "minor", "couple_family"])
    for (const goal of ["counseling", "assessment", "clearance"])
      for (const format of ["online", "f2f"])
        for (const schedule of ["asap", "weekend", "flexible"]) {
          const title = hooks.getRecommendation({ client, goal, format, schedule }).title;
          const expected = goal === "clearance" ? "Psychological Evaluation for Official Clearance"
            : goal === "assessment" ? "Full Psychological Assessment & Testing Battery"
            : client === "couple_family" ? "Couples / Family Counseling"
            : "Individual Counseling / Talk Therapy";
          assert.equal(title, expected);
        }
});

test("contact validation accepts email/phone and rejects invalid contacts", () => {
  const hooks = app();
  for (const value of ["0917-123-4567", "+63 917 123 4567", "client@example.com"]) {
    assert.equal(hooks.isValidContact(value), true);
  }
  for (const value of ["", "hello", "x@y", "123", "1".repeat(16), "=1234567"]) {
    assert.equal(hooks.isValidContact(value), false);
  }
});

test("unanswered steps cannot advance; back preserves answers", () => {
  const hooks = app();
  hooks.advanceFromStep();
  assert.equal(hooks.state.step, 1);
  hooks.state.answers.client = "minor";
  hooks.advanceFromStep();
  assert.equal(hooks.state.step, 2);
  hooks.goBack();
  assert.equal(hooks.state.step, 1);
  assert.equal(hooks.state.answers.client, "minor");
});

test("urgent schedule requires acknowledgment before result", () => {
  const hooks = app();
  Object.assign(hooks.state.answers, {
    client: "adult", goal: "counseling", format: "online", schedule: "asap"
  });
  hooks.state.step = 4;
  hooks.advanceFromStep();
  assert.equal(hooks.nodes.get("crisis-modal").open, true);
  assert.equal(hooks.state.phase, "intake");
  hooks.state.crisisAcknowledged = true;
  hooks.advanceFromStep();
  assert.equal(hooks.state.phase, "result");
});

test("result includes review, native referral radios, notice and format warnings", () => {
  const hooks = app();
  fill(hooks, { goal: "clearance" });
  const markup = hooks.nodes.get("step-root").innerHTML;
  assert.match(markup, /requires in-person testing/);
  assert.match(markup, /data-action="edit-answers"/);
  assert.match(markup, /name="referral"/);
  assert.match(markup, /privacy.html/);
  hooks.editAnswers();
  assert.equal(hooks.state.phase, "intake");
  assert.equal(hooks.state.step, 4);
});

test("invalid contact and missing consent never send", async () => {
  let calls = 0;
  const hooks = app(async () => { calls++; });
  fill(hooks);
  hooks.nodes.get("contact-input").value = "invalid";
  await submit(hooks);
  hooks.nodes.get("contact-input").value = "client@example.com";
  hooks.nodes.get("consent-checkbox").checked = false;
  await submit(hooks);
  assert.equal(calls, 0);
});

test("opaque POST alone stays Unverified and receipt requests contain no contact data", async () => {
  const hooks = app(async (url, options) => {
    assert.equal(url, "https://script.google.com/macros/s/AKfycbxCx0FCf-1i4HyBMHZ3WHiyhpQW_8LxbEAsMnNwgUQIXw6le92YVlCXis6dZMGUjY8tjg/exec");
    assert.equal(options.mode, "no-cors");
    assert.equal(options.headers["Content-Type"], "text/plain;charset=UTF-8");
    assert.equal(options.credentials, "omit");
    const data = JSON.parse(options.body);
    assert.equal(data.consent, true);
    assert.equal(data.privacy_version, "2026-11-15");
    assert.ok(Number.isFinite(Date.parse(data.timestamp)));
    assert.equal("receiver_secret" in data, false);
    return { type: "opaque", status: 0, json() { throw new Error("Opaque body must not be read"); } };
  }, (url) => {
    assert.equal(url.searchParams.get("action"), "receipt");
    assert.deepEqual([...url.searchParams.keys()].sort(), ["_", "action", "attempt", "callback", "id"]);
    assert.equal(url.href.includes("09171234567"), false);
    return { status: "unverified" };
  });
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.submitted, false);
  assert.match(hooks.nodes.get("inquiry-mount").innerHTML, /Submission Unverified/);
  assert.doesNotMatch(hooks.nodes.get("inquiry-mount").innerHTML, /Your inquiry was saved|Inquiry Received/);
  assert.match(hooks.buildCopySummary(), /Delivery: unverified/);
});

test("network failure stays Unverified; retry preserves submission data with a new attempt ID", async () => {
  const requests = [];
  let attempt = 0;
  const hooks = app(async (_, options) => {
    requests.push(JSON.parse(options.body));
    attempt++;
    if (attempt === 1) throw new Error("lost response");
    return { type: "opaque", status: 0 };
  });
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.submitted, false);
  assert.match(hooks.nodes.get("inquiry-mount").innerHTML, /Submission Unverified/);
  hooks.renderResult();
  await submit(hooks);
  assert.equal(requests[0].inquiry_id, requests[1].inquiry_id);
  assert.notEqual(requests[0].attempt_id, requests[1].attempt_id);
  const withoutAttempt = ({ attempt_id, ...data }) => data;
  assert.deepEqual(withoutAttempt(requests[0]), withoutAttempt(requests[1]));
  assert.equal(hooks.state.submitted, false);
  assert.match(hooks.buildCopySummary(), /Delivery: unverified/);
});

test("opaque server errors cannot be distinguished from accepted requests", async () => {
  // no-cors deliberately hides HTTP status, including rejected server writes.
  const hooks = app(async () => ({ type: "opaque", status: 0, ok: false }));
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.submitted, false);
  assert.match(hooks.buildCopySummary(), /Delivery: unverified/);
});

test("in-flight double submit sends only once", async () => {
  let calls = 0;
  let finish;
  const hooks = app(async (_, options) => {
    calls++;
    await new Promise((resolve) => { finish = resolve; });
    return { type: "opaque", status: 0 };
  });
  fill(hooks);
  const pending = submit(hooks);
  await submit(hooks);
  assert.equal(calls, 1);
  finish();
  await pending;
  assert.equal(hooks.state.submitted, false);
});

test("authoritative receipt confirms storage even when the POST response is lost", async () => {
  const hooks = app(async () => { throw new Error("response lost after write"); },
    () => ({ status: "confirmed", received_at: "2026-11-15T12:00:00.000Z" }));
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.submitted, true);
  assert.equal(hooks.state.deliveryMode, "confirmed");
  assert.match(hooks.nodes.get("inquiry-mount").innerHTML, /Inquiry Confirmed/);
  assert.match(hooks.buildCopySummary(), /Server received at: 2026-11-15T12:00:00.000Z/);
});

test("server-rejected requests show Failed, not Unverified or Confirmed", async () => {
  const hooks = app(async () => ({ type: "opaque" }), () => ({ status: "failed" }));
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.submitted, false);
  assert.equal(hooks.state.deliveryMode, "failed");
  assert.match(hooks.nodes.get("inquiry-mount").innerHTML, /Submission Failed/);
  assert.match(hooks.nodes.get("inquiry-mount").innerHTML, /retry-inquiry/);
});

test("wrong IDs, protocol, timestamps and unknown statuses cannot confirm", async () => {
  for (const result of [
    { status: "confirmed", inquiry_id: randomUUID(), received_at: "2026-11-15" },
    { status: "confirmed", received_at: "invalid" },
    { status: "confirmed", received_at: "2026-11-15", protocol: "wrong" },
    { status: "something-else" }
  ]) {
    const hooks = app(async () => ({ type: "opaque" }), () => result);
    fill(hooks);
    await submit(hooks);
    assert.equal(hooks.state.deliveryMode, "unverified");
  }
});

test("receipt errors, timeouts and old deployments remain Unverified", async () => {
  for (const result of ["error", "timeout"]) {
    const hooks = app(async () => ({ type: "opaque" }), () => result);
    fill(hooks);
    await submit(hooks);
    assert.equal(hooks.state.deliveryMode, "unverified");
    assert.deepEqual(hooks.pendingReceiptCallbacks(), []);
    assert.ok(hooks.receiptScripts.every((script) => script.removed));
  }
});

test("POST timeout still checks durable storage and clears the busy state", async () => {
  const hooks = app((_, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("timeout")));
  }), () => ({ status: "confirmed", received_at: "2026-11-15T12:00:00.000Z" }));
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.deliveryMode, "confirmed");
  assert.equal(hooks.state.submitting, false);
  assert.deepEqual(hooks.pendingReceiptCallbacks(), []);
});

test("simultaneous receipt callbacks are independent and cleaned up", async () => {
  const hooks = app(undefined, () => ({ status: "confirmed", received_at: "2026-11-15T12:00:00.000Z" }));
  const results = await Promise.all([
    hooks.lookupReceipt(randomUUID(), randomUUID()), hooks.lookupReceipt(randomUUID(), randomUUID())
  ]);
  assert.ok(results.every((result) => result.status === "confirmed"));
  assert.deepEqual(hooks.pendingReceiptCallbacks(), []);
  assert.ok(hooks.receiptScripts.every((script) => script.removed));
});

test("receipt polling tolerates eventual storage and stops once confirmed", async () => {
  let lookups = 0;
  const hooks = app(async () => ({ type: "opaque" }), () => ++lookups === 1
    ? { status: "unverified" }
    : { status: "confirmed", received_at: "2026-11-15T12:00:00.000Z" });
  fill(hooks);
  await submit(hooks);
  assert.equal(lookups, 2);
  assert.equal(hooks.state.submitted, true);
});

test("real frontend payload and receiver JSONP work together with the historical ledger", async () => {
  const receiver = createReceiver();
  const historical = structuredClone(receiver.rows.slice(1));
  const hooks = app(async (_, options) => {
    const result = receiver.send(JSON.parse(options.body));
    assert.equal(result.status, "confirmed");
    return { type: "opaque" };
  }, (url) => {
    const result = receiver.get(Object.fromEntries(url.searchParams));
    return { javascript: result.body };
  });
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.submitted, true);
  assert.equal(receiver.rows[3][12], hooks.state.payload.inquiry_id);
  assert.equal(receiver.rows[3][8], hooks.state.contact);
  assert.deepEqual(receiver.rows.slice(1, 3), historical);
});

test("start over removes all inquiry and contact information", () => {
  const hooks = app();
  fill(hooks);
  Object.assign(hooks.state, {
    contact: "private@example.com", preferredName: "Private",
    scheduleNotes: "Friday afternoon", referral: "facebook",
    consent: true, payload: { contact: "private@example.com" },
    deliveryMode: "confirmed", submitted: true, receivedAt: "2026-11-15T12:00:00.000Z"
  });
  hooks.resetIntake();
  assert.equal(hooks.state.scheduleNotes, "");
  assert.equal(hooks.state.contact, "");
  assert.equal(hooks.state.preferredName, "");
  assert.equal(hooks.state.referral, null);
  assert.equal(hooks.state.payload, null);
  assert.equal(hooks.state.consent, false);
  assert.equal(hooks.state.submitted, false);
  assert.equal(hooks.state.receivedAt, null);
  assert.ok(Object.values(hooks.state.answers).every((value) => value === null));
});
