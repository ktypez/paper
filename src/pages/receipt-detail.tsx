import { useParams, useNavigate, Link } from "react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trash2,
  FileText,
  Download,
  AlertCircle,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useReceipts } from "@/hooks/use-receipts";
import { useCategories } from "@/hooks/use-categories";
import { formatDate, formatSize, stripExtension } from "@/lib/utils";
import { getFileUrl, updateReceipt } from "@/lib/api";
import { toast } from "sonner";

export function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { receipts, loading, remove, reload } = useReceipts();
  const { categories } = useCategories();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFilename, setEditFilename] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const receipt = receipts.find((r) => r.id === id);

  useEffect(() => {
    if (!loading && !receipt && receipts.length > 0) {
      navigate("/receipts", { replace: true });
    }
  }, [loading, receipt, receipts, navigate]);

  const startEditing = () => {
    if (!receipt) return;
    setEditFilename(stripExtension(receipt.filename));
    setEditCategory(receipt.category);
    setEditOwner(receipt.owner || "");
    setEditNotes(receipt.notes || "");
    setEditMode(true);
  };

  const cancelEditing = () => {
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!id) return;
    const name = editFilename.trim();
    if (!name) return;
    setSaving(true);
    try {
      await updateReceipt(id, {
        filename: name,
        category: editCategory,
        owner: editOwner || null,
        notes: editNotes,
      });
      setEditMode(false);
      toast.success("Receipt updated");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await remove(id);
      toast.success("Receipt deleted");
      navigate("/receipts");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-6 w-48" />
        </div>
        {/* Content skeleton */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="aspect-[3/4] w-full rounded-md" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Receipt not found</p>
        <Button variant="outline" asChild>
          <Link to="/receipts">Back to documents</Link>
        </Button>
      </div>
    );
  }

  const isImage = receipt.content_type.startsWith("image/");
  const isPdf = receipt.content_type === "application/pdf";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/receipts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-xl font-semibold truncate">
          {stripExtension(receipt.filename)}
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center rounded-lg border border-border bg-background min-h-[300px]">
              {isImage ? (
                <img
                  src={getFileUrl(receipt.id)}
                  alt={receipt.filename}
                  className="max-h-[600px] max-w-full object-contain cursor-pointer"
                  onClick={() => setLightbox(true)}
                />
              ) : isPdf ? (
                <iframe
                  src={getFileUrl(receipt.id)}
                  className="h-[600px] w-full rounded-lg"
                  title={receipt.filename}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-10">
                  <FileText className="h-16 w-16 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Preview not available
                  </p>
                  <Button variant="outline" asChild>
                    <a
                      href={getFileUrl(receipt.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="mr-1 h-4 w-4" /> Download file
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Filename</p>
              {editMode ? (
                <Input
                  value={editFilename}
                  onChange={(e) => setEditFilename(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="text-sm font-medium break-all">
                  {stripExtension(receipt.filename)}
                </p>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              {editMode ? (
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="mt-1">
                  {receipt.category}
                </Badge>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground">Owner / Folder</p>
              {editMode ? (
                <Input
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  placeholder="(optional)"
                  className="mt-1"
                />
              ) : receipt.owner ? (
                <Badge variant="outline" className="mt-1">
                  {receipt.owner}
                </Badge>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground italic">
                  None
                </p>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground">File type</p>
              <p className="text-sm">{receipt.content_type}</p>
            </div>

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="text-sm">{formatSize(receipt.size)}</p>
            </div>

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              {editMode ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              ) : receipt.notes ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {receipt.notes}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground italic">No notes</p>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground">Uploaded at</p>
              <p className="text-sm">{formatDate(receipt.uploaded_at)}</p>
            </div>

            <Separator />

            <div className="flex gap-2 pt-2">
              {editMode ? (
                <>
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={startEditing}
                  >
                    <Pencil className="mr-1 h-4 w-4" /> Edit
                  </Button>
                  <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete receipt</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete{" "}
                          <strong>{receipt.filename}</strong>? This action cannot
                          be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting..." : "Delete"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {lightbox && isImage && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightbox(false)}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={getFileUrl(receipt.id)}
              alt={receipt.filename}
              className="max-h-[95vh] max-w-[95vw] object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
