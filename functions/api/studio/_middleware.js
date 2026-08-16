// Everything under /api/studio requires a session, except signing in.

import { unauthorized } from "../../_lib/http.js";
import { requireStudio, studioConfigured } from "../../_lib/auth.js";

const PUBLIC_PATHS = new Set(["/api/studio/login", "/api/studio/session"]);

export async function onRequest(context) {
  const { request, next, env } = context;
  const { pathname } = new URL(request.url);

  if (PUBLIC_PATHS.has(pathname)) return next();

  if (!studioConfigured(env)) {
    return unauthorized("The studio area isn't set up yet. Add STUDIO_PASSWORD and STUDIO_SESSION_SECRET.");
  }

  if (!(await requireStudio(context))) return unauthorized();

  return next();
}
