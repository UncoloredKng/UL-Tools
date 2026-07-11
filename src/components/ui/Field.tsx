import { forwardRef } from "react";
import type { LabelHTMLAttributes, TextareaHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function FieldLabel({
  className,
  hint,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label
        className={cn("text-sm font-medium text-foreground", className)}
        {...props}
      >
        {children}
      </label>
      {hint && <span className="text-xs text-muted-soft">{hint}</span>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  monospace?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, monospace, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-border-soft bg-surface-soft px-3.5 py-3 text-sm text-foreground placeholder:text-muted-soft outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent/40 resize-y",
          monospace && "font-mono text-[13px] leading-relaxed",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-border-soft bg-surface-soft px-3.5 text-sm text-foreground placeholder:text-muted-soft outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent/40",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
