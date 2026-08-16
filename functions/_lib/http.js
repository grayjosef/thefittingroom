// Small response helpers. Every API route answers JSON and is never cached.

const BASE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { ...BASE_HEADERS, ...(init.headers || {}) },
  });
}

export function ok(data = {}) {
  return json({ ok: true, ...data });
}

export function fail(status, code, message, extra = {}) {
  return json({ ok: false, error: { code, message, ...extra } }, { status });
}

export const badRequest = (message, extra) => fail(400, "bad_request", message, extra);
export const unauthorized = (message = "Sign in required.") => fail(401, "unauthorized", message);
export const notFound = (message = "Not found.") => fail(404, "not_found", message);
export const conflict = (message, extra) => fail(409, "conflict", message, extra);
export const tooMany = (message = "Slow down a moment.") => fail(429, "rate_limited", message);
export const serverError = (message = "Something went wrong on our end.") =>
  fail(500, "server_error", message);

// Body parsing with a hard ceiling, so a malicious payload can't chew CPU time.
const MAX_BODY_BYTES = 32 * 1024;

export async function readJson(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "That request was too large.");
  }
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new HttpError(400, "bad_request", "Expected a JSON object.");
    }
    return parsed;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, "bad_request", "That request wasn't valid JSON.");
  }
}

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
  toResponse() {
    return fail(this.status, this.code, this.message, this.extra);
  }
}

// Wraps a handler so thrown HttpErrors become clean responses and anything
// unexpected becomes a 500 without leaking a stack trace to the browser.
export function handler(fn) {
  return async (context) => {
    try {
      return await fn(context);
    } catch (err) {
      if (err instanceof HttpError) return err.toResponse();
      console.error("Unhandled API error:", err && err.stack ? err.stack : err);
      return serverError();
    }
  };
}

export function methodNotAllowed(allowed = []) {
  return json(
    { ok: false, error: { code: "method_not_allowed", message: "That method isn't allowed here." } },
    { status: 405, headers: { allow: allowed.join(", ") } }
  );
}

// Basic field helpers — the booking form is public, so nothing is trusted.
export function str(value, { max = 500, trim = true } = {}) {
  if (value === undefined || value === null) return "";
  let s = String(value);
  if (trim) s = s.trim();
  return s.slice(0, max);
}

export function email(value) {
  const s = str(value, { max: 254 }).toLowerCase();
  // Deliberately permissive: reject the obviously broken, let Stripe and the
  // mail provider be the real judge.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : "";
}

export function strList(value, { max = 30, itemMax = 80 } = {}) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map((v) => str(v, { max: itemMax })).filter(Boolean);
}
