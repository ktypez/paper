import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaperPlaneProps {
  className?: string;
  iconClassName?: string;
}

/** Friendly "Peppi" the paper plane brand mascot, built from lucide + rounded divs. */
export function PaperPlane({ className, iconClassName }: PaperPlaneProps) {
  return (
    <div aria-hidden className={cn("relative h-16 w-16", className)}>
      <div className="absolute inset-y-1 left-2 w-3 rotate-6 rounded-sm border border-border bg-card" />
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-from to-brand-to text-white">
        <Send className={cn("h-8 w-8 -translate-x-0.5 translate-y-0.5 rotate-[8deg]", iconClassName)} />
      </div>
      <div className="absolute -right-0.5 top-1 h-2 w-2 rounded-full bg-accent-sun" />
      <div className="absolute bottom-0 right-2 h-1.5 w-1.5 rounded-full bg-accent-coral" />
    </div>
  );
}
