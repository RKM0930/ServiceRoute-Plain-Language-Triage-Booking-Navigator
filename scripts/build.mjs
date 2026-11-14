import { mkdir, copyFile } from "node:fs/promises";

// Publish only browser assets, never source snapshots or receiver code.
await mkdir("public", { recursive: true });
for (const file of ["index.html", "style.css", "app.js", "privacy.html"]) {
  await copyFile(file, `public/${file}`);
}
