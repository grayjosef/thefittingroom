// POST /api/studio/login — one shared password, signed cookie back.

import { checkPassword, issueSession, sessionCookie, studioConfigured } from "../../_lib/auth.js";
import { fail, handler, json, readJson, str } from "../../_lib/http.js";

export const onRequestPost = handler(async ({ request, env }) => {
  if (!studioConfigured(env)) {
    return fail(503, "not_configured", "Add STUDIO_PASSWORD and STUDIO_SESSION_SECRET first.");
  }

  const body = await readJson(request);
  const password = str(body.password, { max: 200, trim: false });

  if (!(await checkPassword(env, password))) {
    // Deliberately slow to make guessing tedious.
    await new Promise((r) => setTimeout(r, 400));
    return fail(401, "unauthorized", "That password isn't right.");
  }

  const token = await issueSession(env);
  return json({ ok: true }, { headers: { "set-cookie": sessionCookie(token) } });
});
