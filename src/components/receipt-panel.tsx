// Slide-over receipt panel (Variant D): opens from the right over the list,
// image (tap for lightbox) + meta + edit/delete. Used by Home and Library.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FileText, Maximize2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { isImage, origUrl, thumbUrl, type Receipt } from "@/lib/api-v2";
import { formatDate, formatSize } from "@/lib/format";
import { useCategories, useDeleteReceipt, useUpdateReceipt } from "@/lib/query";
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

interface ReceiptPanelProps {
  receipt: Receipt;
  onClose: () => void;
}

export function ReceiptPanel({ receipt, onClose }: ReceiptPanelProps) {
  const [r, setR] = useState(receipt);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const cats = useCategories();
  const update = useUpdateReceipt();
  const del = useDeleteReceipt();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filename, setFilename] = useState("");
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setFilename(r.filename);
    setCategory(r.category);
    setOwner(r.owner ?? "");
    setNotes(r.notes ?? "");
  }, [r]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lightbox && !editOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, editOpen, onClose]);

  function handleSave() {
    if (!r.id) return;
    update.mutate(
      {
        id: r.id,
        patch: {
          filename: filename.trim() || r.filename,
          category,
          owner: owner.trim() ? owner.trim() : null,
          notes: notes.trim() ? notes.trim() : null,
        },
      },
      {
        onSuccess: (row) => {
          setR(row);
          setEditOpen(false);
          toast.success("บันทึกล่ะ");
        },
        onError: () => toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่"),
      }
    );
  }

  function handleDelete() {
    del.mutate(r.id, {
      onSuccess: () => {
        toast.success("ลบเอกสารล่ะ");
        onClose();
      },
      onError: () => toast.error("ลบไม่สำเร็จ กรุณาลองใหม่"),
    });
  }

  return (
    <>
      <div
        className="overlay-in fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="panel-in fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label={r.filename}
      >
        <header className="flex min-h-[56px] items-center gap-2 border-b border-border px-3">
          <h2 className="min-w-0 flex-1 truncate px-1 text-base font-bold">{r.filename}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isImage(r) ? (
            <button
              type="button"
              onClick={() => setLightbox(origUrl(r))}
              aria-label="เปิดรูปเต็มจอ"
              className="group relative block w-full overflow-hidden rounded-2xl bg-muted"
            >
              <img
                src={thumbUrl(r)}
                alt={r.filename}
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors group-active:bg-black/70">
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
          ) : (
            <Link
              to={`/r/${r.id}`}
              className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 text-muted-foreground"
            >
              <FileText className="h-8 w-8" />
              <span className="text-sm font-semibold text-foreground">PDF</span>
              <span className="text-xs">แตะเพื่อเปิดดู PDF เต็มหน้า</span>
            </Link>
          )}

          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border">
              <dt className="text-muted-foreground">หมวดหมู่</dt>
              <dd className="font-medium">{r.category}</dd>
            </div>
            <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border">
              <dt className="text-muted-foreground">เจ้าของ</dt>
              <dd className="font-medium">{r.owner ?? "—"}</dd>
            </div>
            <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border">
              <dt className="text-muted-foreground">วันที่อัปโหลด</dt>
              <dd className="font-medium">{formatDate(r.uploaded_at)}</dd>
            </div>
            <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border">
              <dt className="text-muted-foreground">ขนาด</dt>
              <dd className="font-medium">{formatSize(r.size)}</dd>
            </div>
          </dl>

          {r.notes && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">โน้ต</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{r.notes}</p>
            </div>
          )}
        </div>

        <footer
          className="grid grid-cols-2 gap-2 border-t border-border p-3"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
        >
          <Button variant="outline" onClick={() => setEditOpen(true)} className="min-h-[44px]">
            <Pencil className="h-4 w-4" />
            แก้ไข
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="min-h-[44px] text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            ลบ
          </Button>
        </footer>
      </aside>

      {lightbox && (
        <Lightbox src={lightbox} alt={r.filename} onClose={() => setLightbox(null)} />
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขเอกสาร</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="panel-filename">ชื่อไฟล์</Label>
              <Input
                id="panel-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="panel-category">หมวดหมู่</Label>
              <Select value={category} onValueChange={setCategory} disabled={update.isPending}>
                <SelectTrigger id="panel-category" className="min-h-[44px]">
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
              <Label htmlFor="panel-owner">เจ้าของ</Label>
              <Input
                id="panel-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="เช่น บ้าน, บริษัท"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="panel-notes">โน้ต</Label>
              <Input
                id="panel-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม"
                className="min-h-[44px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="min-h-[44px]">
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

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบเอกสาร</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ต้องการลบ “{r.filename}” หรือไม่? จะลบทั้งไฟล์ต้นฉบับและภาพย่อ
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} className="min-h-[44px]">
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={del.isPending}
              className="min-h-[44px]"
            >
              {del.isPending ? "กำลังลบ…" : "ยืนยันลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
