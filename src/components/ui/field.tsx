import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const fieldClass =
  "w-full rounded-[4px] border border-control bg-surface text-ink placeholder:text-muted/75 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-accent";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        className={cn(fieldClass, "min-h-11 px-3 text-base", className)}
        ref={ref}
        autoComplete="off"
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(fieldClass, "min-h-28 resize-y px-3 py-2.5 text-base", className)}
        autoComplete="off"
        {...props}
      />
    );
  },
);

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(fieldClass, "min-h-11 px-3 text-base", className)}
        autoComplete="off"
        {...props}
      />
    );
  },
);

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ id, label, required, hint, error, children }: FieldProps) {
  const description = error ?? hint;
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>
      {children}
      {description ? (
        <p
          id={`${id}-description`}
          className={cn("text-sm", error ? "text-accent" : "text-muted")}
          role={error ? "alert" : undefined}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
