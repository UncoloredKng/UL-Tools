"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface TagFieldProps {
  label: string;
  /** Valeurs suggérées (ex. issues des blocs). */
  options: string[];
  /** Valeurs sélectionnées pour cet item. */
  values: string[];
  onChange: (values: string[]) => void;
  accent?: string;
}

/**
 * Sélection multi-valeurs par "chips" : bascule les suggestions existantes
 * et permet d'ajouter des entrées personnalisées.
 */
export function TagField({
  label,
  options,
  values,
  onChange,
  accent = "bg-accent-soft text-accent",
}: TagFieldProps) {
  const [draft, setDraft] = useState("");

  const all = Array.from(new Set([...options, ...values]));

  function toggle(value: string) {
    onChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value]
    );
  }

  function addCustom() {
    const clean = draft.trim();
    if (!clean || values.includes(clean)) {
      setDraft("");
      return;
    }
    onChange([...values, clean]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-medium uppercase tracking-wide text-muted-soft">
          {label}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {all.map((value) => {
          const selected = values.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                selected
                  ? cn("border-transparent", accent)
                  : "border-border-soft text-muted hover:border-border hover:text-foreground"
              )}
            >
              {value}
              {selected && <X className="h-3 w-3" />}
            </button>
          );
        })}
        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-soft pl-2 pr-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Ajouter…"
            className="w-20 bg-transparent py-1 text-xs text-foreground placeholder:text-muted-soft outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            aria-label={`Ajouter à ${label}`}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
          </button>
        </span>
      </div>
    </div>
  );
}
