"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { useDdsStore } from "@/store/useDdsStore";
import { getPublisherConfig, type DdsAsset } from "@/types/dds-creator";

interface AssetCardProps {
  phaseId: string;
  publisherId: string;
  publisherName: string;
  segmentId: string;
  asset: DdsAsset;
  index: number;
  canRemove: boolean;
}

export function AssetCard({
  phaseId,
  publisherId,
  publisherName,
  segmentId,
  asset,
  index,
  canRemove,
}: AssetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const updateAsset = useDdsStore((state) => state.updateAsset);
  const removeAsset = useDdsStore((state) => state.removeAsset);
  const config = getPublisherConfig(publisherName);

  const patch = (patchValue: Partial<DdsAsset>) =>
    updateAsset(phaseId, publisherId, segmentId, asset.id, patchValue);

  const deviceOptions = config.devices.map((device) => ({ value: device, label: device }));
  if (asset.device && !config.devices.includes(asset.device)) {
    deviceOptions.push({ value: asset.device, label: asset.device });
  }

  return (
    <div className="rounded-xl border border-border-soft bg-surface-soft p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-soft">
          Asset {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => removeAsset(phaseId, publisherId, segmentId, asset.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Retirer
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`asset-name-${asset.id}`}>Nom de l&apos;asset</FieldLabel>
          <Input
            id={`asset-name-${asset.id}`}
            value={asset.assetName}
            placeholder="Ex : Hero, Brillance..."
            onChange={(event) => patch({ assetName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`asset-type-${asset.id}`}>Type d&apos;asset</FieldLabel>
          <Input
            id={`asset-type-${asset.id}`}
            value={asset.assetType}
            placeholder="Ex : Hero 30s, Short 15sec..."
            onChange={(event) => patch({ assetType: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`asset-device-${asset.id}`}>Device</FieldLabel>
          <Select
            id={`asset-device-${asset.id}`}
            options={deviceOptions}
            value={asset.device}
            onChange={(event) => patch({ device: event.target.value })}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
        />
        {expanded ? "Masquer" : "Wordings, liens & specs (optionnel)"}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border-soft pt-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-link-${asset.id}`}>Link</FieldLabel>
            <Input
              id={`asset-link-${asset.id}`}
              value={asset.link}
              placeholder="URL de l'annonce"
              onChange={(event) => patch({ link: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-cta-${asset.id}`}>CTA</FieldLabel>
            <Input
              id={`asset-cta-${asset.id}`}
              value={asset.cta}
              onChange={(event) => patch({ cta: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel htmlFor={`asset-adcopy-${asset.id}`}>AD Copy</FieldLabel>
            <Textarea
              id={`asset-adcopy-${asset.id}`}
              rows={2}
              value={asset.adCopy}
              onChange={(event) => patch({ adCopy: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-title-${asset.id}`} hint={asset.titleRule || undefined}>
              Title
            </FieldLabel>
            <Input
              id={`asset-title-${asset.id}`}
              value={asset.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-desc-${asset.id}`} hint={asset.descriptionRule || undefined}>
              Description Link AD
            </FieldLabel>
            <Input
              id={`asset-desc-${asset.id}`}
              value={asset.descriptionLinkAd}
              onChange={(event) => patch({ descriptionLinkAd: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-format-${asset.id}`}>Format</FieldLabel>
            <Input
              id={`asset-format-${asset.id}`}
              value={asset.format}
              onChange={(event) => patch({ format: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-specname-${asset.id}`}>Nom spec</FieldLabel>
            <Input
              id={`asset-specname-${asset.id}`}
              value={asset.specName}
              onChange={(event) => patch({ specName: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel htmlFor={`asset-specind-${asset.id}`}>
              Specs indications (lien doc)
            </FieldLabel>
            <Input
              id={`asset-specind-${asset.id}`}
              value={asset.specIndications}
              onChange={(event) => patch({ specIndications: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-filename-${asset.id}`}>File name</FieldLabel>
            <Input
              id={`asset-filename-${asset.id}`}
              value={asset.fileName}
              onChange={(event) => patch({ fileName: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-sizmek-${asset.id}`}>
              Liens Sizmek (ou URL Youtube)
            </FieldLabel>
            <Input
              id={`asset-sizmek-${asset.id}`}
              value={asset.sizmekLink}
              onChange={(event) => patch({ sizmekLink: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-assetid-${asset.id}`}>Asset ID</FieldLabel>
            <Input
              id={`asset-assetid-${asset.id}`}
              value={asset.assetId}
              onChange={(event) => patch({ assetId: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`asset-redirdevice-${asset.id}`}>
              Redirection (device only)
            </FieldLabel>
            <Input
              id={`asset-redirdevice-${asset.id}`}
              value={asset.redirectionDevice}
              onChange={(event) => patch({ redirectionDevice: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel htmlFor={`asset-redirurl-${asset.id}`}>URL de redirection</FieldLabel>
            <Input
              id={`asset-redirurl-${asset.id}`}
              value={asset.redirectionUrl}
              onChange={(event) => patch({ redirectionUrl: event.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
