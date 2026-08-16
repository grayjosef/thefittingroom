// What is actually wired up. Safe to hit publicly — it reports which
// integrations are configured, never any of their values.

import { capabilities, loadConfig } from "../_lib/config.js";
import { handler, json } from "../_lib/http.js";

export const onRequestGet = handler(async ({ env }) => {
  const config = loadConfig(env);
  const caps = capabilities(env);

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
    notes: stubbed.length
      ? `Stubbed: ${stubbed.join(", ")}. The site still works; these fall back to designed placeholders.`
      : "All integrations configured.",
  });
});
