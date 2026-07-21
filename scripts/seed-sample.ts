import fs from "node:fs";
import path from "node:path";
import { importCsv } from "@/lib/datasets/import";

/*
 * Load the bundled xCloud sample exports into the current database so the
 * reports have data to show. Run: `npm run seed:sample`.
 */
const dir = path.join(process.cwd(), "test", "fixtures");

const ga = importCsv("ga_channels", fs.readFileSync(path.join(dir, "ga4.csv"), "utf8"));
console.log(`GA4 channels + totals: ${ga.ok} rows imported, ${ga.skipped} skipped`);

const gsc = importCsv("gsc_monthly", fs.readFileSync(path.join(dir, "gsc.csv"), "utf8"));
console.log(`GSC monthly: ${gsc.ok} months imported, ${gsc.skipped} skipped`);

console.log("Done. Set the date range to 'All' to see everything.");
