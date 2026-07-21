import { NextRequest } from "next/server";
import { getDataset } from "@/lib/datasets/config";
import { template } from "@/lib/datasets/import";

export function GET(req: NextRequest) {
  const set = req.nextUrl.searchParams.get("set") ?? "";
  if (!getDataset(set)) {
    return new Response("Unknown dataset", { status: 404 });
  }
  return new Response(template(set), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${set}_template.csv"`,
    },
  });
}
