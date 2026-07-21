import { NextRequest } from "next/server";
import { getSetting } from "@/lib/settings";
import { issueCode } from "@/lib/mcp/oauth";
import { ensureDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** GET: render the approval page. The MCP token is the proof of authorization. */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const redirectUri = p.get("redirect_uri") ?? "";
  const challenge = p.get("code_challenge") ?? "";
  const state = p.get("state") ?? "";
  const err = p.get("error");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorize Claude · Analytio</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #f4f5f7; color: #14161a; display: grid; place-items: center; min-height: 100vh; margin: 0; }
  @media (prefers-color-scheme: dark) { body { background: #0d0f12; color: #e8eaed; } .card { background: #16181d; border-color: #2a2d34; } input { background:#0d0f12; color:#e8eaed; border-color:#2a2d34; } }
  .card { background:#fff; border:1px solid #e2e4e8; border-radius:14px; padding:28px; width:min(92vw,420px); box-shadow:0 8px 30px rgba(0,0,0,.08); }
  h1 { font-size:18px; margin:0 0 6px; } p { color:#6b7280; font-size:14px; margin:0 0 18px; }
  label { display:block; font-size:13px; font-weight:600; margin:14px 0 6px; }
  input { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; }
  button { margin-top:18px; width:100%; padding:11px; border:0; border-radius:8px; background:#2a78d6; color:#fff; font-weight:600; font-size:14px; cursor:pointer; }
  .err { color:#c0392b; font-size:13px; margin-top:10px; }
  .hint { font-size:12px; color:#9aa0aa; margin-top:14px; }
</style></head><body>
<form class="card" method="post" action="/api/oauth/authorize">
  <h1>Connect Claude to Analytio</h1>
  <p>Paste your <strong>MCP token</strong> (Settings → Claude MCP connector) to authorize this connection.</p>
  <label for="tok">MCP token</label>
  <input id="tok" name="mcp_token" type="password" autocomplete="off" autofocus required>
  <input type="hidden" name="redirect_uri" value="${esc(redirectUri)}">
  <input type="hidden" name="code_challenge" value="${esc(challenge)}">
  <input type="hidden" name="state" value="${esc(state)}">
  <button type="submit">Authorize</button>
  ${err ? `<div class="err">${esc(err)}</div>` : ""}
  <div class="hint">Only someone with the token from your dashboard settings can approve this.</div>
</form></body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/** POST: verify the token, mint an auth code bound to the PKCE challenge, redirect back. */
export async function POST(req: NextRequest) {
  ensureDb();
  const form = await req.formData();
  const token = String(form.get("mcp_token") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const challenge = String(form.get("code_challenge") ?? "");
  const state = String(form.get("state") ?? "");

  const expected = getSetting("mcp_token");
  const back = (error: string) =>
    Response.redirect(
      `${req.nextUrl.origin}/api/oauth/authorize?${new URLSearchParams({ redirect_uri: redirectUri, code_challenge: challenge, state, error })}`,
      303,
    );

  if (!expected || token !== expected) return back("Invalid MCP token. Copy it from Settings → Claude MCP connector.");
  if (!/^https?:\/\//.test(redirectUri)) return back("Invalid redirect URI.");

  const code = issueCode({ challenge, redirectUri });
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 303);
}
