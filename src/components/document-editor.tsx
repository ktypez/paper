import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import type { CategoryRecord, DocumentPatch, DocumentRecord } from "@/lib/types";

export function DocumentEditor({
  document,
  categories,
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
}: {
  document: DocumentRecord;
  categories: CategoryRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (patch: DocumentPatch) => Promise<unknown>;
  pending: boolean;
  error?: string;
}) {
  const [filename, setFilename] = useState(document.filename);
  const [category, setCategory] = useState(document.category);
  const [owner, setOwner] = useState(document.owner ?? "");
  const [notes, setNotes] = useState(document.notes ?? "");
  const [localError, setLocalError] = useState<string>();
  const filenameInput = useRef<HTMLInputElement>(null);
  const categorySelect = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;
    setFilename(document.filename);
    setCategory(document.category);
    setOwner(document.owner ?? "");
    setNotes(document.notes ?? "");
    setLocalError(undefined);
  }, [document, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filename.trim()) {
      setLocalError("กรอกชื่อไฟล์");
      filenameInput.current?.focus();
      return;
    }
    if (!category) {
      setLocalError("เลือกหมวดหมู่");
      categorySelect.current?.focus();
      return;
    }
    setLocalError(undefined);
    try {
      await onSubmit({
        filename: filename.trim(),
        category,
        owner: owner.trim() || null,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ");
    }
  }

  const message = localError ?? error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="แก้ไขข้อมูลเอกสาร"
          description="เปลี่ยนชื่อที่แสดง หมวดหมู่ โฟลเดอร์ หรือบันทึกข้อมูล ไฟล์ต้นฉบับจะไม่ถูกเปลี่ยน"
        />
        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <Field id="edit-filename" label="ชื่อไฟล์" required>
            <Input
              ref={filenameInput}
              id="edit-filename"
              name="filename"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              maxLength={180}
              autoComplete="off"
            />
          </Field>
          <Field id="edit-category" label="หมวดหมู่" required>
            <NativeSelect
              ref={categorySelect}
              id="edit-category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            >
              {categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="edit-owner" label="โฟลเดอร์หรือเจ้าของ" hint="ใช้เป็นข้อความอิสระ เช่น ค่าใช้จ่ายประจำเดือน">
            <Input
              id="edit-owner"
              name="owner"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              maxLength={120}
              autoComplete="off"
            />
          </Field>
          <Field id="edit-notes" label="บันทึก">
            <Textarea
              id="edit-notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={4000}
            />
          </Field>
          {message ? <p className="text-sm text-accent" role="alert">{message}</p> : null}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="ghost">ยกเลิก</Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
