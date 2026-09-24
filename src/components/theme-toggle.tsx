import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { resolvedTheme, setPreference } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const Icon = resolvedTheme === "dark" ? Sun : Moon;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setPreference(nextTheme)}
      aria-label={nextTheme === "dark" ? "เปลี่ยนเป็นโหมดมืด" : "เปลี่ยนเป็นโหมดสว่าง"}
      title={nextTheme === "dark" ? "โหมดมืด" : "โหมดสว่าง"}
    >
      <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
    </Button>
  );
}
