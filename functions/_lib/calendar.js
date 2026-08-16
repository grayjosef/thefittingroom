// Google Calendar: read Catherine's busy blocks, write confirmed consultations.

import { googleFetch } from "./google.js";

const API = "https://www.googleapis.com/calendar/v3";

// Every calendar that should block availability. The booking calendar counts
// as busy too — a confirmed consultation must not be offered twice.
export function busySources(config) {
  return [config.calendarId, ...config.busyCalendarIds].filter(
    (id, i, all) => id && all.indexOf(id) === i
  );
}

// Returns [{ start: Date, end: Date }] across every watched calendar.
export async function freeBusy(env, config, timeMin, timeMax) {
  const items = busySources(config).map((id) => ({ id }));
  if (!items.length) return [];

  const data = await googleFetch(env, `${API}/freeBusy`, {
    method: "POST",
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: config.timezone,
      items,
    }),
  });

  const out = [];
  for (const id of Object.keys(data?.calendars || {})) {
    const entry = data.calendars[id];
    // A calendar we can't read (wrong ID, revoked share) reports an error here
    // rather than failing the whole request. Log it — silently treating an
    // unreadable calendar as "free" is how double-bookings happen.
    if (entry?.errors?.length) {
      console.warn(`freeBusy could not read calendar ${id}:`, JSON.stringify(entry.errors));
      continue;
    }
    for (const period of entry?.busy || []) {
      out.push({ start: new Date(period.start), end: new Date(period.end) });
    }
  }
  return out;
}

export async function createEvent(env, config, { start, end, summary, description, attendeeEmail, attendeeName }) {
  const body = {
    summary,
    description,
    start: { dateTime: start.toISOString(), timeZone: config.timezone },
    end: { dateTime: end.toISOString(), timeZone: config.timezone },
    location: config.studioLocation,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "email", minutes: 24 * 60 },
      ],
    },
  };

  if (attendeeEmail) {
    body.attendees = [{ email: attendeeEmail, displayName: attendeeName || undefined }];
  }

  // sendUpdates=all lets Google deliver the invitation itself, which is a
  // useful backstop if the transactional mail provider is not configured yet.
  const params = new URLSearchParams({ sendUpdates: attendeeEmail ? "all" : "none" });

  return googleFetch(env, `${API}/calendars/${encodeURIComponent(config.calendarId)}/events?${params}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteEvent(env, config, eventId) {
  if (!eventId) return;
  try {
    await googleFetch(
      env,
      `${API}/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: "DELETE" }
    );
  } catch (err) {
    // Already gone is a success for our purposes.
    if (err?.status !== 404 && err?.status !== 410) throw err;
  }
}
