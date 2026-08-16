// Timezone maths without a dependency.
//
// Workers ship full ICU, so Intl is the source of truth for what
// "10:00 AM in Stevens Point" means on any given day — including the two
// weekends a year when Central time shifts and naive UTC offsets go wrong.

const PART_OPTS = {
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};

const formatterCache = new Map();

function partsFormatter(timeZone) {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, ...PART_OPTS });
    formatterCache.set(timeZone, f);
  }
  return f;
}

// How far the zone is from UTC at a given instant, in milliseconds.
export function zoneOffsetMs(instant, timeZone) {
  const parts = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(instant)) {
    if (type !== "literal") parts[type] = value;
  }
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24, // hour12:false renders midnight as "24" in some ICU builds
    Number(parts.minute),
    Number(parts.second)
  );
  const whole = Math.floor(instant.getTime() / 1000) * 1000;
  return asIfUtc - whole;
}

// "2026-09-08 14:30 in America/Chicago" -> the exact UTC instant.
// Iterates because the offset itself depends on the instant we're solving for.
export function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = naive;
  for (let i = 0; i < 3; i++) {
    const next = naive - zoneOffsetMs(new Date(guess), timeZone);
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

// The calendar fields an instant lands on inside a zone.
export function zonedParts(instant, timeZone) {
  const parts = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(instant)) {
    if (type !== "literal") parts[type] = value;
  }
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  // Weekday needs its own pass — deriving it from a shifted UTC date is a
  // classic off-by-one across the date line.
  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(instant);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName);
  return { year, month, day, hour, minute, weekday, date: ymd(year, month, day) };
}

export function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseYmd(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function parseYearMonth(value) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function parseHm(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// "10:00 AM" — matches the labels the design already uses.
export function slotLabel(instant, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(instant);
}

// "Tuesday, September 8, 2026"
export function longDate(instant, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(instant);
}

export function addMinutes(instant, minutes) {
  return new Date(instant.getTime() + minutes * 60000);
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
