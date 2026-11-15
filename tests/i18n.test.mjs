import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function fixture(search = "") {
  const attrs = new Map([["placeholder", "0917-123-4567 o email"]]);
  const input = {
    value: "Magpatuloy", checked: true, disabled: true,
    hasAttribute: (name) => attrs.has(name),
    getAttribute: (name) => attrs.get(name),
    setAttribute: (name, value) => attrs.set(name, value)
  };
  const nodes = ["Sino ang gagamit ng serbisyo?", "Ipadala ang inquiry"].map((nodeValue) => ({
    nodeValue, parentElement: { closest: () => false }
  }));
  const links = [{
    href: "privacy.html",
    getAttribute() { return this.href; }, setAttribute(_, value) { this.href = value; }
  }];
  const document = {
    documentElement: { lang: "fil" },
    createTreeWalker() { let i = 0; return { nextNode: () => nodes[i++] || null }; },
    querySelectorAll(selector) {
      if (selector.startsWith("[aria-label]")) return [input];
      if (selector.startsWith("a[")) return links;
      return [];
    }
  };
  const context = vm.createContext({ document, location: { search }, URLSearchParams });
  vm.runInContext(readFileSync(new URL("../i18n.js", import.meta.url), "utf8"), context);
  return { ui: context.ServiceRouteI18n, document, nodes, input, links };
}
test("Filipino default and reversible English switching translate text without touching entered values", () => {
  const f = fixture();
  assert.equal(f.ui.language, "fil");
  f.ui.setLanguage("en");
  assert.equal(f.nodes[0].nodeValue, "Who will use the service?");
  assert.equal(f.input.getAttribute("placeholder"), "0917-123-4567 or email");
  assert.equal(f.input.value, "Magpatuloy");
  assert.equal(f.input.checked, true);
  assert.equal(f.input.disabled, true);
  assert.equal(f.document.documentElement.lang, "en");
  assert.equal(f.links[0].href, "privacy.html?lang=en");
  f.ui.setLanguage("fil");
  assert.equal(f.nodes[0].nodeValue, "Sino ang gagamit ng serbisyo?");
  assert.equal(f.document.documentElement.lang, "fil");
  f.ui.setLanguage("unsupported");
  assert.equal(f.ui.language, "fil");
});
test("privacy language query accepts only a non-sensitive supported language code", () => {
  assert.equal(fixture("?lang=en").ui.language, "en");
  assert.equal(fixture("?lang=fil").ui.language, "fil");
  assert.equal(fixture("?lang=bad").ui.language, "fil");
});
test("dynamic replacement text is translated after navigation rather than using stale cached text", () => {
  const f = fixture("?lang=en");
  f.nodes[0].nodeValue = "Kailan mo gustong magpa-appointment?";
  f.ui.apply();
  assert.equal(f.nodes[0].nodeValue, "When would you prefer to schedule your appointment?");
  f.ui.setLanguage("fil");
  assert.equal(f.nodes[0].nodeValue, "Kailan mo gustong magpa-appointment?");
});
test("translation catalog covers all four questions, receipt explanations, accessibility and privacy requirements", () => {
  const { ui } = fixture("?lang=en");
  for (const key of [
    "Sino ang gagamit ng serbisyo?", "Ano ang pangunahing layunin ng appointment?",
    "Saan mo nais isagawa ang session?", "Kailan mo gustong magpa-appointment?",
    "Isara at bumalik sa pagpili ng schedule", "Privacy notice ng ServiceRoute",
    "Kailangan pang ilathala rito ang beripikadong privacy contact at aprubadong retention period. Hindi sapat ang pagbanggit sa RA 10173 o consent checkbox para masabing legal na compliant ang app."
  ]) assert.notEqual(ui.text(key), key);
  assert.deepEqual(Object.keys(ui.translations.fil).sort(), Object.keys(ui.translations.en).sort());
});
test("canonical English service names have localized display aliases without modifying their identifiers", () => {
  const { ui } = fixture();
  const canonical = "Individual Counseling / Talk Therapy";
  assert.equal(ui.text(canonical), "Indibidwal na counseling / talk therapy");
  ui.setLanguage("en");
  assert.equal(ui.text(canonical), canonical);
  assert.equal(ui.text("Natanggap ang inquiry"), "Inquiry Confirmed");
});
