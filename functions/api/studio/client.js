// GET   /api/studio/client?id=cl_xxx — the full dossier.
// PATCH /api/studio/client?id=cl_xxx — edit the standing summary and details.
//
// This is the "so I'm not lost in the sauce" view: everything known about one
// person or business, newest first, in a single request.

import { loadConfig } from "../../_lib/config.js";
import { badRequest, email as parseEmail, fail, handler, json, notFound, readJson, str } from "../../_lib/http.js";
import {
  getClient, intakeForClient, listAppointments, notesForClient, storeReady, updateClient,
} from "../../_lib/store.js";
import { longDate, slotLabel } from "../../_lib/time.js";

export const onRequestGet = handler(async ({ request, env }) => {
  const config = loadConfig(env);
  if (!storeReady(env, config)) {
    return fail(503, "store_unavailable", "Client records aren't connected yet.");
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("Missing client id.");

  const client = await getClient(env, config, id);
  if (!client) return notFound("No such client.");

  const [notes, intake, appointments] = await Promise.all([
    notesForClient(env, config, id),
    intakeForClient(env, config, id),
    listAppointments(env, config),
  ]);

  const mine = appointments
    .filter((a) => a.clientId === id)
    .sort((a, b) => String(b.startIso).localeCompare(String(a.startIso)))
    .map((a) => ({
      id: a.id,
      startIso: a.startIso,
      dateLabel: longDate(new Date(a.startIso), config.timezone),
      timeLabel: slotLabel(new Date(a.startIso), config.timezone),
      status: a.status,
      paymentStatus: a.paymentStatus,
      reference: a.reference,
      amountCents: Number(a.amountCents) || 0,
      needsManualCalendarEntry: a.calendarEventId === "NEEDS_MANUAL_ENTRY",
    }));

  return json({
    ok: true,
    client,
    appointments: mine,
    // Intake answers, newest first — what she told us about the gown.
    intake: intake.sort((a, b) => String(b.created).localeCompare(String(a.created))).map((r) => ({
      ...r,
      work: String(r.work || "").split(" | ").filter(Boolean),
    })),
    notes,
  });
});

export const onRequestPatch = handler(async ({ request, env }) => {
  const config = loadConfig(env);
  if (!storeReady(env, config)) {
    return fail(503, "store_unavailable", "Client records aren't connected yet.");
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("Missing client id.");

  const existing = await getClient(env, config, id);
  if (!existing) return notFound("No such client.");

  const body = await readJson(request);
  const patch = {};

  // Only touch fields that were actually sent, so a partial save can't blank
  // out something Catherine wrote earlier.
  if ("name" in body) patch.name = str(body.name, { max: 120 });
  if ("org" in body) patch.org = str(body.org, { max: 160 });
  if ("email" in body) patch.email = parseEmail(body.email);
  if ("phone" in body) patch.phone = str(body.phone, { max: 40 });
  if ("city" in body) patch.city = str(body.city, { max: 120 });
  if ("status" in body) patch.status = str(body.status, { max: 40 });
  if ("tags" in body) patch.tags = str(body.tags, { max: 200 });
  if ("type" in body) patch.type = str(body.type, { max: 20 }).toLowerCase();
  if ("summary" in body) patch.summary = str(body.summary, { max: 2000 });

  if (!Object.keys(patch).length) return badRequest("Nothing to change.");

  const client = await updateClient(env, config, id, patch);
  return json({ ok: true, client });
});
