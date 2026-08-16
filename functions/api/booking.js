// POST /api/booking — save her details and open a payment.
//
// Nothing is on the calendar at the end of this. The appointment row exists as
// "pending / unpaid" and only becomes real once the money clears.

import { isSlotBookable } from "../_lib/availability.js";
import { loadConfig } from "../_lib/config.js";
import { badRequest, conflict, email as parseEmail, handler, json, readJson, str, strList } from "../_lib/http.js";
import { createPaymentIntent, stripeConfigured } from "../_lib/stripe.js";
import {
  activeHolds, createAppointment, getHold, holdIsLive, listAppointments,
  saveIntake, storeReady, upsertClient,
} from "../_lib/store.js";
import { longDate, slotLabel } from "../_lib/time.js";
import { bookingReference } from "../_lib/ids.js";

export const onRequestPost = handler(async ({ request, env }) => {
  const config = loadConfig(env);
  const body = await readJson(request);

  const name = str(body.name, { max: 120 });
  const email = parseEmail(body.email);
  const phone = str(body.phone, { max: 40 });
  const holdId = str(body.holdId, { max: 60 });
  const startIso = str(body.startIso, { max: 40 });

  if (!name) return badRequest("Please give your name.");
  if (!email) return badRequest("Please give an email we can send the confirmation to.");
  if (!phone) return badRequest("Please give a phone number.");
  if (!startIso) return badRequest("Pick a time first.");

  const intake = {
    weddingDate: str(body.weddingDate, { max: 40 }),
    purchased: str(body.purchased, { max: 40 }),
    designer: str(body.designer, { max: 160 }),
    shop: str(body.shop, { max: 160 }),
    work: strList(body.work),
    timeline: str(body.timeline, { max: 600 }),
    notes: str(body.notes, { max: 4000 }),
  };

  // Re-check the slot. The hold protects against another booking, but not
  // against Catherine having just blocked the time on her own calendar.
  const context = storeReady(env, config)
    ? {
        // Exclude this booking's own hold, or it blocks itself.
        holds: (await activeHolds(env, config).catch(() => [])).filter((h) => h.id !== holdId),
        appointments: await listAppointments(env, config).catch(() => []),
      }
    : { holds: [], appointments: [] };

  const check = await isSlotBookable(env, config, startIso, context);
  if (!check.ok) return conflict(check.reason);

  const dateLabel = longDate(check.start, config.timezone);
  const timeLabel = slotLabel(check.start, config.timezone);

  // --- no store: demo the flow without persisting anything ---
  if (!storeReady(env, config)) {
    return json({
      ok: true,
      stub: true,
      stubReason: "Client records are not connected yet.",
      appointmentId: "stub_appointment",
      reference: bookingReference(),
      amountCents: config.totalCents,
      currency: config.currency,
      clientSecret: null,
      publishableKey: null,
      dateLabel,
      timeLabel,
    });
  }

  if (holdId) {
    const hold = await getHold(env, config, holdId);
    if (!holdIsLive(hold)) {
      return conflict("That time was held too long and has been released. Please pick a time again.", {
        expired: true,
      });
    }
  }

  const client = await upsertClient(env, config, { name, email, phone, type: "bride" });
  const appointment = await createAppointment(env, config, {
    clientId: client.id,
    holdId,
    startIso: check.start.toISOString(),
    endIso: check.end.toISOString(),
    amountCents: config.totalCents,
  });
  await saveIntake(env, config, { clientId: client.id, appointmentId: appointment.id, intake });

  // --- no Stripe: leave the paywall stubbed but keep the record ---
  if (!stripeConfigured(env)) {
    return json({
      ok: true,
      stub: true,
      stubReason: "Stripe is not connected yet.",
      appointmentId: appointment.id,
      reference: appointment.reference,
      amountCents: config.totalCents,
      currency: config.currency,
      clientSecret: null,
      publishableKey: null,
      dateLabel,
      timeLabel,
    });
  }

  const intent = await createPaymentIntent(env, {
    amountCents: config.totalCents,
    currency: config.currency,
    appointmentId: appointment.id,
    reference: appointment.reference,
    email,
    name,
    description: `${config.appointmentTitle} · ${dateLabel} ${timeLabel} · ${config.studioName}`,
  });

  return json({
    ok: true,
    stub: false,
    appointmentId: appointment.id,
    reference: appointment.reference,
    amountCents: config.totalCents,
    currency: config.currency,
    clientSecret: intent.client_secret,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    dateLabel,
    timeLabel,
  });
});
