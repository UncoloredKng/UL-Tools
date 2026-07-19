"use client";

import type { StatusMeta } from "@/types/strat-builder";
import { cn } from "@/lib/cn";

interface StatusIndicatorProps<K extends string> {
  status: K;
  meta: Record<K, StatusMeta>;
  /** Ordre de défilement des états à chaque clic. */
  order: readonly K[];
  onChange: (status: K) => void;
  className?: string;
}

/**
 * Pastille de statut cliquable. Un clic fait défiler l'état suivant selon
 * `order`. Le libellé et la couleur dépendent du contexte fourni via `meta`.
 */
export function StatusIndicator<K extends string>({
  status,
  meta,
  order,
  onChange,
  className,
}: StatusIndicatorProps<K>) {
  const current = meta[status];

  function cycle() {
    const index = order.indexOf(status);
    const next = order[(index + 1) % order.length];
    onChange(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title="Cliquer pour changer le statut"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-soft bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-border hover:text-foreground",
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", current.dot)} />
      {current.label}
    </button>
  );
}
