# Setup — booking, payment, and studio records

Everything is built and deploys stubbed. Each integration goes live on its own
the moment its variables exist; nothing else changes and nothing breaks in the
meantime. Check state any time at **`/api/health`**.

Variables all live in **Cloudflare → Workers & Pages → `thefittingroom-gh` →
Settings → Variables and secrets**. Mark every one **Encrypted** except
`SITE_URL`. Redeploy after adding them (Deployments → Retry deployment, or just
push a commit).

---

## What's live vs stubbed

| Integration | Without config | With config |
|---|---|---|
| Availability | Synthetic times, deterministic | Real free/busy from Catherine's calendar |
| Payment | Placeholder card fields, no charge | Stripe Payment Element, Link included |
| Calendar write | Skipped | Event created, bride invited |
| Client records | `/studio` shows an empty-state banner | Full roster, dossiers, notes |
| Email | Logged to console | Sent via Resend |

---

## 1. Google — calendar and the record sheet

**Console: <https://console.cloud.google.com>**

1. New project (any name).
2. **APIs & Services → Library** → enable **Google Calendar API** and
   **Google Sheets API**.
3. **OAuth consent screen** → External. App name `The Fitting Room`. Support
   email your own. Add scopes `.../auth/calendar` and `.../auth/spreadsheets`.
4. **Publish the consent screen to "In production."**
   This is the step that matters. An app left in *Testing* issues refresh
   tokens that expire after **7 days** — booking works for a week, then dies
   silently. Publishing makes the token permanent. It will not be Google-verified,
   so Catherine sees an "unverified app" warning once; that is expected and safe.
5. **Credentials → Create credentials → OAuth client ID → Web application.**
   Authorized redirect URI:
   `https://thefittingroom-gh.com/api/google/callback`
6. Save the client ID and secret into Cloudflare as `GOOGLE_OAUTH_CLIENT_ID`
   and `GOOGLE_OAUTH_CLIENT_SECRET`. Add `GOOGLE_SETUP_TOKEN` too — any random
   string, e.g. `node -e "console.log(crypto.randomUUID())"`. Redeploy.

### Connecting Catherine's calendar

The account that approves is the account bookings land on. It **must** be
`cateelizabeth1967@gmail.com`.

Open, signed in as her:

    https://thefittingroom-gh.com/api/google/start?token=<GOOGLE_SETUP_TOKEN>

Approve, and the callback page shows a refresh token. **Do this on your own
machine with her signed in, or sitting beside her** — the token is
password-equivalent and should not travel by text. Paste it into Cloudflare as
`GOOGLE_OAUTH_REFRESH_TOKEN`, encrypted. Redeploy.

The callback warns you if the wrong Google account approved.

> If Google returns no refresh token, that account has approved before. Remove
> the old grant at <https://myaccount.google.com/permissions> and retry.

### The record sheet

Create an empty Google Sheet **on the same account**, copy the ID from its URL
(`docs.google.com/spreadsheets/d/`**`THIS`**`/edit`), set `GOOGLE_SHEET_ID`.
The five tabs — Clients, Appointments, Intake, Notes, Inquiries, Holds — are
created with headers on first write. Don't rename them or reorder columns.

Share it with your own account as Editor so you can read it directly.

---

## 2. Stripe

Catherine opens the account (see the PDF she was sent). Once it exists:

1. **Developers → API keys** → `STRIPE_PUBLISHABLE_KEY` (`pk_live_…`) and
   `STRIPE_SECRET_KEY` (`sk_live_…`).
2. **Developers → Webhooks → Add endpoint**
   URL: `https://thefittingroom-gh.com/api/stripe/webhook`
   Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
3. Redeploy.

Link needs no configuration — it's part of the Payment Element and appears
automatically.

**Test with `sk_test_` / `pk_test_` keys first.** Card `4242 4242 4242 4242`,
any future expiry, any CVC. Point a test-mode webhook at the same URL.

### How payment actually completes

Two paths run and either can win; both are idempotent:

- The browser confirms the card, then calls `/api/booking/finalize`, which
  re-verifies with Stripe server-side before writing anything.
- The webhook arrives independently and finalizes if the browser didn't.

If the calendar write fails after a successful charge, the booking is still
confirmed and flagged `NEEDS_MANUAL_ENTRY` in `/studio`. Money is never taken
without a reservation, and a reservation is never unwound over a calendar error.

---

## 3. Email

Porkbun forwarding receives but cannot send, so outbound needs a provider.

1. Sign up at <https://resend.com>, add `thefittingroom-gh.com`, add the DNS
   records it gives you in Cloudflare (you own the zone — two minutes).
2. `RESEND_API_KEY`, and `NOTIFY_FROM` on the verified domain, e.g.
   `bookings@thefittingroom-gh.com`.
3. `NOTIFY_EMAIL=cateelizabeth1967@gmail.com` — where alerts land today.
   Change to `inquiry@thefittingroom-gh.com` when that mailbox can receive.
   **This is separate from the calendar and changing it affects nothing else.**

---

## 4. Studio records

    STUDIO_PASSWORD=<something she'll actually remember>
    STUDIO_SESSION_SECRET=<node -e "console.log(crypto.randomBytes(32).toString('hex'))">

Then <https://thefittingroom-gh.com/studio>. Sessions last 12 hours. The page is
`noindex` and never cached.

---

## Local development

    cp .dev.vars.example .dev.vars     # fill in what you have
    npm install
    npm run dev                        # http://localhost:3170

`.dev.vars` is git-ignored. With it empty everything runs stubbed, which is the
fastest way to click through the booking flow.

---

## After a Claude Design re-export

The design is authored in Claude Design and re-exported over `components/`.
That export knows nothing about the backend and **will** overwrite
`BookingFlow.jsx` with the placeholder version.

    npm run check

It reports exactly which hooks were lost and how to restore them. Run it before
every push. The integration itself lives in `scripts/gh-booking.js`, which the
export never touches.

Hook points are marked `GH-WIRE` in the source.

---

## Layout

    functions/_lib/      shared server code (not routed, not served)
    functions/api/       the endpoints
    scripts/gh-booking.js   browser-side integration — window.GH
    studio/              private client records UI
    components/          Claude Design export + GH-WIRE hooks

## Endpoints

| Route | Purpose |
|---|---|
| `GET /api/health` | What's live vs stubbed |
| `GET /api/availability?month=YYYY-MM` | Open slot count per day |
| `GET /api/availability?date=YYYY-MM-DD` | Bookable times that day |
| `POST /api/hold` | Reserve a slot for 15 minutes |
| `POST /api/booking` | Save intake, open a PaymentIntent |
| `POST /api/booking/finalize` | Verify payment, write the calendar entry |
| `GET /api/booking/status?id=` | Poll a booking |
| `POST /api/stripe/webhook` | Authoritative confirmation |
| `POST /api/contact` | Inquiry form |
| `GET /api/google/start?token=` | One-time calendar connect |
| `/api/studio/*` | Client records, session-gated |
