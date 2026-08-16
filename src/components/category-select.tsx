import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/hooks/use-categories";
import { toast } from "sonner";

const ADD_NEW = "__add_new__";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Category picker that lets the user select an existing category or create
 * and select a new one inline — useful in upload and edit flows.
 */
export function CategorySelect({ value, onChange, placeholder, disabled }: CategorySelectProps) {
  const { categories, create } = useCategories();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleValueChange = (v: string) => {
    if (v === ADD_NEW) {
      setAdding(true);
      return;
    }
    setAdding(false);
    onChange(v);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const cat = await create(name);
      onChange(cat.name);
      setNewName("");
      setAdding(false);
      toast.success("เพิ่มหมวดหมู่แล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      {!adding ? (
        <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder ?? "เลือกหมวดหมู่"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
            <SelectItem value={ADD_NEW}>
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> เพิ่มหมวดหมู่ใหม่
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={newName}
            placeholder="ชื่อหมวดหมู่ใหม่..."
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setAdding(false);
            }}
            disabled={disabled}
            className="h-11 flex-1"
          />
          <Button onClick={handleCreate} disabled={!newName.trim() || saving} className="h-11 shrink-0" aria-label="บันทึกหมวดหมู่">
            <Check className="mr-1 h-4 w-4" /> {saving ? "..." : "บันทึก"}
          </Button>
          <Button variant="outline" onClick={() => setAdding(false)} className="h-11 shrink-0" disabled={disabled}>
            ยกเลิก
          </Button>
        </div>
      )}
    </div>
  );
}
