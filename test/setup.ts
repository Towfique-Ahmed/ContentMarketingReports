import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Isolate tests on a throwaway SQLite file, recreated each run.
const dbPath = path.join(os.tmpdir(), "cmr-vitest.sqlite");
process.env.DATABASE_PATH = dbPath;
for (const suffix of ["", "-wal", "-shm"]) {
  try {
    fs.unlinkSync(dbPath + suffix);
  } catch {
    /* not present */
  }
}
