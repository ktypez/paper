// Home (capture-first): rounded capture CTA + recent receipts as a
// timeline with slide-over detail. Variant D styling.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Camera } from "lucide-react";
import { listQueuedUploads, type Receipt } from "@/lib/api-v2";
import { useReceiptsInfinite } from "@/lib/query";
import { OutboxBadge } from "@/components/outbox-badge";
import { TimelineList } from "@/components/timeline";
import { ReceiptPanel } from "@/components/receipt-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function Home() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useReceiptsInfinite({}, 30);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [pending, setPending] = useState(0);

  const refreshOutbox = useCallback(async () => {
    try {
      const items = await listQueuedUploads();
      setPending(items.length);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshOutbox();
    const onFocus = () => void refreshOutbox();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshOutbox]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="sticky top-12 z-10 -mx-3 flex min-h-[44px] items-center justify-between bg-background/95 px-3 backdrop-blur-sm lg:-mx-6 lg:px-6">
        <span className="text-lg font-bold">Paper</span>
        <OutboxBadge />
      </header>

      <main className="space-y-6 px-1 py-4">
        <section aria-label="ถ่ายเอกสารใหม่">
          <Link
            to="/capture"
            className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-8 text-primary-foreground shadow-md transition-transform active:scale-[0.99]"
          >
            <Camera className="h-9 w-9" />
            <span className="text-base font-bold">ถ่าย / อัปโหลดเอกสาร</span>
            <span className="text-sm opacity-70">แตะเพื่อเริ่มสแกนใบเสร็จ</span>
          </Link>
          {pending > 0 && (
            <Link
              to="/capture"
              className="mt-3 flex min-h-[44px] items-center justify-between rounded-xl border border-border bg-card px-4 text-sm"
            >
              <span>มีเอกสารรออัปโหลด {pending} รายการ</span>
              <span className="font-semibold underline">ดูคิว</span>
            </Link>
          )}
        </section>

        <section aria-label="เอกสารล่าสุด">
          <div className="mb-2 flex min-h-[44px] items-center justify-between px-1">
            <h2 className="text-base font-bold">ล่าสุด</h2>
            <Link to="/lib" className="inline-flex min-h-[44px] items-center text-sm font-semibold underline">
              ดูทั้งหมด
            </Link>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
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
              ยังไม่มีเอกสาร แตะปุ่มด้านบนเพิ่มใบเสร็จแรก
            </p>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <>
              <TimelineList items={items} onOpen={setSelected} />
              {hasNextPage && (
                <Button
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="mt-3 min-h-[44px] w-full"
                >
                  {isFetchingNextPage ? "กำลังโหลด…" : "โหลดเพิ่ม"}
                </Button>
              )}
            </>
          )}
        </section>
      </main>

      {selected && <ReceiptPanel receipt={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
