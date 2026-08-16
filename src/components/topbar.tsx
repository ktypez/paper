import { PanelLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TouchArea } from "@/components/ui/touch-area";
import { useMediaQuery } from "@/lib/use-media-query";
import { useLocation, useNavigate } from "react-router";

const pageTitles: Record<string, string> = {
  "/": "หน้าหลัก",
  "/receipts": "เอกสาร",
  "/upload": "อัปโหลด",
  "/categories": "หมวดหมู่",
  "/settings": "ตั้งค่า",
};

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const isDetail = location.pathname.startsWith("/receipts/") && location.pathname !== "/receipts";
  const title = pageTitles[location.pathname] || "Paper";

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border bg-background px-3 lg:px-6">
      {isDetail && isMobile ? (
        <TouchArea asChild>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="กลับ">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </TouchArea>
      ) : !isMobile ? (
        <TouchArea asChild>
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="Toggle sidebar">
            <PanelLeft className="h-5 w-5" />
          </Button>
        </TouchArea>
      ) : null}

      <h1 className="truncate font-display text-base font-semibold tracking-tight text-foreground">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
