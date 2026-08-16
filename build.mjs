// Assembles the deployable site into dist/.
//
// This exists for one specific reason. Cloudflare Pages compiles /functions
// only when it sits OUTSIDE the static root:
//
//   "Make sure that the /functions directory is at the root of your Pages
//    project (and not in the static root, such as /dist)."
//
// With no build output directory configured, the static root was the repo
// root — so functions/ was inside it, got uploaded as plain .js files, and
// every /api/* request fell through to index.html. Copying the site into
// dist/ and pointing Pages at dist/ leaves functions/ at the root where it
// belongs.
//
// It also keeps the Claude Design workflow intact: re-exports still land in
// the repo root, and this decides what actually ships.
//
// Deliberately an allowlist. A denylist would one day quietly publish
// .dev.vars.

import { cp, mkdir, rm, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "dist");

// Everything the browser is allowed to fetch. Nothing else ships.
const SHIP = [
  "index.html",
  "app.jsx",
  "components",
  "styles",
  "assets",
  "legal",
  "studio",
  "_headers",
  "_redirects",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
];

// scripts/ holds build tooling as well as browser code, so it's named file by file.
const SHIP_FILES = [
  ["scripts/gh-booking.js", "scripts/gh-booking.js"],
];

async function main() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const shipped = [];
  const skipped = [];

  for (const entry of SHIP) {
    const from = join(root, entry);
    if (!existsSync(from)) {
      skipped.push(entry);
      continue;
    }
    await cp(from, join(out, entry), { recursive: true });
    shipped.push(entry);
  }

  for (const [from, to] of SHIP_FILES) {
    const src = join(root, from);
    if (!existsSync(src)) {
      skipped.push(from);
      continue;
    }
    await mkdir(dirname(join(out, to)), { recursive: true });
    await cp(src, join(out, to));
    shipped.push(to);
  }

  // Guard rails. These have burned people on static hosts before.
  const forbidden = [".dev.vars", ".env", "functions", "node_modules", "package.json"];
  for (const name of forbidden) {
    if (existsSync(join(out, name))) {
      throw new Error(`build.mjs tried to publish ${name} — refusing. Fix the allowlist.`);
    }
  }

  if (!existsSync(join(out, "index.html"))) {
    throw new Error("dist/index.html is missing — the site would deploy blank.");
  }

  let count = 0;
  async function tally(dir) {
    for (const name of await readdir(dir)) {
      const full = join(dir, name);
      const info = await stat(full);
      if (info.isDirectory()) await tally(full);
      else count++;
    }
  }
  await tally(out);

  console.log(`Built dist/ — ${count} files`);
  console.log(`  shipped: ${shipped.join(", ")}`);
  if (skipped.length) console.log(`  absent (fine): ${skipped.join(", ")}`);
  console.log("  functions/ deliberately excluded — Pages compiles it from the repo root");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
