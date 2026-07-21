import { NextRequest } from "next/server";
import { getSetting } from "@/lib/settings";
import { consumeCode, pkceMatches } from "@/lib/mcp/oauth";
import { ensureDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

/** Exchange an authorization code (+ PKCE verifier) for the access token. */
export async function POST(req: NextRequest) {
  ensureDb();
  const form = await req.formData();
  const grantType = String(form.get("grant_type") ?? "");
  const code = String(form.get("code") ?? "");
  const verifier = String(form.get("code_verifier") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");

  const fail = (error: string, status = 400) =>
    Response.json({ error }, { status, headers: cors });

  if (grantType !== "authorization_code") return fail("unsupported_grant_type");
  const rec = consumeCode(code);
  if (!rec) return fail("invalid_grant");
  if (rec.redirectUri !== redirectUri) return fail("invalid_grant");
  if (!pkceMatches(verifier, rec.challenge)) return fail("invalid_grant");

  const token = getSetting("mcp_token");
  if (!token) return fail("server_error", 500);

  // The issued access token IS the MCP token — the MCP endpoint already
  // validates it as a Bearer credential.
  return Response.json(
    { access_token: token, token_type: "Bearer", scope: "mcp", expires_in: 31_536_000 },
    { headers: cors },
  );
}
