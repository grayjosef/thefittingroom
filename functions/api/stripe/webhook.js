// POST /api/stripe/webhook — the authoritative confirmation path.
//
// Stripe retries this for days if we don't answer 2xx, which makes it the
// safety net for the browser-side finalize. Always answer 200 once the
// signature checks out, even on internal failure, or Stripe will hammer us
// while the same error repeats.

import { finalizeAppointment } from "../../_lib/booking.js";
import { loadConfig } from "../../_lib/config.js";
import { json } from "../../_lib/http.js";
import { verifyWebhook } from "../../_lib/stripe.js";
import { closeHold, getAppointment, updateAppointment, storeReady } from "../../_lib/store.js";

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  const config = loadConfig(env);

  if (!env.STRIPE_WEBHOOK_SECRET) {
    // Refuse rather than trust unsigned input.
    return json({ ok: false, error: "Webhook signing secret not configured." }, { status: 503 });
  }

  // Signature is computed over the exact bytes — read as text, never parse first.
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = await verifyWebhook(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn("Rejected Stripe webhook:", err?.message || err);
    return json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }

  if (!storeReady(env, config)) {
    console.warn(`Received ${event.type} but the record store isn't connected.`);
    return json({ received: true, ignored: "store_unavailable" });
  }

  try {
    const intent = event.data?.object || {};
    const appointmentId = intent?.metadata?.appointmentId;

    switch (event.type) {
      case "payment_intent.succeeded": {
        if (!appointmentId) break;
        await finalizeAppointment(env, config, appointmentId, { stripeRef: intent.id, waitUntil });
        break;
      }

      case "payment_intent.payment_failed": {
        if (!appointmentId) break;
        const appointment = await getAppointment(env, config, appointmentId);
        // Only mark a still-pending booking as failed; never touch a confirmed one.
        if (appointment && appointment.status === "pending") {
          await updateAppointment(env, config, appointmentId, { paymentStatus: "failed" });
          // Give the slot straight back rather than waiting out the hold.
          if (appointment.holdId) await closeHold(env, config, appointment.holdId, "released");
        }
        break;
      }

      case "charge.refunded": {
        const ref = intent?.payment_intent;
        if (!ref) break;
        console.log(`Refund recorded for payment ${ref}.`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Logged, but still acknowledged — a retry storm helps nobody.
    console.error(`Failed handling ${event.type}:`, err?.stack || err);
  }

  return json({ received: true });
}
