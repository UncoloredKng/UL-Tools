"use client";

import { Plus, Trash2 } from "lucide-react";
import { PublisherCard } from "@/components/dds-creator/PublisherCard";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { useDdsStore } from "@/store/useDdsStore";
import { FUNNEL_SUGGESTIONS, type DdsPhase } from "@/types/dds-creator";

interface PhaseCardProps {
  phase: DdsPhase;
  index: number;
  canRemove: boolean;
}

export function PhaseCard({ phase, index, canRemove }: PhaseCardProps) {
  const updatePhaseFunnel = useDdsStore((state) => state.updatePhaseFunnel);
  const removePhase = useDdsStore((state) => state.removePhase);
  const addPublisher = useDdsStore((state) => state.addPublisher);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">
              {index + 1}
            </span>
            <FieldLabel htmlFor={`phase-${phase.id}`}>Phase / Funnel</FieldLabel>
          </div>
          <Input
            id={`phase-${phase.id}`}
            className="max-w-xs"
            list="funnel-suggestions"
            value={phase.funnel}
            placeholder="Ex : Awareness, Consideration..."
            onChange={(event) => updatePhaseFunnel(phase.id, event.target.value)}
          />
          <datalist id="funnel-suggestions">
            {FUNNEL_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => removePhase(phase.id)}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer la phase
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {phase.publishers.map((publisher, publisherIndex) => (
          <PublisherCard
            key={publisher.id}
            phaseId={phase.id}
            publisher={publisher}
            index={publisherIndex}
            canRemove={phase.publishers.length > 1}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="md"
        className="mt-4"
        onClick={() => addPublisher(phase.id)}
      >
        <Plus className="h-4 w-4" />
        Ajouter un publisher
      </Button>
    </div>
  );
}
