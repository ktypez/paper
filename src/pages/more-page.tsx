import { ChevronRight, FolderCog, Settings, Upload } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { PageHeader, Skeleton } from "@/components/ui/states";
import { useSummary } from "@/lib/query";

const destinations = [
  {
    to: "/more/categories",
    title: "หมวดหมู่",
    description: "สร้าง เปลี่ยนชื่อ และจัดลำดับหมวดหมู่",
    icon: FolderCog,
  },
  {
    to: "/more/settings",
    title: "ตั้งค่า",
    description: "บัญชี ธีม และข้อมูลที่เก็บในเบราว์เซอร์",
    icon: Settings,
  },
] as const;

export function MorePage() {
  const summary = useSummary();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader title="อื่น ๆ" description="จัดการหมวดหมู่ บัญชี และการตั้งค่าของ Paper" />

      {summary.isPending ? (
        <Skeleton className="h-14 w-full" />
      ) : summary.data ? (
        <p className="text-sm text-muted">
          ขณะนี้มี {summary.data.documentCount} เอกสาร ใน {summary.data.categoryCount} หมวดหมู่
          {summary.data.uncategorizedCount > 0 ? ` และมี ${summary.data.uncategorizedCount} รายการที่ยังผูกไม่ได้` : ""}
        </p>
      ) : null}

      <nav className="overflow-hidden rounded-sheet border border-line bg-surface" aria-label="เมนูจัดการ">
        {destinations.map(({ to, title, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-ink/[0.035] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
          >
            <div className="grid size-10 place-items-center rounded-[10px] bg-raised text-muted">
              <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
            </div>
            <ChevronRight aria-hidden="true" className="text-muted" size={19} strokeWidth={1.7} />
          </Link>
        ))}
      </nav>

      <div className="rounded-sheet border border-line bg-surface p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Upload aria-hidden="true" className="mt-0.5 shrink-0 text-muted" size={20} strokeWidth={1.7} />
          <div>
            <h2 className="text-sm font-medium text-ink">เพิ่มเอกสารจากหน้าหลัก</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              ใช้ปุ่มกลางด้านล่างบนมือถือ หรือปุ่ม “เพิ่มเอกสาร”บนหน้าคลัง
            </p>
            <Button asChild variant="secondary" size="small" className="mt-4">
              <Link to="/capture">ไปหน้าเพิ่มเอกสาร</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
