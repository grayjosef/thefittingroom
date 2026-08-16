// Checks that the integration hooks survived a Claude Design re-export.
//
// The design is authored in Claude Design and re-exported over components/.
// That export doesn't know about the booking backend, so it will happily
// replace BookingFlow.jsx with the placeholder version and the site will go
// back to inventing appointment times. Run this after every re-export:
//
//   npm run check

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const CHECKS = [
  {
    file: "index.html",
    needs: [
      ["scripts/gh-booking.js", "the integration script tag"],
    ],
    fix: 'Add <script src="scripts/gh-booking.js"></script> before the text/babel tags.',
  },
  {
    file: "components/BookingFlow.jsx",
    needs: [
      ["GH-WIRE", "the integration markers"],
      ["window.GH", "the API calls"],
      ["payAndFinalize", "the real payment path"],
      ["api.hold", "the slot hold"],
      ["mountPayment", "the Stripe Payment Element mount"],
    ],
    fix: "Restore components/BookingFlow.jsx from git: git checkout HEAD -- components/BookingFlow.jsx",
  },
  {
    file: "components/Sections.jsx",
    needs: [
      ["sendInquiry", "the contact form delivery"],
    ],
    fix: "Restore the Contact submit handler: git checkout HEAD -- components/Sections.jsx",
  },
  {
    file: "styles/site.css",
    needs: [
      ["pay-element", "the Payment Element styles"],
    ],
    fix: "Re-append the booking integration block at the end of styles/site.css.",
  },
];

let failed = 0;

for (const check of CHECKS) {
  let source;
  try {
    source = await readFile(join(root, check.file), "utf8");
  } catch {
    console.error(`MISSING  ${check.file}`);
    failed++;
    continue;
  }

  const gone = check.needs.filter(([needle]) => !source.includes(needle));

  if (gone.length === 0) {
    console.log(`ok       ${check.file}`);
    continue;
  }

  failed++;
  console.error(`BROKEN   ${check.file}`);
  for (const [needle, what] of gone) {
    console.error(`         lost ${what}  (looked for "${needle}")`);
  }
  console.error(`         fix: ${check.fix}`);
}

if (failed) {
  console.error(`\n${failed} file(s) lost their wiring. The site will fall back to fake booking data.`);
  process.exit(1);
}

console.log("\nAll integration hooks present.");
