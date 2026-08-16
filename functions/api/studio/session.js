// GET  /api/studio/session — is this browser signed in?
// POST /api/studio/session — sign out.

import { requireStudio, sessionCookie, studioConfigured } from "../../_lib/auth.js";
import { handler, json } from "../../_lib/http.js";

export const onRequestGet = handler(async (context) => {
  const configured = studioConfigured(context.env);
  return json({
    ok: true,
    configured,
    signedIn: configured ? await requireStudio(context) : false,
  });
});

export const onRequestPost = handler(async () =>
  json({ ok: true, signedOut: true }, { headers: { "set-cookie": sessionCookie("", { clear: true }) } })
);
