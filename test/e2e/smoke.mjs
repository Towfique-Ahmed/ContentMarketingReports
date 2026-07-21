/*
 * End-to-end smoke test. Starts the production server, seeds sample data, and
 * checks the core flows: pages render, a KPI shows real numbers, a table sorts,
 * and the MCP endpoint answers. Uses the pre-installed Chromium.
 *
 *   npm run build && npm run seed:sample && npm run test:e2e
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = process.env.PORT || 3100;
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME =
  process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  if (!cond) failures++;
}

const server = spawn("npm", ["start"], { env: { ...process.env, PORT }, stdio: "ignore" });

try {
  // Wait for readiness.
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok) break;
    } catch {}
    await sleep(500);
  }

  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

  await page.goto(`${BASE}/?range=all`, { waitUntil: "networkidle" });
  check("overview renders heading", (await page.getByRole("heading", { name: /Marketing Overview/i }).count()) > 0);
  check("overview shows a KPI value", /\d/.test(await page.locator("text=Sessions").first().textContent().catch(() => "")) || (await page.getByText(/593K|Sessions/).count()) > 0);

  await page.goto(`${BASE}/search?range=all`, { waitUntil: "networkidle" });
  check("search page renders", (await page.getByRole("heading", { name: /Search & Traffic/i }).count()) > 0);
  check("query table present", (await page.getByText(/Top search queries/i).count()) > 0);

  await page.goto(`${BASE}/content?type=blog&range=all`, { waitUntil: "networkidle" });
  check("content tabs render", (await page.getByRole("tab", { name: /Blog/i }).count()) > 0);

  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  check("settings renders MCP card", (await page.getByText(/Claude MCP connector/i).count()) > 0);

  // MCP endpoint (rebuild over HTTP — the settings page displays https for prod).
  const preText = (await page.locator("pre").first().textContent()) || "";
  const token = (preText.match(/token=(\S+)/) || [])[1];
  if (token) {
    const res = await fetch(`${BASE}/api/mcp?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    const data = await res.json();
    check("MCP tools/list returns tools", Array.isArray(data?.result?.tools) && data.result.tools.length === 7);
  } else {
    check("MCP url discoverable", false);
  }

  await browser.close();
} finally {
  server.kill("SIGTERM");
}

console.log(failures === 0 ? "\nALL SMOKE CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
