import { redirect } from "next/navigation";

// Monthly and yearly are now one combined report.
export default function YearlyRedirect() {
  redirect("/reports/monthly");
}
