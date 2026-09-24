import { Camera, FileUp, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui/states";
import { useCategories, useUploadDocument } from "@/lib/query";
import { createImageThumbnail, looksLikeImage, validateUploadFile } from "@/lib/upload-utils";

export function CapturePage() {
  const navigate = useNavigate();
  const categories = useCategories();
  const upload = useUploadDocument();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const categorySelect = useRef<HTMLSelectElement>(null);
  const abortController = useRef<AbortController | null>(null);
  const uploadId = useRef(crypto.randomUUID());
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      abortController.current?.abort();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!file) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [file]);

  function chooseFile(selected?: File) {
    if (!selected) return;
    const validation = validateUploadFile(selected);
    if (validation) {
      setError(validation);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    uploadId.current = crypto.randomUUID();
    setFile(selected);
    setDisplayName(selected.name);
    setPreviewUrl(looksLikeImage(selected) ? URL.createObjectURL(selected) : undefined);
    setError(undefined);
    setProgress(0);
    if (!category && categories.data?.length) setCategory(categories.data[0].name);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function clearFile() {
    abortController.current?.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    uploadId.current = crypto.randomUUID();
    setFile(undefined);
    setPreviewUrl(undefined);
    setDisplayName("");
    setProgress(0);
    setError(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("เลือกรูปภาพหรือ PDF ก่อน");
      return;
    }
    if (!displayName.trim()) {
      setError("กรอกชื่อเอกสาร");
      nameInput.current?.focus();
      return;
    }
    if (!category) {
      setError("เลือกหมวดหมู่");
      categorySelect.current?.focus();
      return;
    }

    setError(undefined);
    setProgress(1);
    abortController.current = new AbortController();

    try {
      const thumbnail = await createImageThumbnail(file).catch(() => undefined);
      const document = await upload.mutateAsync({
        file,
        thumbnail,
        metadata: {
          uploadId: uploadId.current,
          filename: displayName.trim(),
          category,
          owner: owner.trim(),
          notes: notes.trim(),
        },
        signal: abortController.current.signal,
        onProgress: setProgress,
      });
      toast.success("เพิ่มเอกสารแล้ว");
      navigate(`/d/${encodeURIComponent(document.id)}`, { replace: true });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setError("ยกเลิกการอัปโหลดแล้ว");
        return;
      }
      setError(cause instanceof Error ? cause.message : "อัปโหลดไม่สำเร็จ");
      setProgress(0);
    }
  }

  if (categories.isError) {
    return <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />;
  }

  if (categories.isSuccess && categories.data.length === 0) {
    return (
      <EmptyState
        title="ต้องมีหมวดหมู่ก่อน"
        description="สร้างหมวดหมู่อย่างน้อยหนึ่งรายการ แล้วกลับมาเพิ่มเอกสาร"
        action={
          <Button asChild variant="primary">
            <Link to="/more/categories">จัดการหมวดหมู่</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        title="เพิ่มเอกสาร"
        description="เลือกรูปจากกล้องหรืออัปโหลดไฟล์ แล้วใส่ข้อมูลที่ต้องการค้นหาภายหลัง"
      />

      <input
        ref={cameraInput}
        name="camera-file"
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={onFileChange}
        tabIndex={-1}
      />
      <input
        ref={fileInput}
        name="file"
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={onFileChange}
        tabIndex={-1}
      />

      {!file ? (
        <div className="grid gap-3 rounded-sheet border border-dashed border-control bg-surface p-5 sm:grid-cols-2 sm:p-7">
          <button
            className="grid min-h-36 place-items-center rounded-[10px] border border-line bg-raised px-5 text-center transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            onClick={() => cameraInput.current?.click()}
          >
            <span>
              <Camera className="mx-auto text-accent" size={28} strokeWidth={1.6} />
              <span className="mt-4 block text-sm font-medium text-ink">ถ่ายรูป</span>
              <span className="mt-1 block text-xs text-muted">JPEG, PNG หรือ WebP</span>
            </span>
          </button>
          <button
            className="grid min-h-36 place-items-center rounded-[10px] border border-line bg-raised px-5 text-center transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            onClick={() => fileInput.current?.click()}
          >
            <span>
              <FileUp className="mx-auto text-muted" size={28} strokeWidth={1.6} />
              <span className="mt-4 block text-sm font-medium text-ink">เลือกไฟล์</span>
              <span className="mt-1 block text-xs text-muted">รูปภาพหรือ PDF ไม่เกิน 10 MB</span>
            </span>
          </button>
        </div>
      ) : (
        <form className="grid gap-6" onSubmit={submit}>
          <div className="relative overflow-hidden rounded-sheet border border-line bg-raised">
            {previewUrl ? (
              <img src={previewUrl} alt="ตัวอย่างไฟล์ที่เลือก" className="max-h-[46dvh] w-full object-contain" />
            ) : (
              <div className="grid min-h-48 place-items-center px-5 text-center">
                <div>
                  <FileUp className="mx-auto text-muted" size={32} strokeWidth={1.5} />
                  <p className="mt-4 text-sm font-medium text-ink">{file.name}</p>
                  <p className="mt-1 text-xs text-muted">PDF</p>
                </div>
              </div>
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 top-3 bg-surface/90"
              onClick={clearFile}
              aria-label="เลือกไฟล์ใหม่"
            >
              <X aria-hidden="true" size={19} strokeWidth={1.8} />
            </Button>
          </div>

          <div className="grid gap-5 rounded-sheet border border-line bg-surface p-4 sm:p-5">
            <Field id="capture-name" label="ชื่อเอกสาร" required error={error}>
              <Input
                ref={nameInput}
                id="capture-name"
                name="filename"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={180}
                autoComplete="off"
                aria-invalid={Boolean(error)}
                aria-describedby="capture-name-description"
              />
            </Field>
            <Field id="capture-category" label="หมวดหมู่" required>
              <NativeSelect
                ref={categorySelect}
                id="capture-category"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                <option value="">เลือกหมวดหมู่</option>
                {categories.data?.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="capture-owner" label="โฟลเดอร์หรือเจ้าของ" hint="ข้อความอิสระสำหรับจัดกลุ่ม เช่น ค่าประจำเดือน">
              <Input
                id="capture-owner"
                name="owner"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                maxLength={120}
                autoComplete="off"
              />
            </Field>
            <Field id="capture-notes" label="บันทึกข้อมูล">
              <Textarea
                id="capture-notes"
                name="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={4000}
              />
            </Field>
          </div>

          {upload.isPending ? (
            <div className="grid gap-2" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted">
                  <LoaderCircle className="animate-spin" size={17} strokeWidth={1.8} />
                  กำลังอัปโหลด…
                </span>
                <span className="tabular-nums text-ink">{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full bg-accent-solid transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                abortController.current?.abort();
                navigate(-1);
              }}
            >
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary" disabled={upload.isPending || categories.isPending}>
              {upload.isPending ? "กำลังอัปโหลด…" : "เพิ่มเอกสาร"}
            </Button>
          </div>
        </form>
      )}

      {error && !file ? <p className="text-sm text-accent" role="alert">{error}</p> : null}
    </div>
  );
}
