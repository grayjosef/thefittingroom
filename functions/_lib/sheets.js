// Google Sheets as the datastore.
//
// Chosen deliberately: the studio does a handful of bookings a week, and it
// means Catherine can open her own client list in a spreadsheet without anyone
// building her a viewer. The tradeoff is no transactions and no indexes — so
// every write is append-only where possible, and reads are whole-tab.
//
// If this ever outgrows a few thousand rows, swap this module for Postgres and
// nothing above it changes.

import { googleFetch } from "./google.js";

const API = "https://sheets.googleapis.com/v4/spreadsheets";

export const TABS = {
  Clients: [
    "id", "created", "updated", "type", "name", "org", "email", "phone",
    "city", "status", "tags", "source", "summary",
  ],
  Appointments: [
    "id", "created", "clientId", "holdId", "startIso", "endIso", "timezone", "status",
    "paymentStatus", "amountCents", "stripeRef", "calendarEventId", "reference",
  ],
  Intake: [
    "id", "created", "clientId", "appointmentId", "weddingDate", "purchased",
    "designer", "shop", "work", "timeline", "notes",
  ],
  Notes: ["id", "created", "clientId", "author", "kind", "body", "followUpDate"],
  Inquiries: ["id", "created", "name", "email", "message", "status"],
  Holds: ["id", "created", "startIso", "endIso", "expiresIso", "status"],
};

function columnLetter(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function lastColumn(tab) {
  return columnLetter(TABS[tab].length - 1);
}

function range(tab, a1) {
  return encodeURIComponent(`${tab}!${a1}`);
}

function toRow(tab, obj) {
  return TABS[tab].map((key) => {
    const v = obj[key];
    if (v === undefined || v === null) return "";
    if (Array.isArray(v)) return v.join(" | ");
    return String(v);
  });
}

function fromRow(tab, row, rowNumber) {
  const out = { _row: rowNumber };
  TABS[tab].forEach((key, i) => {
    out[key] = row[i] === undefined ? "" : row[i];
  });
  return out;
}

// --- schema bootstrap ------------------------------------------------------

// Creates any missing tab and writes its header row. Safe to call repeatedly;
// called lazily on first write rather than on every request.
export async function ensureSchema(env, sheetId) {
  const meta = await googleFetch(env, `${API}/${sheetId}?fields=sheets.properties.title`);
  const existing = new Set((meta?.sheets || []).map((s) => s.properties?.title));

  const missing = Object.keys(TABS).filter((tab) => !existing.has(tab));
  if (!missing.length) return { created: [] };

  await googleFetch(env, `${API}/${sheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: missing.map((title) => ({
        addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } },
      })),
    }),
  });

  await googleFetch(env, `${API}/${sheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: missing.map((tab) => ({
        range: `${tab}!A1:${lastColumn(tab)}1`,
        values: [TABS[tab]],
      })),
    }),
  });

  return { created: missing };
}

let schemaChecked = false;

async function withSchema(env, sheetId) {
  if (schemaChecked) return;
  await ensureSchema(env, sheetId);
  schemaChecked = true;
}

// --- reads and writes ------------------------------------------------------

export async function readAll(env, sheetId, tab) {
  await withSchema(env, sheetId);
  const data = await googleFetch(
    env,
    `${API}/${sheetId}/values/${range(tab, `A2:${lastColumn(tab)}`)}?majorDimension=ROWS`
  );
  const rows = data?.values || [];
  // Row 1 is the header, so sheet row number is index + 2.
  return rows.map((row, i) => fromRow(tab, row, i + 2)).filter((r) => r.id);
}

export async function append(env, sheetId, tab, obj) {
  await withSchema(env, sheetId);
  await googleFetch(
    env,
    `${API}/${sheetId}/values/${range(tab, `A:${lastColumn(tab)}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [toRow(tab, obj)] }) }
  );
  return obj;
}

export async function findById(env, sheetId, tab, id) {
  if (!id) return null;
  const rows = await readAll(env, sheetId, tab);
  return rows.find((r) => r.id === id) || null;
}

export async function updateById(env, sheetId, tab, id, patch) {
  const current = await findById(env, sheetId, tab, id);
  if (!current) return null;
  const merged = { ...current, ...patch };
  await googleFetch(
    env,
    `${API}/${sheetId}/values/${range(tab, `A${current._row}:${lastColumn(tab)}${current._row}`)}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: [toRow(tab, merged)] }) }
  );
  return merged;
}
