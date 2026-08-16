// Domain operations on top of the sheet. Everything the API routes need to
// read or change lives here, so the routes stay thin and the storage backend
// stays swappable.

import { append, findById, readAll, updateById } from "./sheets.js";
import { googleConfigured } from "./google.js";
import { newId, nowIso, bookingReference } from "./ids.js";

export function storeReady(env, config) {
  return Boolean(config.sheetId && googleConfigured(env));
}

// Guard so a stub-mode deployment answers cleanly instead of throwing.
function requireStore(env, config) {
  if (!storeReady(env, config)) {
    const err = new Error("The client record store isn't connected yet.");
    err.code = "store_unavailable";
    throw err;
  }
  return config.sheetId;
}

// --- holds -----------------------------------------------------------------

export async function activeHolds(env, config) {
  if (!storeReady(env, config)) return [];
  const rows = await readAll(env, config.sheetId, "Holds");
  const now = Date.now();
  return rows.filter((h) => h.status === "active" && new Date(h.expiresIso).getTime() > now);
}

export async function createHold(env, config, { startIso, endIso }) {
  const sheetId = requireStore(env, config);
  const hold = {
    id: newId("hold"),
    created: nowIso(),
    startIso,
    endIso,
    expiresIso: new Date(Date.now() + config.holdMinutes * 60_000).toISOString(),
    status: "active",
  };
  await append(env, sheetId, "Holds", hold);
  return hold;
}

export async function getHold(env, config, id) {
  if (!storeReady(env, config)) return null;
  return findById(env, config.sheetId, "Holds", id);
}

export async function closeHold(env, config, id, status = "consumed") {
  if (!storeReady(env, config) || !id) return null;
  return updateById(env, config.sheetId, "Holds", id, { status });
}

export function holdIsLive(hold) {
  return Boolean(hold && hold.status === "active" && new Date(hold.expiresIso).getTime() > Date.now());
}

// --- clients ---------------------------------------------------------------

export async function listClients(env, config) {
  if (!storeReady(env, config)) return [];
  const rows = await readAll(env, config.sheetId, "Clients");
  return rows.sort((a, b) => String(b.updated || b.created).localeCompare(String(a.updated || a.created)));
}

export async function getClient(env, config, id) {
  if (!storeReady(env, config)) return null;
  return findById(env, config.sheetId, "Clients", id);
}

// Email is the identity key — a returning bride should land on her existing
// record rather than creating a duplicate.
export async function upsertClient(env, config, { name, email, phone, type = "bride", org = "", city = "", source = "website", tags = "" }) {
  const sheetId = requireStore(env, config);
  const rows = await readAll(env, sheetId, "Clients");
  const key = String(email || "").toLowerCase();
  const existing = key ? rows.find((r) => String(r.email).toLowerCase() === key) : null;

  if (existing) {
    const patch = { updated: nowIso() };
    // Only fill gaps — never overwrite a note Catherine has curated by hand.
    if (name && !existing.name) patch.name = name;
    if (phone && !existing.phone) patch.phone = phone;
    if (org && !existing.org) patch.org = org;
    if (city && !existing.city) patch.city = city;
    return updateById(env, sheetId, "Clients", existing.id, patch);
  }

  const client = {
    id: newId("cl"),
    created: nowIso(),
    updated: nowIso(),
    type,
    name,
    org,
    email: key,
    phone,
    city,
    status: "active",
    tags,
    source,
    summary: "",
  };
  await append(env, sheetId, "Clients", client);
  return client;
}

export async function updateClient(env, config, id, patch) {
  const sheetId = requireStore(env, config);
  return updateById(env, sheetId, "Clients", id, { ...patch, updated: nowIso() });
}

