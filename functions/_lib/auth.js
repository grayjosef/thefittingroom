// Session handling for the private studio area.
//
// One shared password, an HMAC-signed cookie, no user table. That is the right
// size for a two-person studio; it is not the right size for anything with
// per-person accounts, so don't grow it into one.

const COOKIE = "gh_studio";
const TTL_SECONDS = 60 * 60 * 12;

function b64urlEncode(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64urlEncode(sig);
}

export function studioConfigured(env) {
  return Boolean(env.STUDIO_PASSWORD && env.STUDIO_SESSION_SECRET);
}

export async function checkPassword(env, candidate) {
  const expected = String(env.STUDIO_PASSWORD || "");
  if (!expected) return false;
  // Hash both sides first so the comparison is length-independent.
  const a = await hmac(env.STUDIO_SESSION_SECRET || "x", `pw:${candidate}`);
  const b = await hmac(env.STUDIO_SESSION_SECRET || "x", `pw:${expected}`);
  return timingSafeEqual(a, b);
}

export async function issueSession(env) {
  const payload = b64urlEncode(
    new TextEncoder().encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }))
  );
  const sig = await hmac(env.STUDIO_SESSION_SECRET, payload);
  return `${payload}.${sig}`;
}

export async function verifySession(env, token) {
  if (!token || !env.STUDIO_SESSION_SECRET) return false;
  const [payload, sig] = String(token).split(".");
  if (!payload || !sig) return false;

  const expected = await hmac(env.STUDIO_SESSION_SECRET, payload);
  if (!timingSafeEqual(sig, expected)) return false;

  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    return Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function readCookie(request, name = COOKIE) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export function sessionCookie(value, { clear = false } = {}) {
  const attrs = [
    `${COOKIE}=${clear ? "" : value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    clear ? "Max-Age=0" : `Max-Age=${TTL_SECONDS}`,
  ];
  return attrs.join("; ");
}

export async function requireStudio(context) {
  const { request, env } = context;
  if (!studioConfigured(env)) return false;
  return verifySession(env, readCookie(request));
}
