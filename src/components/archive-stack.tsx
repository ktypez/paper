import { cn } from "@/lib/utils";

// Small decorative "stack of documents" motif, used on brand surfaces
// (login, dashboard hero, empty states). Pure framed rectangles, no SVG.
export function ArchiveStack({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-end gap-2", className)}
      aria-hidden="true"
    >
      <div className="h-14 w-12 rounded-md border border-border bg-background" />
      <div className="h-16 w-12 rounded-md border border-primary/30 bg-primary/5" />
      <div className="h-20 w-12 rounded-md border border-border bg-background shadow-[var(--shadow)]" />
    </div>
  );
}