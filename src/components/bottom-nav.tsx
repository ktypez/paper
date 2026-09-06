import { NavLink, useLocation } from "react-router";
import { Home, Images, Camera, Tags, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { TouchArea } from "@/components/ui/touch-area";

const navItems = [
  { to: "/", label: "หน้าแรก", icon: Home },
  { to: "/lib", label: "รูปทั้งหมด", icon: Images },
  { to: "/capture", label: "ถ่าย", icon: Camera, center: true },
  { to: "/categories", label: "หมวดหมู่", icon: Tags },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-14 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="relative flex flex-col items-center gap-1"
            >
              {item.center ? (
                <TouchArea asChild>
                  <span className="relative -top-6 flex h-12 w-12 items-center justify-center rounded-none bg-primary text-primary-foreground transition-transform active:scale-90">
                    <item.icon className="h-6 w-6" />
                  </span>
                </TouchArea>
              ) : (
                <TouchArea asChild>
                  <span className="flex flex-col items-center gap-1 transition-transform active:scale-90">
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "absolute -bottom-1 h-0.5 w-4 bg-foreground transition-opacity",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </span>
                </TouchArea>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
