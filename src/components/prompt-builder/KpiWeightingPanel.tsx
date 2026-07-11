"use client";

import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import type { KpiWeights } from "@/types/prompt-builder";

const KPI_FIELDS: { key: keyof KpiWeights; label: string }[] = [
  { key: "awareness", label: "Awareness" },
  { key: "videoViews", label: "Vues Vidéo" },
  { key: "engagement", label: "Engagement" },
  { key: "traffic", label: "Trafic" },
];

interface KpiWeightingPanelProps {
  enabled: boolean;
  weights: KpiWeights;
  onToggle: (enabled: boolean) => void;
  onWeightChange: (key: keyof KpiWeights, value: number) => void;
}

export function KpiWeightingPanel({
  enabled,
  weights,
  onToggle,
  onWeightChange,
}: KpiWeightingPanelProps) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface-soft p-4">
      <Switch
        id="kpi-weighting"
        checked={enabled}
        onChange={onToggle}
        label="Activer la pondération stratégique (KPI)"
        description="Oriente l'analyse de l'IA vers les KPIs que vous jugez prioritaires cette semaine."
      />

      {enabled && (
        <div className="mt-4 grid grid-cols-1 gap-5 border-t border-border-soft pt-4 sm:grid-cols-2">
          {KPI_FIELDS.map(({ key, label }) => (
            <Slider
              key={key}
              label={label}
              value={weights[key]}
              onChange={(value) => onWeightChange(key, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
