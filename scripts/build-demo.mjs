import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import vm from "node:vm";

// Extract ONLY static presentation data and the pure matching function.
// Never copy the production application/receiver into the publication folder.
const source = await readFile("app.js", "utf8");
const data = source.match(/  const STEPS = \[[\s\S]*?(?=  const ICON_PATHS)/)?.[0];
const routing = source.match(/  function getRecommendation\(answers = state.answers\) \{[\s\S]*?\n  \}/)?.[0];
if (!data || !routing) throw new Error("Production presentation structure changed; review demo extraction.");
const model = vm.runInNewContext(`(() => { ${data}; return { STEPS, SERVICES }; })()`);
const translations = {
  "ServiceRoute — Demonstrasyon": "ServiceRoute — Demonstration",
  "Demo Mode": "Demo Mode",
  "Demonstrasyon lamang — walang ipinapadala o sine-save na sagot. Hindi ito booking o clinical assessment.": "Demonstration only — answers are not submitted or saved. This is not a booking or clinical assessment.",
  "Sinusubukan mo ang demonstrasyon ng ServiceRoute. Hindi ipinapadala o sine-save ang iyong mga sagot. Sa aktuwal na app, susuriin muna ng clinic ang inquiry bago kumpirmahin ang appointment.": "You're exploring a demonstration of ServiceRoute. Your answers are not submitted or saved. In the actual application, the clinic would review your inquiry before confirming an appointment.",
  "Magsimula muli": "Start Again",
  "Magpatuloy sa demonstrasyon": "Continue exploring",
  "Mga halimbawang pagpili para sa pag-aaral lamang. Huwag gumamit ng tunay na personal na detalye.": "Example choices for learning only. Do not use real personal details.",
  "Walang garantisadong same-day slot sa Kahilom. Ang demonstrasyong ito ay hindi emergency service. Kung kailangan mo ng agarang suporta, tumawag sa NCMH Crisis Hotline.": "Kahilom cannot guarantee a same-day slot. This demonstration is not an emergency service. For immediate support, call the NCMH Crisis Hotline."
};
let html = await readFile("index.html", "utf8");
html = html
  .replace('<meta charset="utf-8">', `<meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; form-action 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-src 'none'">
  <meta name="referrer" content="no-referrer">`)
  .replace(/<title>.*?<\/title>/, "<title>ServiceRoute — Demonstrasyon</title>")
  .replace(/<meta name="description"[^>]+>/, '<meta name="description" content="ServiceRoute — Demonstrasyon">')
  .replace(/  <!-- Social Media[\s\S]*?(?=  <link rel="icon")/, "")
  .replace(/<h1 class="header-line">[\s\S]*?<\/h1>/, '<h1 class="header-line">ServiceRoute — Demonstrasyon</h1>')
  .replace('<main id="app-main" class="app-main" tabindex="-1">', `<main id="app-main" class="app-main" tabindex="-1">
      <aside class="service-card" aria-labelledby="demo-title">
        <h2 id="demo-title">Demo Mode</h2>
        <p>Demonstrasyon lamang — walang ipinapadala o sine-save na sagot. Hindi ito booking o clinical assessment.</p>
        <p>Mga halimbawang pagpili para sa pag-aaral lamang. Huwag gumamit ng tunay na personal na detalye.</p>
      </aside>`)
  .replace(/<p>I-enable ang JavaScript,[\s\S]*?<\/p>/, "<p>JavaScript is required to explore this demo. Walang ipinapadalang inquiry.</p>")
  .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, '<footer class="site-footer"><p>Demonstrasyon lamang — walang ipinapadala o sine-save na sagot. Hindi ito booking o clinical assessment.</p></footer>')
  .replace("Walang garantisadong same-day slot sa Kahilom. Ang inquiry na ito ay hindi emergency service.", "Walang garantisadong same-day slot sa Kahilom. Ang demonstrasyong ito ay hindi emergency service.")
  .replace("Magpatuloy sa inquiry", "Magpatuloy sa demonstrasyon")
  .replace('src="app.js"', 'src="demo.js"');
const catalog = (await readFile("i18n.js", "utf8"))
  .replace("const en = {", `const en = {\n${Object.entries(translations).map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join("\n")}`);
const runtime = `"use strict";\n(() => {\n${data}\n${routing.replace("answers = state.answers", "answers")}\n${await readFile("scripts/demo-app.js", "utf8")}\n})();\n`;
for (const content of [html, catalog, runtime]) {
  if (/script\.google|googleusercontent|SPREADSHEET_ID|19zT6nog|AKfycb/.test(content)) throw new Error("Production identifier in demo");
}
await mkdir("docs", { recursive: true });
await Promise.all([
  writeFile("docs/index.html", html),
  writeFile("docs/i18n.js", catalog),
  writeFile("docs/demo.js", runtime),
  writeFile("docs/.nojekyll", ""),
  copyFile("style.css", "docs/style.css")
]);
console.log(`Built isolated demo: ${model.STEPS.length - 1} steps, ${Object.keys(model.SERVICES).length} services.`);
