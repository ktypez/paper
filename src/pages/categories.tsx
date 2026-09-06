import { useState } from "react";
import { AlertCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategories } from "@/lib/query";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    return text as unknown as T;
  }
  if (!res.ok) {
    const msg = (data as unknown as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

interface V1Category {
  id: string;
  name: string;
}

export function Categories() {
  const { data, isLoading, isError, refetch } = useCategories();

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleAdd() {
    const name = newName.trim();
    setFormError(null);
    if (!name) {
      setFormError("กรุณากรอกชื่อหมวดหมู่");
      return;
    }
    setAdding(true);
    try {
      await req<V1Category>("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setNewName("");
      toast.success("เพิ่มหมวดหมู่แล้ว");
      refetch();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(id: string, name: string) {
    setEditId(id);
    setEditName(name);
    setEditError(null);
  }

  async function handleEdit(id: string) {
    const name = editName.trim();
    setEditError(null);
    if (!name) {
      setEditError("กรุณากรอกชื่อหมวดหมู่");
      return;
    }
    setEditSaving(true);
    try {
      await req(`/api/categories/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setEditId(null);
      toast.success("แก้ไขแล้ว");
      refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "แก้ไขไม่สำเร็จ");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await req(`/api/categories/${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });
      setDeleteId(null);
      toast.success("ลบแล้ว");
      refetch();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-foreground">โหลดหมวดหมู่ไม่สำเร็จ</p>
        <Button variant="outline" className="touch-target" onClick={() => refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-foreground">หมวดหมู่</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">เพิ่มหมวดหมู่</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="เช่น อาหาร, ค่าไฟ, ใบเสร็จ"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="touch-target flex-1"
              disabled={adding}
            />
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              className="touch-target gap-1"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {adding ? "กำลังเพิ่ม..." : "เพิ่ม"}
            </Button>
          </div>
          {formError ? (
            <p role="alert" className="mt-2 text-xs text-foreground">
              {formError}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              ชื่อต้องไม่ซ้ำกับหมวดหมู่เดิม
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="font-medium text-foreground">ยังไม่มีหมวดหมู่</p>
              <p className="text-sm text-muted-foreground">
                เพิ่มหมวดหมู่เพื่อจัดระเบียบเอกสารของคุณ
              </p>
            </div>
          ) : (
            data.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border border-border bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  {editId === c.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEdit(c.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                        autoFocus
                        className="touch-target"
                        disabled={editSaving}
                      />
                      {editError && (
                        <p role="alert" className="text-xs text-foreground">
                          {editError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="touch-target flex-1"
                          onClick={() => handleEdit(c.id)}
                          disabled={!editName.trim() || editSaving}
                        >
                          {editSaving ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="touch-target"
                          onClick={() => setEditId(null)}
                          disabled={editSaving}
                        >
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="truncate font-medium text-foreground">{c.name}</p>
                  )}
                </div>
                {editId !== c.id && (
                  <>
                    <Badge variant="secondary">{c.count} เอกสาร</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target shrink-0"
                      onClick={() => startEdit(c.id, c.name)}
                      aria-label={`แก้ไข ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target shrink-0"
                      onClick={() => {
                        setDeleteId(c.id);
                        setDeleteError(null);
                      }}
                      aria-label={`ลบ ${c.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบหมวดหมู่</DialogTitle>
            <DialogDescription>
              ต้องการลบ “{data?.find((c) => c.id === deleteId)?.name}” หรือไม่?
              หากยังมีเอกสารใช้งานอยู่จะลบไม่ได้
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-foreground">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="touch-target"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              className="touch-target"
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
