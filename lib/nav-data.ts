import { asc } from "drizzle-orm";
import { db } from "./db/client";
import { customPages } from "./db/schema";
import { getSetting } from "./settings";
import { NAV, type NavItem, type NavSection } from "./nav";

/*
 * Server-side sidebar builder: built-in sections (minus any the user hid in
 * Settings) plus user-created pages from the database, grouped by their
 * chosen section. A custom section whose name matches a built-in group
 * ("Channels", "Reporting") merges into it; other names become new groups
 * placed after Reporting and before Settings.
 */

export type CustomPage = typeof customPages.$inferSelect;

export function getCustomPages(): CustomPage[] {
  return db.select().from(customPages).orderBy(asc(customPages.position), asc(customPages.id)).all();
}

export function getHiddenNavKeys(): Set<string> {
  return new Set(
    (getSetting("nav_hidden") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function toNavItem(p: CustomPage): NavItem {
  const external = p.kind === "link" && !!p.url;
  return {
    key: `custom-${p.id}`,
    label: p.title,
    href: external ? p.url! : `/custom/${p.slug}`,
    icon: p.icon || "file-text",
    external,
  };
}

export function buildNav(): NavSection[] {
  const hidden = getHiddenNavKeys();
  const sections: NavSection[] = NAV.map((s) => ({
    label: s.label,
    items: s.items.filter((i) => !hidden.has(i.key)),
  })).filter((s) => s.items.length > 0);

  const groups = new Map<string, NavItem[]>();
  for (const p of getCustomPages()) {
    const label = (p.section ?? "").trim() || "My pages";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(toNavItem(p));
  }

  for (const [label, items] of groups) {
    const existing = sections.find((s) => s.label?.toLowerCase() === label.toLowerCase());
    if (existing) {
      existing.items.push(...items);
    } else {
      // Insert before the trailing Settings section.
      const settingsIdx = sections.findIndex((s) => s.items.some((i) => i.key === "settings"));
      const section = { label, items };
      if (settingsIdx === -1) sections.push(section);
      else sections.splice(settingsIdx, 0, section);
    }
  }
  return sections;
}
