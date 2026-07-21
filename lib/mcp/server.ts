import { getSetting } from "@/lib/settings";
import { deleteRow, recentRows, upsertRow, DATASETS } from "@/lib/datasets/import";
import { getDataset } from "@/lib/datasets/config";
import { runAll } from "@/lib/sync/runner";
import {
  COMPARE_METRICS,
  campaignTable,
  compareSeries,
  compareValue,
  emailTotals,
  gaTotals,
  gscTotals,
  socialTotals,
} from "@/lib/reports/queries";

/*
 * MCP (Model Context Protocol) server — JSON-RPC over HTTP. Lets Claude read
 * reports and manage data in this dashboard. Ported from the PHP McpServer.
 */
const PROTOCOL = "2025-03-26";

type JsonRpc = { jsonrpc: "2.0"; id?: unknown; method?: string; params?: Record<string, unknown> };

export function authorize(req: Request, url: URL): boolean {
  const token = getSetting("mcp_token");
  if (!token) return false;
  let given = url.searchParams.get("token") ?? "";
  if (!given) {
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/Bearer\s+(\S+)/i);
    if (m) given = m[1];
  }
  return given === token;
}

export async function handleRpc(req: JsonRpc): Promise<Record<string, unknown> | null> {
  // Notifications (no id) are acknowledged with no body.
  if (!("id" in req) || req.id === undefined) return null;
  const id = req.id;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });

  try {
    switch (req.method) {
      case "initialize":
        return reply({
          protocolVersion: PROTOCOL,
          capabilities: { tools: {} },
          serverInfo: { name: "analytio-marketing-reports", version: "2.0.0" },
        });
      case "ping":
        return reply({});
      case "tools/list":
        return reply({ tools: toolDefinitions() });
      case "tools/call": {
        const name = String(req.params?.name ?? "");
        const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
        const text = await callTool(name, args);
        return reply({ content: [{ type: "text", text }] });
      }
      default:
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${req.method}` } };
    }
  } catch (e) {
    return reply({ content: [{ type: "text", text: "Error: " + (e as Error).message }], isError: true });
  }
}

function editableKeys(): string {
  return Object.values(DATASETS).filter((d) => !d.matrix).map((d) => d.key).join(", ");
}

function toolDefinitions() {
  const metricKeys = Object.keys(COMPARE_METRICS).join(", ");
  const obj = { type: "object" as const };
  return [
    { name: "get_overview", description: "Marketing overview: GA4, Search Console, social and email totals for the last N days.", inputSchema: { ...obj, properties: { days: { type: "integer", description: "Range length in days (default 30)" } } } },
    { name: "get_metric_series", description: `Daily/monthly values of one metric between two dates. Metrics: ${metricKeys}`, inputSchema: { ...obj, required: ["metric", "from", "to"], properties: { metric: { type: "string" }, from: { type: "string" }, to: { type: "string" } } } },
    { name: "list_datasets", description: "List every editable dataset with its fields.", inputSchema: { ...obj, properties: {} } },
    { name: "list_rows", description: `Latest rows of a dataset (with rowids). Datasets: ${editableKeys()}`, inputSchema: { ...obj, required: ["dataset"], properties: { dataset: { type: "string" }, limit: { type: "integer" } } } },
    { name: "add_row", description: "Add or update one row in a dataset (upserts by natural key). Lookup fields accept the natural value (URL, campaign name, keyword text).", inputSchema: { ...obj, required: ["dataset", "fields"], properties: { dataset: { type: "string" }, fields: { type: "object" } } } },
    { name: "delete_row", description: "Delete one row from a dataset by rowid (get rowids from list_rows).", inputSchema: { ...obj, required: ["dataset", "rowid"], properties: { dataset: { type: "string" }, rowid: { type: "integer" } } } },
    { name: "run_sync", description: "Run the full data sync now and return per-source status.", inputSchema: { ...obj, properties: {} } },
  ];
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_overview": {
      const days = Math.max(1, Math.min(730, Number(args.days ?? 30)));
      const end = addDays(today(), -1);
      const start = addDays(end, -(days - 1));
      const prevEnd = addDays(start, -1);
      const prevStart = addDays(prevEnd, -(days - 1));
      return JSON.stringify(
        {
          range: { from: start, to: end },
          analytics: gaTotals(start, end),
          analytics_previous: gaTotals(prevStart, prevEnd),
          search_console: gscTotals(start, end),
          search_console_previous: gscTotals(prevStart, prevEnd),
          social: socialTotals(start, end),
          email: emailTotals(start, end),
          campaigns: campaignTable(start, end).slice(0, 10),
        },
        null,
        2,
      );
    }
    case "get_metric_series": {
      const metric = String(args.metric ?? "");
      if (!COMPARE_METRICS[metric]) return "Unknown metric. Valid: " + Object.keys(COMPARE_METRICS).join(", ");
      const from = String(args.from ?? "");
      const to = String(args.to ?? "");
      return JSON.stringify({ metric: COMPARE_METRICS[metric].label, total: compareValue(metric, from, to), series: compareSeries(metric, from, to) }, null, 2);
    }
    case "list_datasets": {
      const out: Record<string, unknown> = {};
      for (const d of Object.values(DATASETS)) {
        if (d.matrix || !d.fields) continue;
        out[d.key] = { label: d.label, unique: d.unique, fields: Object.fromEntries(Object.entries(d.fields).map(([k, f]) => [k, f.type])) };
      }
      return JSON.stringify(out, null, 2);
    }
    case "list_rows": {
      const rows = recentRows(String(args.dataset ?? ""), Math.max(1, Math.min(100, Number(args.limit ?? 15))));
      return rows.length ? JSON.stringify(rows, null, 2) : "No rows (or unknown dataset — use list_datasets).";
    }
    case "add_row": {
      const fields = args.fields as Record<string, unknown>;
      const input: Record<string, string> = {};
      for (const [k, v] of Object.entries(fields ?? {})) input[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
      upsertRow(String(args.dataset ?? ""), input);
      return "Row saved.";
    }
    case "delete_row":
      deleteRow(String(args.dataset ?? ""), Number(args.rowid ?? 0));
      return "Row deleted (if it existed).";
    case "run_sync":
      return await runSyncTool();
    default:
      return "Unknown tool: " + name;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// run_sync is async; handle it specially in the route.
export async function runSyncTool(): Promise<string> {
  const results = await runAll();
  return Object.entries(results)
    .map(([s, r]) => `${s.padEnd(16)} ${r.status.padEnd(8)} ${r.message}`)
    .join("\n");
}

export { getDataset };
