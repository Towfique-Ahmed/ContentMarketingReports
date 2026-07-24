import type { Metadata } from "next";
import { SidebarNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getBranding, themeCss } from "@/lib/branding";
import { buildNav } from "@/lib/nav-data";

// Every report reads live data per request — never prerender at build time
// (which would also try to open the database in a read-only build sandbox).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getBranding();
  return { title: { default: siteName, template: `%s · ${siteName}` } };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const branding = getBranding();
  const sections = buildNav();
  const css = themeCss(branding);
  const brand = { name: branding.siteName, logo: branding.logo };

  return (
    <div className="flex min-h-screen">
      {/* Appearance settings (accent, font, radius, density) applied app-wide. */}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto">
          <SidebarNav brand={brand} sections={sections} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar brand={brand} sections={sections} />
        <main id="main-content" className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
