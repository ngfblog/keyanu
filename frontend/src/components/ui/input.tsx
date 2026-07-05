import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, mono, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 focus-visible:border-brass disabled:cursor-not-allowed disabled:opacity-50",
          mono && "font-mono",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
