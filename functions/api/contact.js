// POST /api/contact — the "Send a note" form in the Contact section.

import { loadConfig } from "../_lib/config.js";
import { sendInquiryAlert } from "../_lib/email.js";
import { badRequest, email as parseEmail, handler, json, readJson, str } from "../_lib/http.js";
import { saveInquiry, storeReady } from "../_lib/store.js";

export const onRequestPost = handler(async (context) => {
  const { request, env, waitUntil } = context;
  const config = loadConfig(env);
  const body = await readJson(request);

  const name = str(body.name, { max: 120 });
  const email = parseEmail(body.email);
  const message = str(body.message, { max: 4000 });

  // Honeypot: a real person never fills a field they can't see.
  if (str(body.company, { max: 100 })) {
    return json({ ok: true, received: true });
  }

  if (!name) return badRequest("Please give your name.");
  if (!email) return badRequest("Please give an email Catherine can reply to.");
  if (!message) return badRequest("Please write a message.");

  if (storeReady(env, config)) {
    await saveInquiry(env, config, { name, email, message }).catch((err) =>
      console.error("Could not save inquiry:", err)
    );
  }

  const deliver = sendInquiryAlert(env, config, { name, email, message }).catch((err) =>
    console.error("Could not send inquiry alert:", err)
  );
  if (waitUntil) waitUntil(deliver);
  else await deliver;

  return json({ ok: true, received: true });
});
