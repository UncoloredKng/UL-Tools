"use client";

import { Plus, Trash2, Sparkles, Copy, Users } from "lucide-react";
import {
  ASSET_TYPES,
  type Asset,
  type AssetsBlock,
  type StratBlock,
} from "@/types/strat-builder";
import { createAsset, createAssetGroup } from "@/store/useStratStore";
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

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AssetsBody({ block, update }: Props) {
  function mutate(recipe: (b: AssetsBlock) => AssetsBlock) {
    update((b) => recipe(b as AssetsBlock));
  }

  function mapGroup(groupId: string, recipe: (assets: Asset[]) => Asset[]) {
    mutate((b) => ({
      ...b,
      groups: b.groups.map((g) =>
        g.id === groupId ? { ...g, assets: recipe(g.assets) } : g
      ),
    }));
  }

  function updateAsset(
    groupId: string,
    assetId: string,
    patch: Partial<{ name: string; assetType: string; duration: string }>
  ) {
    mapGroup(groupId, (assets) =>
      assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a))
    );
  }

  function duplicateAsset(groupId: string, assetId: string) {
    mapGroup(groupId, (assets) => {
      const index = assets.findIndex((a) => a.id === assetId);
      if (index === -1) return assets;
      const copy: Asset = { ...assets[index], id: newId() };
      const next = [...assets];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  const multipleGroups = block.groups.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {block.groups.map((group) => (
        <div
          key={group.id}
          className="rounded-xl border border-border-soft bg-surface-soft/60 p-3"
        >
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted" />
            <Input
              value={group.name}
              onChange={(e) =>
                mutate((b) => ({
                  ...b,
                  groups: b.groups.map((g) =>
                    g.id === group.id ? { ...g, name: e.target.value } : g
                  ),
                }))
              }
              placeholder="Adset / ciblage (ex. Creator, Brand)"
              className="h-9 font-medium"
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={!multipleGroups}
              onClick={() =>
                mutate((b) => ({
                  ...b,
                  groups: b.groups.filter((g) => g.id !== group.id),
                }))
              }
              aria-label="Retirer l'adset"
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {group.assets.map((asset) => (
              <div
                key={asset.id}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-lg border p-2.5",
                  asset.recommended
                    ? "border-accent/40 bg-accent-soft/40"
                    : "border-border-soft bg-surface/40"
                )}
              >
                <Input
                  value={asset.name}
                  onChange={(e) =>
                    updateAsset(group.id, asset.id, { name: e.target.value })
                  }
                  placeholder="Nom de la créa"
                  className="h-9 min-w-[150px] flex-[2]"
                />
                <Select
                  value={asset.assetType}
                  onChange={(e) =>
                    updateAsset(group.id, asset.id, { assetType: e.target.value })
                  }
                  options={TYPE_OPTIONS}
                  className="h-9 min-w-[110px] flex-1"
                />
                <Input
                  value={asset.duration}
                  onChange={(e) =>
                    updateAsset(group.id, asset.id, { duration: e.target.value })
                  }
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
                  onClick={() => duplicateAsset(group.id, asset.id)}
                  aria-label="Dupliquer la créa"
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    mapGroup(group.id, (assets) =>
                      assets.filter((a) => a.id !== asset.id)
                    )
                  }
                  aria-label="Retirer la créa"
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  mapGroup(group.id, (assets) => [...assets, createAsset(false)])
                }
                className="self-start text-accent hover:text-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une créa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  mapGroup(group.id, (assets) => [...assets, createAsset(true)])
                }
                className="self-start text-accent hover:text-accent"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Recommander une créa
              </Button>
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => mutate((b) => ({ ...b, groups: [...b.groups, createAssetGroup()] }))}
        className="self-start"
      >
        <Plus className="h-4 w-4" />
        Ajouter un adset / groupe de créas
      </Button>
    </div>
  );
}
