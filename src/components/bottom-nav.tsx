import { NavLink, useLocation } from "react-router";
import { motion, LayoutGroup } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Tags,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TouchArea } from "@/components/ui/touch-area";

const navItems = [
  { to: "/", label: "หน้าแรก", icon: LayoutDashboard },
  { to: "/receipts", label: "เอกสาร", icon: FileText },
  { to: "/upload", label: "อัปโหลด", icon: Upload },
  { to: "/categories", label: "หมวดหมู่", icon: Tags },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <LayoutGroup>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item, index) => {
          const isCenter = index === 2;
          const isActive = location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="relative flex flex-col items-center gap-1"
            >
              {isCenter ? (
                <TouchArea asChild>
                  <motion.div
                    className="relative -top-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1c1c1c] text-[#fcfbf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.2)]"
                    whileTap={{ scale: 0.9 }}
                  >
                  <Upload className="h-6 w-6" />
                  </motion.div>
                </TouchArea>
              ) : (
                <TouchArea asChild>
                  <motion.div
                    className="flex flex-col items-center gap-1"
                    whileTap={{ scale: 0.85 }}
                  >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -bottom-1 h-0.5 w-4 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    style={{ opacity: isActive ? 1 : 0 }}
                  />
                  </motion.div>
                </TouchArea>
              )}
            </NavLink>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}