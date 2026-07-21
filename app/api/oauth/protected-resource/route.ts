import { NextRequest } from "next/server";
import { baseUrl } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** RFC 9728 protected-resource metadata (served at /.well-known/oauth-protected-resource). */
export function GET(req: NextRequest) {
  const base = baseUrl(req);
  return Response.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      bearer_methods_supported: ["header"],
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
