# Design facelift — 2026-10-28

Visual-only pass. **No wiring changed.**

## Untouched (booking, payments, admin)
- `functions/` (all API, Stripe, Google, studio admin)
- `scripts/gh-booking.js`, `scripts/verify-wiring.mjs`
- `components/BookingFlow.jsx`, `components/BCSignature.jsx`, `components/gallery-items.js`, `components/Placeholders.jsx`
- `studio/`, `legal/`, `build.mjs`, `package*.json`, `_headers`, `robots.txt`, `sitemap.xml`
- The Contact form's `/api/contact` submit handler and honeypot are unchanged, as are the "Book" buttons, which still call `openBooking()` into the same modal.

## Changed
- `styles/site.css`: three style layers appended at the end of the file. The original rules above them are unchanged, so removing the layers reverts the facelift.
- `components/Sections.jsx`: layout and markup only. Header (needle-and-thread menu), Hero, Quiet, Services (consultation panel plus an expand-on-click list), About, Booking copy, the drawer, and copy glitch fixes.
- `components/Logo.jsx`: points at the new emblem and fixes the image's alt text.
- `components/Gallery.jsx`: one copy glitch fix.
- `app.jsx`: the page is wrapped in `.page-shell` for the push drawer, and the NowAccepting section is removed (its text now sits in the Hero). `BookingFlow` and the mobile CTA bar stay **outside** the shell, so their fixed positioning is unaffected.
- `index.html`: logo, favicon, and social-sharing image now use `assets/gray-house-logo-2026.png`. Cache numbers bumped to `?v=7`.

## New assets
- `assets/gray-house-logo-2026.png`: ivory emblem (live)
- `assets/gray-house-logo-2026-gold.png`: gold emblem (backup)
- `assets/contact-bride.jpg`: **not included yet.** Add it when ready. Until then the Contact banner falls back to `studio-detail.png` automatically.

## Before deploy
1. Compress `gray-house-logo-2026.png` (1.3 MB). A WebP version about 1000px wide is ideal.
2. Run `node scripts/verify-wiring.mjs` as usual.
3. The favicon is the full emblem, which won't read at small sizes. Swap in a simple mark when one exists.
