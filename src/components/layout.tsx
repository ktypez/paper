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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to main content
      </a>

      {isMobile ? <BottomNav /> : <Sidebar open={sidebarOpen} />}

      <div
        className={cn(
          "transition-all duration-300",
          !isMobile && sidebarOpen && "ml-56",
          isMobile && "pb-20"
        )}
      >
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main id="main-content" className="p-4 lg:p-6" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <Toaster position="bottom-right" richColors closeButton duration={4000} />
    </div>
  );
}
