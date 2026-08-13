import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TouchArea } from "@/components/ui/touch-area";
import { useTheme } from "@/lib/theme-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <TouchArea asChild>
            <Button variant="ghost" size="icon" onClick={toggle}>
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          </TouchArea>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Switch to {theme === "light" ? "dark" : "light"} mode
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
