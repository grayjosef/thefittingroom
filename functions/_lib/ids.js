export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

// Human-facing booking reference. Matches the "GH-XXXXX" shape the design
// already shows on the confirmation screen.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 — read aloud over the phone

export function bookingReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `GH-${out}`;
}

export function nowIso() {
  return new Date().toISOString();
}
