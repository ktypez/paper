import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, FileText, Maximize2, Pencil, Trash2 } from "lucide-react";
import { isImage, origUrl } from "@/lib/api-v2";
import { formatDate, formatSize } from "@/lib/format";
import { useCategories, useDeleteReceipt, useReceipt, useUpdateReceipt } from "@/lib/query";
import { Lightbox } from "@/components/lightbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function ReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const receipt = useReceipt(id);
  const cats = useCategories();
  const update = useUpdateReceipt();
  const del = useDeleteReceipt();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (receipt.data) {
      setFilename(receipt.data.filename);
      setCategory(receipt.data.category);
      setOwner(receipt.data.owner ?? "");
      setNotes(receipt.data.notes ?? "");
    }
  }, [receipt.data]);

  const r = receipt.data;

  function handleSave() {
    if (!id) return;
    update.mutate(
      {
        id,
        patch: {
          filename: filename.trim() || r?.filename,
          category,
          owner: owner.trim() ? owner.trim() : null,
          notes: notes.trim() ? notes.trim() : null,
        },
      },
      { onSuccess: () => setEditOpen(false) }
    );
  }

  function handleDelete() {
    if (!id) return;
    del.mutate(id, { onSuccess: () => navigate("/lib") });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex min-h-[56px] w-full max-w-3xl items-center gap-2 px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="กลับ"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-base font-bold">
            {r ? r.filename : "รายละเอียดเอกสาร"}
          </h1>
          {r && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label="แก้ไข"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <Pencil className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4">
        {receipt.isLoading && (
          <div className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <Skeleton className="h-5 w-1/3 rounded-md" />
          </div>
        )}

        {receipt.isError && (
          <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm">
            <p className="text-muted-foreground">โหลดเอกสารไม่สำเร็จ อาจถูกลบไปแล้ว</p>
            <Link to="/lib" className="mt-3 inline-flex min-h-[44px] items-center underline">
              กลับไปคลังเอกสาร
            </Link>
          </div>
        )}

        {r && (
          <>
            <section
              aria-label="ไฟล์ต้นฉบับ"
              className="rounded-2xl border border-border bg-card"
            >
              {isImage(r) ? (
                <button
                  type="button"
                  onClick={() => setLightbox(origUrl(r))}
                  aria-label="เปิดรปูเต็มจอ"
                  className="group relative block w-full"
                >
                  <img
                    src={origUrl(r)}
                    alt={r.filename}
                    loading="lazy"
                    className="w-full object-contain"
                  />
                  <span className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors group-active:bg-black/70">
                    <Maximize2 className="h-4 w-4" />
                  </span>
                </button>
              ) : (
                <div className="p-4">
                  <p className="mb-2 flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-5 w-5" />
                    ไฟล์ PDF — แสดงตัวอย่างด้านล่าง
                  </p>
                  <iframe
                    src={origUrl(r)}
                    title={r.filename}
                    className="h-[60vh] w-full rounded-xl border border-border bg-background"
                  />
                </div>
              )}
            </section>

            <section aria-label="ข้อมูลเอกสาร" className="space-y-2 text-sm">
              <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4">
                <span className="text-muted-foreground">ชื่อไฟล์</span>
                <span className="truncate font-medium">{r.filename}</span>
              </div>
              <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4">
                <span className="text-muted-foreground">หมวดหมู่</span>
                <span className="font-medium">{r.category}</span>
              </div>
              <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4">
                <span className="text-muted-foreground">เจ้าของ</span>
                <span className="font-medium">{r.owner ?? "—"}</span>
              </div>
              <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4">
                <span className="text-muted-foreground">วันที่อัปโหลด</span>
                <span className="font-medium">{formatDate(r.uploaded_at)}</span>
              </div>
              <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4">
                <span className="text-muted-foreground">ขนาด</span>
                <span className="font-medium">{formatSize(r.size)}</span>
              </div>
              {r.notes && (
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-muted-foreground">โน้ต</p>
                  <p className="mt-1 whitespace-pre-wrap">{r.notes}</p>
                </div>
              )}
            </section>

            <section aria-label="ลบเอกสาร" className="pb-8">
              {!confirmDelete ? (
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-[44px] w-full rounded-xl"
                >
                  <Trash2 className="h-4 w-4" />
                  ลบเอกสาร
                </Button>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-bold">ยืนยันการลบเอกสารนี้?</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmDelete(false)}
                      className="min-h-[44px] flex-1 rounded-xl"
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      onClick={handleDelete}
                      disabled={del.isPending}
                      className="min-h-[44px] flex-1 rounded-xl"
                    >
                      {del.isPending ? "กำลังลบ…" : "ยืนยันลบ"}
                    </Button>
                  </div>
                  {del.isError && (
                    <p className="mt-2 text-sm text-muted-foreground">ลบไม่สำเร็จ กรุณาลองใหม่</p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขเอกสาร</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-filename">ชื่อไฟล์</Label>
              <Input
                id="edit-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="min-h-[44px] rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-category">หมวดหมู่</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="edit-category" className="min-h-[44px] rounded-xl">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {(cats.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-owner">เจ้าของ</Label>
              <Input
                id="edit-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="เช่น บ้าน, บริษัท"
                className="min-h-[44px] rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-notes">โน้ต</Label>
              <Input
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม"
                className="min-h-[44px] rounded-xl"
              />
            </div>
            {update.isError && (
              <p className="text-sm text-muted-foreground">บันทึกไม่สำเร็จ กรุณาลองใหม่</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="min-h-[44px]"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSave}
              disabled={update.isPending || !filename.trim() || !category}
              className="min-h-[44px]"
            >
              {update.isPending ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lightbox && (
        <Lightbox src={lightbox} alt={r?.filename} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
