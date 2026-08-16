import { NavLink } from "react-router";
import { motion } from "framer-motion";
import { FileText, Upload, Tags, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/receipts", label: "Documents", icon: FileText },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
}

export function Sidebar({ open }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ x: open ? 0 : -224 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 z-40 flex h-dvh w-56 flex-col bg-sidebar border-r border-sidebar-border"
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <motion.div
          initial={{ rotate: -12, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 12 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to text-white"
        >
          <FileText className="h-4 w-4" />
        </motion.div>
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
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors active:scale-[0.98] h-11",
                isActive
                  ? "bg-[rgba(28,28,28,0.04)] text-foreground border-l-2 border-l-[#1c1c1c] pl-[11px]"
                  : "text-sidebar-foreground/70 hover:bg-[rgba(28,28,28,0.04)] hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </motion.aside>
  );
}