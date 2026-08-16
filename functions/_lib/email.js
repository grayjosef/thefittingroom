// Transactional mail via Resend.
//
// The domain's MX is Porkbun forwarding, which can receive but cannot send, so
// outbound needs its own provider. Everything here is best-effort: a failed
// email must never roll back a paid booking.

const API = "https://api.resend.com/emails";

export function emailConfigured(env) {
  return Boolean(env.RESEND_API_KEY && env.NOTIFY_FROM);
}

async function send(env, { to, subject, text, replyTo }) {
  if (!emailConfigured(env)) {
    console.log(`[email stub] to=${to} subject=${subject}`);
    return { stub: true };
  }
  if (!to) return { skipped: "no recipient" };

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.NOTIFY_FROM,
        to: [to],
        subject,
        text,
        reply_to: replyTo || undefined,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Resend rejected the message (${res.status}): ${detail}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("Resend request failed:", err);
    return { ok: false };
  }
}

function moneyLine(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function sendBrideConfirmation(env, config, { appointment, client, dateLabel, timeLabel }) {
  const text = [
    `Your consultation is reserved.`,
    ``,
    `${dateLabel}`,
    `${timeLabel} · 30 minutes`,
    `Reference ${appointment.reference}`,
    ``,
    `With Catherine Gray at ${config.studioName}, ${config.studioLocation}.`,
    `The studio address is shared with you directly before your appointment.`,
    ``,
    `Your ${moneyLine(config.feeCents)} booking fee holds this time and is applied toward your`,
    `final alterations bill if you move forward.`,
    ``,
    `You may reschedule once, with at least 24 hours' notice, by replying to this email.`,
    ``,
    `— ${config.studioName}`,
    config.siteUrl,
  ].join("\n");

  return send(env, {
    to: client.email,
    subject: `Your bridal consultation — ${dateLabel}`,
    text,
    replyTo: config.notifyEmail || undefined,
  });
}

export async function sendStudioAlert(env, config, { appointment, client, intake, dateLabel, timeLabel }) {
  const work = intake?.work ? String(intake.work).split(" | ").filter(Boolean).join(", ") : "";
  const text = [
    `New consultation booked.`,
    ``,
    `${dateLabel} at ${timeLabel}`,
    `Reference ${appointment.reference}`,
    ``,
    `${client.name}`,
    `${client.email}`,
    `${client.phone || "no phone given"}`,
    ``,
    intake?.weddingDate ? `Wedding date: ${intake.weddingDate}` : ``,
    intake?.purchased ? `Dress purchased: ${intake.purchased}` : ``,
    intake?.designer ? `Designer / shop: ${intake.designer}` : ``,
    work ? `Work needed: ${work}` : ``,
    intake?.timeline ? `Timeline notes: ${intake.timeline}` : ``,
    intake?.notes ? `\nHer notes:\n${intake.notes}` : ``,
    ``,
    `Paid ${moneyLine(Number(appointment.amountCents) || config.totalCents)}.`,
    `It is already on the calendar.`,
  ]
    .filter((line) => line !== ``)
    .join("\n");

  return send(env, {
    to: config.notifyEmail,
    subject: `Booked: ${client.name} — ${dateLabel} ${timeLabel}`,
    text,
    replyTo: client.email || undefined,
  });
}

export async function sendInquiryAlert(env, config, { name, email, message }) {
  return send(env, {
    to: config.notifyEmail,
    subject: `Website inquiry from ${name}`,
    text: [`${name}`, email, ``, message].join("\n"),
    replyTo: email || undefined,
  });
}
