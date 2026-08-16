// POST /api/studio/note — add a dated note to a client's timeline.

import { loadConfig } from "../../_lib/config.js";
import { badRequest, fail, handler, json, notFound, readJson, str } from "../../_lib/http.js";
import { addNote, getClient, storeReady } from "../../_lib/store.js";

const KINDS = new Set(["general", "call", "fitting", "measurement", "payment", "timeline"]);

export const onRequestPost = handler(async ({ request, env }) => {
  const config = loadConfig(env);
  if (!storeReady(env, config)) {
    return fail(503, "store_unavailable", "Client records aren't connected yet.");
  }

  const body = await readJson(request);
  const clientId = str(body.clientId, { max: 60 });
  const noteBody = str(body.body, { max: 8000 });

  if (!clientId) return badRequest("Missing client.");
  if (!noteBody) return badRequest("The note is empty.");

  const client = await getClient(env, config, clientId);
  if (!client) return notFound("No such client.");

  const kind = str(body.kind, { max: 20 }).toLowerCase();

  const note = await addNote(env, config, {
    clientId,
    author: str(body.author, { max: 60 }) || "studio",
    kind: KINDS.has(kind) ? kind : "general",
    body: noteBody,
    followUpDate: str(body.followUpDate, { max: 20 }),
  });

  return json({ ok: true, note });
});
