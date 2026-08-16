import {
  Sun,
  Moon,
  FileText,
  HardDrive,
  LogOut,
  User,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme-provider";
import { useReceipts } from "@/hooks/use-receipts";
import { useClerk, useUser } from "@clerk/clerk-react";
import { formatSize } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function Settings() {
  const { theme, toggle } = useTheme();
  const { receipts } = useReceipts();
  const { signOut } = useClerk();
  const { user } = useUser();
  const totalStorage = receipts.reduce((sum, r) => sum + r.size, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt=""
                  className="h-14 w-14 rounded-full border border-border"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">
                  {user.fullName || user.primaryEmailAddress?.emailAddress}
                </p>
                {user.primaryEmailAddress && (
                  <p className="truncate text-sm text-muted-foreground">
                    {user.primaryEmailAddress.emailAddress}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Appearance</CardTitle>
          <CardDescription>
            เลือกธีมสำหรับแอป
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  if (theme !== value) toggle();
                }}
                className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  theme === value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                {theme === value && (
                  <div className="absolute right-2 top-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Storage</CardTitle>
          <CardDescription>พื้นที่จัดเก็บเอกสารของคุณ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Total documents</span>
            </div>
            <Badge variant="secondary">{receipts.length}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Storage used</span>
            </div>
            <Badge variant="secondary">{formatSize(totalStorage)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-medium text-foreground">Paper</span>
            <Badge variant="outline" className="text-xs">
              v2.0.0
            </Badge>
          </div>
          <p>Personal document storage built with React & Cloudflare.</p>
        </CardContent>
      </Card>

      {/* Sign out */}
      <div className="flex justify-center pb-8">
        <Button
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={async () => {
            await signOut();
            window.location.assign("/");
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
