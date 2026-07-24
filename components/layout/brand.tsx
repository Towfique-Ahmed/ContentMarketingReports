import { cn } from "@/lib/utils";

export type BrandInfo = { name: string; logo: string | null };

/** Logo (uploaded in Settings) or a letter mark, plus the site name. */
export function Brand({ brand, compact }: { brand: BrandInfo; compact?: boolean }) {
  const box = compact ? "h-7 w-7" : "h-8 w-8";
  return (
    <span className="flex min-w-0 items-center gap-2">
      {brand.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from settings
        <img src={brand.logo} alt="" className={cn(box, "shrink-0 rounded-lg object-contain")} />
      ) : (
        <span
          className={cn(
            box,
            "flex shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground",
            compact ? "text-xs" : "text-sm",
          )}
          aria-hidden
        >
          {(brand.name.trim()[0] ?? "A").toUpperCase()}
        </span>
      )}
      <span className={cn("truncate font-semibold", compact ? "text-sm" : "text-base")}>{brand.name}</span>
    </span>
  );
}
