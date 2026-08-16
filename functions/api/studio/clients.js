// GET  /api/studio/clients — the roster, with enough context to triage at a glance.
// POST /api/studio/clients — add a record by hand (a boutique, a vendor, a walk-in).

import { loadConfig } from "../../_lib/config.js";
import { badRequest, email as parseEmail, fail, handler, json, readJson, str } from "../../_lib/http.js";
import { allNotes, createClient, listAppointments, listClients, storeReady } from "../../_lib/store.js";
import { longDate, slotLabel } from "../../_lib/time.js";

const VALID_TYPES = new Set(["bride", "person", "business", "boutique", "vendor"]);

export const onRequestGet = handler(async ({ env }) => {
  const config = loadConfig(env);
  if (!storeReady(env, config)) {
    return json({ ok: true, stub: true, clients: [], reason: "Client records aren't connected yet." });
  }

  const [clients, appointments, notes] = await Promise.all([
    listClients(env, config),
    listAppointments(env, config),
    allNotes(env, config),
  ]);

  const now = Date.now();

  const enriched = clients.map((client) => {
    const mine = appointments
      .filter((a) => a.clientId === client.id)
      .sort((a, b) => String(a.startIso).localeCompare(String(b.startIso)));

    const upcoming = mine.find((a) => a.status === "confirmed" && new Date(a.startIso).getTime() > now);
    const past = mine.filter((a) => new Date(a.startIso).getTime() <= now);
    const lastNote = notes
      .filter((n) => n.clientId === client.id)
      .sort((a, b) => String(b.created).localeCompare(String(a.created)))[0];

    const lastTouch = [client.updated, lastNote?.created, past[past.length - 1]?.startIso]
      .filter(Boolean)
      .sort()
      .pop();

    return {
      id: client.id,
      type: client.type,
      name: client.name,
      org: client.org,
      email: client.email,
      phone: client.phone,
      status: client.status,
      tags: client.tags,
      summary: client.summary,
      appointmentCount: mine.length,
      noteCount: notes.filter((n) => n.clientId === client.id).length,
      nextAppointment: upcoming
        ? {
            startIso: upcoming.startIso,
            dateLabel: longDate(new Date(upcoming.startIso), config.timezone),
            timeLabel: slotLabel(new Date(upcoming.startIso), config.timezone),
          }
        : null,
      lastTouch: lastTouch || client.created,
      // Days since anything happened — the "am I lost in the sauce" signal.
      daysQuiet: lastTouch ? Math.floor((now - new Date(lastTouch).getTime()) / 86_400_000) : null,
    };
  });

  return json({ ok: true, stub: false, clients: enriched });
});

export const onRequestPost = handler(async ({ request, env }) => {
  const config = loadConfig(env);
  if (!storeReady(env, config)) {
    return fail(503, "store_unavailable", "Connect the client sheet first.");
  }

  const body = await readJson(request);
  const name = str(body.name, { max: 120 });
  if (!name) return badRequest("A name is required.");

  const type = str(body.type, { max: 20 }).toLowerCase();

  const client = await createClient(env, config, {
    name,
    type: VALID_TYPES.has(type) ? type : "person",
    org: str(body.org, { max: 160 }),
    email: parseEmail(body.email),
    phone: str(body.phone, { max: 40 }),
    city: str(body.city, { max: 120 }),
    tags: str(body.tags, { max: 200 }),
    summary: str(body.summary, { max: 1000 }),
    source: "manual",
  });

  return json({ ok: true, client });
});
