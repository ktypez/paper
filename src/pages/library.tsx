import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { thumbUrl } from "@/lib/api-v2";
import { useCategories, useReceiptsInfinite } from "@/lib/query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const COLS = 3;
const ROW_PX = 120;

export function Library() {
  const [qInput, setQInput] = useState("");
  const [ownerInput, setOwnerInput] = useState("");
  const [q, setQ] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput.trim() ? qInput.trim() : null);
      setOwner(ownerInput.trim() ? ownerInput.trim() : null);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, ownerInput]);

  const cats = useCategories();
  const list = useReceiptsInfinite({ category, owner, q });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = list;

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const rowCount = Math.ceil(items.length / COLS);

  const parentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_PX,
    overscan: 4,
  });
  const virtualRows = virtualizer.getVirtualItems();

  useEffect(() => {
    if (virtualRows.length === 0) return;
    const last = virtualRows[virtualRows.length - 1];
    if (last.index >= rowCount - 2 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [virtualRows, rowCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = parentRef.current;
    if (!el || !root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rowCount]);

  const filtering = q !== null || owner !== null || category !== null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-3">
          <h1 className="text-lg font-bold">คลังเอกสาร</h1>
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="ค้นหาชื่อไฟล์ / โน้ต…"
            aria-label="ค้นหาเอกสาร"
            className="min-h-[44px] rounded-none"
          />
          <Input
            value={ownerInput}
            onChange={(e) => setOwnerInput(e.target.value)}
            placeholder="กรองตามเจ้าของ…"
            aria-label="กรองตามเจ้าของ"
            className="min-h-[44px] rounded-none"
          />
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="กรองตามหมวดหมู่"
          >
            <button
              type="button"
              onClick={() => setCategory(null)}
              aria-pressed={category === null}
              className={`inline-flex min-h-[44px] shrink-0 items-center rounded-none border border-border px-4 text-sm ${
                category === null
                  ? "bg-primary font-bold text-primary-foreground"
                  : "bg-card text-foreground"
              }`}
            >
              ทั้งหมด
            </button>
            {(cats.data ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(category === c.name ? null : c.name)}
                aria-pressed={category === c.name}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-none border border-border px-4 text-sm ${
                  category === c.name
                    ? "bg-primary font-bold text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {c.name}
                <span className="text-xs opacity-70">({c.count})</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-4">
        {isLoading && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-none" />
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-none border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            โหลดเอกสารไม่สำเร็จ กรุณาลองใหม่
          </p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <p className="rounded-none border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            {filtering ? "ไม่พบเอกสารที่ตรงกับเงื่อนไข" : "ยังไม่มีเอกสารในคลัง"}
          </p>
        )}

        {items.length > 0 && (
          <div
            ref={parentRef}
            className="h-[60vh] overflow-auto rounded-none border border-border bg-background"
          >
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualRows.map((vr) => {
                const rowItems = items.slice(vr.index * COLS, vr.index * COLS + COLS);
                return (
                  <div
                    key={vr.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${vr.start}px)`,
                    }}
                  >
                    <div className="grid grid-cols-3 gap-2 px-2 pt-2">
                      {rowItems.map((r) => (
                        <Link
                          key={r.id}
                          to={`/r/${r.id}`}
                          aria-label={r.filename}
                          className="block min-h-[44px] rounded-none border border-border bg-card"
                        >
                          <img
                            src={thumbUrl(r)}
                            alt={r.filename}
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={sentinelRef} className="flex min-h-[44px] items-center justify-center p-2">
              {isFetchingNextPage ? (
                <span className="text-sm text-muted-foreground">กำลังโหลด…</span>
              ) : hasNextPage ? (
                <Button
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                  className="min-h-[44px] w-full rounded-none"
                >
                  โหลดเพิ่ม
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">แสดงครบทั้งหมดแล้ว</span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
