import { useState, useRef, useEffect, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload as UploadIcon, FileText, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useCategories } from "@/hooks/use-categories";
import { uploadReceiptWithProgress } from "@/lib/api";
import { toast } from "sonner";
import { formatSize } from "@/lib/utils";
import { validateFile, compressImage } from "@/lib/upload-utils";

interface QuickUploadProps {
  onUploaded?: () => void;
}

export function QuickUpload({ onUploaded }: QuickUploadProps) {
  const { categories } = useCategories();
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const clear = () => {
    setFile(null);
    setOriginalSize(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      clear();
      return;
    }
    setError(null);
    setOriginalSize(f.size);

    if (f.type.startsWith("image/")) {
      setCompressing(true);
      try {
        setFile(await compressImage(f));
      } catch {
        setFile(f);
      } finally {
        setCompressing(false);
      }
    } else {
      setFile(f);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file || !category) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadReceiptWithProgress(file, category, setUploadProgress);
      toast.success("Upload successful");
      clear();
      onUploaded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!file && !compressing ? (
        <motion.div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          animate={{ scale: dragOver ? 1.01 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-all ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <UploadIcon className="h-8 w-8 text-muted-foreground/50" />
          <div>
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </motion.div>
      ) : compressing ? (
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          Compressing image...
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-3 rounded-lg border p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file?.name}</p>
              <p className="text-xs text-muted-foreground">
                {originalSize && file && originalSize !== file.size ? (
                  <>
                    <span className="line-through">{formatSize(originalSize)}</span>{" "}
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
              onClick={clear}
              disabled={uploading}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={setCategory} disabled={uploading}>
              <SelectTrigger className="flex-1">
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
            <Button
              onClick={handleUpload}
              disabled={!category || uploading}
              className="shrink-0"
            >
              {uploading ? (
                <>{uploadProgress}% · Uploading...</>
              ) : (
                <>
                  <UploadIcon className="mr-1 h-4 w-4" /> Upload
                </>
              )}
            </Button>
          </div>

          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Progress value={uploadProgress} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
