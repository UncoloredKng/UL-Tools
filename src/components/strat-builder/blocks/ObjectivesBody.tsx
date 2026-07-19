"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  OBJECTIVE_STATUS,
  OBJECTIVE_STATUS_ORDER,
  type ObjectivesBlock,
  type ObjectiveStatus,
  type StratBlock,
} from "@/types/strat-builder";
import { createObjective } from "@/store/useStratStore";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/strat-builder/StatusIndicator";

interface Props {
  block: ObjectivesBlock;
  update: (recipe: (block: StratBlock) => StratBlock) => void;
}

export function ObjectivesBody({ block, update }: Props) {
  function mutate(recipe: (b: ObjectivesBlock) => ObjectivesBlock) {
    update((b) => recipe(b as ObjectivesBlock));
  }

  function updateObjective(
    objectiveId: string,
    patch: Partial<{ goal: string; approach: string; status: ObjectiveStatus }>
  ) {
    mutate((b) => ({
      ...b,
      objectives: b.objectives.map((o) =>
        o.id === objectiveId ? { ...o, ...patch } : o
      ),
    }));
  }

  return (
    <div className="flex flex-col gap-2">
      {block.objectives.map((objective) => (
        <div
          key={objective.id}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-border-soft bg-surface-soft/60 p-2.5"
        >
          <Input
            value={objective.goal}
            onChange={(e) => updateObjective(objective.id, { goal: e.target.value })}
            placeholder="Objectif (ex. 60% de reach cible)"
            className="h-9 min-w-[180px] flex-[2] font-medium"
          />
          <Input
            value={objective.approach}
            onChange={(e) =>
              updateObjective(objective.id, { approach: e.target.value })
            }
            placeholder="Comment y répondre…"
            className="h-9 min-w-[180px] flex-[3]"
          />
          <StatusIndicator
            status={objective.status}
            meta={OBJECTIVE_STATUS}
            order={OBJECTIVE_STATUS_ORDER}
            onChange={(status) => updateObjective(objective.id, { status })}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              mutate((b) => ({
                ...b,
                objectives: b.objectives.filter((o) => o.id !== objective.id),
              }))
            }
            aria-label="Retirer l'objectif"
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          mutate((b) => ({ ...b, objectives: [...b.objectives, createObjective()] }))
        }
        className="self-start"
      >
        <Plus className="h-4 w-4" />
        Ajouter un objectif
      </Button>
    </div>
  );
}
