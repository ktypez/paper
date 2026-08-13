import { useState, useRef, useEffect, type DragEvent } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload as UploadIcon,
  FileText,
  X,
  AlertCircle,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useCategories } from "@/hooks/use-categories";
import { uploadReceiptWithProgress } from "@/lib/api";
import { toast } from "sonner";
import { formatSize } from "@/lib/utils";
import { validateFile, compressImage } from "@/lib/upload-utils";

export function Upload() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    category?: string;
    notes?: string;
    owner?: string;
  }>({});
  const [touched, setTouched] = useState<{
    category?: boolean;
    notes?: boolean;
    owner?: boolean;
  }>({});

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validate = (f: File): string | null => validateFile(f);

  const handleFile = async (f: File) => {
    const err = validate(f);
    if (err) {
      setError(err);
      clearFileState();
      return;
    }
    setError(null);
    setOriginalSize(f.size);

    if (f.type.startsWith("image/")) {
      setCompressing(true);
      try {
        const compressed = await compressImage(f);
        setFile(compressed);
        setPreviewUrl(URL.createObjectURL(compressed));
      } catch {
        setFile(f);
        setPreviewUrl(URL.createObjectURL(f));
      } finally {
        setCompressing(false);
      }
    } else {
      setFile(f);
      setPreviewUrl(null);
    }
  };

  const clearFileState = () => {
    setFile(null);
    setOriginalSize(0);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const clearFile = () => {
    clearFileState();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file || !validateFields()) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadReceiptWithProgress(
        file,
        category,
        setUploadProgress,
        notes,
        owner.trim() || undefined
      );
      toast.success("Upload successful");
      navigate(`/receipts/${result.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onCategoryChange = async (value: string) => {
    setCategory(value);
    setTouched((t) => ({ ...t, category: true }));
    setFieldErrors((e) => ({ ...e, category: undefined }));
  };

  const validateFields = () => {
    const errs: typeof fieldErrors = {};
    if (!category) errs.category = "กรุณาเลือกหมวดหมู่";
    setFieldErrors(errs);
    setTouched({ category: true, notes: true, owner: true });
    return Object.keys(errs).length === 0;
  };

  const handleBlur = (field: "notes" | "owner") => {
    setTouched((t) => ({ ...t, [field]: true }));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Upload Document</CardTitle>
          <CardDescription>
            Drop a file or click to select. Supported: JPEG, PNG, WebP, PDF.
            Images are compressed to WebP for smaller storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file && !compressing ? (
            <motion.div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              animate={{ scale: dragOver ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-12 transition-all ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <motion.div
                animate={dragOver ? { y: -4 } : { y: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <UploadIcon className="h-10 w-10 text-muted-foreground/50" />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your document here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG, WebP, PDF (images compressed to WebP)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleInputChange}
              />
            </motion.div>
          ) : compressing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-12"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <p className="text-sm text-muted-foreground">
                Compressing image...
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4 rounded-lg border p-4">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-16 w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-background">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {originalSize && file && originalSize !== file.size ? (
                      <>
                        <span className="line-through">
                          {formatSize(originalSize)}
                        </span>{" "}
                        → {formatSize(file.size)}
                      </>
                    ) : (
                      file && formatSize(file.size)
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </div>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => handleBlur("notes")}
                  placeholder="เช่น เลขที่ใบเสร็จ, วันที่ซื้อ..."
                  rows={3}
                  disabled={uploading}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">เพิ่มหมายเหตุเพื่อค้นหาง่ายขึ้น</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="category">Category</Label>
                  <span className="text-xs text-destructive">*</span>
                </div>
                <Select
                  value={category}
                  onValueChange={onCategoryChange}
                  disabled={uploading}
                >
                  <SelectTrigger id="category" aria-invalid={!!fieldErrors.category}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.category && fieldErrors.category ? (
                  <p className="text-xs text-destructive">{fieldErrors.category}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Required — เลือกหมวดหมู่ที่ตรงกับเอกสาร</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="owner">Owner / Folder</Label>
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </div>
                <Input
                  id="owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  onBlur={() => handleBlur("owner")}
                  placeholder="เช่น คุณแม่, บ้าน, รถ"
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">จัดกลุ่มเอกสารตามเจ้าของหรือที่เก็บ</p>
              </div>

              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <motion.span
                        className="font-medium"
                        key={uploadProgress}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {uploadProgress}%
                      </motion.span>
                    </div>
                    <Progress value={uploadProgress} />
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={!category || uploading}
              >
                {uploading ? (
                  <>{uploadProgress}% · Uploading...</>
                ) : (
                  <>
                    <UploadIcon className="mr-1 h-4 w-4" /> Upload Document
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
