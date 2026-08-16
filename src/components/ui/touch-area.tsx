import { cn } from "@/lib/utils";
import React from "react";

export interface TouchAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function TouchArea({ className, asChild = false, ...props }: TouchAreaProps) {
  if (asChild) {
    const child = React.Children.only(
      props.children
    ) as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
    return React.cloneElement(child, {
      className: cn(child.props.className, "touch-target rounded-md", className),
      ...props,
    });
  }
  return <div className={cn("touch-target rounded-md", className)} {...props} />;
}
