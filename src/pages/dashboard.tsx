import { useMemo } from "react";
import { Link } from "react-router";
import { Upload, ReceiptText, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TouchArea } from "@/components/ui/touch-area";
import { useReceipts } from "@/hooks/use-receipts";
import { formatDateShort, formatSize } from "@/lib/utils";
import { getFileUrl } from "@/lib/api";
import { QuickUpload } from "@/components/quick-upload";
import { ArchiveStack } from "@/components/archive-stack";
import type { Receipt } from "@/types";

function RecentReceipt({ r }: { r: Receipt }) {
  return (
    <Link
      to={`/receipts/${r.id}`}
      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/60"
    >
      <TouchArea className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-background">
        {r.content_type.startsWith("image/") ? (
          <img
            src={getFileUrl(r.id)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ReceiptText className="h-5 w-5 text-muted-foreground" />
        )}
      </TouchArea>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{r.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateShort(r.uploaded_at)} &middot; {formatSize(r.size)}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0">
        {r.category}
      </Badge>
    </Link>
  );
}

function EmptyArchive() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <ArchiveStack />
      <div className="space-y-1">
        <h3 className="font-display text-lg text-foreground">ยังไม่มีเอกสาร</h3>
        <p className="text-sm text-muted-foreground">
          อัปโหลดเอกสารแรกของคุณเพื่อเริ่มต้นจัดระเบียบ
        </p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { receipts, loading, reload } = useReceipts();
  const recent = useMemo(() => receipts.slice(0, 5), [receipts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero band */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md space-y-2">
            <h2 className="font-display text-3xl leading-tight tracking-tight text-foreground">
              ยินดีต้อนรับกลับ
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              อัปโหลดเอกสารใหม่ หรือเรียกดูเอกสารล่าสุดของคุณต่อได้เลย
            </p>
          </div>
          <ArchiveStack className="hidden justify-end lg:flex" />
        </div>
      </section>

      {/* Quick upload + recent, asymmetric on desktop */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Quick Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickUpload onUploaded={reload} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-base">Recent Documents</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/receipts">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyArchive />
            ) : (
              <div className="space-y-2">
                {recent.map((r) => (
                  <RecentReceipt key={r.id} r={r} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}