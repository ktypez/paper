import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  className?: string;
}

function CountUp({ value }: { value: string }) {
  const reduce = useReducedMotion();
  const isNumeric = /^\d+$/.test(value);
  const spring = useMotionValue(0);
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    if (!isNumeric || reduce) return;
    const target = Number(value);
    const duration = 600;
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      spring.set(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, isNumeric, reduce, spring]);

  if (isNumeric && !reduce) {
    return (
      <motion.span className="truncate text-lg font-semibold leading-none tabular-nums text-foreground">
        {display}
      </motion.span>
    );
  }
  return (
    <span className="truncate text-lg font-semibold leading-none tabular-nums text-foreground">
      {value}
    </span>
  );
}

export function StatTile({ icon: Icon, label, value, sub, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent",
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent-ink" />
        <span className="truncate">{label}</span>
      </span>
      <CountUp value={value} />
      {sub ? <span className="truncate text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  );
}
