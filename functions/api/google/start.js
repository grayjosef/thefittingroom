// GET /api/google/start?token=... — begins the one-time calendar connection.
//
// Gated by a setup token so the consent flow can't be kicked off by a stranger.
// Put GOOGLE_SETUP_TOKEN in the Cloudflare environment, then open:
//   https://thefittingroom-gh.com/api/google/start?token=<that value>

import { consentUrl } from "../../_lib/google.js";
import { fail, handler } from "../../_lib/http.js";

function redirectUri(request) {
  return `${new URL(request.url).origin}/api/google/callback`;
}

export const onRequestGet = handler(async ({ request, env }) => {
  const token = new URL(request.url).searchParams.get("token") || "";
  const expected = env.GOOGLE_SETUP_TOKEN || "";

  if (!expected) {
    return fail(503, "not_configured", "Set GOOGLE_SETUP_TOKEN in the environment before running setup.");
  }
  if (token !== expected) {
    return fail(403, "forbidden", "That setup link isn't valid.");
  }
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return fail(503, "not_configured", "Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET first.");
  }

  const url = consentUrl(env, { redirectUri: redirectUri(request), state: expected });
  return Response.redirect(url, 302);
});
