// Studio business rules. Everything here is overridable by environment variable
// so Catherine's hours can change without a code deploy.
//
// Weekday indexes match JS getDay(): 0 = Sunday … 6 = Saturday.
// Each entry is a list of [open, close] windows in the studio's local time.
// A slot is offered when it starts inside a window and ends at or before the close.

const DEFAULT_WINDOWS = {
  0: [],                                                        // Sunday  — closed
  1: [],                                                        // Monday  — closed
  2: [["10:00", "11:30"], ["13:00", "14:30"], ["15:00", "16:30"]],
  3: [["10:00", "11:30"], ["13:00", "14:30"], ["15:00", "16:30"]],
  4: [["10:00", "11:30"], ["13:00", "14:30"], ["15:00", "16:30"]],
  5: [["10:00", "11:30"], ["13:00", "14:30"], ["15:00", "16:30"]],
  6: [["09:30", "12:00"]],                                      // Saturday — mornings only
};

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function list(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadConfig(env = {}) {
  let windows = DEFAULT_WINDOWS;
  if (env.STUDIO_HOURS_JSON) {
    try {
      windows = JSON.parse(env.STUDIO_HOURS_JSON);
    } catch {
      // Malformed override should never take the booking system down.
      windows = DEFAULT_WINDOWS;
    }
  }

  const feeCents = num(env.BOOKING_FEE_CENTS, 2500);
  const processingCents = num(env.BOOKING_PROCESSING_CENTS, 105);

  return {
    timezone: env.STUDIO_TIMEZONE || "America/Chicago",
    windows,

    slotMinutes: num(env.BOOKING_SLOT_MINUTES, 30),
    // Padding held after each appointment so back-to-back fittings aren't offered.
    bufferMinutes: num(env.BOOKING_BUFFER_MINUTES, 0),
    // How soon a bride may book. 24h keeps same-day surprises off the calendar.
    leadHours: num(env.BOOKING_LEAD_HOURS, 24),
    maxDaysAhead: num(env.BOOKING_MAX_DAYS_AHEAD, 120),
    // How long a slot is reserved while she is on the payment screen.
    holdMinutes: num(env.BOOKING_HOLD_MINUTES, 15),

    feeCents,
    processingCents,
    totalCents: feeCents + processingCents,
    currency: (env.BOOKING_CURRENCY || "usd").toLowerCase(),

    calendarId: env.GOOGLE_CALENDAR_ID || "primary",
    busyCalendarIds: list(env.GOOGLE_BUSY_CALENDAR_IDS),
    sheetId: env.GOOGLE_SHEET_ID || "",

    appointmentTitle: env.BOOKING_EVENT_TITLE || "Bridal Consultation",
    studioName: "The Fitting Room at Gray House",
    studioLocation: env.STUDIO_LOCATION || "Stevens Point, Wisconsin",
    siteUrl: env.SITE_URL || "https://thefittingroom-gh.com",

    notifyEmail: env.NOTIFY_EMAIL || "",
    notifyFrom: env.NOTIFY_FROM || "",
  };
}

// Which integrations are actually live. Drives /api/health and lets every
// endpoint degrade to a designed stub instead of erroring.
export function capabilities(env = {}) {
  // The refresh token normally lives in KV, written by the connect flow, so a
  // bound TOKENS namespace counts as a valid source. Whether a token is
  // actually present is a separate question — /api/health resolves that
  // asynchronously and narrows these before reporting.
  const googleCreds = Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      (env.GOOGLE_OAUTH_REFRESH_TOKEN || env.TOKENS)
  );

  return {
    google: googleCreds,
    sheets: Boolean(env.GOOGLE_SHEET_ID && googleCreds),
    stripe: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY),
    stripeWebhook: Boolean(env.STRIPE_WEBHOOK_SECRET),
    email: Boolean(env.RESEND_API_KEY && env.NOTIFY_FROM),
    studio: Boolean(env.STUDIO_PASSWORD && env.STUDIO_SESSION_SECRET),
  };
}
