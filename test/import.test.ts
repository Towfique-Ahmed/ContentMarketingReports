import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { importCsv, upsertRow } from "@/lib/datasets/import";
import { cleanDate, cleanNumber, parseCsv } from "@/lib/datasets/csv";
import { sqlite } from "@/lib/db/client";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");

describe("value cleaners", () => {
  it("cleanNumber handles commas, percents, dashes", () => {
    expect(cleanNumber("1,234")).toBe(1234);
    expect(cleanNumber("45.0%")).toBe(45);
    expect(cleanNumber("–")).toBeNull();
    expect(cleanNumber("")).toBeNull();
    expect(cleanNumber("#N/A")).toBeNull();
  });
  it("cleanDate normalizes month formats to the 1st", () => {
    expect(cleanDate("2025-03-15")).toBe("2025-03-15");
    expect(cleanDate("Jan'25")).toBe("2025-01-01");
    expect(cleanDate("Mar 2026")).toBe("2026-03-01");
    expect(cleanDate("2025-02")).toBe("2025-02-01");
  });
  it("parseCsv keeps quoted commas and embedded newlines", () => {
    const rows = parseCsv('a,"1,234",c\n"line\nbreak",y,z\n');
    expect(rows[0]).toEqual(["a", "1,234", "c"]);
    expect(rows[1][0]).toBe("line\nbreak");
  });
});

describe("GA4 combined import (channels + Total → site totals)", () => {
  beforeAll(() => {
    importCsv("ga_channels", fixture("ga4.csv"));
  });

  it("routes Total rows into ga_daily with all metrics", () => {
    const jan = sqlite
      .prepare("SELECT sessions, users, new_users, engagement_rate, avg_duration, bounce_rate FROM ga_daily WHERE date = '2025-01-01'")
      .get() as Record<string, number>;
    expect(jan.sessions).toBe(11032);
    expect(jan.users).toBe(5295);
    expect(jan.new_users).toBe(4474);
    expect(jan.engagement_rate).toBeCloseTo(45.85, 2);
    expect(jan.avg_duration).toBe(47);
    expect(jan.bounce_rate).toBeCloseTo(54.15, 2);
  });

  it("imports all 17 months and reconciles total sessions", () => {
    const row = sqlite.prepare("SELECT COUNT(*) c, SUM(sessions) s FROM ga_daily").get() as { c: number; s: number };
    expect(row.c).toBe(17);
    expect(row.s).toBe(593017);
  });

  it("writes channel rows without leaking totals-only columns", () => {
    const ch = sqlite
      .prepare("SELECT sessions, users, new_users, conversions FROM ga_channels WHERE channel = 'Direct' AND date = '2025-01-01'")
      .get() as Record<string, number>;
    expect(ch.sessions).toBe(3491);
    expect(ch.users).toBe(1960);
    // ga_channels has no engagement_rate column at all.
    const cols = (sqlite.prepare("PRAGMA table_info(ga_channels)").all() as { name: string }[]).map((c) => c.name);
    expect(cols).not.toContain("engagement_rate");
  });
});

describe("GSC monthly matrix import", () => {
  beforeAll(() => {
    importCsv("gsc_monthly", fixture("gsc.csv"));
  });
  it("parses metric rows × month columns into gsc_daily", () => {
    const jan26 = sqlite
      .prepare("SELECT clicks, impressions, ctr, position FROM gsc_daily WHERE date = '2026-01-01'")
      .get() as Record<string, number>;
    expect(jan26.clicks).toBe(26631);
    expect(jan26.impressions).toBe(3635287);
    expect(jan26.position).toBeCloseTo(23.6, 1);
    const count = sqlite.prepare("SELECT COUNT(*) c FROM gsc_daily").get() as { c: number };
    expect(count.c).toBe(17);
  });
});

describe("manual upsert + validation", () => {
  it("upserts by natural key and validates select options", () => {
    upsertRow("keywords", { keyword: "seo tool", search_volume: "4400", difficulty: "35" });
    upsertRow("keywords", { keyword: "seo tool", search_volume: "5000", difficulty: "40" });
    const row = sqlite.prepare("SELECT search_volume, difficulty FROM keywords WHERE keyword = 'seo tool'").get() as Record<string, number>;
    expect(row.search_volume).toBe(5000);
    expect(row.difficulty).toBe(40);
    expect(() => upsertRow("content_items", { type: "bogus", title: "x", url: "https://e.com/x" })).toThrow();
  });
});
