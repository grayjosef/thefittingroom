// Stripe over plain fetch — no SDK, so the project keeps its no-build promise.
//
// Payment Element is used rather than hosted Checkout so the designed payment
// screen survives. Link rides along with it automatically: enabling
// automatic_payment_methods is all that's required.

const API = "https://api.stripe.com/v1";

export function stripeConfigured(env) {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY);
}

// Stripe's API is form-encoded, including nested structures.
function encodeForm(obj, prefix = "", params = new URLSearchParams()) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    const field = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && !Array.isArray(value)) {
      encodeForm(value, field, params);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => params.append(`${field}[${i}]`, String(v)));
    } else {
      params.append(field, String(value));
    }
  }
  return params;
}

async function stripeFetch(env, path, { method = "POST", body, idempotencyKey } = {}) {
  const headers = {
    authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? encodeForm(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe returned ${res.status}`;
    throw new StripeError(msg, res.status, data?.error);
  }
  return data;
}

export class StripeError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function createPaymentIntent(env, { amountCents, currency, appointmentId, reference, email, name, description }) {
  return stripeFetch(env, "/payment_intents", {
    body: {
      amount: amountCents,
      currency,
      automatic_payment_methods: { enabled: true },
      description,
      receipt_email: email || undefined,
      // Metadata is how the webhook finds its way back to our appointment row.
      metadata: { appointmentId, reference, name: name || "" },
    },
    // Retrying the same appointment must not create a second charge.
    idempotencyKey: `pi_${appointmentId}`,
  });
}

export async function retrievePaymentIntent(env, id) {
  return stripeFetch(env, `/payment_intents/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function refundPaymentIntent(env, id, reason = "requested_by_customer") {
  return stripeFetch(env, "/refunds", {
    body: { payment_intent: id, reason },
    idempotencyKey: `re_${id}`,
  });
}

// --- webhook signature verification ---------------------------------------

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_TOLERANCE_SECONDS = 300;

// Verifies the Stripe-Signature header against the raw request body.
// The body MUST be the untouched text — re-serialising parsed JSON changes the
// bytes and the signature will never match.
export async function verifyWebhook(rawBody, signatureHeader, secret, toleranceSeconds = DEFAULT_TOLERANCE_SECONDS) {
  if (!signatureHeader || !secret) {
    throw new StripeError("Missing webhook signature or signing secret.", 400);
  }

  let timestamp = null;
  const signatures = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    else if (key === "v1") signatures.push(value);
  }

  if (!timestamp || !signatures.length) {
    throw new StripeError("Malformed Stripe signature header.", 400);
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    throw new StripeError("Webhook timestamp outside tolerance — possible replay.", 400);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  );
  const expected = toHex(mac);

  if (!signatures.some((sig) => timingSafeEqual(sig, expected))) {
    throw new StripeError("Webhook signature did not match.", 400);
  }

  return JSON.parse(rawBody);
}
