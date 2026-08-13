import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#1c1c1c] text-[#fcfbf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)] hover:opacity-90 active:opacity-80",
        outline:
          "border-[rgba(28,28,28,0.4)] bg-transparent text-foreground hover:bg-[rgba(28,28,28,0.04)]",
        secondary:
          "bg-background text-foreground hover:bg-[rgba(28,28,28,0.04)]",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-[rgba(28,28,28,0.04)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)] hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-1.5 px-4",
        xs: "h-8 gap-1 rounded-sm px-2 text-xs",
        sm: "h-9 gap-1 rounded-md px-3 text-xs",
        lg: "h-12 gap-1.5 px-6",
        icon: "size-11 rounded-full",
        "icon-xs":
          "size-8 rounded-full",
        "icon-sm":
          "size-9 rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
