// All non-demo requests are blocked and recorded, including on the public site.
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
if (!process.env.PLAYWRIGHT_MODULE || !process.env.AXE_SCRIPT) throw new Error("Supply external PLAYWRIGHT_MODULE and AXE_SCRIPT.");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const axe = await readFile(process.env.AXE_SCRIPT, "utf8");
const prefix = "/ServiceRoute-Plain-Language-Triage-Booking-Navigator/";
const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    const file = path === prefix ? "index.html" : path.slice(prefix.length);
    if (!path.startsWith(prefix) || !["index.html", "demo.js", "i18n.js", "style.css"].includes(file)) {
      res.writeHead(404).end(); return;
    }
    const body = await readFile(resolve("docs", file));
    res.setHeader("Content-Type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html");
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
if (!process.env.DEMO_URL) await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = process.env.DEMO_URL || `http://127.0.0.1:${server.address().port}${prefix}`;
const base = new URL(url);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const unexpected = [], errors = [], responses = [];
await context.route("**/*", async (route) => {
  const request = route.request();
  const destination = new URL(request.url());
  if (request.method() !== "GET" || destination.origin !== base.origin || !destination.pathname.startsWith(base.pathname)) {
    unexpected.push({ url: request.url(), method: request.method() });
    await route.abort(); return;
  }
  await route.continue();
});
const page = await context.newPage();
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("response", (response) => { if (response.status() >= 400) responses.push([response.url(), response.status()]); });
let routes = 0, scans = 0;
async function switchLanguage(lang, scope = ".app-header") {
  await page.locator(`${scope} [data-language="${lang}"]`).click();
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
}
async function layoutAndAxe() {
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.evaluate(axe);
  const result = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }));
  assert.deepEqual(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })), []);
  scans++;
}
async function choose(name, value) {
  await page.locator(`input[name="${name}"][value="${value}"]`).check();
  await page.locator("#continue-button").click();
}
try {
  await page.goto(url);
  assert.equal(await page.locator("html").getAttribute("lang"), "fil");
  assert.equal(await page.locator("#continue-button").isDisabled(), true);
  await page.locator('input[value="minor"]').check();
  await switchLanguage("en");
  assert.equal(await page.locator('input[value="minor"]').isChecked(), true);
  assert.equal(await page.locator("#step-title").textContent(), "Who will use the service?");
  await page.locator("#continue-button").click();
  await page.locator("#back-button").click();
  assert.equal(await page.locator('input[value="minor"]').isChecked(), true);
  for (const client of ["adult", "minor", "couple_family"]) {
    for (const goal of ["counseling", "clearance", "assessment"]) {
      for (const format of ["online", "f2f"]) {
        for (const schedule of ["asap", "weekend", "flexible"]) {
          await page.goto(url);
          await switchLanguage("en");
          await choose("client", client);
          await choose("goal", goal);
          await choose("format", format);
          await choose("schedule", schedule);
          if (schedule === "asap") {
            assert.equal(await page.locator("#crisis-modal").isVisible(), true);
            await switchLanguage("fil", "#crisis-modal");
            assert.equal(await page.locator("#crisis-modal").isVisible(), true);
            await switchLanguage("en", "#crisis-modal");
            await page.locator("[data-crisis-proceed]").click();
          }
          const expected = goal === "clearance" ? "Psychological Evaluation for Official Clearance"
            : goal === "assessment" ? "Full Psychological Assessment & Testing Battery"
            : client === "couple_family" ? "Couples / Family Counseling" : "Individual Counseling / Talk Therapy";
          assert.equal(await page.locator("#result-heading").textContent(), expected);
          assert.match(await page.locator("#demo-result + p").textContent(), /not submitted or saved/);
          assert.equal(await page.locator('input:not([type="radio"]),textarea,form').count(), 0);
          await switchLanguage("fil");
          assert.match(await page.locator("#demo-result + p").textContent(), /Hindi ipinapadala/);
          await page.locator("#continue-button").click();
          assert.equal(await page.locator("input:checked").count(), 0);
          assert.equal(await page.locator("#continue-button").isDisabled(), true);
          routes++;
        }
      }
    }
  }
  for (const lang of ["fil", "en"]) {
    for (const width of [320, 375, 480, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await switchLanguage(lang);
      await layoutAndAxe();
      await choose("client", "adult");
      await choose("goal", "counseling");
      await choose("format", "online");
      await choose("schedule", "asap");
      await layoutAndAxe();
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#crisis-modal").isVisible(), false);
      await page.locator("#continue-button").click();
      await page.locator("[data-crisis-proceed]").click();
      await layoutAndAxe();
    }
  }
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]), [0, 0, ""]);
  assert.deepEqual(unexpected, [], "no outbound production or other external requests");
  assert.deepEqual(errors, []);
  assert.deepEqual(responses, []);
  console.log(JSON.stringify({ url, routes, languages: ["fil", "en"], widths: [320, 375, 480, 768, 1440], accessibilityScans: scans, unexpectedRequests: unexpected, errors, brokenAssets: responses }, null, 2));
} finally {
  await browser.close();
  if (server.listening) await new Promise((done) => server.close(done));
}
