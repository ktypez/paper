import { Archive, Ellipsis, Home, Plus, Search } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "@/lib/cn";

const items = [
  { to: "/", label: "ล่าสุด", icon: Home, end: true },
  { to: "/library", label: "คลัง", icon: Archive, end: false },
  { to: "/search", label: "ค้นหา", icon: Search, end: false },
  { to: "/more", label: "อื่น ๆ", icon: Ellipsis, end: false },
] as const;

function navClass(isActive: boolean) {
  return cn(
    "flex min-h-11 items-center gap-2 rounded-[8px] px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    isActive ? "bg-accent-quiet text-accent" : "text-muted hover:bg-ink/[0.05] hover:text-ink",
  );
}

export function DesktopNavigation() {
  return (
    <nav className="flex items-center gap-1" aria-label="เมนูหลัก">
      {items.slice(0, 3).map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => navClass(isActive)}>
          <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
      <NavLink
        to="/capture"
        className={({ isActive }) =>
          cn(
            "ml-1 inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            isActive ? "bg-accent-hover" : "bg-accent-solid hover:bg-accent-hover",
          )
        }
      >
        <Plus aria-hidden="true" size={18} strokeWidth={2} />
        เพิ่มเอกสาร
      </NavLink>
      <NavLink to="/more" className={({ isActive }) => navClass(isActive)}>
        <Ellipsis aria-hidden="true" size={18} strokeWidth={1.8} />
        อื่น ๆ
      </NavLink>
    </nav>
  );
}

export function BottomNavigation() {
  return (
    <nav
      className="app-chrome fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md md:hidden"
      aria-label="เมนูหลัก"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[8px] text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink",
                isActive ? "text-accent" : "text-muted",
              )
            }
          >
            <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
        <NavLink
          to="/capture"
          className={({ isActive }) =>
            cn(
              "mx-auto -mt-5 grid min-h-14 w-14 place-items-center rounded-[14px] border-4 border-canvas text-white shadow-[0_4px_14px_rgba(24,33,29,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              isActive ? "bg-accent-hover" : "bg-accent-solid",
            )
          }
          aria-label="เพิ่มเอกสาร"
        >
          <Plus aria-hidden="true" size={24} strokeWidth={2} />
        </NavLink>
        {items.slice(2).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[8px] text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink",
                isActive ? "text-accent" : "text-muted",
              )
            }
          >
            <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
