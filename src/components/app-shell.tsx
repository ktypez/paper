import { Toaster } from "sonner";
import { Outlet } from "react-router";
import { Logo } from "./logo";
import { BottomNavigation, DesktopNavigation } from "./navigation";
import { ThemeToggle } from "./theme-toggle";

export function AppShell() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-[8px] bg-ink px-4 py-3 text-sm font-medium text-white transition-transform focus:translate-y-0"
      >
        ไปยังเนื้อหาหลัก
      </a>

      <header className="app-chrome sticky top-0 z-30 border-b border-line bg-canvas/92 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="hidden md:block">
            <DesktopNavigation />
          </div>
          <div className="flex items-center gap-1 md:order-last">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1280px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-8"
      >
        <Outlet />
      </main>

      <BottomNavigation />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
