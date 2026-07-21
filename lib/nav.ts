import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  Mail,
  Megaphone,
  Search,
  Settings,
  Share2,
  Tags,
} from "lucide-react";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};

/** Sidebar information architecture: executive → channels → reporting → admin. */
export const NAV: NavSection[] = [
  {
    items: [{ key: "overview", label: "Overview", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Channels",
    items: [
      { key: "content", label: "Content", href: "/content", icon: FileText },
      { key: "search", label: "Search & Traffic", href: "/search", icon: Search },
      { key: "keywords", label: "Keywords", href: "/keywords", icon: Tags },
      { key: "social", label: "Social", href: "/social", icon: Share2 },
      { key: "email", label: "Email", href: "/email", icon: Mail },
      { key: "campaigns", label: "Campaigns", href: "/campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Reporting",
    items: [
      { key: "monthly", label: "Monthly & Yearly", href: "/reports/monthly", icon: CalendarRange },
      { key: "compare", label: "Compare", href: "/reports/compare", icon: GitCompareArrows },
    ],
  },
  {
    items: [{ key: "settings", label: "Settings", href: "/settings", icon: Settings }],
  },
];
