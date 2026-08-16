// Turning a paid PaymentIntent into a real appointment.
//
// Called from two places — the browser as soon as the card clears, and the
// Stripe webhook as a backstop. Both paths run the same function and it must be
// safe to run twice for the same appointment, because they routinely race.

import { createEvent } from "./calendar.js";
import { googleConfigured } from "./google.js";
import { sendBrideConfirmation, sendStudioAlert } from "./email.js";
import { longDate, slotLabel } from "./time.js";
import { closeHold, getAppointment, getClient, intakeForAppointment, updateAppointment } from "./store.js";

function describe(config, appointment, client, intake) {
  const work = intake?.work ? String(intake.work).split(" | ").filter(Boolean).join(", ") : "";
  return [
    `Bridal consultation — ${config.slotMinutes} minutes`,
    ``,
    `${client.name}`,
    client.email || "",
    client.phone || "",
    ``,
    intake?.weddingDate ? `Wedding date: ${intake.weddingDate}` : "",
    intake?.purchased ? `Dress purchased: ${intake.purchased}` : "",
    intake?.designer ? `Designer / shop: ${intake.designer}` : "",
    intake?.shop ? `Bought at: ${intake.shop}` : "",
    work ? `Work needed: ${work}` : "",
    intake?.timeline ? `Timeline: ${intake.timeline}` : "",
    intake?.notes ? `\nHer notes:\n${intake.notes}` : "",
    ``,
    `Reference ${appointment.reference}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function finalizeAppointment(env, config, appointmentId, { stripeRef = "", waitUntil } = {}) {
  const appointment = await getAppointment(env, config, appointmentId);
  if (!appointment) return { ok: false, reason: "not_found" };

  // Idempotency gate. Whichever of the two callers arrives second stops here.
  if (appointment.status === "confirmed") {
    return { ok: true, alreadyDone: true, appointment };
  }

  const client = await getClient(env, config, appointment.clientId);
  if (!client) return { ok: false, reason: "client_missing" };

  const intake = await intakeForAppointment(env, config, appointmentId);
  const start = new Date(appointment.startIso);
  const end = new Date(appointment.endIso);

  let calendarEventId = "";
  let calendarFailed = false;

  if (googleConfigured(env)) {
    try {
      const event = await createEvent(env, config, {
        start,
        end,
        summary: `${config.appointmentTitle} — ${client.name}`,
        description: describe(config, appointment, client, intake),
        attendeeEmail: client.email,
        attendeeName: client.name,
      });
      calendarEventId = event?.id || "";
    } catch (err) {
      // She has been charged. Never unwind the booking over a calendar error —
      // record it, confirm anyway, and make sure the studio alert still goes out
      // so Catherine can add it by hand.
      calendarFailed = true;
      console.error(`Calendar write failed for ${appointmentId}:`, err?.message || err);
    }
  }

  const updated = await updateAppointment(env, config, appointmentId, {
    status: "confirmed",
    paymentStatus: "paid",
    stripeRef: stripeRef || appointment.stripeRef || "",
    calendarEventId: calendarFailed ? "NEEDS_MANUAL_ENTRY" : calendarEventId,
  });

  if (appointment.holdId) {
    await closeHold(env, config, appointment.holdId, "consumed").catch(() => {});
  }

  const dateLabel = longDate(start, config.timezone);
  const timeLabel = slotLabel(start, config.timezone);
  const mail = async () => {
    await sendBrideConfirmation(env, config, {
      appointment: updated || appointment, client, dateLabel, timeLabel,
    }).catch((e) => console.error("bride confirmation failed:", e));
    await sendStudioAlert(env, config, {
      appointment: updated || appointment, client, intake, dateLabel, timeLabel,
    }).catch((e) => console.error("studio alert failed:", e));
  };

  // Don't make the bride wait on SMTP before she sees her confirmation screen.
  if (waitUntil) waitUntil(mail());
  else await mail();

  return {
    ok: true,
    appointment: updated || appointment,
    client,
    calendarFailed,
    dateLabel,
    timeLabel,
  };
}
