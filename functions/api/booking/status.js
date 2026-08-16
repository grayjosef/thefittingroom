// GET /api/booking/status?id=appt_xxx — polled while waiting on the webhook.

import { loadConfig } from "../../_lib/config.js";
import { badRequest, handler, json, notFound } from "../../_lib/http.js";
import { getAppointment, storeReady } from "../../_lib/store.js";
import { longDate, slotLabel } from "../../_lib/time.js";

export const onRequestGet = handler(async ({ request, env }) => {
  const config = loadConfig(env);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("Missing booking id.");

  if (!storeReady(env, config)) {
    return json({ ok: true, stub: true, status: "confirmed" });
  }

  const appointment = await getAppointment(env, config, id);
  if (!appointment) return notFound("We couldn't find that booking.");

  const start = new Date(appointment.startIso);
  return json({
    ok: true,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    reference: appointment.reference,
    dateLabel: longDate(start, config.timezone),
    timeLabel: slotLabel(start, config.timezone),
  });
});
