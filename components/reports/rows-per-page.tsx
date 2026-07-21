"use client";

import { useRouter } from "next/navigation";

/** Rows-per-page selector; navigates to the precomputed href on change. */
export function RowsPerPage({
  perPage,
  options,
}: {
  perPage: number;
  options: { value: number; href: string }[];
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      Rows
      <select
        value={perPage}
        onChange={(e) => {
          const opt = options.find((o) => o.value === Number(e.target.value));
          if (opt) router.push(opt.href);
        }}
        className="rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground"
        aria-label="Rows per page"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value}
          </option>
        ))}
      </select>
    </label>
  );
}
