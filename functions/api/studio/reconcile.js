// GET  /api/studio/reconcile — find bookings that were paid but never completed.
// POST /api/studio/reconcile — repair them.
//
// Why this exists: a booking is finalized by two independent paths, the browser
// calling back after the card clears and the Stripe webhook arriving. If the
// webhook endpoint does not exist in Stripe — which was the case until it was
// created — the browser is the only path. A bride who closed the tab, lost
// signal, or hit an error at that moment paid in full and got nothing: no
// calendar entry, no confirmation, and nobody at the studio any the wiser.
//
// Money taken without a reservation is the worst failure this system can have,
// and it fails silently. So: list every pending appointment, ask Stripe what
// actually happened to each, and finish the ones that were really paid.

import { finalizeAppointment } from "../../_lib/booking.js";
import { loadConfig } from "../../_lib/config.js";
import { fail, handler, json } from "../../_lib/http.js";
import { findPaymentIntentForAppointment, stripeConfigured } from "../../_lib/stripe.js";
import { getClient, listAppointments, storeReady, updateAppointment } from "../../_lib/store.js";
import { longDate, slotLabel } from "../../_lib/time.js";

async function survey(env, config) {
  const appointments = await listAppointments(env, config);
  const unfinished = appointments.filter((a) => a.status !== "confirmed" && a.status !== "cancelled");

  const rows = [];
  for (const appt of unfinished) {
    const client = await getClient(env, config, appt.clientId).catch(() => null);
    const start = new Date(appt.startIso);

    let payment = null;
    let paid = false;
    if (stripeConfigured(env)) {
      try {
        const intent = await findPaymentIntentForAppointment(env, appt.id);
        if (intent) {
          paid = intent.status === "succeeded";
          payment = {
            id: intent.id,
            status: intent.status,
            amount: intent.amount_received || intent.amount,
          };
        }
      } catch (err) {
        payment = { error: err.message };
      }
    }

    rows.push({
      appointmentId: appt.id,
      reference: appt.reference,
      status: appt.status,
      recordedPayment: appt.paymentStatus,
      name: client?.name || "(unknown)",
      email: client?.email || "",
      phone: client?.phone || "",
      dateLabel: longDate(start, config.timezone),
      timeLabel: slotLabel(start, config.timezone),
      inThePast: start.getTime() < Date.now(),
      payment,
      // The case that matters: her money was taken, she has no appointment.
      paidButNotBooked: paid,
    });
  }
  return rows;
}

export const onRequestGet = handler(async ({ env }) => {
  const config = loadConfig(env);
  if (!storeReady(env, config)) {
    return fail(503, "store_unavailable", "Client records aren't connected.");
  }

  const rows = await survey(env, config);
  const owed = rows.filter((r) => r.paidButNotBooked);

  return json({
    ok: true,
    checked: rows.length,
    paidButNotBooked: owed.length,
    rows,
    summary: owed.length
      ? `${owed.length} booking(s) were paid for but never made it onto the calendar.`
      : rows.length
      ? `${rows.length} unfinished booking(s), none of them paid — abandoned before checkout.`
      : "Nothing unfinished. Every booking completed.",
  });
});

export const onRequestPost = handler(async (context) => {
  const { env, waitUntil } = context;
  const config = loadConfig(env);
  if (!storeReady(env, config)) {
    return fail(503, "store_unavailable", "Client records aren't connected.");
  }

  const rows = await survey(env, config);
  const repairs = [];

  for (const row of rows) {
    if (!row.paidButNotBooked) continue;

    // An appointment whose time has already passed must not be written onto the
    // calendar as though it were upcoming. Flag it for a human instead — she
    // needs to ring that bride and apologise, not discover a ghost booking.
    if (row.inThePast) {
      await updateAppointment(env, config, row.appointmentId, {
        paymentStatus: "paid",
        status: "missed_contact_required",
        stripeRef: row.payment?.id || "",
      }).catch(() => {});
      repairs.push({
        ...row,
        action: "flagged",
        detail: "Paid, but the slot has already passed. Contact her directly — do not re-book silently.",
      });
      continue;
    }

    const result = await finalizeAppointment(env, config, row.appointmentId, {
      stripeRef: row.payment?.id || "",
      waitUntil,
    });

    repairs.push({
      ...row,
      action: result.ok ? "booked" : "failed",
      detail: result.ok
        ? `Added to the calendar for ${result.dateLabel} at ${result.timeLabel}.${
            result.calendarFailed ? " Calendar write failed — add it by hand." : ""
          }`
        : `Could not complete: ${result.reason}`,
    });
  }

  return json({
    ok: true,
    repaired: repairs.filter((r) => r.action === "booked").length,
    flagged: repairs.filter((r) => r.action === "flagged").length,
    failed: repairs.filter((r) => r.action === "failed").length,
    repairs,
    summary: repairs.length
      ? `${repairs.length} paid booking(s) handled.`
      : "Nothing to repair — no paid booking is missing from the calendar.",
  });
});
