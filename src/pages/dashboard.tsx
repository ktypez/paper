import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ReceiptText, ArrowRight, Plus, HardDrive, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReceipts } from "@/hooks/use-receipts";
import { formatSize } from "@/lib/utils";
import { QuickUpload } from "@/components/quick-upload";
import { StatTile } from "@/components/stat-tile";
import { ReceiptRow } from "@/components/receipt-row";
import { PaperPlane } from "@/components/paper-plane";
import { toast } from "sonner";
import type { Receipt } from "@/types";

function useDashboardStats(receipts: Receipt[]) {
  return useMemo(() => {
    const total = receipts.length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let totalBytes = 0;
    let thisMonth = 0;
    let recent7 = 0;
    receipts.forEach((r) => {
      totalBytes += r.size;
      const d = new Date(r.uploaded_at);
      if (d >= startOfMonth) thisMonth += 1;
      if (d >= weekAgo) recent7 += 1;
    });
    return { total, totalBytes, thisMonth, recent7 };
  }, [receipts]);
}

function EmptyArchive() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <PaperPlane />
      <div className="space-y-1">
        <h3 className="font-display text-base text-foreground">ยังไม่มีเอกสาร</h3>
        <p className="text-sm text-muted-foreground">
          อัปโหลดเอกสารแรกของคุณเพื่อเริ่มต้นจัดระเบียบ
        </p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { receipts, loading, reload, remove } = useReceipts();
  const { total, totalBytes, thisMonth, recent7 } = useDashboardStats(receipts);
  const recent = useMemo(() => receipts.slice(0, 5), [receipts]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await remove(deleteId);
      toast.success("ลบเอกสารแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-md border border-border bg-card px-3 py-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-6 w-12" />
            </div>
          ))}
        </div>
        {/* Recent skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-12 rounded-sm" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Fun greeting */}
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          ยินดีต้อนรับกลับ, จัดเก็บ
          <span className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-transparent">
            {" "}เอกสารของคุณ
          </span>
          {" "}ให้เป็นระเบียบ
        </h2>
        <p className="text-sm text-muted-foreground">
          เรียกดูรายงานและเอกสารล่าสุดของคุณได้อย่างรวดเร็ว
        </p>
      </div>

      {/* Compact stat strip */}
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
        <StatTile
          icon={ReceiptText}
          label="เอกสารทั้งหมด"
          value={String(total)}
          sub="ฉบับทั้งหมด"
        />
        <StatTile
          icon={HardDrive}
          label="พื้นที่จัดเก็บ"
          value={formatSize(totalBytes)}
          sub="ใช้ไปแล้ว"
        />
        <StatTile
          icon={Calendar}
          label="เดือนนี้"
          value={String(thisMonth)}
          sub="อัปโหลดล่าสุด"
        />
        <StatTile
          icon={Activity}
          label="7 วัน"
          value={String(recent7)}
          sub="กิจกรรมล่าสุด"
          className="hidden lg:flex"
        />
      </div>

      {/* Recent documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-display text-sm font-semibold">
            เอกสารล่าสุด
          </CardTitle>
          <div className="flex items-center gap-1">
            {!uploadOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> อัปโหลด
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/receipts">
                ดูทั้งหมด <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        {uploadOpen && (
          <CardContent className="pt-0">
            <QuickUpload onUploaded={() => {
              reload();
              setUploadOpen(false);
            }} />
          </CardContent>
        )}

        <CardContent className="pt-0">
          {recent.length === 0 ? (
            <EmptyArchive />
          ) : (
            <div>
              {recent.map((r) => (
                <ReceiptRow
                  key={r.id}
                  r={r}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบเอกสาร</DialogTitle>
            <DialogDescription>
              ต้องการลบเอกสารนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
