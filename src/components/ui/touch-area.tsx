import { cn } from "@/lib/utils";
import React from "react";

export interface TouchAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function TouchArea({ className, asChild = false, ...props }: TouchAreaProps) {
  const base = "inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md";
  if (asChild) {
    const child = React.Children.only(props.children) as React.ReactElement;
    return React.cloneElement(child, {
      className: cn(child.props.className, base, className),
      ...props,
    });
  }
  return <div className={cn(base, className)} {...props} />;
}
