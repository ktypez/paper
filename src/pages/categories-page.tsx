import { ArrowDown, ArrowUp, FolderCog, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from "@/lib/query";
import type { CategoryRecord } from "@/lib/types";

function SortButton({
  label,
  direction,
  disabled,
  onClick,
}: {
  label: string;
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
    </Button>
  );
}

function CategoryRow({
  category,
  index,
  total,
  onMove,
  reorderPending,
}: {
  category: CategoryRecord;
  index: number;
  total: number;
  onMove: (id: string, direction: -1 | 1) => void;
  reorderPending: boolean;
}) {
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await update.mutateAsync({ id: category.id, name: name.trim() });
      setEditing(false);
    } catch {
      return;
    }
  }

  return (
    <li className="grid gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <div className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="grid size-10 place-items-center rounded-[10px] bg-raised text-muted">
          <FolderCog aria-hidden="true" size={19} strokeWidth={1.7} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{category.name}</p>
          <p className="mt-0.5 text-xs text-muted">{category.documentCount} ฉบับ</p>
        </div>
        <div className="flex items-center">
          <SortButton
            label={`ย้าย ${category.name} ขึ้น`}
            direction="up"
            disabled={index === 0 || reorderPending}
            onClick={() => onMove(category.id, -1)}
          />
          <SortButton
            label={`ย้าย ${category.name} ลง`}
            direction="down"
            disabled={index === total - 1 || reorderPending}
            onClick={() => onMove(category.id, 1)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="small" onClick={() => setEditing((value) => !value)}>
          <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
          เปลี่ยนชื่อ
        </Button>
        <Button
          variant="ghost"
          size="small"
          className="text-accent"
          disabled={category.documentCount > 0 || remove.isPending}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />
          ลบ
        </Button>
      </div>
      {editing ? (
        <form className="flex items-end gap-2" onSubmit={save}>
          <div className="min-w-0 flex-1">
            <Field id={`rename-${category.id}`} label="ชื่อหมวดหมู่ใหม่">
              <Input
                id={`rename-${category.id}`}
                name={`rename-${category.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={update.isPending}>
            บันทึก
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            ยกเลิก
          </Button>
        </form>
      ) : null}
      {update.isError || remove.isError ? (
        <p className="text-sm text-accent" role="alert">
          {update.error?.message ?? remove.error?.message}
        </p>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader
            title="ลบหมวดหมู่"
            description={`ลบ “${category.name}” หรือไม่ การลบไม่ย้อนกลับได้`}
          />
          {remove.isError ? <p className="mt-4 text-sm text-accent" role="alert">{remove.error.message}</p> : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync(category.id);
                  setDeleteOpen(false);
                } catch {
                  return;
                }
              }}
            >
              ลบหมวดหมู่
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}

export function CategoriesPage() {
  const categories = useCategories();
  const create = useCreateCategory();
  const reorder = useReorderCategories();
  const [name, setName] = useState("");
  const sorted = useMemo(
    () => [...(categories.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    [categories.data],
  );

  function move(id: string, direction: -1 | 1) {
    const index = sorted.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    reorder.mutate(next.map((item) => item.id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await create.mutateAsync(name.trim());
      setName("");
    } catch {
      return;
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        title="หมวดหมู่"
        description="การเปลี่ยนชื่อหมวดหมู่จะอัปเดตเอกสารที่อยู่ในหมวดนั้นด้วย"
        action={
          <Button asChild variant="ghost">
            <Link to="/more">กลับ</Link>
          </Button>
        }
      />

      <form className="rounded-sheet border border-line bg-surface p-4" onSubmit={submit}>
        <Field id="new-category" label="สร้างหมวดหมู่" error={create.isError ? create.error.message : undefined}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="new-category"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="เช่น ค่าใช้จ่ายประจำ…"
              aria-invalid={create.isError}
              aria-describedby="new-category-description"
            />
            <Button type="submit" variant="primary" disabled={create.isPending} className="sm:w-36">
              <Plus aria-hidden="true" size={17} strokeWidth={2} />
              เพิ่ม
            </Button>
          </div>
        </Field>
      </form>

      {categories.isPending ? (
        <div className="overflow-hidden rounded-sheet border border-line bg-surface">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="m-3 h-16" />
          ))}
        </div>
      ) : null}
      {categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : null}
      {categories.isSuccess && sorted.length === 0 ? (
        <EmptyState
          icon={FolderCog}
          title="ยังไม่มีหมวดหมู่"
          description="สร้างหมวดหมู่แรกเพื่อเริ่มจัดกลุ่มเอกสาร"
        />
      ) : null}
      {sorted.length > 0 ? (
        <ul className="overflow-hidden rounded-sheet border border-line bg-surface">
          {sorted.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              index={index}
              total={sorted.length}
              onMove={move}
              reorderPending={reorder.isPending}
            />
          ))}
        </ul>
      ) : null}
      {reorder.isError ? <p className="text-sm text-accent" role="alert">{reorder.error.message}</p> : null}
    </div>
  );
}
