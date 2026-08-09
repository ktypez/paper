import * as React from "react"
import { cn } from "@/lib/utils"

interface ClaudeNoteProps extends React.HTMLAttributes<HTMLDivElement> {
  tags?: string[]
  title?: string
  description?: string
  callout?: string
  meta?: string
}

export function ClaudeNote({ 
  className, 
  tags = ["#warm", "#editorial", "#dual-mode"],
  title = "Why paper still wins",
  description = "Quiet surfaces, a cobalt accent, and a serif that doesn't shout. Light and dark on the same hierarchy, calm either way.",
  callout = "Reading stays at 17px with 1.72 line height. Your eyes will thank you.",
  meta = "// obsidian · 2026-07-31 · vault: notes",
  ...props 
}: ClaudeNoteProps) {
  return (
    <div 
      className={cn("relative p-6 border rounded-lg", className)}
      style={{
        background: "var(--bg, var(--background))",
        border: "1px solid var(--border, #e5e5e5)",
        boxShadow: "var(--shadow, 0 2px 8px rgba(0,0,0,0.08))",
      }}
      {...props}
    >
      <div className="mb-2.5">
        {tags.map((tag, i) => (
          <span 
            key={i}
            className="inline-block font-mono text-[10px] px-2 py-0.5 rounded-full mr-1.5"
            style={{ 
              color: "var(--accent-deep, #b85c3f)",
              background: "var(--accent-soft, rgba(217, 119, 87, 0.1))",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      
      <h3 
        className="text-2xl font-semibold tracking-tight leading-tight mb-2"
        style={{ color: "var(--fg, var(--foreground))" }}
      >
        {title}
      </h3>
      
      <p 
        className="text-[15px] mb-3.5"
        style={{ color: "var(--fg-muted, var(--muted-foreground))" }}
      >
        {description}
      </p>
      
      {callout && (
        <div 
          className="flex gap-2.5 p-2.5 rounded-lg text-[13.5px]"
          style={{ 
            background: "var(--accent-soft, rgba(217, 119, 87, 0.1))",
            color: "var(--fg, var(--foreground))",
          }}
        >
          <span 
            className="font-mono flex-shrink-0"
            style={{ color: "var(--accent, #1d4ed8)" }}
          >
            ❝
          </span>
          <span>{callout}</span>
        </div>
      )}
      
      {meta && (
        <div 
          className="mt-3.5 pt-3 border-t font-mono text-[10px]"
          style={{ 
            borderTop: "1px solid var(--border, #e5e5e5)",
            color: "var(--fg-dim, var(--muted-foreground))",
          }}
        >
          {meta}
        </div>
      )}
    </div>
  )
}
