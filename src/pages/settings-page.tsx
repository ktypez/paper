import { LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useClerk, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/states";
import { clearLegacyBrowserData } from "@/lib/browser-actions";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

const themes = [
  { value: "system", label: "ตามระบบ", icon: Monitor },
  { value: "light", label: "สว่าง", icon: Sun },
  { value: "dark", label: "มืด", icon: Moon },
] as const;

export function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { preference, setPreference } = useTheme();
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function clearLocalData() {
    setClearing(true);
    try {
      await clearLegacyBrowserData();
      setClearOpen(false);
      toast.success("ล้างข้อมูลในเบราว์เซอร์แล้ว");
    } catch {
      toast.error("ล้างข้อมูลไม่สำเร็จ");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        title="ตั้งค่า"
        description="บัญชี รูปแบบสี และข้อมูลชั่วคราวในเบราว์เซอร์"
        action={
          <Button asChild variant="ghost">
            <Link to="/more">กลับ</Link>
          </Button>
        }
      />

      <section className="rounded-sheet border border-line bg-surface p-4 sm:p-5" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-sm font-medium text-ink">บัญชี</h2>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-accent-quiet text-sm font-semibold text-accent">
            {(user?.fullName || user?.primaryEmailAddress?.emailAddress || "P").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{user?.fullName || "ผู้ใช้ Paper"}</p>
            <p className="truncate text-xs text-muted">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => void signOut().catch(() => toast.error("ออกจากระบบไม่สำเร็จ"))}
        >
          <LogOut aria-hidden="true" size={17} strokeWidth={1.8} />
          ออกจากระบบ
        </Button>
      </section>

      <section className="rounded-sheet border border-line bg-surface p-4 sm:p-5">
        <fieldset>
          <legend className="text-sm font-medium text-ink">รูปแบบสี</legend>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {themes.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={cn(
                  "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border text-xs font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                  preference === value
                    ? "border-accent bg-accent-quiet text-accent"
                    : "border-line text-muted hover:border-ink/30 hover:text-ink",
                )}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="theme"
                  value={value}
                  checked={preference === value}
                  onChange={() => setPreference(value)}
                />
                <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-sheet border border-line bg-surface p-4 sm:p-5" aria-labelledby="local-data-heading">
        <h2 id="local-data-heading" className="text-sm font-medium text-ink">ข้อมูลในเบราว์เซอร์</h2>
        <p className="mt-2 max-w-[58ch] text-sm leading-6 text-muted">
          ล้างเฉพาะ cache และข้อมูลชั่วคราวจากรุ่นเก่า เอกสารและไฟล์ใน D1 และ R2 จะไม่ถูกลบ
        </p>
        <Button variant="secondary" className="mt-5" onClick={() => setClearOpen(true)}>
          <Trash2 aria-hidden="true" size={17} strokeWidth={1.8} />
          ล้างข้อมูลในเบราว์เซอร์
        </Button>
      </section>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader
            title="ล้างข้อมูลในเบราว์เซอร์"
            description="ข้อมูลเอกสารบนเซิร์ฟเวอร์จะยังอยู่ แต่ cache และข้อมูลชั่วคราวของรุ่นเก่าจะถูกลบ"
          />
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setClearOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="danger" disabled={clearing} onClick={() => void clearLocalData()}>
              {clearing ? "กำลังล้าง…" : "ล้างข้อมูล"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
