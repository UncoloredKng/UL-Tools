"use client";

import { useMemo } from "react";
import { Download, FileSpreadsheet, LayoutGrid, Plus, RotateCcw } from "lucide-react";
import { PhaseCard } from "@/components/dds-creator/PhaseCard";
import { DdsPreviewTable } from "@/components/dds-creator/DdsPreviewTable";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { FieldLabel, Input } from "@/components/ui/Field";
import { exportDdsDocument, flattenDocument } from "@/lib/ddsCreator";
import { useDdsStore, useDdsStoreHydrated } from "@/store/useDdsStore";

export default function DdsCreatorPage() {
  const hydrated = useDdsStoreHydrated();
  const document = useDdsStore((state) => state.document);
  const setCampaignField = useDdsStore((state) => state.setCampaignField);
  const addPhase = useDdsStore((state) => state.addPhase);
  const reset = useDdsStore((state) => state.reset);

  const rows = useMemo(() => flattenDocument(document), [document]);

  const stats = useMemo(() => {
    const publishers = document.phases.reduce(
      (total, phase) => total + phase.publishers.length,
      0
    );
    const segments = document.phases.reduce(
      (total, phase) =>
        total +
        phase.publishers.reduce((sub, publisher) => sub + publisher.segments.length, 0),
      0
    );
    return { phases: document.phases.length, publishers, segments, assets: rows.length };
  }, [document, rows.length]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <ToolPageHeader
        title="DDS Creator"
        description="Générez la base d'un Doc de Structure à partir d'un formulaire : phases, publishers, segments et assets."
        icon={LayoutGrid}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,520px)_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <CardHeader className="mb-4">
              <CardTitle>Informations campagne</CardTitle>
              <CardDescription>
                En-tête du document, repris tel quel dans l&apos;export Excel.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <FieldLabel htmlFor="campaign-name">Campaign name on Sizmek</FieldLabel>
                <Input
                  id="campaign-name"
                  value={document.campaignName}
                  placeholder="Ex : Sun - Musée Gastronomie"
                  onChange={(event) => setCampaignField("campaignName", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="campaign-id">Campaign ID</FieldLabel>
                <Input
                  id="campaign-id"
                  value={document.campaignId}
                  onChange={(event) => setCampaignField("campaignId", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="advertiser">Advertiser</FieldLabel>
                <Input
                  id="advertiser"
                  value={document.advertiser}
                  onChange={(event) => setCampaignField("advertiser", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="agency">Agency</FieldLabel>
                <Input
                  id="agency"
                  value={document.agency}
                  onChange={(event) => setCampaignField("agency", event.target.value)}
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {document.phases.map((phase, index) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                index={index}
                canRemove={document.phases.length > 1}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="primary" size="md" onClick={addPhase}>
              <Plus className="h-4 w-4" />
              Ajouter une phase
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                if (window.confirm("Réinitialiser tout le document ?")) {
                  reset();
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </div>

        <Card className="flex min-w-0 flex-col p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <CardHeader>
              <CardTitle>Prévisualisation du Doc de structure</CardTitle>
              <CardDescription>
                {hydrated
                  ? `${stats.phases} phase(s) · ${stats.publishers} publisher(s) · ${stats.segments} segment(s) · ${stats.assets} asset(s)`
                  : "Chargement..."}
              </CardDescription>
            </CardHeader>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={rows.length === 0}
              onClick={() => exportDdsDocument(document)}
            >
              <Download className="h-4 w-4" />
              Exporter en Excel
            </Button>
          </div>

          {rows.length > 0 ? (
            <DdsPreviewTable rows={rows} />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border-soft bg-surface-soft p-8 text-center">
              <FileSpreadsheet className="mb-4 h-10 w-10 text-muted-soft" strokeWidth={1.8} />
              <p className="text-sm font-medium text-foreground">
                Aucune ligne à afficher
              </p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Ajoutez au moins un asset dans un segment pour voir apparaître la
                prévisualisation du tableau.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
