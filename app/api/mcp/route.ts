import { NextRequest } from "next/server";
import { authorize, handleRpc } from "@/lib/mcp/server";
import { baseUrl } from "@/lib/mcp/oauth";
import { ensureDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * 401 that points Claude at the OAuth resource metadata, so custom connectors
 * run the OAuth flow (RFC 9728 WWW-Authenticate) instead of failing to register.
 */
function unauthorized(req: NextRequest) {
  const resource = `${baseUrl(req)}/.well-known/oauth-protected-resource`;
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
    {
      status: 401,
      headers: { ...cors, "WWW-Authenticate": `Bearer resource_metadata="${resource}"` },
    },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function GET(req: NextRequest) {
  if (!authorize(req, req.nextUrl)) return unauthorized(req);
  return Response.json(
    { error: "Method Not Allowed — POST JSON-RPC messages to this URL" },
    { status: 405, headers: cors },
  );
}

export async function POST(req: NextRequest) {
  ensureDb();
  if (!authorize(req, req.nextUrl)) return unauthorized(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { headers: cors });
  }
  if (typeof body !== "object" || body === null) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { headers: cors });
  }

  const result = await handleRpc(body as Parameters<typeof handleRpc>[0]);
  if (result === null) return new Response(null, { status: 202, headers: cors });
  return Response.json(result, { headers: cors });
}
