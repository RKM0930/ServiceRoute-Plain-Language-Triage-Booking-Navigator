import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

test("published demo contains no production identifiers, transport, storage, or personal-data fields", () => {
  assert.deepEqual(readdirSync("docs").sort(), [".nojekyll", "demo.js", "i18n.js", "index.html", "style.css"].sort());
  for (const file of readdirSync("docs")) {
    const text = readFileSync(`docs/${file}`, "utf8");
    assert.doesNotMatch(text, /script\.google|googleusercontent|19zT6nog|AKfycb|SPREADSHEET_ID/);
    if (file === "demo.js") {
      assert.doesNotMatch(text, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|document\.cookie|receipt_lookup|inquiry_id/);
      assert.doesNotMatch(text, /type=["'](?:text|email|tel)|textarea|<form/);
    }
  }
  const html = readFileSync("docs/index.html", "utf8");
  assert.match(html, /connect-src 'none'; form-action 'none'/);
  assert.doesNotMatch(html, /src=["']https?:|href=["'](?:\/|https?:)|privacy\.html|src="app.js"/);
});

test("demo retains every production service-routing combination", () => {
  const demo = readFileSync("docs/demo.js", "utf8");
  const get = (text) => {
    const data = text.match(/  const STEPS = \[[\s\S]*?(?=  const ICON_PATHS|  function getRecommendation)/)[0];
    const routing = text.match(/  function getRecommendation\([^)]*\) \{[\s\S]*?\n  \}/)[0];
    return vm.runInNewContext(`(() => { ${data}; ${routing}; return getRecommendation; })()`);
  };
  const production = get(readFileSync("app.js", "utf8"));
  const demonstration = get(demo);
  for (const client of ["adult", "minor", "couple_family"]) {
    for (const goal of ["counseling", "clearance", "assessment"]) {
      for (const format of ["online", "f2f"]) {
        for (const schedule of ["asap", "weekend", "flexible"]) {
          const answers = { client, goal, format, schedule };
          assert.equal(demonstration(answers).title, production(answers).title);
        }
      }
    }
  }
});
