import { NextRequest } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * Dynamic Client Registration (RFC 7591). Public client — we accept any
 * registration and echo back the redirect URIs with a generated client_id.
 * Access is actually gated at /authorize by the MCP token, so open
 * registration is safe here.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const clientId = "mcp-" + crypto.randomBytes(12).toString("hex");
  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: body.redirect_uris ?? [],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
      scope: "mcp",
    },
    { status: 201, headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
