"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Brand, type BrandInfo } from "./brand";
import { navIcon } from "./nav-icons";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({
  brand,
  sections,
  onNavigate,
}: {
  brand: BrandInfo;
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-5 p-4">
      <div className="border-b border-border px-2 pb-4">
        <Link href="/" onClick={onNavigate} className="block rounded-md focus-visible:outline-none">
          <Brand brand={brand} />
        </Link>
      </div>
      {sections.map((section, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {section.label && (
            <div className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </div>
          )}
          {section.items.map((item) => {
            const active = !item.external && isActive(pathname, item.href);
            const Icon = navIcon(item.icon);
            const cls = cn(
              "relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            );
            const inner = (
              <>
                {active && (
                  <span
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.external && <ExternalLink className="size-3.5 shrink-0 opacity-60" aria-hidden />}
              </>
            );
            return item.external ? (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavigate}
                className={cls}
              >
                {inner}
              </a>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cls}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
