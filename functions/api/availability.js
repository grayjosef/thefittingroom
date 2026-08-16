// GET /api/availability?month=YYYY-MM   -> open slot count per day
// GET /api/availability?date=YYYY-MM-DD -> the bookable times on that day

import { availabilityForMonth, slotsForDate } from "../_lib/availability.js";
import { loadConfig } from "../_lib/config.js";
import { GoogleAuthError, googleConfigured } from "../_lib/google.js";
import { badRequest, handler, json } from "../_lib/http.js";
import { parseYearMonth, parseYmd } from "../_lib/time.js";
import { activeHolds, listAppointments, storeReady } from "../_lib/store.js";

async function loadContext(env, config) {
  if (!storeReady(env, config)) return { holds: [], appointments: [] };
  const [holds, appointments] = await Promise.all([
    activeHolds(env, config).catch(() => []),
    listAppointments(env, config).catch(() => []),
  ]);
  return { holds, appointments };
}

export const onRequestGet = handler(async ({ request, env }) => {
  const config = loadConfig(env);
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const dateParam = url.searchParams.get("date");
  const stub = !googleConfigured(env);

  const context = await loadContext(env, config);

  // If the calendar is configured but unreachable, show nothing rather than
  // everything. An unreadable calendar must never read as "all free" — that is
  // how a bride books over a day Catherine has already committed.
  if (dateParam) {
    const parsed = parseYmd(dateParam);
    if (!parsed) return badRequest("Use date=YYYY-MM-DD.");
    try {
      const slots = await slotsForDate(env, config, parsed, context);
      return json({
        ok: true,
        stub,
        date: dateParam,
        timezone: config.timezone,
        slotMinutes: config.slotMinutes,
        slots,
      });
    } catch (err) {
      if (!(err instanceof GoogleAuthError)) throw err;
      console.error("Calendar unreachable, failing closed:", err.message);
      return json({
        ok: true,
        stub: false,
        calendarUnavailable: true,
        date: dateParam,
        timezone: config.timezone,
        slotMinutes: config.slotMinutes,
        slots: [],
      });
    }
  }

  const ym = parseYearMonth(monthParam || "");
  if (!ym) return badRequest("Use month=YYYY-MM or date=YYYY-MM-DD.");

  try {
    const days = await availabilityForMonth(env, config, ym.year, ym.month, context);
    return json({
      ok: true,
      stub,
      month: monthParam,
      timezone: config.timezone,
      leadHours: config.leadHours,
      maxDaysAhead: config.maxDaysAhead,
      days,
    });
  } catch (err) {
    if (!(err instanceof GoogleAuthError)) throw err;
    console.error("Calendar unreachable, failing closed:", err.message);
    return json({
      ok: true,
      stub: false,
      calendarUnavailable: true,
      month: monthParam,
      timezone: config.timezone,
      days: {},
    });
  }
});
