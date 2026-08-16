import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  className?: string;
}

export function StatTile({ icon: Icon, label, value, sub, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2.5",
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-lg font-semibold leading-none tabular-nums text-foreground">
        {value}
      </span>
      {sub ? <span className="truncate text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  );
}
