import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, mono, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 focus-visible:border-brass disabled:cursor-not-allowed disabled:opacity-50",
          mono && "font-mono",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
