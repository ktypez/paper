// Bottom nav — clean 2 + 2 layout around a centered capture FAB.
// Active state = soft pill behind the icon (no dot indicators).
import { NavLink, useLocation } from "react-router";
import { Camera, Home, Images, Settings, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemDef {
  to: string;
  label: string;
  icon: typeof Home;
}

const leftItems: NavItemDef[] = [
  { to: "/", label: "หน้าแรก", icon: Home },
  { to: "/lib", label: "เอกสาร", icon: Images },
];

const rightItems: NavItemDef[] = [
  { to: "/categories", label: "หมวดหมู่", icon: Tags },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];

function NavItem({ item, isActive }: { item: NavItemDef; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-11 items-center justify-center rounded-full transition-colors",
          isActive && "bg-muted"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
      </span>
      <span className={cn("text-[10px] transition-colors", isActive && "font-semibold")}>
        {item.label}
      </span>
    </NavLink>
  );
}

export function BottomNav() {
  const location = useLocation();
  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative mx-auto flex h-16 max-w-2xl items-center px-3">
        <div className="flex flex-1 items-center justify-around">
          {leftItems.map((item) => (
            <NavItem key={item.to} item={item} isActive={isActive(item.to)} />
          ))}
        </div>

        <NavLink
          to="/capture"
          aria-label="ถ่าย / อัปโหลดเอกสาร"
          className="absolute left-1/2 -top-4 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-background transition-transform active:scale-90"
        >
          <Camera className="h-6 w-6" />
        </NavLink>

        <div className="flex flex-1 items-center justify-around">
          {rightItems.map((item) => (
            <NavItem key={item.to} item={item} isActive={isActive(item.to)} />
          ))}
        </div>
      </div>
    </nav>
  );
}
