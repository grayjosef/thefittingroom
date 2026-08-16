// What is actually wired up. Safe to hit publicly — it reports which
// integrations are configured, never any of their values.

import { capabilities, loadConfig } from "../_lib/config.js";
import { connectedAccount, hasRefreshToken } from "../_lib/google.js";
import { handler, json } from "../_lib/http.js";

export const onRequestGet = handler(async ({ env }) => {
  const config = loadConfig(env);
  const caps = capabilities(env);

  // Credentials being present isn't the same as being connected — the consent
  // flow may not have been run yet. Report the difference plainly.
  const tokenPresent = await hasRefreshToken(env);
  caps.google = caps.google && tokenPresent;
  caps.sheets = caps.sheets && tokenPresent;

  const live = Object.entries(caps).filter(([, v]) => v).map(([k]) => k);
  const stubbed = Object.entries(caps).filter(([, v]) => !v).map(([k]) => k);

  return json({
    ok: true,
    mode: caps.google && caps.stripe ? "live" : "partial",
    integrations: caps,
    live,
    stubbed,
    booking: {
      feeCents: config.feeCents,
      processingCents: config.processingCents,
      totalCents: config.totalCents,
      currency: config.currency,
      slotMinutes: config.slotMinutes,
      leadHours: config.leadHours,
      holdMinutes: config.holdMinutes,
      timezone: config.timezone,
    },
    google: {
      tokenStorage: env.TOKENS ? "kv" : env.GOOGLE_OAUTH_REFRESH_TOKEN ? "env" : "none",
      connected: tokenPresent,
      // Recorded at connect time. If it's null on an otherwise-working
      // connection, the account was recorded before identity lookup worked —
      // reconnect to fill it in, or confirm by booking a test appointment and
      // seeing which calendar it lands on.
      account: (await connectedAccount(env)) || null,
      calendarId: config.calendarId,
    },
    notes: stubbed.length
      ? `Stubbed: ${stubbed.join(", ")}. The site still works; these fall back to designed placeholders.`
      : "All integrations configured.",
  });
});
