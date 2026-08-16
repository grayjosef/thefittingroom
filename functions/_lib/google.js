// Google auth via a stored refresh token.
//
// Catherine is on a personal Gmail, not Workspace, so a service account with
// domain-wide delegation isn't available. One refresh token, minted once during
// setup, stands in for it.
//
// The token only stays valid if the OAuth consent screen is PUBLISHED
// ("In production"). Apps left in Testing hand out refresh tokens that expire
// after seven days, and booking dies quietly a week after launch.

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
];

// Access tokens live an hour. Cache per isolate so a burst of requests doesn't
// re-mint one every time.
let cached = { token: null, expiresAt: 0 };

// Where the refresh token lives when the connect flow stores it for us.
export const KV_REFRESH_KEY = "google_refresh_token";
export const KV_ACCOUNT_KEY = "google_account_email";

// True when we have credentials AND somewhere a token could come from.
// Not a promise that a token actually exists yet — see hasRefreshToken.
export function googleConfigured(env) {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      (env.GOOGLE_OAUTH_REFRESH_TOKEN || env.TOKENS)
  );
}

// The refresh token itself. KV is the normal path — the connect flow writes it
// there so it never has to be displayed, copied, or sent to anyone. The env var
// remains supported for anyone who prefers to paste it by hand.
export async function storedRefreshToken(env) {
  if (env.GOOGLE_OAUTH_REFRESH_TOKEN) return env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!env.TOKENS) return null;
  try {
    return await env.TOKENS.get(KV_REFRESH_KEY);
  } catch (err) {
    console.error("Could not read the refresh token from KV:", err);
    return null;
  }
}

export async function hasRefreshToken(env) {
  return Boolean(await storedRefreshToken(env));
}

export async function connectedAccount(env) {
  if (!env.TOKENS) return null;
  try {
    return await env.TOKENS.get(KV_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

export async function accessToken(env) {
  if (!googleConfigured(env)) return null;

  const now = Date.now();
  if (cached.token && cached.expiresAt > now + 60_000) return cached.token;

  const refresh = await storedRefreshToken(env);
  if (!refresh) return null;

  const body = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.access_token) {
    cached = { token: null, expiresAt: 0 };
    const reason = data.error_description || data.error || `HTTP ${res.status}`;
    // invalid_grant almost always means the consent screen was left in Testing
    // and the seven-day clock ran out, or Catherine revoked access.
    throw new GoogleAuthError(
      `Google refused the refresh token (${reason}). Re-run the connect flow at /api/google/start.`
    );
  }

  cached = {
    token: data.access_token,
    expiresAt: now + Number(data.expires_in || 3600) * 1000,
  };
  return cached.token;
}

export class GoogleAuthError extends Error {}
export class GoogleApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Thin fetch wrapper that attaches the bearer token and surfaces Google's own
// error text, which is far more useful than a bare status code.
export async function googleFetch(env, url, init = {}) {
  const token = await accessToken(env);
  if (!token) throw new GoogleAuthError("Google is not connected yet.");

  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      (data && data.error && (data.error.message || data.error)) || `Google API returned ${res.status}`;
    throw new GoogleApiError(String(message), res.status, data);
  }

  return data;
}

// --- one-time connect flow -------------------------------------------------

export function consentUrl(env, { redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    // Both are required to be handed a refresh token at all.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(env, { code, redirectUri }) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID || "",
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GoogleAuthError(data.error_description || data.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function tokenIdentity(accessTokenValue) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${accessTokenValue}` },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}
