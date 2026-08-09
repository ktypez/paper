import {
  Sun,
  Moon,
  FileText,
  HardDrive,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/lib/theme-provider";
import { useReceipts } from "@/hooks/use-receipts";
import { useClerk } from "@clerk/clerk-react";import { formatSize } from "@/lib/utils";

export function Settings() {
  const { theme, toggle } = useTheme();
  const { receipts } = useReceipts();
  const { signOut } = useClerk();
  const totalStorage = receipts.reduce((sum, r) => sum + r.size, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggle}
              className="gap-2"
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4" /> Dark
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" /> Light
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Total documents</span>
            </div>
            <span className="text-sm font-medium">{receipts.length}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Storage used</span>
            </div>
            <span className="text-sm font-medium">
              {formatSize(totalStorage)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-medium text-foreground">Paper</span>
          </div>
          <p>Version 2.0.0. Personal document storage.</p>
          <Separator />
          <p>
            Built with React, shadcn/ui, and Cloudflare (D1 + R2 + Pages).
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          variant="outline"
          className="gap-2 text-destructive"
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