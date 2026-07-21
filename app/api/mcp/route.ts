import { NextRequest } from "next/server";
import { authorize, handleRpc } from "@/lib/mcp/server";
import { ensureDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized: invalid MCP token" } },
    { status: 401 },
  );
}

export async function GET(req: NextRequest) {
  if (!authorize(req, req.nextUrl)) return unauthorized();
  return Response.json({ error: "Method Not Allowed — POST JSON-RPC messages to this URL" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  ensureDb();
  if (!authorize(req, req.nextUrl)) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
  if (typeof body !== "object" || body === null) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }

  const result = await handleRpc(body as Parameters<typeof handleRpc>[0]);
  if (result === null) return new Response(null, { status: 202 }); // notification ack
  return Response.json(result);
}
