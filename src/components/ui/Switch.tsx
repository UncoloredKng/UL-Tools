"use client";

import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  id?: string;
}

export function Switch({ checked, onChange, label, description, id }: SwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {label && (
          <label
            htmlFor={id}
            className="cursor-pointer text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-surface-hover border border-border-soft"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}
