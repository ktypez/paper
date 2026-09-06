// Timeline list (Variant D): month groups, left time rail with dots,
// compact 76px rows with 56px thumbs. Shared by Home and Library.
import { useMemo } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { isImage, thumbUrl, type Receipt } from "@/lib/api-v2";
import { formatMonth, formatWhen } from "@/lib/format";

interface MonthGroup {
  key: string;
  label: string;
  items: Receipt[];
}

function groupByMonth(items: Receipt[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const r of items) {
    const d = new Date(r.uploaded_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const g = map.get(key);
    if (g) {
      g.items.push(r);
    } else {
      map.set(key, { key, label: formatMonth(d), items: [r] });
    }
  }
  return [...map.values()];
}

export function TimelineRow({
  r,
  onOpen,
}: {
  r: Receipt;
  onOpen: (r: Receipt) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(r)}
      aria-label={r.filename}
      className="relative flex w-full min-h-[76px] items-center gap-3 py-2 pr-2 text-left transition-colors active:bg-muted/60"
    >
      <span
        aria-hidden
        className="absolute -left-[27px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-foreground bg-background"
      />
      {isImage(r) ? (
        <img
          src={thumbUrl(r)}
          alt={r.filename}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-xl bg-muted object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileText className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {r.filename}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {r.category}
          {r.owner ? ` · ${r.owner}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="text-xs text-muted-foreground">{formatWhen(r.uploaded_at)}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      </span>
    </button>
  );
}

export function TimelineList({
  items,
  onOpen,
}: {
  items: Receipt[];
  onOpen: (r: Receipt) => void;
}) {
  const months = useMemo(() => groupByMonth(items), [items]);

  return (
    <div className="space-y-4">
      {months.map((m) => (
        <section key={m.key} aria-label={m.label}>
          <h2 className="px-1 py-2 text-[13px] font-bold text-muted-foreground">
            {m.label}
          </h2>
          <div className="ml-4 space-y-1 border-l-2 border-border pl-5">
            {m.items.map((r) => (
              <TimelineRow key={r.id} r={r} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
