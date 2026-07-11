"use client";

import { cn } from "@/lib/cn";

interface ToggleGroupOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleGroupProps<T extends string> {
  options: ToggleGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function ToggleGroup<T extends string>({ options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap gap-1 rounded-xl border border-border-soft bg-surface-soft p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer",
              active
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
