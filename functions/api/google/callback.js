// GET /api/google/callback — where Google lands after Catherine approves.
//
// Shows the refresh token once so it can be pasted into Cloudflare. The token
// is password-equivalent: it is never stored here and never logged.

import { KV_ACCOUNT_KEY, KV_REFRESH_KEY, exchangeCode, tokenIdentity } from "../../_lib/google.js";
import { handler } from "../../_lib/http.js";

function page(title, bodyHtml, status = 200) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title}</title>
<style>
  :root{--bg:#F7F3EB;--ink:#2E3542;--soft:#5A6070;--rule:#DED5C5;--accent:#B86F67;--panel:#FFFDF8}
  @media(prefers-color-scheme:dark){:root{--bg:#262C37;--ink:#EFE9DD;--soft:#C4BBAC;--rule:#454C5B;--accent:#F2B8B2;--panel:#2E3542}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
       font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;
       display:flex;justify-content:center;padding:48px 20px}
  main{max-width:640px;width:100%;display:flex;flex-direction:column;gap:20px}
  h1{font:400 30px/1.15 "Iowan Old Style",Palatino,Georgia,serif;margin:0}
  p{margin:0;color:var(--soft)}
  .tok{font:13px/1.5 ui-monospace,Consolas,monospace;background:var(--panel);
       border:1px solid var(--rule);border-left:3px solid var(--accent);
       border-radius:0 3px 3px 0;padding:14px;word-break:break-all;color:var(--ink)}
  .lbl{font:11px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;
       color:var(--soft);margin-bottom:7px;display:block}
  button{font:inherit;padding:10px 16px;border:1px solid var(--accent);background:transparent;
         color:var(--accent);border-radius:3px;cursor:pointer}
  button:hover{background:var(--accent);color:var(--bg)}
  .warn{border:1px solid var(--accent);border-radius:3px;padding:16px;color:var(--ink)}
  code{font-family:ui-monospace,monospace;font-size:.88em}
</style></head><body><main>${bodyHtml}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

export const onRequestGet = handler(async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return page("Connection cancelled", `<h1>Connection cancelled</h1>
      <p>Google reported: <code>${error}</code>. Nothing changed — you can close this and try the link again.</p>`, 400);
  }

  if (!env.GOOGLE_SETUP_TOKEN || state !== env.GOOGLE_SETUP_TOKEN) {
    return page("Link expired", `<h1>That link isn't valid</h1>
      <p>Ask Josef for a fresh setup link.</p>`, 403);
  }

  if (!code) {
    return page("Missing code", `<h1>Something went wrong</h1>
      <p>Google didn't send an authorization code. Try the setup link again.</p>`, 400);
  }

  const tokens = await exchangeCode(env, { code, redirectUri: `${url.origin}/api/google/callback` });

  if (!tokens.refresh_token) {
    // Google withholds it when this account has already granted consent before.
    return page("Almost — one more step", `<h1>Google didn't return a permanent key</h1>
      <p>That happens when this account has approved the app before. Remove the old
      approval, then open the setup link again.</p>
      <p><a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>
      → find <strong>The Fitting Room</strong> → Remove access.</p>`, 200);
  }

  const who = await tokenIdentity(tokens.access_token);
  const account = who?.email || "";
  const expected = (env.GOOGLE_EXPECTED_ACCOUNT || "cateelizabeth1967@gmail.com").toLowerCase();
  const mismatch = account && account.toLowerCase() !== expected;

  // Wrong account means every booking would land on the wrong calendar.
  // Refuse rather than store it — the fix is to sign in as the right person.
  if (mismatch) {
    return page(
      "Wrong account",
      `<h1>That's the wrong Google account</h1>
       <p>You approved as <strong>${account}</strong>, but appointments need to go to
       <strong>${expected}</strong>. Nothing was saved.</p>
       <p>Sign out of Google, sign back in as ${expected}, and open the link again.</p>
       <p><a href="https://accounts.google.com/Logout">Sign out of Google</a></p>`,
      400
    );
  }

  // Store the token server-side. It is never displayed, so there is nothing to
  // copy, nothing to send, and nothing to leak. This is the whole point of the
  // KV binding — a refresh token is password-equivalent and should never make
  // the trip through a text message or a screenshot.
  if (!env.TOKENS) {
    return page(
      "Storage not connected",
      `<h1>Almost — one setup step missing</h1>
       <p>Google approved the connection, but there's nowhere to store it safely,
       so it was discarded.</p>
       <p>Bind a KV namespace called <code>TOKENS</code> to this Pages project, redeploy,
       then open the link again.</p>`,
      503
    );
  }

  await env.TOKENS.put(KV_REFRESH_KEY, tokens.refresh_token);
  if (account) await env.TOKENS.put(KV_ACCOUNT_KEY, account);

  return page(
    "Calendar connected",
    `<h1>All set — your calendar is connected.</h1>
     <p>Connected as <strong>${account || "your Google account"}</strong>.</p>
     <p>Appointments booked on the website will now appear on your calendar
     automatically, and nobody can book a time you're already busy.</p>
     <p>There's nothing to copy and nothing to send. You can close this page.</p>
     <p style="margin-top:24px"><a href="${(env.SITE_URL || "https://thefittingroom-gh.com")}">Back to the website</a></p>`
  );
});
