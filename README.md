# The Fitting Room at Gray House

Marketing site for **The Fitting Room at Gray House** — private bridal alterations and custom sewing studio by Catherine Gray in Stevens Point, Wisconsin.

🌐 **Live:** [thefittingroom-gh.com](https://thefittingroom-gh.com)

## What this is

A static, single-page React landing page. The JSX is compiled in the browser via `@babel/standalone` — fast to ship, slow on first paint. See **Future improvements** below for the precompile path.

## Stack

- **React 18** (loaded from unpkg, production build)
- **Babel Standalone** (in-browser JSX compilation)
- **Vanilla CSS** with custom properties (no Tailwind, no preprocessors)
- **Cloudflare Pages** for hosting
- **Acuity Scheduling + Stripe** (planned, not yet integrated)
- **No build step**

## Local development

```bash
# Python (built-in)
python3 -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000`.

## File map

| Path                          | What it is                                                          |
| ----------------------------- | ------------------------------------------------------------------- |
| `index.html`                  | Entry point. Loads React, fonts, then composes app                  |
| `app.jsx`                     | Root composition — Header, sections, footer, booking modal          |
| `components/Logo.jsx`         | Logo image component (uses `/assets/gray-house-logo-ivory.png`)     |
| `components/Sections.jsx`     | All page sections + Footer + MobileDrawer                           |
| `components/BookingFlow.jsx`  | Multi-step booking modal (calendar/intake/payment/confirmation)     |
| `components/Placeholders.jsx` | Striped image placeholder blocks (refined; no fake stock photos)    |
| `components/BCSignature.jsx`  | Bull City Systems "powered by" signature                            |
| `styles/site.css`             | Full design system + section styles                                 |
| `styles/bcs-signature.css`    | Bull City signature styles (theme-aware: dark or light)             |
| `assets/`                     | Logo files and detail imagery                                       |
| `legal/`                      | Standalone policy pages (terms, privacy, cookies, refund, etc.)     |
| `_headers`                    | Cloudflare Pages cache + security headers                           |

## Booking integration

The `BookingFlow` modal currently shows a designed-but-non-functional payment step. Real payment requires Acuity Scheduling + Stripe. See `BOOKING-INTEGRATION.md` (TODO) for the plan.

## Future improvements

- **Precompile the JSX** so Babel doesn't ship to every visitor (~500KB savings, faster first paint). ~30 min job using esbuild.
- **Wire Acuity + Stripe** for real paid booking.
- **Replace placeholder image blocks** with real photography of the studio, fabric details, fittings, etc.
- **Set up Google Workspace email** for `catherine@thefittingroom-gh.com` and aliases (`bookings@`, `hello@`, `info@`).

## License

All rights reserved. © The Fitting Room at Gray House / Catherine Gray.

---

*Built by Bull City Systems · [bullcitysystems.com](https://bullcitysystems.com)*
