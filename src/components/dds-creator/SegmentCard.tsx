"use client";

import { Plus, Trash2 } from "lucide-react";
import { AssetCard } from "@/components/dds-creator/AssetCard";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { useDdsStore } from "@/store/useDdsStore";
import type { DdsSegment } from "@/types/dds-creator";

interface SegmentCardProps {
  phaseId: string;
  publisherId: string;
  publisherName: string;
  segment: DdsSegment;
  index: number;
  canRemove: boolean;
}

export function SegmentCard({
  phaseId,
  publisherId,
  publisherName,
  segment,
  index,
  canRemove,
}: SegmentCardProps) {
  const updateSegmentName = useDdsStore((state) => state.updateSegmentName);
  const removeSegment = useDdsStore((state) => state.removeSegment);
  const addAsset = useDdsStore((state) => state.addAsset);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <FieldLabel htmlFor={`segment-name-${segment.id}`}>
            Segment / Audience {index + 1}
          </FieldLabel>
          <Input
            id={`segment-name-${segment.id}`}
            value={segment.name}
            placeholder="Nom du segment (naming d'audience complet)"
            onChange={(event) =>
              updateSegmentName(phaseId, publisherId, segment.id, event.target.value)
            }
          />
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => removeSegment(phaseId, publisherId, segment.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Segment
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {segment.assets.map((asset, assetIndex) => (
          <AssetCard
            key={asset.id}
            phaseId={phaseId}
            publisherId={publisherId}
            publisherName={publisherName}
            segmentId={segment.id}
            asset={asset}
            index={assetIndex}
            canRemove={segment.assets.length > 1}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2.5"
        onClick={() => addAsset(phaseId, publisherId, segment.id)}
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter un asset
      </Button>
    </div>
  );
}
