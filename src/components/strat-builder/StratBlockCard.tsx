"use client";

import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trash2,
  LayoutGrid,
  Target,
  Film,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BLOCK_META, type BlockType, type StratBlock } from "@/types/strat-builder";
import { useStratStore } from "@/store/useStratStore";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/strat-builder/RichTextEditor";
import { PlatformAudienceBody } from "@/components/strat-builder/blocks/PlatformAudienceBody";
import { ObjectivesBody } from "@/components/strat-builder/blocks/ObjectivesBody";
import { AssetsBody } from "@/components/strat-builder/blocks/AssetsBody";

const BLOCK_ICON: Record<BlockType, LucideIcon> = {
  "platform-audience": LayoutGrid,
  objectives: Target,
  assets: Film,
};

interface Props {
  block: StratBlock;
  isFirst: boolean;
  isLast: boolean;
}

export function StratBlockCard({ block, isFirst, isLast }: Props) {
  const updateBlock = useStratStore((s) => s.updateBlock);
  const removeBlock = useStratStore((s) => s.removeBlock);
  const moveBlock = useStratStore((s) => s.moveBlock);

  const Icon = BLOCK_ICON[block.type];
  const update = (recipe: (b: StratBlock) => StratBlock) =>
    updateBlock(block.id, recipe);

  const collapsed = block.collapsed ?? false;

  return (
    <Card className="p-5">
      <div className={cn("flex items-center gap-2", !collapsed && "mb-4")}>
        <button
          type="button"
          onClick={() => update((b) => ({ ...b, collapsed: !collapsed }))}
          aria-label={collapsed ? "Déplier le bloc" : "Replier le bloc"}
          aria-expanded={!collapsed}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={block.title}
            onChange={(e) => update((b) => ({ ...b, title: e.target.value }))}
            className="h-9 border-transparent bg-transparent px-0 text-base font-semibold focus:border-transparent focus:ring-0"
          />
          <p className="px-0 text-xs text-muted-soft">
            {BLOCK_META[block.type].description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={isFirst}
            onClick={() => moveBlock(block.id, "up")}
            aria-label="Monter le bloc"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLast}
            onClick={() => moveBlock(block.id, "down")}
            aria-label="Descendre le bloc"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => removeBlock(block.id)}
            aria-label="Supprimer le bloc"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="mb-4">
            <RichTextEditor
              value={block.notes}
              onChange={(notes) => update((b) => ({ ...b, notes }))}
              placeholder="Réflexions, questionnements, décisions prises…"
            />
          </div>

          {block.type === "platform-audience" && (
            <PlatformAudienceBody block={block} update={update} />
          )}
          {block.type === "objectives" && (
            <ObjectivesBody block={block} update={update} />
          )}
          {block.type === "assets" && (
            <AssetsBody block={block} update={update} />
          )}
        </>
      )}
    </Card>
  );
}