export async function createClient(env, config, fields) {
  const sheetId = requireStore(env, config);
  const client = {
    id: newId("cl"),
    created: nowIso(),
    updated: nowIso(),
    type: fields.type || "person",
    name: fields.name || "",
    org: fields.org || "",
    email: String(fields.email || "").toLowerCase(),
    phone: fields.phone || "",
    city: fields.city || "",
    status: fields.status || "active",
    tags: fields.tags || "",
    source: fields.source || "manual",
    summary: fields.summary || "",
  };
  await append(env, sheetId, "Clients", client);
  return client;
}

// --- appointments ----------------------------------------------------------

export async function listAppointments(env, config) {
  if (!storeReady(env, config)) return [];
  return readAll(env, config.sheetId, "Appointments");
}

export async function getAppointment(env, config, id) {
  if (!storeReady(env, config)) return null;
  return findById(env, config.sheetId, "Appointments", id);
}

export async function createAppointment(env, config, { clientId, holdId, startIso, endIso, amountCents }) {
  const sheetId = requireStore(env, config);
  const appointment = {
    id: newId("appt"),
    created: nowIso(),
    clientId,
    holdId: holdId || "",
    startIso,
    endIso,
    timezone: config.timezone,
    status: "pending",
    paymentStatus: "unpaid",
    amountCents: String(amountCents),
    stripeRef: "",
    calendarEventId: "",
    reference: bookingReference(),
  };
  await append(env, sheetId, "Appointments", appointment);
  return appointment;
}

export async function updateAppointment(env, config, id, patch) {
  const sheetId = requireStore(env, config);
  return updateById(env, sheetId, "Appointments", id, patch);
}

// --- intake ----------------------------------------------------------------

export async function saveIntake(env, config, { clientId, appointmentId, intake }) {
  const sheetId = requireStore(env, config);
  const row = {
    id: newId("in"),
    created: nowIso(),
    clientId,
    appointmentId,
    weddingDate: intake.weddingDate || "",
    purchased: intake.purchased || "",
    designer: intake.designer || "",
    shop: intake.shop || "",
    work: Array.isArray(intake.work) ? intake.work.join(" | ") : intake.work || "",
    timeline: intake.timeline || "",
    notes: intake.notes || "",
  };
  await append(env, sheetId, "Intake", row);
  return row;
}

export async function intakeForClient(env, config, clientId) {
  if (!storeReady(env, config)) return [];
  const rows = await readAll(env, config.sheetId, "Intake");
  return rows.filter((r) => r.clientId === clientId);
}

export async function intakeForAppointment(env, config, appointmentId) {
  if (!storeReady(env, config)) return null;
  const rows = await readAll(env, config.sheetId, "Intake");
  return rows.find((r) => r.appointmentId === appointmentId) || null;
}

// --- notes -----------------------------------------------------------------

export async function addNote(env, config, { clientId, author, kind, body, followUpDate }) {
  const sheetId = requireStore(env, config);
  const note = {
    id: newId("note"),
    created: nowIso(),
    clientId,
    author: author || "studio",
    kind: kind || "general",
    body,
    followUpDate: followUpDate || "",
  };
  await append(env, sheetId, "Notes", note);
  await updateById(env, sheetId, "Clients", clientId, { updated: nowIso() });
  return note;
}

export async function notesForClient(env, config, clientId) {
  if (!storeReady(env, config)) return [];
  const rows = await readAll(env, config.sheetId, "Notes");
  return rows
    .filter((r) => r.clientId === clientId)
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
}

export async function allNotes(env, config) {
  if (!storeReady(env, config)) return [];
  return readAll(env, config.sheetId, "Notes");
}

// --- inquiries -------------------------------------------------------------

export async function saveInquiry(env, config, { name, email, message }) {
  const sheetId = requireStore(env, config);
  const row = {
    id: newId("inq"),
    created: nowIso(),
    name,
    email,
    message,
    status: "new",
  };
  await append(env, sheetId, "Inquiries", row);
  return row;
}

export async function listInquiries(env, config) {
  if (!storeReady(env, config)) return [];
  const rows = await readAll(env, config.sheetId, "Inquiries");
  return rows.sort((a, b) => String(b.created).localeCompare(String(a.created)));
}
