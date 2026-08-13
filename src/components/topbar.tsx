import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TouchArea } from "@/components/ui/touch-area";
import { useMediaQuery } from "@/lib/use-media-query";
import { useLocation } from "react-router";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/receipts": "Documents",
  "/upload": "Upload",
  "/categories": "Categories",
  "/settings": "Settings",
};

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const title = pageTitles[location.pathname] || "Paper";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
      {!isMobile && (
        <TouchArea asChild>
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </TouchArea>
      )}

      <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}