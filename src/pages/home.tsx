import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Camera, Library, Settings } from "lucide-react";
import { listQueuedUploads, thumbUrl } from "@/lib/api-v2";
import { useReceiptsInfinite } from "@/lib/query";
import { OutboxBadge } from "@/components/outbox-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function Home() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useReceiptsInfinite({}, 30);
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
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex min-h-[56px] w-full max-w-3xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight">Paper</span>
          <nav className="flex items-center gap-1">
            <OutboxBadge />
            <Link
              to="/lib"
              aria-label="คลังเอกสาร"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground"
            >
              <Library className="h-5 w-5" />
            </Link>
            <Link
              to="/settings"
              aria-label="ตั้งค่า"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <section aria-label="ถ่ายเอกสารใหม่">
          <Link
            to="/capture"
            className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-none border-2 border-border bg-primary px-4 py-8 text-primary-foreground"
          >
            <Camera className="h-10 w-10" />
            <span className="text-lg font-bold">ถ่าย / อัปโหลดเอกสาร</span>
            <span className="text-sm opacity-80">แตะเพื่อเริ่มสแกนใบเสร็จ</span>
          </Link>
          {pending > 0 && (
            <Link
              to="/capture"
              className="mt-3 flex min-h-[44px] items-center justify-between rounded-none border border-border bg-card px-4 text-sm"
            >
              <span>มีเอกสารรออัปโหลด {pending} รายการ</span>
              <span className="font-bold underline">ดูคิว</span>
            </Link>
          )}
        </section>

        <section aria-label="เอกสารล่าสุด">
          <div className="mb-3 flex min-h-[44px] items-center justify-between">
            <h2 className="text-base font-bold">ล่าสุด</h2>
            <Link to="/lib" className="inline-flex min-h-[44px] items-center text-sm underline">
              ดูทั้งหมด
            </Link>
          </div>

          {isLoading && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
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
              ยังไม่มีเอกสาร แตะปุ่มด้านบนเพื่อเพิ่มใบเสร็จแรก
            </p>
          )}

          {items.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {items.map((r) => (
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
              {hasNextPage && (
                <Button
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="mt-4 min-h-[44px] w-full rounded-none"
                >
                  {isFetchingNextPage ? "กำลังโหลด…" : "โหลดเพิ่ม"}
                </Button>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
