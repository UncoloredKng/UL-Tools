"use client";

import { Plus, Trash2, Sparkles } from "lucide-react";
import {
  ASSET_TYPES,
  type AssetsBlock,
  type StratBlock,
} from "@/types/strat-builder";
import { createAsset } from "@/store/useStratStore";
import { Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface Props {
  block: AssetsBlock;
  update: (recipe: (block: StratBlock) => StratBlock) => void;
}

const TYPE_OPTIONS = [
  { value: "", label: "Type…" },
  ...ASSET_TYPES.map((t) => ({ value: t, label: t })),
];

export function AssetsBody({ block, update }: Props) {
  function mutate(recipe: (b: AssetsBlock) => AssetsBlock) {
    update((b) => recipe(b as AssetsBlock));
  }

  function updateAsset(
    assetId: string,
    patch: Partial<{ name: string; assetType: string; duration: string }>
  ) {
    mutate((b) => ({
      ...b,
      assets: b.assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a)),
    }));
  }

  return (
    <div className="flex flex-col gap-2">
      {block.assets.map((asset) => (
        <div
          key={asset.id}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border p-2.5",
            asset.recommended
              ? "border-accent/40 bg-accent-soft/40"
              : "border-border-soft bg-surface-soft/60"
          )}
        >
          <Input
            value={asset.name}
            onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
            placeholder="Nom de l'asset"
            className="h-9 min-w-[160px] flex-[2]"
          />
          <Select
            value={asset.assetType}
            onChange={(e) => updateAsset(asset.id, { assetType: e.target.value })}
            options={TYPE_OPTIONS}
            className="h-9 min-w-[120px] flex-1"
          />
          <Input
            value={asset.duration}
            onChange={(e) => updateAsset(asset.id, { duration: e.target.value })}
            placeholder="Durée (option.)"
            className="h-9 w-28"
          />
          {asset.recommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3" />
              Reco client
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              mutate((b) => ({
                ...b,
                assets: b.assets.filter((a) => a.id !== asset.id),
              }))
            }
            aria-label="Retirer l'asset"
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => mutate((b) => ({ ...b, assets: [...b.assets, createAsset(false)] }))}
          className="self-start"
        >
          <Plus className="h-4 w-4" />
          Ajouter un asset
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => mutate((b) => ({ ...b, assets: [...b.assets, createAsset(true)] }))}
          className="self-start text-accent"
        >
          <Sparkles className="h-4 w-4" />
          Recommander un asset
        </Button>
      </div>
    </div>
  );
}
