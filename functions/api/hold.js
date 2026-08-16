// POST /api/hold — reserve a slot for the length of the payment step.
//
// This is what stops two brides paying for the same Tuesday at two. The hold is
// short-lived and expires on its own; nothing needs to clean it up.

import { isSlotBookable } from "../_lib/availability.js";
import { loadConfig } from "../_lib/config.js";
import { badRequest, conflict, handler, json, readJson, str } from "../_lib/http.js";
import { activeHolds, createHold, listAppointments, storeReady } from "../_lib/store.js";
import { slotLabel, longDate } from "../_lib/time.js";

export const onRequestPost = handler(async ({ request, env }) => {
  const config = loadConfig(env);
  const body = await readJson(request);
  const startIso = str(body.startIso, { max: 40 });

  if (!startIso) return badRequest("Pick a time first.");

  const context = storeReady(env, config)
    ? {
        holds: await activeHolds(env, config).catch(() => []),
        appointments: await listAppointments(env, config).catch(() => []),
      }
    : { holds: [], appointments: [] };

  const check = await isSlotBookable(env, config, startIso, context);
  if (!check.ok) return conflict(check.reason);

  const start = check.start;
  const end = check.end;

  // Without a store there is nowhere to record the hold. The flow still works —
  // it just can't defend against a simultaneous second booking, which is
  // acceptable while the site is in stub mode and taking no real money.
  if (!storeReady(env, config)) {
    return json({
      ok: true,
      stub: true,
      hold: {
        id: "stub_hold",
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        expiresIso: new Date(Date.now() + config.holdMinutes * 60_000).toISOString(),
      },
      dateLabel: longDate(start, config.timezone),
      timeLabel: slotLabel(start, config.timezone),
    });
  }

  const hold = await createHold(env, config, {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  });

  return json({
    ok: true,
    stub: false,
    hold: {
      id: hold.id,
      startIso: hold.startIso,
      endIso: hold.endIso,
      expiresIso: hold.expiresIso,
    },
    dateLabel: longDate(start, config.timezone),
    timeLabel: slotLabel(start, config.timezone),
  });
});
