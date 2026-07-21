import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as schema from "./schema";

/*
 * Single shared better-sqlite3 connection, opened LAZILY on first real use.
 *
 * Nothing here touches the filesystem at import time — that matters because
 * `next build` imports every route module to collect page data, and opening
 * the database (or creating its directory) during the build would fail on a
 * read-only build sandbox. The connection + migrations run on the first
 * request instead, via the exported proxies or ensureDb().
 *
 * The data file is one SQLite file under ./data (override with DATABASE_PATH).
 */

type DbClient = BetterSQLite3Database<typeof schema>;

let _sqlite: Database.Database | null = null;
let _db: DbClient | null = null;
let migrated = false;

function openAt(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const s = new Database(dbPath);
  s.pragma("journal_mode = WAL");
  s.pragma("foreign_keys = ON");
  return s;
}

function connect() {
  if (_sqlite) return;
  const configured = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.sqlite");
  try {
    _sqlite = openAt(configured);
  } catch (e) {
    // A non-writable data dir (e.g. DATABASE_PATH=/data on a locked-down host)
    // must not take the whole site down. Fall back to a writable temp location
    // and log loudly — data there is NOT persistent across restarts.
    const fallback = path.join(os.tmpdir(), "analytio-data", "app.sqlite");
    console.error(
      `[db] Cannot open database at "${configured}" (${(e as Error).message}). ` +
        `Falling back to "${fallback}". Set DATABASE_PATH to a writable path for persistent data.`,
    );
    _sqlite = openAt(fallback);
  }
  _db = drizzle(_sqlite, { schema });
}

/** Open the connection, run migrations, and seed defaults. Idempotent. */
export function ensureDb() {
  connect();
  if (migrated) return;
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (fs.existsSync(migrationsFolder)) {
    migrate(_db!, { migrationsFolder });
  }
  const token = () => crypto.randomBytes(16).toString("hex");
  _db!.run(sql`
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('site_name', 'Analytio'),
      ('sync_time', '06:00'),
      ('timezone', 'UTC'),
      ('cron_token', ${token()}),
      ('mcp_token', ${token()})
  `);
  migrated = true;
}

// Lazy proxies: any property access opens + migrates the DB first, so call
// sites keep using `db`/`sqlite` directly with zero import-time side effects.
function lazyProxy<T extends object>(get: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      ensureDb();
      const target = get() as Record<PropertyKey, unknown>;
      const value = target[prop];
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  });
}

export const sqlite = lazyProxy<Database.Database>(() => _sqlite as Database.Database);
export const db = lazyProxy<DbClient>(() => _db as DbClient);
export { schema };
