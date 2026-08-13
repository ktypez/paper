import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/hooks/use-categories";
import { useReceipts } from "@/hooks/use-receipts";

import { toast } from "sonner";

export function Categories() {
  const {
    categories,
    loading,
    error,
    reload,
    create,
    update,
    remove,
    reorderCats,
  } = useCategories();
  const { receipts } = useReceipts();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [dragCat, setDragCat] = useState<string | null>(null);
  const [catDropTarget, setCatDropTarget] = useState<string | null>(null);
  const [addTouched, setAddTouched] = useState(false);
  const [editTouched, setEditTouched] = useState(false);

  const receiptCounts = receipts.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  const handleAdd = async () => {
    const name = newName.trim();
    setAddTouched(true);
    if (!name) return;
    setAdding(true);
    try {
      await create(name);
      setNewName("");
      toast.success("Category created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id: string) => {
    const name = editName.trim();
    setEditTouched(true);
    if (!name) return;
    try {
      await update(id, name);
      setEditId(null);
      toast.success("Category updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await remove(deleteId);
      toast.success("Category deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleCatDragStart = (id: string) => (e: React.DragEvent) => {
    setDragCat(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `cat:${id}`);
  };

  const handleCatDrop = async (targetId: string) => {
    if (!dragCat || dragCat === targetId) {
      setDragCat(null);
      return;
    }
    const ordered = categories
      .map((c) => c.id)
      .filter((id) => id !== dragCat);
    const idx = ordered.indexOf(targetId);
    ordered.splice(idx, 0, dragCat);
    setDragCat(null);
    try {
      await reorderCats(ordered);
      toast.success("Categories reordered");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reorder");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={reload}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Manage Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            คลุมแล้วลากเพื่อเรียงลำดับหมวดหมู่
          </p>
          <div className="mb-6 space-y-2">
            <div className="flex gap-3">
              <Input
                placeholder="ชื่อหมวดหมู่ใหม่"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (addTouched) setAddTouched(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                aria-invalid={addTouched && !newName.trim()}
                className="h-11"
              />
              <Button onClick={handleAdd} disabled={!newName.trim() || adding} className="h-11">
                <Plus className="mr-1 h-4 w-4" />
                {adding ? "กำลังเพิ่ม..." : "เพิ่ม"}
              </Button>
            </div>
            {addTouched && !newName.trim() ? (
              <p className="text-xs text-destructive">กรุณากรอกชื่อหมวดหมู่</p>
            ) : (
              <p className="text-xs text-muted-foreground">ตั้งชื่อสั้น ๆ ชัดเจน เช่น "อาหาร", "ค่าไฟ"</p>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-5 w-8 rounded-sm" />
                  <div className="flex shrink-0 gap-1">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No categories yet. Add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => (
                <motion.div
                  key={c.id}
                  draggable
                  onDragStart={handleCatDragStart(c.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragCat) setCatDropTarget(c.id);
                  }}
                  onDragLeave={() => {
                    if (catDropTarget === c.id) setCatDropTarget(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleCatDrop(c.id);
                  }}
                  whileDrag={{ scale: 1.05, opacity: 0.8, zIndex: 50 }}
                  className={`rounded-lg border border-border bg-card ${
                    dragCat === c.id ? "opacity-50" : ""
                  } ${
                    catDropTarget === c.id && dragCat ? "ring-2 ring-ring" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {receiptCounts[c.name] || 0}
                    </Badge>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditId(c.id);
                          setEditName(c.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Dialog
                        open={deleteId === c.id}
                        onOpenChange={(open) => setDeleteId(open ? c.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete category</DialogTitle>
                            <DialogDescription>
                              {(receiptCounts[c.name] || 0) > 0 ? (
                                <span className="text-destructive">
                                  Cannot delete "{c.name}."{" "}
                                  {receiptCounts[c.name]} document(s) are using
                                  this category. Reassign them first.
                                </span>
                              ) : (
                                <span>
                                  Are you sure you want to delete{" "}
                                  <strong>{c.name}</strong>? This action cannot
                                  be undone.
                                </span>
                              )}
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDeleteId(null)}
                            >
                              Cancel
                            </Button>
                            {(receiptCounts[c.name] || 0) === 0 && (
                              <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleting}
                              >
                                {deleting ? "Deleting..." : "Delete"}
                              </Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <AnimatePresence>
                    {editId === c.id && (
                      <motion.div
                        key="edit-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border px-4 py-3 space-y-2">
                          <div className="flex gap-3">
                            <Input
                              value={editName}
                              onChange={(e) => {
                                setEditName(e.target.value);
                                if (editTouched) setEditTouched(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEdit(c.id);
                                if (e.key === "Escape") setEditId(null);
                              }}
                              onBlur={() => setEditTouched(true)}
                              aria-invalid={editTouched && !editName.trim()}
                              autoFocus
                              className="flex-1"
                            />
                            <Button onClick={() => handleEdit(c.id)} disabled={!editName.trim()}>บันทึก</Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditId(null)}
                            >
                              ยกเลิก
                            </Button>
                          </div>
                          {editTouched && !editName.trim() && (
                            <p className="text-xs text-destructive">กรุณากรอกชื่อหมวดหมู่</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
