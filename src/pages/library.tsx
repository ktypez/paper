// Library (Variant D · Timeline): compact header with search, category
// filter select, month-grouped time rail, slide-over detail + lightbox.
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { type Receipt } from "@/lib/api-v2";
import { useCategories, useReceiptsInfinite } from "@/lib/query";
import { TimelineList } from "@/components/timeline";
import { ReceiptPanel } from "@/components/receipt-panel";
import { Skeleton } from "@/components/ui/skeleton";

export function Library() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput.trim() ? qInput.trim() : null);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const cats = useCategories();
  const list = useReceiptsInfinite({ category: category || null, q });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = list;

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filtering = q !== null || category !== "";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="sticky top-12 z-10 -mx-3 bg-background/95 px-3 pt-1 backdrop-blur-sm lg:-mx-6 lg:px-6">
        <div className="flex min-h-[44px] items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold">เอกสารทั้งหมด</h1>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">{items.length} รายการ</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (searchOpen && qInput) {
                setQInput("");
              } else {
                setSearchOpen(true);
              }
            }}
            aria-label="ค้นหาเอกสาร"
            aria-expanded={searchOpen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-muted"
          >
            {searchOpen && qInput ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
        </div>

        {searchOpen && (
          <input
            ref={searchRef}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="ค้นหาชื่อไฟล์ / โน้ต / เจ้าของ…"
            aria-label="ค้นหาเอกสาร"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-muted/60 px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        )}

        <div className="flex items-center gap-2 pb-2 pt-1">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="กรองตามหมวดหมู่"
            className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="">ทุกหมวดหมู่</option>
            {(cats.data ?? []).map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="px-1 py-3">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            โหลดเอกสารไม่สำเร็จ กรุณาลองใหม่
          </p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <p className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            {filtering ? "ไม่พบเอกสารที่ตรงเงื่อนไข" : "ยังไม่มีเอกสารในคลัง"}
          </p>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <>
            <TimelineList items={items} onOpen={setSelected} />
            <div ref={sentinelRef} className="flex min-h-[44px] items-center justify-center py-3">
              {isFetchingNextPage ? (
                <span className="text-sm text-muted-foreground">กำลังโหลด…</span>
              ) : !hasNextPage ? (
                <span className="text-xs text-muted-foreground">แสดงครบทั้งหมดแล้ว</span>
              ) : null}
            </div>
          </>
        )}
      </main>

      {selected && <ReceiptPanel receipt={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
