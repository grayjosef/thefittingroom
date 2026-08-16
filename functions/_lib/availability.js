// Turning Catherine's calendar into bookable slots.

import { freeBusy } from "./calendar.js";
import { googleConfigured } from "./google.js";
import {
  addMinutes, daysInMonth, overlaps, parseHm, slotLabel, ymd, zonedParts, zonedToUtc,
} from "./time.js";

// Candidate starts for one local date, before anything is subtracted.
function candidatesForDate(config, { year, month, day }) {
  const probe = zonedToUtc(year, month, day, 12, 0, config.timezone);
  const weekday = zonedParts(probe, config.timezone).weekday;
  const windows = config.windows[weekday] || [];

  const slots = [];
  for (const [openStr, closeStr] of windows) {
    const open = parseHm(openStr);
    const close = parseHm(closeStr);
    if (!open || !close) continue;

    const closeAt = zonedToUtc(year, month, day, close.hour, close.minute, config.timezone);
    let start = zonedToUtc(year, month, day, open.hour, open.minute, config.timezone);

    // Studio hours sit well clear of the 2am DST shift, so stepping in UTC
    // inside a single window is safe.
    while (addMinutes(start, config.slotMinutes) <= closeAt) {
      slots.push({ start, end: addMinutes(start, config.slotMinutes) });
      start = addMinutes(start, config.slotMinutes);
    }
  }
  return slots.sort((a, b) => a.start - b.start);
}

// Stub availability for when Google isn't connected yet. Deterministic, so the
// design demos identically on every load, and clearly marked as not real.
function stubBusy(slots) {
  return slots.filter((_, i) => i % 4 === 1).map((s) => ({ start: s.start, end: s.end }));
}

function windowForRange(config, startDate, endDate) {
  return {
    timeMin: zonedToUtc(startDate.year, startDate.month, startDate.day, 0, 0, config.timezone),
    timeMax: addMinutes(
      zonedToUtc(endDate.year, endDate.month, endDate.day, 0, 0, config.timezone),
      24 * 60
    ),
  };
}

// Blocks that make a slot unavailable, from every source we know about.
async function gatherBusy(env, config, timeMin, timeMax, { holds = [], appointments = [] } = {}) {
  const busy = [];

  if (googleConfigured(env)) {
    busy.push(...(await freeBusy(env, config, timeMin, timeMax)));
  }

  const now = Date.now();
  for (const hold of holds) {
    if (hold.status !== "active") continue;
    if (new Date(hold.expiresIso).getTime() <= now) continue;
    busy.push({ start: new Date(hold.startIso), end: new Date(hold.endIso) });
  }

  // Confirmed appointments are already on the calendar, but this covers the
  // window where a calendar write failed and we'd otherwise resell the slot.
  for (const appt of appointments) {
    if (appt.status !== "confirmed") continue;
    busy.push({ start: new Date(appt.startIso), end: new Date(appt.endIso) });
  }

  return busy;
}

function isFree(slot, busy, bufferMinutes) {
  const start = bufferMinutes ? addMinutes(slot.start, -bufferMinutes) : slot.start;
  const end = bufferMinutes ? addMinutes(slot.end, bufferMinutes) : slot.end;
  return !busy.some((b) => overlaps(start, end, b.start, b.end));
}

function bookableBounds(config) {
  const now = Date.now();
  return {
    earliest: new Date(now + config.leadHours * 3600_000),
    latest: new Date(now + config.maxDaysAhead * 86_400_000),
  };
}

// --- public API ------------------------------------------------------------

export async function slotsForDate(env, config, { year, month, day }, context = {}) {
  const candidates = candidatesForDate(config, { year, month, day });
  if (!candidates.length) return [];

  const { earliest, latest } = bookableBounds(config);
  const inRange = candidates.filter((s) => s.start >= earliest && s.start <= latest);
  if (!inRange.length) return [];

  const timeMin = inRange[0].start;
  const timeMax = inRange[inRange.length - 1].end;

  const busy = googleConfigured(env)
    ? await gatherBusy(env, config, timeMin, timeMax, context)
    : [...stubBusy(candidates), ...(await gatherBusy(env, config, timeMin, timeMax, context))];

  return inRange
    .filter((slot) => isFree(slot, busy, config.bufferMinutes))
    .map((slot) => ({
      startIso: slot.start.toISOString(),
      endIso: slot.end.toISOString(),
      label: slotLabel(slot.start, config.timezone),
    }));
}

// Per-day open counts for a whole month, in a single freeBusy call.
export async function availabilityForMonth(env, config, year, month, context = {}) {
  const total = daysInMonth(year, month);
  const first = { year, month, day: 1 };
  const last = { year, month, day: total };
  const { timeMin, timeMax } = windowForRange(config, first, last);

  const busy = await gatherBusy(env, config, timeMin, timeMax, context);
  const { earliest, latest } = bookableBounds(config);

  const days = {};
  for (let day = 1; day <= total; day++) {
    const candidates = candidatesForDate(config, { year, month, day });
    if (!candidates.length) {
      days[ymd(year, month, day)] = 0;
      continue;
    }
    const dayBusy = googleConfigured(env) ? busy : [...busy, ...stubBusy(candidates)];
    const open = candidates.filter(
      (slot) =>
        slot.start >= earliest && slot.start <= latest && isFree(slot, dayBusy, config.bufferMinutes)
    );
    days[ymd(year, month, day)] = open.length;
  }

  return days;
}

// Confirms a specific start time is still genuinely bookable. Called again at
// hold time and at payment time — availability is advisory until the moment
// money moves.
export async function isSlotBookable(env, config, startIso, context = {}) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return { ok: false, reason: "That isn't a valid time." };

  const { earliest, latest } = bookableBounds(config);
  if (start < earliest) {
    return { ok: false, reason: `Consultations need at least ${config.leadHours} hours' notice.` };
  }
  if (start > latest) {
    return { ok: false, reason: "That date is too far ahead to book yet." };
  }

  const parts = zonedParts(start, config.timezone);
  const candidates = candidatesForDate(config, parts);
  const match = candidates.find((s) => s.start.getTime() === start.getTime());
  if (!match) {
    return { ok: false, reason: "The studio isn't open at that time." };
  }

  const busy = googleConfigured(env)
    ? await gatherBusy(env, config, match.start, match.end, context)
    : [...stubBusy(candidates), ...(await gatherBusy(env, config, match.start, match.end, context))];

  if (!isFree(match, busy, config.bufferMinutes)) {
    return { ok: false, reason: "That time was just taken. Please choose another." };
  }

  return { ok: true, start: match.start, end: match.end };
}
