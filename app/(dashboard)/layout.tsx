import { SidebarNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main-content" className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
