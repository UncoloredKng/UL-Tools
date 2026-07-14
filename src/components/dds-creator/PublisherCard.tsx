"use client";

import { Layers, Plus, Trash2 } from "lucide-react";
import { SegmentCard } from "@/components/dds-creator/SegmentCard";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useDdsStore } from "@/store/useDdsStore";
import { PUBLISHERS, type DdsPublisher } from "@/types/dds-creator";

interface PublisherCardProps {
  phaseId: string;
  publisher: DdsPublisher;
  index: number;
  canRemove: boolean;
}

export function PublisherCard({ phaseId, publisher, index, canRemove }: PublisherCardProps) {
  const updatePublisherName = useDdsStore((state) => state.updatePublisherName);
  const removePublisher = useDdsStore((state) => state.removePublisher);
  const addSegment = useDdsStore((state) => state.addSegment);

  return (
    <div className="rounded-2xl border border-border bg-surface-soft p-4">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <FieldLabel htmlFor={`publisher-${publisher.id}`}>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-accent" />
              Publisher {index + 1}
            </span>
          </FieldLabel>
          <Select
            id={`publisher-${publisher.id}`}
            className="max-w-xs"
            options={PUBLISHERS.map((name) => ({ value: name, label: name }))}
            value={publisher.name}
            onChange={(event) =>
              updatePublisherName(phaseId, publisher.id, event.target.value)
            }
          />
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => removePublisher(phaseId, publisher.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Publisher
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {publisher.segments.map((segment, segmentIndex) => (
          <SegmentCard
            key={segment.id}
            phaseId={phaseId}
            publisherId={publisher.id}
            publisherName={publisher.name}
            segment={segment}
            index={segmentIndex}
            canRemove={publisher.segments.length > 1}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => addSegment(phaseId, publisher.id)}
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter un segment
      </Button>
    </div>
  );
}
