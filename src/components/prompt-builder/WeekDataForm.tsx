"use client";

import { Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { KpiWeightingPanel } from "@/components/prompt-builder/KpiWeightingPanel";
import { DataPasteField } from "@/components/prompt-builder/DataPasteField";
import { buildPrompt } from "@/lib/generatePrompt";
import type { Campaign, KpiWeights, ReportMode, WeekDraft } from "@/types/prompt-builder";

const REPORT_MODE_OPTIONS: { value: ReportMode; label: string }[] = [
  { value: "lancement", label: "🌱 Lancement" },
  { value: "run", label: "📈 Run (Hebdo)" },
  { value: "bilan", label: "🏁 Bilan" },
];

interface WeekDataFormProps {
  campaign: Campaign;
  onUpdateDraft: (patch: Partial<WeekDraft>) => void;
  onResetDraft: () => void;
  onGenerate: (prompt: string) => void;
}

export function WeekDataForm({
  campaign,
  onUpdateDraft,
  onResetDraft,
  onGenerate,
}: WeekDataFormProps) {
  const { draft } = campaign;

  function handleWeightChange(key: keyof KpiWeights, value: number) {
    onUpdateDraft({ kpiWeights: { ...draft.kpiWeights, [key]: value } });
  }

  function handleGenerate() {
    const prompt = buildPrompt(draft);
    onGenerate(prompt);
  }

  const isLancement = draft.mode === "lancement";

  const hasAnyContent =
    draft.tcdData.trim() ||
    draft.bddData.trim() ||
    draft.benchmarks.trim() ||
    draft.contexteAutre.trim() ||
    draft.oldComments.trim() ||
    draft.contexteGlobal.trim() ||
    draft.contexteCrea.trim() ||
    draft.useKpiWeighting;

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Données de la semaine
          </h2>
          <p className="mt-1 text-sm text-muted">
            Renseignez les informations disponibles pour la semaine en cours.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onResetDraft} title="Réinitialiser le brief">
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser
        </Button>
      </div>

      <div className="mb-5">
        <FieldLabel>Mode de rapport</FieldLabel>
        <div className="mt-1.5">
          <ToggleGroup
            options={REPORT_MODE_OPTIONS}
            value={draft.mode}
            onChange={(mode) => onUpdateDraft({ mode })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <FieldLabel htmlFor="weekLabel">Libellé de la semaine</FieldLabel>
          <Input
            id="weekLabel"
            className="mt-1.5"
            placeholder="Ex : Semaine du 07 au 13 juillet"
            value={draft.weekLabel}
            onChange={(e) => onUpdateDraft({ weekLabel: e.target.value })}
          />
        </div>

        <DataPasteField
          id="tcdData"
          label="Données TCD actualisées (coller depuis Excel)"
          placeholder="Sélectionnez vos cellules dans Excel/Google Sheets, puis collez-les ici (Cmd/Ctrl+V)…"
          value={draft.tcdData}
          table={draft.tcdTable}
          onChange={(tcdData, tcdTable) => onUpdateDraft({ tcdData, tcdTable })}
          rows={8}
        />

        <DataPasteField
          id="bddData"
          label="Données brutes (export BDD)"
          placeholder="Export brut issu de la base de données (logs, requêtes, extraction plateforme…)"
          value={draft.bddData}
          table={draft.bddTable}
          onChange={(bddData, bddTable) => onUpdateDraft({ bddData, bddTable })}
          rows={5}
        />

        <DataPasteField
          id="benchmarks"
          label="Benchmarks"
          placeholder="Benchmarks internes ou marché à comparer aux performances…"
          value={draft.benchmarks}
          table={draft.benchmarksTable}
          onChange={(benchmarks, benchmarksTable) =>
            onUpdateDraft({ benchmarks, benchmarksTable })
          }
          rows={3}
          monospace={false}
        />

        <div>
          <FieldLabel htmlFor="contexteAutre">Contexte / Autre</FieldLabel>
          <Textarea
            id="contexteAutre"
            className="mt-1.5"
            rows={3}
            placeholder="Événements, changements de budget, saisonnalité, actus client…"
            value={draft.contexteAutre}
            onChange={(e) => onUpdateDraft({ contexteAutre: e.target.value })}
          />
        </div>

        {isLancement ? (
          <>
            <div>
              <FieldLabel htmlFor="contexteGlobal">
                Contexte global (Objectifs et KPI cibles)
              </FieldLabel>
              <Textarea
                id="contexteGlobal"
                className="mt-1.5"
                rows={3}
                placeholder="Objectifs de la campagne, KPI cibles à atteindre, budget alloué…"
                value={draft.contexteGlobal}
                onChange={(e) => onUpdateDraft({ contexteGlobal: e.target.value })}
              />
            </div>

            <div>
              <FieldLabel htmlFor="contexteCrea">
                Stratégie créa &amp; audiences (A/B tests)
              </FieldLabel>
              <Textarea
                id="contexteCrea"
                className="mt-1.5"
                rows={3}
                placeholder="Hypothèses créatives, audiences testées, structure des A/B tests…"
                value={draft.contexteCrea}
                onChange={(e) => onUpdateDraft({ contexteCrea: e.target.value })}
              />
            </div>
          </>
        ) : (
          <div>
            <FieldLabel htmlFor="oldComments">Commentaires précédents de l&apos;IA</FieldLabel>
            <Textarea
              id="oldComments"
              className="mt-1.5"
              rows={3}
              placeholder="Reprenez ici les points clés de la dernière analyse générée…"
              value={draft.oldComments}
              onChange={(e) => onUpdateDraft({ oldComments: e.target.value })}
            />
          </div>
        )}

        <KpiWeightingPanel
          enabled={draft.useKpiWeighting}
          weights={draft.kpiWeights}
          onToggle={(enabled) => onUpdateDraft({ useKpiWeighting: enabled })}
          onWeightChange={handleWeightChange}
        />
      </div>

      <div className="mt-6">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleGenerate}
          disabled={!hasAnyContent}
        >
          <Sparkles className="h-5 w-5" />
          Générer le Prompt
        </Button>
      </div>
    </Card>
  );
}
