import { mkdir, copyFile, writeFile } from "node:fs/promises";

// Full production frontend only. Never publish the receiver, tests, or reports.
await mkdir("docs", { recursive: true });
for (const file of ["index.html", "style.css", "app.js", "i18n.js", "privacy.html"]) {
  await copyFile(file, `docs/${file}`);
}
await writeFile("docs/.nojekyll", "");
console.log("Prepared full ServiceRoute application in docs/ for GitHub Pages.");
