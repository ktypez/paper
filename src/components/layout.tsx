import { useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Topbar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { Toaster } from "sonner";

export function Layout() {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-[100dvh] bg-background">
      {isMobile ? <BottomNav /> : <Sidebar open={sidebarOpen} />}

      <div
        className={cn(
          "transition-all duration-300",
          !isMobile && sidebarOpen && "ml-56",
          isMobile && "pb-20"  // Space for bottom nav
        )}
      >
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
