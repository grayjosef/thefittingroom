// POST /api/booking/finalize — called by the browser the moment the card clears.
//
// The Stripe webhook is the authoritative path, but it can lag by seconds and
// the bride is staring at a spinner. This verifies the payment directly with
// Stripe and finalizes immediately; the webhook then finds it already done.

import { finalizeAppointment } from "../../_lib/booking.js";
import { loadConfig } from "../../_lib/config.js";
import { badRequest, conflict, handler, json, notFound, readJson, str } from "../../_lib/http.js";
import { retrievePaymentIntent, stripeConfigured } from "../../_lib/stripe.js";
import { getAppointment, storeReady } from "../../_lib/store.js";
import { longDate, slotLabel } from "../../_lib/time.js";

export const onRequestPost = handler(async (context) => {
  const { request, env, waitUntil } = context;
  const config = loadConfig(env);
  const body = await readJson(request);

  const appointmentId = str(body.appointmentId, { max: 60 });
  const paymentIntentId = str(body.paymentIntentId, { max: 120 });

  if (!appointmentId) return badRequest("Missing appointment.");

  // Stub mode: no store and no Stripe, so there is nothing to verify. Report
  // success so the designed confirmation screen still renders.
  if (!storeReady(env, config)) {
    return json({ ok: true, stub: true, status: "confirmed", reference: str(body.reference, { max: 20 }) });
  }

  const appointment = await getAppointment(env, config, appointmentId);
  if (!appointment) return notFound("We couldn't find that booking.");

  if (appointment.status === "confirmed") {
    return json({
      ok: true,
      status: "confirmed",
      alreadyDone: true,
      reference: appointment.reference,
      dateLabel: longDate(new Date(appointment.startIso), config.timezone),
      timeLabel: slotLabel(new Date(appointment.startIso), config.timezone),
    });
  }

  // With Stripe live, never take the browser's word that payment happened.
  if (stripeConfigured(env)) {
    if (!paymentIntentId) return badRequest("Missing payment reference.");

    const intent = await retrievePaymentIntent(env, paymentIntentId);
    if (intent?.metadata?.appointmentId !== appointmentId) {
      return conflict("That payment doesn't belong to this booking.");
    }
    if (intent.status !== "succeeded") {
      return conflict(`Payment hasn't completed yet (${intent.status}).`, { paymentStatus: intent.status });
    }
    if (Number(intent.amount_received) < Number(appointment.amountCents)) {
      return conflict("The amount paid doesn't match the booking fee.");
    }
  }

  const result = await finalizeAppointment(env, config, appointmentId, {
    stripeRef: paymentIntentId,
    waitUntil,
  });

  if (!result.ok) return conflict("We couldn't complete that booking. Please contact the studio.");

  return json({
    ok: true,
    status: "confirmed",
    reference: result.appointment.reference,
    dateLabel: result.dateLabel,
    timeLabel: result.timeLabel,
    // Surfaced so the UI can soften the wording if the calendar write failed.
    calendarFailed: Boolean(result.calendarFailed),
  });
});
