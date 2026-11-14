import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";

// Lightweight DOM double: tests state transitions and rendered markup, not layout.
function app(fetchImpl = async () => { throw new Error("offline"); }) {
  const nodes = new Map();
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
    getElementById: (id) => nodes.get(id) || null,
    createElement: () => element(),
    querySelector: (selector) => selector === "[data-crisis-proceed]" ? crisisProceed : element()
  };
  // Parse dynamically inserted dock controls too.
  document.createElement = () => element();
  const window = {
    scrollTo() {}, requestAnimationFrame(fn) { fn(); },
    setTimeout() { return 1; }, clearTimeout() {},
    matchMedia() { return { matches: false }; }, confirm() { return true; }
  };
  let source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  source = source.replace("  init();", `  globalThis.hooks = {
    state, getRecommendation, isValidContact, advanceFromStep, goBack,
    showResult, editAnswers, resetIntake, handleInquirySubmit, postInquiry,
    handleOptionChange, buildCopySummary, renderResult
  }; init();`);
  const context = vm.createContext({
    document, window, console, crypto: { randomUUID }, AbortController,
    fetch: fetchImpl, navigator: {}
  });
  vm.runInContext(source, context);
  return { ...context.hooks, nodes, crisisProceed };
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

test("sends directly to the configured Apps Script without claiming confirmed storage", async () => {
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
  });
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.submitted, true);
  assert.match(hooks.nodes.get("inquiry-mount").innerHTML, /Inquiry Sent/);
  assert.match(hooks.nodes.get("inquiry-mount").innerHTML, /cannot verify that Google Sheets saved it/);
  assert.doesNotMatch(hooks.nodes.get("inquiry-mount").innerHTML, /Your inquiry was saved|Inquiry Received/);
  assert.match(hooks.buildCopySummary(), /Delivery: Sent; receipt not verified/);
});

test("network failure shows interrupted sending; retries preserve the original payload", async () => {
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
  assert.match(hooks.nodes.get("inquiry-mount").innerHTML, /Connection interrupted/);
  hooks.renderResult();
  await submit(hooks);
  assert.equal(requests[0].inquiry_id, requests[1].inquiry_id);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(hooks.state.submitted, true);
  assert.match(hooks.buildCopySummary(), /receipt not verified/);
});

test("opaque server errors cannot be distinguished from accepted requests", async () => {
  // no-cors deliberately hides HTTP status, including rejected server writes.
  const hooks = app(async () => ({ type: "opaque", status: 0, ok: false }));
  fill(hooks);
  await submit(hooks);
  assert.equal(hooks.state.submitted, true);
  assert.match(hooks.buildCopySummary(), /receipt not verified/);
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
  assert.equal(hooks.state.submitted, true);
});

test("start over removes all inquiry and contact information", () => {
  const hooks = app();
  fill(hooks);
  Object.assign(hooks.state, {
    contact: "private@example.com", preferredName: "Private",
    scheduleNotes: "Friday afternoon", referral: "facebook",
    consent: true, payload: { contact: "private@example.com" },
    deliveryMode: "sent", submitted: true
  });
  hooks.resetIntake();
  assert.equal(hooks.state.scheduleNotes, "");
  assert.equal(hooks.state.contact, "");
  assert.equal(hooks.state.preferredName, "");
  assert.equal(hooks.state.referral, null);
  assert.equal(hooks.state.payload, null);
  assert.equal(hooks.state.consent, false);
  assert.equal(hooks.state.submitted, false);
  assert.ok(Object.values(hooks.state.answers).every((value) => value === null));
});
