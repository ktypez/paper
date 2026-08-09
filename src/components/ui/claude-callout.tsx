import * as React from "react"
import { cn } from "@/lib/utils"

interface ClaudeCalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string
  children: React.ReactNode
}

export function ClaudeCallout({ 
  className, 
  icon = "❝",
  children,
  ...props 
}: ClaudeCalloutProps) {
  return (
    <div 
      className={cn("flex gap-2.5 p-2.5 rounded-lg text-[13.5px]", className)}
      style={{ 
        background: "var(--accent-soft, rgba(217, 119, 87, 0.1))",
        color: "var(--fg, var(--foreground))",
      }}
      {...props}
    >
      <span 
        className="font-mono flex-shrink-0"
        style={{ color: "var(--accent, #1d4ed8)" }}
      >
        {icon}
      </span>
      <span>{children}</span>
    </div>
  )
}
