import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

test("Pages publishes the complete production frontend, not the demo or backend", () => {
  const assets = ["index.html", "style.css", "app.js", "i18n.js", "privacy.html"];
  assert.deepEqual(readdirSync("docs").sort(), [".nojekyll", ...assets].sort());
  for (const asset of assets) {
    assert.equal(readFileSync(`docs/${asset}`, "utf8"), readFileSync(asset, "utf8"), `${asset} must match the production source exactly`);
  }
  const html = readFileSync("docs/index.html", "utf8");
  assert.match(html, /src="app\.js\?v=20261115-ui4"/);
  assert.match(html, /href="style\.css\?v=20261115-ui4"/);
  assert.match(html, /src="i18n\.js\?v=20261115-ui4"/);
  assert.match(html, /<details class="emergency-banner">\s*<summary>/);
  assert.match(html, /href="privacy.html"/);
  assert.doesNotMatch(html, /demo\.js|Demo Mode|connect-src 'none'/);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:#|tel:|data:|https?:)/.test(match[1])) continue;
    assert.ok(assets.includes(match[1].split("?")[0]), `relative asset ${match[1]} exists under the Pages subpath`);
  }
  assert.match(readFileSync("docs/app.js", "utf8"), /const SCRIPT_URL = "https:\/\/script\.google\.com\/macros\/s\/[^"]+\/exec"/);
});
