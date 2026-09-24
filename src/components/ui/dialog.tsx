import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { children: ReactNode; hideClose?: boolean }
>(function DialogContent({ className, children, hideClose = false, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="modal-overlay fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] data-[state=closed]:animate-[fade-out_140ms_ease-out] data-[state=open]:animate-[fade-in_140ms_ease-out]" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-sheet border border-line bg-raised p-5 shadow-sheet outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink data-[state=closed]:animate-[dialog-out_160ms_ease-out] data-[state=open]:animate-[dialog-in_180ms_ease-out] sm:p-6",
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-[10px] text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="ปิด"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export function DialogHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="pr-12">
      <DialogPrimitive.Title className="break-words text-xl font-semibold tracking-[-0.02em] text-ink">
        {title}
      </DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="mt-2 max-w-[52ch] text-sm leading-6 text-muted">
          {description}
        </DialogPrimitive.Description>
      ) : null}
    </div>
  );
}
