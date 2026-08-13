import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  MoreHorizontal,
  GripVertical,
  FolderOpen,
  FileText,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TouchArea } from "@/components/ui/touch-area";
import { useCategories } from "@/hooks/use-categories";
import { useReceipts } from "@/hooks/use-receipts";
import { useMediaQuery } from "@/lib/use-media-query";
import { toast } from "sonner";

// Color palette for category cards
const catColors = [
  "from-amber-500/10 to-orange-500/10 border-l-amber-500",
  "from-blue-500/10 to-cyan-500/10 border-l-blue-500",
  "from-green-500/10 to-emerald-500/10 border-l-green-500",
  "from-purple-500/10 to-pink-500/10 border-l-purple-500",
  "from-rose-500/10 to-red-500/10 border-l-rose-500",
  "from-teal-500/10 to-cyan-500/10 border-l-teal-500",
  "from-indigo-500/10 to-blue-500/10 border-l-indigo-500",
  "from-pink-500/10 to-rose-500/10 border-l-pink-500",
];

function getCatColor(index: number) {
  return catColors[index % catColors.length];
}

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
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Add state
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addTouched, setAddTouched] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTouched, setEditTouched] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);

  const receiptCounts = receipts.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  const maxCount = Math.max(1, ...Object.values(receiptCounts));

  const handleAdd = async () => {
    const name = newName.trim();
    setAddTouched(true);
    if (!name) return;
    setAdding(true);
    try {
      await create(name);
      setNewName("");
      setAddTouched(false);
      toast.success("เพิ่มหมวดหมู่แล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id: string) => {
    const name = editName.trim();
    setEditTouched(true);
    if (!name) return;
    setEditSaving(true);
    try {
      await update(id, name);
      setEditId(null);
      toast.success("แก้ไขแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "แก้ไขไม่สำเร็จ");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await remove(deleteId);
      toast.success("ลบแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditId(id);
    setEditName(name);
    setEditTouched(false);
  };

  // Reorder handler for mobile (using framer-motion Reorder)
  const handleReorder = async (newOrder: typeof categories) => {
    const ids = newOrder.map((c) => c.id);
    try {
      await reorderCats(ids);
    } catch (e) {
      toast.error("เรียงลำดับไม่สำเร็จ");
      reload();
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={reload}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header + Add form */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">หมวดหมู่</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="เพิ่มหมวดหมู่ใหม่..."
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (addTouched) setAddTouched(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              aria-invalid={addTouched && !newName.trim()}
              className="h-11 flex-1"
            />
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              className="h-11 px-5"
            >
              <Plus className="mr-1 h-4 w-4" />
              {adding ? "กำลังเพิ่ม..." : "เพิ่ม"}
            </Button>
          </div>
          {addTouched && !newName.trim() ? (
            <p className="mt-2 text-xs text-destructive">กรุณากรอกชื่อหมวดหมู่</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              ตั้งชื่อสั้น ๆ ชัดเจน เช่น "อาหาร", "ค่าไฟ", "ใบเสร็จ"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category list */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-xl border border-border bg-gradient-to-r p-4"
                >
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full max-w-[120px]" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/50">
                <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">ยังไม่มีหมวดหมู่</p>
                <p className="text-sm text-muted-foreground">
                  เพิ่มหมวดหมู่เพื่อจัดระเบียบเอกสารของคุณ
                </p>
              </div>
            </div>
          ) : isDesktop ? (
            /* Desktop: Drag-to-reorder list */
            <div className="space-y-2">
              {categories.map((c, i) => {
                const count = receiptCounts[c.name] || 0;
                const pct = Math.round((count / maxCount) * 100);

                return (
                  <motion.div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      // Handled by handleReorder below
                    }}
                    whileDrag={{ scale: 1.02, zIndex: 50 }}
                    className={`group relative flex items-center gap-4 rounded-xl border-l-4 bg-gradient-to-r p-4 transition-all ${getCatColor(i)} ${
                      dragId === c.id ? "opacity-50" : ""
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {editId === c.id ? (
                        <div className="flex items-center gap-2">
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
                            className="h-9 flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEdit(c.id)}
                            disabled={!editName.trim() || editSaving}
                          >
                            {editSaving ? "..." : "บันทึก"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditId(null)}
                          >
                            ยกเลิก
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-foreground truncate">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 max-w-[160px] overflow-hidden rounded-full bg-border">
                              <motion.div
                                className="h-full rounded-full bg-foreground/30"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {count} เอกสาร
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {editId !== c.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => startEdit(c.id, c.name)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            แก้ไขชื่อ
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(c.id)}
                            disabled={count > 0}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {count > 0 ? "มีเอกสารใช้งานอยู่" : "ลบ"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Mobile: Reorderable list with touch */
            <Reorder.Group
              axis="y"
              values={categories}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {categories.map((c, i) => {
                const count = receiptCounts[c.name] || 0;
                const pct = Math.round((count / maxCount) * 100);

                return (
                  <Reorder.Item
                    key={c.id}
                    value={c}
                    className={`rounded-xl border-l-4 bg-gradient-to-r p-4 ${getCatColor(i)}`}
                    dragListener={true}
                  >
                    <div className="flex items-center gap-3">
                      {/* Drag handle */}
                      <div className="touch-none text-muted-foreground/40">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {editId === c.id ? (
                          <div className="space-y-2">
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
                              className="h-11"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-9 flex-1"
                                onClick={() => handleEdit(c.id)}
                                disabled={!editName.trim() || editSaving}
                              >
                                {editSaving ? "กำลังบันทึก..." : "บันทึก"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9"
                                onClick={() => setEditId(null)}
                              >
                                ยกเลิก
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-foreground truncate">
                              {c.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 max-w-[160px] overflow-hidden rounded-full bg-border">
                                <div
                                  className="h-full rounded-full bg-foreground/30 transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {count} เอกสาร
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Mobile actions */}
                      {editId !== c.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <TouchArea asChild>
                              <Button variant="ghost" size="icon" className="h-11 w-11">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </TouchArea>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => startEdit(c.id, c.name)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              แก้ไขชื่อ
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(c.id)}
                              disabled={count > 0}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {count > 0 ? "มีเอกสารใช้งานอยู่" : "ลบ"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบหมวดหมู่</DialogTitle>
            <DialogDescription>
              {deleteId && (
                <>
                  ต้องการลบ "<strong>{categories.find((c) => c.id === deleteId)?.name}</strong>"?
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
