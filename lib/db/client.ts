import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/*
 * Single shared better-sqlite3 connection. The database is one file under
 * ./data (override with DATABASE_PATH) so the app stays self-hostable — mount
 * that directory as a volume to persist data.
 */
const dbPath =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.sqlite");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Bring the schema up to date and seed default settings on first boot. Runs
// once per process; better-sqlite3 is synchronous so this is safe at import.
let ready = false;
export function ensureDb() {
  if (ready) return;
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (fs.existsSync(migrationsFolder)) {
    migrate(db, { migrationsFolder });
  }
  const token = () => crypto.randomBytes(16).toString("hex");
  db.run(sql`
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('site_name', 'Analytio'),
      ('sync_time', '06:00'),
      ('timezone', 'UTC'),
      ('cron_token', ${token()}),
      ('mcp_token', ${token()})
  `);
  ready = true;
}

ensureDb();

export { schema, sqlite };
