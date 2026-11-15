/**
 * Optional real-browser QA. No app dependencies are installed.
 * Supply PLAYWRIGHT_MODULE and AXE_SCRIPT from an external test-tool installation.
 * Every Google request is intercepted; production never receives test submissions.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createReceiver } from "./support/receiver.mjs";

if (!process.env.AXE_SCRIPT) throw new Error("Set AXE_SCRIPT to an external axe-core/axe.min.js file.");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const axeSource = await readFile(process.env.AXE_SCRIPT, "utf8");
const source = await readFile(resolve(root, "app.js"), "utf8");
const endpoint = /const SCRIPT_URL = "([^"]+)"/.exec(source)?.[1];
assert.match(endpoint, /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/);
const report = { routes: 0, checks: [], widths: [], accessibility: [], errors: [] };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/__test/axe.js") {
      response.writeHead(200, { "Content-Type": "text/javascript" }).end(axeSource);
      return;
    }
    const file = resolve(root, pathname === "/" ? "index.html" : "." + pathname);
    if (!file.startsWith(root + "/")) { response.writeHead(403).end(); return; }
    const type = file.endsWith(".html") ? "text/html" : file.endsWith(".js") ? "text/javascript" : "text/css";
    response.writeHead(200, { "Content-Type": type }).end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"]
  });
  await context.route("**/*", (route) => {
    return route.request().url().startsWith(origin) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  const backend = createReceiver();
  let mode = "success";
  let releasePost;
  let notifyHeld;
  const heldPost = new Promise((done) => { notifyHeld = done; });
  const posts = [];
  const receiptQueries = [];
  await page.route(endpoint + "*", async (route) => {
    if (route.request().method() === "GET") {
      const params = Object.fromEntries(new URL(route.request().url()).searchParams);
      receiptQueries.push(params);
      assert.deepEqual(Object.keys(params).sort(), ["_", "action", "attempt", "callback", "id"]);
      if (mode === "lost-receipt") return route.abort();
      const receipt = backend.get(params);
      return route.fulfill({ contentType: "application/javascript", body: receipt.body });
    }
    assert.equal(route.request().method(), "POST");
    const data = route.request().postDataJSON();
    posts.push(data);
    if (mode === "offline") return route.abort("internetdisconnected");
    if (mode === "hold") await new Promise((done) => { releasePost = done; notifyHeld(); });
    const result = backend.send(mode === "reject" ? { ...data, contact: "bad" } : data);
    if (mode === "lost-post") return route.abort("internetdisconnected");
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(result) });
  });
  async function choose(name, value) {
    await page.locator(`input[name="${name}"][value="${value}"]`).check();
  }
  async function assertLayout() {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const selector of [".step-panel", ".service-card", ".inquiry-card", ".success-card"]) {
      for (const element of await page.locator(selector).all()) {
        const box = await element.boundingBox();
        if (box) assert.ok(box.x >= 0 && box.x + box.width <= (await page.viewportSize()).width + 1);
      }
    }
  }
  async function flow(client = "adult", goal = "counseling", format = "online", schedule = "flexible", layout = false) {
    await page.goto(origin);
    for (const [name, value] of [["client", client], ["goal", goal], ["format", format]]) {
      if (layout) await assertLayout();
      await choose(name, value);
      await page.locator("#continue-button").click();
      await page.waitForFunction(() => document.activeElement.id === "step-title");
    }
    if (layout) await assertLayout();
    await choose("schedule", schedule);
    if (schedule === "asap") {
      await page.locator("#crisis-modal").waitFor({ state: "visible" });
      await page.locator("[data-crisis-proceed]").click();
    } else await page.locator("#continue-button").click();
    await page.locator("#inquiry-form").waitFor();
    await page.waitForFunction(() => document.activeElement.id === "result-heading");
    if (layout) await assertLayout();
  }
  async function axe(label) {
    if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ url: origin + "/__test/axe.js" });
    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] }
      });
      return result.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.map((n) => n.target) }));
    });
    report.accessibility.push({ label, violations });
    assert.deepEqual(violations, []);
  }
  async function outcome(heading) {
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement.id === "success-title");
  }
  async function screenshot(name, fullPage = true) {
    if (!process.env.BROWSER_ARTIFACTS_DIR) return;
    await mkdir(process.env.BROWSER_ARTIFACTS_DIR, { recursive: true });
    await page.screenshot({ path: resolve(process.env.BROWSER_ARTIFACTS_DIR, name + ".png"), fullPage });
  }
  await page.goto(origin);
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(".skip-link").evaluate((el) => el === document.activeElement), true);
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#app-main").evaluate((el) => el === document.activeElement), true);
  assert.equal(await page.locator("#continue-button").isDisabled(), true);
  assert.ok((await page.locator("#progress-fill").boundingBox()).width > 0);
  await axe("initial intake");
  report.checks.push("skip link, progress, disabled navigation and initial accessibility");

  for (const client of ["adult", "minor", "couple_family"])
    for (const goal of ["counseling", "clearance", "assessment"])
      for (const format of ["online", "f2f"])
        for (const schedule of ["asap", "weekend", "flexible"]) {
          await flow(client, goal, format, schedule);
          const expected = goal === "clearance" ? "Psychological Evaluation for Official Clearance"
            : goal === "assessment" ? "Full Psychological Assessment & Testing Battery"
            : client === "couple_family" ? "Couples / Family Counseling" : "Individual Counseling / Talk Therapy";
          assert.equal(await page.locator("#result-heading").textContent(), expected);
          assert.equal(await page.locator("#progress-track").getAttribute("aria-valuenow"), "100");
          assert.equal(await page.locator(".action-dock").isVisible(), false);
          report.routes++;
        }
  await flow();
  await axe("recommendation and complete inquiry form");
  const popupPromise = context.waitForEvent("page");
  await page.locator(".consent-copy a").click();
  const privacyPopup = await popupPromise;
  await privacyPopup.waitForLoadState();
  assert.equal(await privacyPopup.getByRole("heading", { name: "Privacy notice ng ServiceRoute" }).isVisible(), true);
  await privacyPopup.close();
  assert.equal(await page.locator("#consent-checkbox").isChecked(), false);
  const nameInput = page.locator("#preferred-name-input");
  const contact = page.locator("#contact-input");
  await nameInput.fill("juan dela cruz");
  assert.equal(await nameInput.inputValue(), "juan dela cruz");
  await contact.focus();
  assert.equal(await nameInput.inputValue(), "Juan Dela Cruz");
  await nameInput.fill("de la cruz");
  await contact.focus();
  assert.equal(await nameInput.inputValue(), "de la cruz");
  await contact.fill("+63 917 123 4567");
  await page.locator("#schedule-notes-input").focus();
  assert.equal(await contact.inputValue(), "0917-123-4567");
  assert.equal(await page.locator("#submit-inquiry").isDisabled(), true);
  await page.locator("#consent-checkbox").check();
  for (const invalid of ["0917123456", "091712345678", "1234567", "0917abc4567", "0917--123-4567"]) {
    await contact.fill(invalid);
    await page.locator("#submit-inquiry").click();
    assert.equal(await contact.getAttribute("aria-invalid"), "true");
    await page.waitForFunction(() => document.activeElement.id === "contact-input");
    assert.equal(await contact.evaluate((el) => el === document.activeElement), true);
    assert.equal(await page.locator("#contact-error").isVisible(), true);
    assert.equal(posts.length, 0);
  }
  await contact.fill("still invalid");
  assert.equal(await contact.getAttribute("aria-invalid"), "true");
  await contact.fill("09171234567");
  assert.equal(await contact.getAttribute("aria-invalid"), "false");
  await page.locator('input[name="referral"][value="instagram"]').focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator('input[name="referral"][value="facebook"]').isChecked(), true);
  await page.locator("#schedule-notes-input").fill("Friday afternoon");
  await page.locator('[data-action="edit-answers"]').click();
  await choose("schedule", "weekend");
  await page.locator("#back-button").click();
  assert.equal(await page.locator('input[name="format"][value="online"]').isChecked(), true);
  await page.locator("#continue-button").click();
  assert.equal(await page.locator('input[name="schedule"][value="weekend"]').isChecked(), true);
  await page.locator("#continue-button").click();
  assert.equal(await nameInput.inputValue(), "de la cruz");
  assert.equal(await page.locator("#schedule-notes-input").inputValue(), "Friday afternoon");
  mode = "hold";
  await page.locator("#submit-inquiry").click();
  await page.waitForFunction(() => document.querySelector("#inquiry-form").getAttribute("aria-busy") === "true");
  assert.equal(await page.locator("#submit-inquiry").isDisabled(), true);
  assert.match(await page.locator("#submission-status").textContent(), /Ipinapadala/);
  await page.locator("#inquiry-form").evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await heldPost;
  assert.equal(posts.length, 1);
  mode = "success";
  releasePost();
  await outcome("Inquiry Confirmed");
  assert.equal(backend.rows[3][1], "de la cruz");
  assert.equal(backend.rows[3][8], "0917-123-4567");
  assert.equal(backend.rows[3][9], "facebook");
  await axe("Confirmed");
  await page.locator('[data-action="copy-inquiry"]').click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.ok(copied.includes(posts[0].inquiry_id) && copied.includes("0917-123-4567"));
  assert.ok(copied.includes("confirmed"));
  assert.equal(await page.locator("#toast").isVisible(), true);
  report.checks.push("strict errors/focus, first-blur names/manual correction, canonical phone, referral arrows, edit/back, loading/double submit, copy");

  await page.locator('[data-action="start-over"]').click();
  for (const [field, value] of [["client", "adult"], ["goal", "counseling"], ["format", "online"], ["schedule", "flexible"]]) {
    await choose(field, value);
    await page.locator("#continue-button").click();
  }
  for (const selector of ["#contact-input", "#preferred-name-input", "#schedule-notes-input"]) {
    assert.equal(await page.locator(selector).inputValue(), "");
  }
  assert.equal(await page.locator("#consent-checkbox").isChecked(), false);
  assert.equal(await page.locator('input[name="referral"]:checked').count(), 0);
  report.checks.push("start-over clears all personal details and choices");

  for (const [scenario, heading] of [
    ["offline", "Submission Unverified"], ["reject", "Submission Failed"],
    ["lost-post", "Inquiry Confirmed"], ["lost-receipt", "Submission Unverified"]
  ]) {
    await flow();
    backend.cache.clear();
    mode = scenario;
    await page.locator("#contact-input").fill("browser-" + scenario + "@example.invalid");
    await page.locator("#consent-checkbox").check();
    await page.locator("#submit-inquiry").click();
    await outcome(heading);
    await axe(scenario);
    if (scenario === "lost-receipt") {
      const rowCount = backend.rows.length;
      const original = posts.at(-1);
      mode = "success";
      await page.locator('[data-action="retry-inquiry"]').click();
      await outcome("Inquiry Confirmed");
      assert.equal(posts.at(-1).inquiry_id, original.inquiry_id);
      assert.notEqual(posts.at(-1).attempt_id, original.attempt_id);
      assert.equal(backend.rows.length, rowCount);
      assert.equal(JSON.parse(backend.rows.at(-1)[17]).length, 2);
    }
  }
  report.checks.push("truthful three-state outcomes, lost POST recovery, lost receipt retry without another row");
  for (const width of [320, 375, 480, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    await flow("couple_family", "clearance", "online", "flexible", true);
    await axe(`result ${width}px`);
    await screenshot(`result-${width}`);
    await page.locator("#contact-input").fill("0917123456");
    await page.locator("#consent-checkbox").check();
    await page.locator("#submit-inquiry").click();
    await page.waitForFunction(() => document.activeElement.id === "contact-input");
    const errorBox = await page.locator("#contact-error").boundingBox();
    const bannerBox = await page.locator(".emergency-banner").boundingBox();
    assert.ok(errorBox.y >= bannerBox.y + bannerBox.height && errorBox.y + errorBox.height <= (await page.viewportSize()).height);
    await axe(`validation error ${width}px`);
    await screenshot(`error-${width}`, false);
    await page.goto(origin);
    await screenshot(`initial-${width}`);
    for (const [field, value] of [["client", "adult"], ["goal", "counseling"], ["format", "online"]]) {
      await choose(field, value);
      await page.locator("#continue-button").click();
    }
    await choose("schedule", "asap");
    await axe(`urgent dialog ${width}px`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#crisis-modal").open && !document.body.classList.contains("modal-open"));
    await page.locator("#continue-button").click();
    await page.locator("[data-close-modal]").click();
    await choose("schedule", "weekend");
    await page.locator("#continue-button").click();
    await assertLayout();
    await page.goto(origin + "/privacy.html");
    await assertLayout();
    await axe(`privacy ${width}px`);
    assert.equal(await page.getByRole("heading", { name: "Privacy notice ng ServiceRoute" }).isVisible(), true);
    await screenshot(`privacy-${width}`);
    for (const [scenario, heading] of [
      ["success", "Inquiry Confirmed"], ["offline", "Submission Unverified"], ["reject", "Submission Failed"]
    ]) {
      await flow();
      backend.cache.clear();
      mode = scenario;
      await page.locator("#contact-input").fill(`viewport-${width}-${scenario}@example.invalid`);
      await page.locator("#consent-checkbox").check();
      await page.locator("#submit-inquiry").click();
      await outcome(heading);
      await assertLayout();
      await axe(`${heading} ${width}px`);
    }
    report.widths.push(width);
  }
  assert.equal(backend.rows[1][10], "Contacted");
  assert.equal(backend.rows[2][10], "Scheduled");
  assert.deepEqual(report.errors, []);
  assert.ok(receiptQueries.length > 0);
  report.checks.push("all requested widths, complete step/result/modal/privacy layout, dialog Escape/reopen, historical statuses, zero uncaught errors");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.log(JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
