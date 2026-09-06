import { useEffect, useState } from "react";
import { Download, FileText, LogOut, Moon, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTheme } from "@/lib/theme-provider";
import { listQueuedUploads } from "@/lib/api-v2";
import { queryClient, useCategories } from "@/lib/query";
import { useClerk, useUser } from "@clerk/clerk-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function Settings() {
  const { theme, toggle } = useTheme();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: categories } = useCategories();
  const [queued, setQueued] = useState(0);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    listQueuedUploads()
      .then((items) => setQueued(items.length))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function handleInstall() {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  async function handleClearCache() {
    setClearing(true);
    try {
      queryClient.clear();
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      toast.success("ล้าง cache แล้ว");
    } catch {
      toast.error("ล้าง cache ไม่สำเร็จ");
    } finally {
      setClearing(false);
    }
  }

  const totalDocs = (categories ?? []).reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-foreground">ตั้งค่า</h1>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">บัญชี</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-sm font-medium text-foreground">
              {user.fullName || user.primaryEmailAddress?.emailAddress}
            </p>
            {user.primaryEmailAddress && (
              <p className="truncate text-sm text-muted-foreground">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ธีม</CardTitle>
          <CardDescription>เลือกธีมสำหรับแอป</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => theme !== "light" && toggle()}
              className={`touch-target flex items-center justify-center gap-2 border p-3 text-sm font-medium ${
                theme === "light"
                  ? "border-border bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <Sun className="h-4 w-4" aria-hidden /> สว่าง
            </button>
            <button
              type="button"
              onClick={() => theme !== "dark" && toggle()}
              className={`touch-target flex items-center justify-center gap-2 border p-3 text-sm font-medium ${
                theme === "dark"
                  ? "border-border bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <Moon className="h-4 w-4" aria-hidden /> มืด
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">พื้นที่จัดเก็บ</CardTitle>
          <CardDescription>ภาพรวมเอกสารของคุณ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="text-sm text-foreground">เอกสารทั้งหมด</span>
            </div>
            <Badge variant="secondary">{totalDocs}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">หมวดหมู่</span>
            <Badge variant="secondary">{categories?.length ?? 0}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">คิวรออัปโหลด (ออฟไลน์)</span>
            <Badge variant="secondary">{queued}</Badge>
          </div>
        </CardContent>
      </Card>

      {installEvt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ติดตั้งแอป</CardTitle>
            <CardDescription>ติดตั้ง Paper ลงหน้าจอหลักเพื่อใช้งานแบบออฟไลน์</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="touch-target w-full gap-2" onClick={handleInstall}>
              <Download className="h-4 w-4" aria-hidden /> ติดตั้งแอป
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">แคช</CardTitle>
          <CardDescription>ล้างข้อมูลแคชในเครื่องแล้วโหลดข้อมูลใหม่</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="touch-target w-full gap-2"
            onClick={handleClearCache}
            disabled={clearing}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {clearing ? "กำลังล้าง..." : "ล้าง cache"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-center pb-4">
        <Button
          variant="outline"
          className="touch-target gap-2"
          onClick={async () => {
            await signOut();
            window.location.assign("/");
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden /> ออกจากระบบ
        </Button>
      </div>

      <p className="pb-8 text-center text-xs text-muted-foreground">
        Paper v2.0.0 · เก็บเอกสารส่วนตัวด้วย React และ Cloudflare
      </p>
    </div>
  );
}
