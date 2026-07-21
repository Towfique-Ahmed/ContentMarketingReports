import { ensureDb } from "./client";

// CLI entry: `npm run db:migrate` — applies migrations and seeds defaults.
ensureDb();
console.log("Database is up to date.");
