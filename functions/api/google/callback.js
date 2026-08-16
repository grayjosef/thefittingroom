// GET /api/google/callback — where Google lands after Catherine approves.
//
// Shows the refresh token once so it can be pasted into Cloudflare. The token
// is password-equivalent: it is never stored here and never logged.

import { exchangeCode, tokenIdentity } from "../../_lib/google.js";
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
  const account = who?.email || "unknown account";
  const expected = "cateelizabeth1967@gmail.com";
  const mismatch = who?.email && who.email.toLowerCase() !== expected;

  return page(
    "Calendar connected",
    `<h1>Calendar connected</h1>
     <p>Signed in as <strong>${account}</strong>.</p>
     ${mismatch ? `<div class="warn"><strong>Wrong account.</strong> Bookings must go to
       <code>${expected}</code>. Sign out of Google, sign back in as that account, and open the
       setup link again — otherwise appointments land on the wrong calendar.</div>` : ``}
     <div>
       <span class="lbl">Paste this into Cloudflare as GOOGLE_OAUTH_REFRESH_TOKEN</span>
       <div class="tok" id="tok">${tokens.refresh_token}</div>
     </div>
     <button onclick="navigator.clipboard.writeText(document.getElementById('tok').textContent.trim()).then(()=>{this.textContent='Copied'})">Copy</button>
     <div class="warn">
       <p style="color:inherit"><strong>Treat this like a password.</strong> It grants calendar
       access without signing in again. Paste it straight into Cloudflare → Pages → Settings →
       Variables and secrets, as an encrypted value. Don't send it over text or email.</p>
     </div>
     <p>Once it's saved, redeploy and check <a href="/api/health">/api/health</a> —
     <code>google</code> should be listed under live.</p>`
  );
});
