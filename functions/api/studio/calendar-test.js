// POST /api/studio/calendar-test — proves the calendar round trip, no payment.
//
// Answers the two questions that actually matter to Catherine:
//   1. Do appointments land on HER calendar?
//   2. Does anything occupying that calendar stop a bride booking over it?
//
// It writes a clearly-labelled event, re-reads availability to confirm the slot
// disappeared, then deletes the event and confirms the slot came back. Session
// gated by the studio middleware, and it always tries to clean up after itself.

import { slotsForDate } from "../../_lib/availability.js";
import { createEvent, deleteEvent, resolveCalendar } from "../../_lib/calendar.js";
import { loadConfig } from "../../_lib/config.js";
import { googleConfigured } from "../../_lib/google.js";
import { fail, handler, json } from "../../_lib/http.js";
import { activeHolds, listAppointments, storeReady } from "../../_lib/store.js";
import { longDate, slotLabel, zonedParts } from "../../_lib/time.js";

async function context(env, config) {
  if (!storeReady(env, config)) return { holds: [], appointments: [] };
  const [holds, appointments] = await Promise.all([
    activeHolds(env, config).catch(() => []),
    listAppointments(env, config).catch(() => []),
  ]);
  return { holds, appointments };
}

export const onRequestPost = handler(async ({ env }) => {
  const config = loadConfig(env);

  if (!googleConfigured(env)) {
    return fail(503, "not_connected", "Google isn't connected, so there's nothing to test.");
  }

  const steps = [];
  const calendar = await resolveCalendar(env, config);
  steps.push({
    step: "identify calendar",
    ok: Boolean(calendar?.id),
    detail: calendar ? `${calendar.id} (${calendar.timeZone})` : "could not resolve",
  });

  // Find a real bookable slot to borrow. Searching forward rather than
  // assuming tomorrow is open — she is closed Sunday and Monday.
  let target = null;
  for (let offset = 1; offset <= 21 && !target; offset++) {
    const day = new Date(Date.now() + offset * 86_400_000);
    const parts = zonedParts(day, config.timezone);
    const slots = await slotsForDate(env, config, parts, await context(env, config));
    if (slots.length) target = slots[0];
  }

  if (!target) {
    return json({
      ok: false,
      steps,
      summary: "No bookable slot found in the next three weeks, so there was nothing to test against.",
    });
  }

  const start = new Date(target.startIso);
  const end = new Date(target.endIso);
  const when = `${longDate(start, config.timezone)} at ${slotLabel(start, config.timezone)}`;
  steps.push({ step: "pick a free slot", ok: true, detail: when });

  let eventId = null;
  try {
    const event = await createEvent(env, config, {
      start,
      end,
      summary: "TEST — system check, safe to delete",
      description:
        "Written automatically to confirm the website can add appointments to this calendar. " +
        "It is removed within seconds. If you are reading this, something interrupted the test — " +
        "you can delete it yourself.",
    });
    eventId = event?.id || null;
    steps.push({ step: "write event to calendar", ok: Boolean(eventId), detail: eventId ? "created" : "no id returned" });

    // The real question: does an occupied calendar now block that slot?
    const after = await slotsForDate(
      env,
      config,
      zonedParts(start, config.timezone),
      await context(env, config)
    );
    const stillOffered = after.some((s) => s.startIso === target.startIso);
    steps.push({
      step: "slot now blocked for brides",
      ok: !stillOffered,
      detail: stillOffered
        ? "STILL BOOKABLE — the calendar is not blocking availability"
        : "correctly removed from availability",
    });
  } finally {
    if (eventId) {
      try {
        await deleteEvent(env, config, eventId);
        steps.push({ step: "clean up test event", ok: true, detail: "deleted" });
      } catch (err) {
        steps.push({
          step: "clean up test event",
          ok: false,
          detail: `COULD NOT DELETE — remove "TEST — system check" from the calendar by hand (${err.message})`,
        });
      }
    }
  }

  // And the slot should be offered again.
  const restored = await slotsForDate(
    env,
    config,
    zonedParts(start, config.timezone),
    await context(env, config)
  );
  steps.push({
    step: "slot released again",
    ok: restored.some((s) => s.startIso === target.startIso),
    detail: `${restored.length} slots open on that day`,
  });

  const passed = steps.every((s) => s.ok);
  return json({
    ok: passed,
    calendar: calendar?.id || null,
    testedSlot: when,
    steps,
    summary: passed
      ? `Working. Appointments write to ${calendar?.id}, and anything on that calendar blocks the time.`
      : "Something failed — see the steps.",
  });
});
