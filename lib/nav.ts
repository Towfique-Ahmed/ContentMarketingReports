/*
 * Navigation data. Items carry an icon *key* (string) instead of a component
 * so nav can be built on the server (including user-created pages from the
 * database) and passed to client components. Icon keys resolve to Lucide
 * icons in components/layout/nav-icons.ts.
 */

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: string;
  /** External links open in a new tab. */
  external?: boolean;
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};

/** Sidebar information architecture: executive → channels → reporting → admin. */
export const NAV: NavSection[] = [
  {
    items: [{ key: "overview", label: "Overview", href: "/", icon: "layout-dashboard" }],
  },
  {
    label: "Channels",
    items: [
      { key: "content", label: "Content", href: "/content", icon: "file-text" },
      { key: "search", label: "Search & Traffic", href: "/search", icon: "search" },
      { key: "keywords", label: "Keywords", href: "/keywords", icon: "tags" },
      { key: "social", label: "Social", href: "/social", icon: "share-2" },
      { key: "email", label: "Email", href: "/email", icon: "mail" },
      { key: "campaigns", label: "Campaigns", href: "/campaigns", icon: "megaphone" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { key: "monthly", label: "Monthly & Yearly", href: "/reports/monthly", icon: "calendar-range" },
      { key: "compare", label: "Compare", href: "/reports/compare", icon: "git-compare-arrows" },
    ],
  },
  {
    items: [{ key: "settings", label: "Settings", href: "/settings", icon: "settings" }],
  },
];

/** Built-in pages the user may hide from the sidebar (Overview & Settings stay). */
export const HIDEABLE_NAV: NavItem[] = NAV.flatMap((s) => s.items).filter(
  (i) => i.key !== "overview" && i.key !== "settings",
);

/** Icon keys offered when creating a custom page (resolved in nav-icons.ts). */
export const PAGE_ICONS: { key: string; label: string }[] = [
  { key: "file-text", label: "Document" },
  { key: "star", label: "Star" },
  { key: "folder", label: "Folder" },
  { key: "link", label: "Link" },
  { key: "globe", label: "Globe" },
  { key: "book-open", label: "Book" },
  { key: "lightbulb", label: "Idea" },
  { key: "target", label: "Target" },
  { key: "users", label: "People" },
  { key: "bar-chart-3", label: "Chart" },
  { key: "dollar-sign", label: "Money" },
  { key: "bell", label: "Bell" },
  { key: "flag", label: "Flag" },
  { key: "heart", label: "Heart" },
  { key: "rocket", label: "Rocket" },
  { key: "pen-line", label: "Pen" },
  { key: "clipboard-list", label: "Checklist" },
  { key: "calendar-range", label: "Calendar" },
  { key: "megaphone", label: "Megaphone" },
  { key: "search", label: "Search" },
];
