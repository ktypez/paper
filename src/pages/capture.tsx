import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Camera, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  enqueueUpload,
  uploadReceipt,
} from "@/lib/api-v2";
import { useAfterUpload, useCategories } from "@/lib/query";

const MAX_SIZE = 10 * 1024 * 1024;

export function Capture() {
  const navigate = useNavigate();
  const afterUpload = useAfterUpload();
  const { data: categories, isLoading: catsLoading } = useCategories();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!category && categories && categories.length > 0) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickFile(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (f.size > MAX_SIZE) {
      setError("ไฟล์ใหญ่เกิน 10MB");
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  function clearFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSave() {
    setError(null);
    if (!file) {
      setError("กรุณาเลือกไฟล์ก่อน");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("ไฟล์ใหญ่เกิน 10MB");
      return;
    }
    if (!category) {
      setError("กรุณาเลือกหมวดหมู่");
      return;
    }
    const meta = {
      category,
      owner: owner.trim() || null,
      notes: notes.trim() || null,
    };

    if (!navigator.onLine) {
      try {
        await enqueueUpload(file, meta);
        toast.success("ออฟไลน์: เข้าคิวแล้ว จะส่งให้เอง");
        navigate("/");
      } catch {
        setError("เข้าคิวไม่สำเร็จ กรุณาลองใหม่");
      }
      return;
    }

    setSaving(true);
    setProgress(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const receipt = await uploadReceipt(file, meta, setProgress, ctrl.signal);
      afterUpload();
      navigate(`/r/${receipt.id}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("ยกเลิกการอัปโหลดแล้ว");
      } else {
        setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-foreground">สแกน / ถ่ายเอกสาร</h1>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-foreground"
        >
          <Camera className="h-8 w-8" aria-hidden />
          <span className="text-sm font-medium">แตะเพื่อถ่ายรูปหรือเลือกไฟล์</span>
          <span className="text-xs text-muted-foreground">รูปภาพ (JPG/PNG/WebP) หรือ PDF สูงสุด 10MB</span>
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  className="max-h-64 w-full border border-border object-contain bg-muted"
                />
              ) : (
                <div className="flex items-center gap-2 border border-border bg-muted p-4">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-sm text-foreground">{file.name}</span>
                </div>
              )}
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="touch-target shrink-0"
              onClick={clearFile}
              disabled={saving}
              aria-label="ลบไฟล์"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="touch-target mt-3 w-full"
            onClick={() => inputRef.current?.click()}
            disabled={saving}
          >
            เลือกไฟล์ใหม่
          </Button>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="capture-category">หมวดหมู่</Label>
          <Select value={category} onValueChange={setCategory} disabled={catsLoading || saving}>
            <SelectTrigger id="capture-category" className="touch-target w-full">
              <SelectValue placeholder={catsLoading ? "กำลังโหลด..." : "เลือกหมวดหมู่"} />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capture-owner">เจ้าของ / โฟลเดอร์</Label>
          <Input
            id="capture-owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="เช่น บ้าน, ออฟฟิศ"
            className="touch-target"
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="capture-notes">โน้ต</Label>
          <Input
            id="capture-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม"
            className="touch-target"
            disabled={saving}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-border bg-card p-3 text-sm text-foreground">
          {error}
        </p>
      )}

      {saving && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm text-foreground">
            <span>กำลังอัปโหลด...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
          <Button
            type="button"
            variant="outline"
            className="touch-target w-full"
            onClick={handleCancel}
          >
            ยกเลิก
          </Button>
        </div>
      )}

      {!saving && (
        <Button
          type="button"
          className="touch-target-full h-12 text-base font-semibold"
          onClick={handleSave}
          disabled={!file || !category}
        >
          บันทึกเอกสาร
        </Button>
      )}
    </div>
  );
}
