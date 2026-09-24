import { ArrowLeft, Download, Expand, LoaderCircle, Pencil, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { DocumentEditor } from "@/components/document-editor";
import { DocumentViewer, ImageLightbox } from "@/components/document-viewer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { ApiError } from "@/lib/api";
import { downloadDocument, shareDocument } from "@/lib/browser-actions";
import { formatBytes, formatDateTime, isImage } from "@/lib/format";
import { useCategories, useDeleteDocument, useDocument, useUpdateDocument } from "@/lib/query";

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-[65dvh] w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

export function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const documentQuery = useDocument(id);
  const categories = useCategories();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [fileAction, setFileAction] = useState<"download" | "share" | null>(null);
  const document = documentQuery.data;
  const stateFrom = (location.state as { from?: unknown } | null)?.from;
  const returnTo =
    typeof stateFrom === "string" && stateFrom.startsWith("/") && !stateFrom.startsWith("//")
      ? stateFrom
      : "/library";

  async function withToken(action: (token: string) => Promise<void>) {
    const token = await getToken();
    if (!token) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
    await action(token);
  }

  async function runFileAction(kind: "download" | "share") {
    if (fileAction) return;
    setFileAction(kind);
    try {
      await withToken((token) =>
        kind === "download" ? downloadDocument(document!, token) : shareDocument(document!, token),
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "ทำรายการกับไฟล์ไม่สำเร็จ");
    } finally {
      setFileAction(null);
    }
  }

  if (documentQuery.isPending) return <DetailSkeleton />;

  if (documentQuery.isError) {
    const notFound = documentQuery.error instanceof ApiError && documentQuery.error.status === 404;
    return (
      <ErrorState
        title={notFound ? "ไม่พบเอกสาร" : "เปิดเอกสารไม่สำเร็จ"}
        description={
          notFound
            ? "เอกสารอาจถูกย้ายหรือลบไปแล้ว"
            : "เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองเปิดเอกสารอีกครั้ง"
        }
        error={documentQuery.error}
        onRetry={notFound ? undefined : () => void documentQuery.refetch()}
      />
    );
  }

  if (!document) return null;

  return (
    <div className="grid gap-6">
      <Button asChild variant="ghost" size="small" className="w-fit -ml-3">
        <Link to={returnTo}>
          <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.8} />
          กลับคลังเอกสาร
        </Link>
      </Button>

      <PageHeader
        title={document.filename}
        description={`เพิ่มเมื่อ ${formatDateTime(document.uploadedAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {isImage(document.contentType) ? (
              <Button variant="secondary" onClick={() => setLightboxOpen(true)}>
                <Expand aria-hidden="true" size={17} strokeWidth={1.8} />
                ดูเต็มจอ
              </Button>
            ) : null}
            <Button
              variant="secondary"
              disabled={fileAction !== null}
              onClick={() => void runFileAction("download")}
            >
              {fileAction === "download" ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" size={17} strokeWidth={1.8} />
              ) : (
                <Download aria-hidden="true" size={17} strokeWidth={1.8} />
              )}
              {fileAction === "download" ? "กำลังดาวน์โหลด…" : "ดาวน์โหลด"}
            </Button>
            {"share" in navigator ? (
              <Button
                variant="secondary"
                disabled={fileAction !== null}
                onClick={() => void runFileAction("share")}
              >
                {fileAction === "share" ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" size={17} strokeWidth={1.8} />
                ) : (
                  <Share2 aria-hidden="true" size={17} strokeWidth={1.8} />
                )}
                {fileAction === "share" ? "กำลังแชร์…" : "แชร์"}
              </Button>
            ) : null}
            <Button
              variant="primary"
              disabled={!categories.isSuccess || categories.data.length === 0}
              onClick={() => {
                update.reset();
                setEditOpen(true);
              }}
            >
              <Pencil aria-hidden="true" size={17} strokeWidth={1.8} />
              แก้ไข
            </Button>
          </div>
        }
      />

      {!categories.isSuccess ? (
        <p className="text-sm text-muted" role="status">
          {categories.isPending ? "กำลังโหลดหมวดหมู่สำหรับการแก้ไข…" : "โหลดหมวดหมู่ไม่สำเร็จ"}
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <DocumentViewer document={document} />

        <aside className="rounded-sheet border border-line bg-surface p-4 sm:p-5" aria-label="ข้อมูลเอกสาร">
          <h2 className="text-sm font-medium text-ink">ข้อมูล</h2>
          <dl className="mt-4 grid gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted">หมวดหมู่</dt>
              <dd className="mt-1 text-ink">{document.category}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">โฟลเดอร์หรือเจ้าของ</dt>
              <dd className="mt-1 break-words text-ink">{document.owner || "ไม่ระบุ"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">ชนิดไฟล์</dt>
              <dd className="mt-1 break-words text-ink">{document.contentType}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">ขนาดไฟล์</dt>
              <dd className="mt-1 tabular-nums text-ink">{formatBytes(document.size)}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-line pt-5">
            <h3 className="text-xs text-muted">บันทึกข้อมูล</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
              {document.notes || "ไม่มีบันทึกข้อมูล"}
            </p>
          </div>

          <Button
            variant="ghost"
            className="mt-5 w-full text-accent hover:bg-accent-quiet hover:text-accent"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 aria-hidden="true" size={17} strokeWidth={1.8} />
            ลบเอกสาร
          </Button>
        </aside>
      </div>

      {categories.data ? (
        <DocumentEditor
          document={document}
          categories={categories.data}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={(patch) => update.mutateAsync({ id: document.id, patch })}
          pending={update.isPending}
          error={update.error?.message}
        />
      ) : null}

      {isImage(document.contentType) ? (
        <ImageLightbox
          document={document}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader
            title="ลบเอกสาร"
            description={`ลบ “${document.filename}” และไฟล์ต้นฉบับออกถาวรหรือไม่`}
          />
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync(document.id);
                  setDeleteOpen(false);
                  toast.success("ลบเอกสารแล้ว");
                  navigate(returnTo, { replace: true });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "ลบเอกสารไม่สำเร็จ");
                }
              }}
            >
              {remove.isPending ? "กำลังลบ…" : "ลบเอกสาร"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
