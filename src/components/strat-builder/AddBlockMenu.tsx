"use client";

import { LayoutGrid, Target, Film, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BLOCK_META, type BlockType } from "@/types/strat-builder";
import { useStratStore } from "@/store/useStratStore";
import { Button } from "@/components/ui/Button";

const OPTIONS: { type: BlockType; icon: LucideIcon }[] = [
  { type: "platform-audience", icon: LayoutGrid },
  { type: "objectives", icon: Target },
  { type: "assets", icon: Film },
];

export function AddBlockMenu() {
  const addBlock = useStratStore((s) => s.addBlock);

  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted">
        <Plus className="h-4 w-4" />
        Ajouter un bloc
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ type, icon: Icon }) => (
          <Button
            key={type}
            variant="secondary"
            onClick={() => addBlock(type)}
            className="h-auto flex-col items-start gap-1 py-3 text-left"
          >
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Icon className="h-4 w-4 text-accent" />
              {BLOCK_META[type].label}
            </span>
            <span className="text-xs font-normal text-muted-soft">
              {BLOCK_META[type].description}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
