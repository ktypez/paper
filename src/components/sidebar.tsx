import { NavLink } from "react-router";
import { Home, Images, Camera, Tags, Settings, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "หน้าแรก", icon: Home },
  { to: "/lib", label: "รูปทั้งหมด", icon: Images },
  { to: "/capture", label: "ถ่าย/อัปโหลด", icon: Camera },
  { to: "/categories", label: "หมวดหมู่", icon: Tags },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];

interface SidebarProps {
  open: boolean;
}

export function Sidebar({ open }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 flex h-dvh w-56 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "-translate-x-56"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
          <FileText className="h-4 w-4" />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight text-sidebar-foreground">
          Paper
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:scale-[0.98] h-11",
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
