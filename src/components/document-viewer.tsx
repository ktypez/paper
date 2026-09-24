import { Download, ExternalLink, FileText, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { documentFileUrl } from "@/lib/api";
import { isImage, isPdf } from "@/lib/format";
import type { DocumentRecord } from "@/lib/types";

export function DocumentViewer({ document }: { document: DocumentRecord }) {
  const [imageFailed, setImageFailed] = useState(false);
  const originalUrl = documentFileUrl(document.id, "original");
  const imageUrl = document.hasPreview && !imageFailed
    ? documentFileUrl(document.id, "preview")
    : originalUrl;

  useEffect(() => setImageFailed(false), [document.id]);

  if (isImage(document.contentType) && !imageFailed) {
    return (
      <div className="grid min-h-[52dvh] place-items-center overflow-hidden rounded-sheet border border-line bg-raised p-2 sm:min-h-[65dvh] sm:p-4">
        <img
          src={imageUrl}
          alt={document.filename}
          className="max-h-[72dvh] w-auto max-w-full object-contain"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  if (isPdf(document.contentType)) {
    return (
      <div className="overflow-hidden rounded-sheet border border-line bg-raised">
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
            <FileText aria-hidden="true" size={18} strokeWidth={1.7} />
            <span className="truncate">เปิดด้วยโปรแกรมอ่าน PDF ของเบราว์เซอร์</span>
          </div>
          <Button asChild variant="ghost" size="small">
            <a href={originalUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" size={17} strokeWidth={1.8} />
              เปิดแยก
            </a>
          </Button>
        </div>
        <iframe
          src={originalUrl}
          title={`ตัวอย่าง ${document.filename}`}
          className="h-[68dvh] min-h-[480px] w-full bg-white"
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-72 place-items-center rounded-sheet border border-line bg-raised p-8 text-center">
      <div>
        <Download aria-hidden="true" className="mx-auto text-muted" size={30} strokeWidth={1.5} />
        <p className="mt-4 text-sm text-muted">
          {document.hasPreview && imageFailed ? "เปิดภาพตัวอย่างไม่ได้" : "เปิดไฟล์ต้นฉบับเพื่อดูเอกสาร"}
        </p>
        <Button asChild className="mt-5">
          <a href={originalUrl} target="_blank" rel="noreferrer">
            เปิดไฟล์
          </a>
        </Button>
      </div>
    </div>
  );
}

export function ImageLightbox({
  document,
  open,
  onOpenChange,
}: {
  document: DocumentRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="fixed inset-0 left-0 top-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-black/95 p-3 shadow-none focus-visible:outline-white"
      >
        <DialogTitle className="sr-only">{document.filename}</DialogTitle>
        <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center gap-2">
          <a
            href={documentFileUrl(document.id, "original")}
            target="_blank"
            rel="noreferrer"
            className="grid size-11 place-items-center rounded-[10px] bg-white/10 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="เปิดภาพขนาดเต็ม"
          >
            <Maximize2 aria-hidden="true" size={20} strokeWidth={1.8} />
          </a>
          <button
            className="min-h-11 rounded-[10px] bg-white/10 px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={() => onOpenChange(false)}
          >
            ปิด
          </button>
        </div>
        <div className="grid size-full place-items-center">
          <img
            src={documentFileUrl(document.id, "original")}
            alt={document.filename}
            className="max-h-[92dvh] max-w-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
