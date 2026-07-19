"use client";

import { Plus, Trash2, Users } from "lucide-react";
import {
  AUDIENCE_STATUS,
  PLATFORM_SUGGESTIONS,
  STATUS_ORDER,
  type PlatformAudienceBlock,
  type StatusLevel,
  type StratBlock,
} from "@/types/strat-builder";
import { createAudience, createPlatform } from "@/store/useStratStore";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/strat-builder/StatusIndicator";

interface Props {
  block: PlatformAudienceBlock;
  update: (recipe: (block: StratBlock) => StratBlock) => void;
}

export function PlatformAudienceBody({ block, update }: Props) {
  function mutate(recipe: (b: PlatformAudienceBlock) => PlatformAudienceBlock) {
    update((b) => recipe(b as PlatformAudienceBlock));
  }

  function updatePlatform(platformId: string, patch: Partial<{ name: string }>) {
    mutate((b) => ({
      ...b,
      platforms: b.platforms.map((p) =>
        p.id === platformId ? { ...p, ...patch } : p
      ),
    }));
  }

  function updateAudience(
    platformId: string,
    audienceId: string,
    patch: Partial<{ name: string; potential: string; status: StatusLevel }>
  ) {
    mutate((b) => ({
      ...b,
      platforms: b.platforms.map((p) =>
        p.id === platformId
          ? {
              ...p,
              audiences: p.audiences.map((a) =>
                a.id === audienceId ? { ...a, ...patch } : a
              ),
            }
          : p
      ),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <datalist id="strat-platform-suggestions">
        {PLATFORM_SUGGESTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {block.platforms.map((platform) => (
        <div
          key={platform.id}
          className="rounded-xl border border-border-soft bg-surface-soft/60 p-3"
        >
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted" />
            <Input
              list="strat-platform-suggestions"
              value={platform.name}
              onChange={(e) => updatePlatform(platform.id, { name: e.target.value })}
              placeholder="Plateforme (META, TikTok, Snap…)"
              className="h-9 font-medium"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                mutate((b) => ({
                  ...b,
                  platforms: b.platforms.filter((p) => p.id !== platform.id),
                }))
              }
              aria-label="Retirer la plateforme"
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {platform.audiences.map((audience) => (
              <div key={audience.id} className="flex flex-wrap items-center gap-2">
                <Input
                  value={audience.name}
                  onChange={(e) =>
                    updateAudience(platform.id, audience.id, { name: e.target.value })
                  }
                  placeholder="Nom de l'audience"
                  className="h-9 min-w-[160px] flex-[2]"
                />
                <Input
                  value={audience.potential}
                  onChange={(e) =>
                    updateAudience(platform.id, audience.id, {
                      potential: e.target.value,
                    })
                  }
                  placeholder="Potentiel (ex. 1,2M)"
                  className="h-9 min-w-[120px] flex-1"
                />
                <StatusIndicator
                  status={audience.status}
                  meta={AUDIENCE_STATUS}
                  order={STATUS_ORDER}
                  onChange={(status) =>
                    updateAudience(platform.id, audience.id, { status })
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    mutate((b) => ({
                      ...b,
                      platforms: b.platforms.map((p) =>
                        p.id === platform.id
                          ? {
                              ...p,
                              audiences: p.audiences.filter(
                                (a) => a.id !== audience.id
                              ),
                            }
                          : p
                      ),
                    }))
                  }
                  aria-label="Retirer l'audience"
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                mutate((b) => ({
                  ...b,
                  platforms: b.platforms.map((p) =>
                    p.id === platform.id
                      ? { ...p, audiences: [...p.audiences, createAudience()] }
                      : p
                  ),
                }))
              }
              className="self-start text-accent hover:text-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une audience
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          mutate((b) => ({ ...b, platforms: [...b.platforms, createPlatform()] }))
        }
        className="self-start"
      >
        <Plus className="h-4 w-4" />
        Ajouter une plateforme
      </Button>
    </div>
  );
}
