import type { NavSection } from "@/lib/nav";
import { Brand, type BrandInfo } from "./brand";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ brand, sections }: { brand: BrandInfo; sections: NavSection[] }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 shadow-sm backdrop-blur">
      <MobileNav brand={brand} sections={sections} />
      <span className="min-w-0 lg:hidden">
        <Brand brand={brand} compact />
      </span>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
