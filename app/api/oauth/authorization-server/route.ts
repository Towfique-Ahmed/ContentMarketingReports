import { NextRequest } from "next/server";
import { baseUrl } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** RFC 8414 authorization-server metadata (served at /.well-known/oauth-authorization-server). */
export function GET(req: NextRequest) {
  const base = baseUrl(req);
  return Response.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/api/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp"],
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
