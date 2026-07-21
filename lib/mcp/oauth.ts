import crypto from "node:crypto";

/*
 * Minimal OAuth 2.1 layer so claude.ai custom connectors (which always run the
 * OAuth + Dynamic Client Registration flow) can connect. It's a thin shim over
 * the existing MCP token: the /authorize step requires that token as proof, and
 * the issued access token IS the MCP token, which the MCP endpoint already
 * validates. Single-process in-memory code store (fine for a self-hosted app).
 */

export function baseUrl(req: Request): string {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function b64url(b: Buffer): string {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Verify a PKCE S256 code_verifier against the stored challenge. */
export function pkceMatches(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const hashed = b64url(crypto.createHash("sha256").update(verifier).digest());
  return crypto.timingSafeEqual(Buffer.from(hashed), Buffer.from(challenge));
}

type CodeRecord = { challenge: string; redirectUri: string; exp: number };
const codes = new Map<string, CodeRecord>();

export function issueCode(rec: Omit<CodeRecord, "exp">): string {
  const code = crypto.randomBytes(24).toString("hex");
  codes.set(code, { ...rec, exp: Date.now() + 2 * 60_000 });
  return code;
}

export function consumeCode(code: string): CodeRecord | null {
  const rec = codes.get(code);
  if (!rec) return null;
  codes.delete(code);
  if (Date.now() > rec.exp) return null;
  return rec;
}
