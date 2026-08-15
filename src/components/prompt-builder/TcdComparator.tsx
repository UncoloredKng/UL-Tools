"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  GitCompareArrows,
  Minus,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { cn } from "@/lib/cn";
import {
  getGranularityLabel,
  analyzeMetricTrends,
  compareTcd,
  formatEvolution,
  formatMetricValue,
  type EntityMetricComparison,
  type MetricTrend,
} from "@/lib/tcdCompare";
import {
  listAvailableEntities,
  listAvailableGranularities,
  listAvailableKpiHeaders,
  type TcdGranularity,
} from "@/lib/tcdParser";
import type { HistoryEntry, WeekDraft } from "@/types/prompt-builder";

interface TcdComparatorProps {
  draft: WeekDraft;
  history: HistoryEntry[];
}

const TREND_LABELS: Record<MetricTrend, string> = {
  up: "Hausse constante",
  down: "Baisse constante",
  stable: "Stable",
  volatile: "Variable",
  insufficient: "Données insuffisantes",
};

const GRANULARITY_OPTIONS: { value: TcdGranularity; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "platform", label: "Plateforme" },
  { value: "campaign", label: "Campagne" },
  { value: "adset", label: "Adset" },
];

function TrendBadge({ trend }: { trend: MetricTrend }) {
  const config: Record<MetricTrend, { icon: typeof TrendingUp; className: string }> = {
    up: { icon: TrendingUp, className: "text-accent bg-accent-soft" },
    down: { icon: TrendingDown, className: "text-danger bg-danger-soft" },
    stable: { icon: Minus, className: "text-muted bg-surface-hover" },
    volatile: { icon: Waves, className: "text-muted bg-surface-hover" },
    insufficient: { icon: Minus, className: "text-muted-soft bg-surface-soft" },
  };

  const { icon: Icon, className } = config[trend];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {TREND_LABELS[trend]}
    </span>
  );
}

function EvolutionCell({ comparison }: { comparison: EntityMetricComparison }) {
  if (comparison.status !== "matched") {
    return <span className="text-xs text-muted-soft">—</span>;
  }

  const displayValue = comparison.isPercent
    ? formatEvolution(comparison.deltaPoints, true)
    : formatEvolution(comparison.evolutionPercent, false);

  if (displayValue === "—") {
    return <span className="text-xs text-muted-soft">—</span>;
  }

  const numeric = comparison.isPercent
    ? comparison.deltaPoints
    : comparison.evolutionPercent;
  const isPositive = numeric !== null && numeric > 0;
  const isNegative = numeric !== null && numeric < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        isPositive && "text-accent",
        isNegative && "text-danger",
        !isPositive && !isNegative && "text-muted"
      )}
    >
      {isPositive && <ArrowUpRight className="h-3 w-3" />}
      {isNegative && <ArrowDownRight className="h-3 w-3" />}
      {displayValue}
    </span>
  );
}

export function TcdComparator({ draft, history }: TcdComparatorProps) {
  const [referenceId, setReferenceId] = useState<string>(() => history[0]?.id ?? "");
  const [showTrends, setShowTrends] = useState(true);
  const [granularity, setGranularity] = useState<TcdGranularity>("global");
  const [selectedKpiKeys, setSelectedKpiKeys] = useState<string[]>([]);
  const [selectedEntityKeys, setSelectedEntityKeys] = useState<string[]>([]);

  const effectiveReferenceId =
    history.find((entry) => entry.id === referenceId)?.id ?? history[0]?.id ?? "";
  const referenceEntry = history.find((entry) => entry.id === effectiveReferenceId) ?? null;

  const availableGranularities = useMemo(() => {
    if (!referenceEntry || !draft.tcdData.trim()) return ["global"] as TcdGranularity[];
    return listAvailableGranularities(
      referenceEntry.tcdData,
      referenceEntry.tcdTable ?? null,
      draft.tcdData,
      draft.tcdTable
    );
  }, [referenceEntry, draft.tcdData, draft.tcdTable]);

  const availableKpis = useMemo(() => {
    if (!referenceEntry || !draft.tcdData.trim()) return [];
    return listAvailableKpiHeaders(
      referenceEntry.tcdData,
      referenceEntry.tcdTable ?? null,
      draft.tcdData,
      draft.tcdTable,
      granularity
    );
  }, [referenceEntry, draft.tcdData, draft.tcdTable, granularity]);

  const availableEntities = useMemo(() => {
    if (!referenceEntry || !draft.tcdData.trim() || granularity === "global") return [];
    return listAvailableEntities(
      referenceEntry.tcdData,
      referenceEntry.tcdTable ?? null,
      draft.tcdData,
      draft.tcdTable,
      granularity
    );
  }, [referenceEntry, draft.tcdData, draft.tcdTable, granularity]);

  const comparison = useMemo(() => {
    if (!referenceEntry || !draft.tcdData.trim()) return null;
    return compareTcd(
      referenceEntry.tcdData,
      referenceEntry.tcdTable ?? null,
      draft.tcdData,
      draft.tcdTable,
      granularity,
      selectedKpiKeys,
      selectedEntityKeys
    );
  }, [
    referenceEntry,
    draft.tcdData,
    draft.tcdTable,
    granularity,
    selectedKpiKeys,
    selectedEntityKeys,
  ]);

  const trendAnalysis = useMemo(() => {
    if (!showTrends || history.length < 2 || !draft.tcdData.trim()) return [];

    const chronological = [...history].reverse();
    const weeks = [
      ...chronological.map((entry) => ({
        weekLabel: entry.weekLabel,
        tcdData: entry.tcdData,
        tcdTable: entry.tcdTable ?? null,
      })),
      {
        weekLabel: draft.weekLabel.trim() || "Semaine en cours",
        tcdData: draft.tcdData,
        tcdTable: draft.tcdTable,
      },
    ];

    return analyzeMetricTrends(
      weeks,
      granularity,
      selectedKpiKeys,
      selectedEntityKeys
    );
  }, [
    showTrends,
    history,
    draft.tcdData,
    draft.tcdTable,
    draft.weekLabel,
    granularity,
    selectedKpiKeys,
    selectedEntityKeys,
  ]);

  function toggleKpiFilter(key: string) {
    setSelectedKpiKeys((current) => {
      if (current.length === 0) return [key];
      if (current.includes(key)) return current.filter((item) => item !== key);
      return [...current, key];
    });
  }

  function toggleEntityFilter(key: string) {
    setSelectedEntityKeys((current) => {
      if (current.length === 0) return [key];
      if (current.includes(key)) return current.filter((item) => item !== key);
      return [...current, key];
    });
  }

  const currentWeekLabel = draft.weekLabel.trim() || "Semaine en cours";
  const showingAllKpis = selectedKpiKeys.length === 0;
  const showingAllEntities = selectedEntityKeys.length === 0;
  const granularityOptions = GRANULARITY_OPTIONS.filter((option) =>
    availableGranularities.includes(option.value)
  );

  useEffect(() => {
    if (!availableGranularities.includes(granularity)) {
      setGranularity(availableGranularities[0] ?? "global");
    }
  }, [availableGranularities, granularity]);

  useEffect(() => {
    const allowed = new Set(availableKpis.map((kpi) => kpi.key));
    setSelectedKpiKeys((current) => current.filter((key) => allowed.has(key)));
  }, [availableKpis]);

  useEffect(() => {
    const allowed = new Set(availableEntities.map((entity) => entity.key));
    setSelectedEntityKeys((current) => current.filter((key) => allowed.has(key)));
  }, [availableEntities]);

  useEffect(() => {
    if (granularity === "global") {
      setSelectedEntityKeys([]);
    }
  }, [granularity]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-accent" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Comparateur TCD</h2>
            <p className="text-xs text-muted">
              Structure BM détectée depuis votre collage (Plateforme › Campagne › Adset › Créa).
            </p>
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted">
          Archivez au moins une semaine pour activer le comparateur. Les données TCD de chaque
          semaine validée sont conservées automatiquement dans l&apos;historique.
        </p>
      ) : !draft.tcdData.trim() ? (
        <p className="text-sm text-muted">
          Collez vos données TCD actualisées dans le formulaire ci-dessus pour lancer une
          comparaison.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Semaine de référence
              </label>
              <Select
                value={effectiveReferenceId}
                onChange={(event) => setReferenceId(event.target.value)}
                options={history.map((entry, index) => ({
                  value: entry.id,
                  label:
                    index === 0
                      ? `${entry.weekLabel} (semaine précédente)`
                      : `${entry.weekLabel} (il y a ${index + 1} sem.)`,
                }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Semaine comparée
              </label>
              <div className="flex h-10 items-center rounded-xl border border-border-soft bg-surface-soft px-3 text-sm text-foreground">
                {currentWeekLabel}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-muted">
              Niveau de comparaison
            </label>
            <ToggleGroup
              options={granularityOptions}
              value={granularity}
              onChange={setGranularity}
            />
          </div>

          {availableEntities.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-muted">
                  {getGranularityLabel(granularity)}s à comparer
                  <span className="ml-1 font-normal text-muted-soft">
                    (aucune sélection = toutes)
                  </span>
                </label>
                {!showingAllEntities && (
                  <button
                    type="button"
                    onClick={() => setSelectedEntityKeys([])}
                    className="cursor-pointer text-xs text-accent hover:underline"
                  >
                    Tout afficher
                  </button>
                )}
              </div>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {availableEntities.map((entity) => {
                  const isActive =
                    showingAllEntities || selectedEntityKeys.includes(entity.key);
                  return (
                    <button
                      key={entity.key}
                      type="button"
                      title={entity.pathLabel}
                      onClick={() => toggleEntityFilter(entity.key)}
                      className={cn(
                        "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        isActive && !showingAllEntities
                          ? "border-transparent bg-accent text-accent-foreground"
                          : showingAllEntities
                            ? "border-border-soft bg-surface-soft text-foreground hover:border-accent/50"
                            : "border-border-soft text-muted hover:border-border hover:text-foreground"
                      )}
                    >
                      {entity.pathLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {availableKpis.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-muted">
                  KPI à comparer
                  <span className="ml-1 font-normal text-muted-soft">
                    (détectés dans le TCD — aucune sélection = tous)
                  </span>
                </label>
                {!showingAllKpis && (
                  <button
                    type="button"
                    onClick={() => setSelectedKpiKeys([])}
                    className="cursor-pointer text-xs text-accent hover:underline"
                  >
                    Afficher tous les KPI
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableKpis.map((kpi) => {
                  const isActive =
                    showingAllKpis || selectedKpiKeys.includes(kpi.key);
                  return (
                    <button
                      key={kpi.key}
                      type="button"
                      onClick={() => toggleKpiFilter(kpi.key)}
                      className={cn(
                        "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        isActive && !showingAllKpis
                          ? "border-transparent bg-accent text-accent-foreground"
                          : showingAllKpis
                            ? "border-border-soft bg-surface-soft text-foreground hover:border-accent/50"
                            : "border-border-soft text-muted hover:border-border hover:text-foreground"
                      )}
                    >
                      {kpi.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {comparison && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-full bg-surface-hover px-2 py-0.5">
                  Niveau : {getGranularityLabel(comparison.granularity)}
                </span>
                <span className="rounded-full bg-surface-hover px-2 py-0.5">
                  {comparison.entityCount} entité(s)
                </span>
                <span className="rounded-full bg-surface-hover px-2 py-0.5">
                  {comparison.matchedCount} KPI rapprochés
                </span>
                {comparison.hierarchyColumns.length > 0 && (
                  <span className="rounded-full bg-surface-hover px-2 py-0.5">
                    Colonnes BM : {comparison.hierarchyColumns.join(", ")}
                  </span>
                )}
              </div>

              {comparison.warnings.length > 0 && (
                <div className="rounded-xl border border-border-soft bg-surface-soft px-3 py-2 text-xs text-muted">
                  {comparison.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}

              {comparison.comparisons.length === 0 ? (
                <p className="text-sm text-muted">
                  Impossible de comparer les deux jeux de données à ce niveau. Vérifiez que votre
                  TCD contient les colonnes Plateforme / Campagne / Adset et des lignes de
                  sous-totaux ou des lignes détaillées.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border-soft">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border-soft bg-surface-soft text-xs text-muted">
                        {granularity !== "global" && (
                          <th className="px-3 py-2.5 font-medium">
                            {getGranularityLabel(granularity)}
                          </th>
                        )}
                        <th className="px-3 py-2.5 font-medium">KPI</th>
                        <th className="px-3 py-2.5 font-medium">
                          {referenceEntry?.weekLabel ?? "Réf."}
                        </th>
                        <th className="px-3 py-2.5 font-medium">{currentWeekLabel}</th>
                        <th className="px-3 py-2.5 font-medium">Évolution</th>
                        <th className="px-3 py-2.5 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.comparisons.map((row) => (
                        <tr
                          key={`${row.entityKey}-${row.key}`}
                          className="border-b border-border-soft/60 last:border-0"
                        >
                          {granularity !== "global" && (
                            <td className="px-3 py-2.5 text-foreground">
                              <div className="font-medium">{row.entityLabel}</div>
                              {row.entityPathLabel !== row.entityLabel && (
                                <div className="text-xs text-muted-soft">{row.entityPathLabel}</div>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2.5 font-medium text-foreground">{row.label}</td>
                          <td className="px-3 py-2.5 tabular-nums text-muted">
                            {formatMetricValue(
                              row.referenceValue,
                              row.referenceRaw,
                              row.isPercent
                            )}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-foreground">
                            {formatMetricValue(row.currentValue, row.currentRaw, row.isPercent)}
                          </td>
                          <td className="px-3 py-2.5">
                            <EvolutionCell comparison={row} />
                          </td>
                          <td className="px-3 py-2.5">
                            {row.status === "new" && (
                              <span className="text-xs text-accent">Nouveau KPI</span>
                            )}
                            {row.status === "removed" && (
                              <span className="text-xs text-danger">Absent cette semaine</span>
                            )}
                            {row.status === "matched" && (
                              <span className="text-xs text-muted-soft">Comparé</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {history.length >= 2 && (
            <div className="border-t border-border-soft pt-4">
              <button
                type="button"
                onClick={() => setShowTrends((value) => !value)}
                className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
              >
                <TrendingUp className="h-4 w-4 text-accent" />
                Tendances multi-semaines
                <span className="text-xs font-normal text-muted">
                  ({showTrends ? "masquer" : "afficher"})
                </span>
              </button>

              {showTrends && trendAnalysis.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border-soft">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border-soft bg-surface-soft text-xs text-muted">
                        {granularity !== "global" && (
                          <th className="px-3 py-2.5 font-medium">
                            {getGranularityLabel(granularity)}
                          </th>
                        )}
                        <th className="px-3 py-2.5 font-medium">KPI</th>
                        {[...history]
                          .reverse()
                          .map((entry) => (
                            <th key={entry.id} className="px-3 py-2.5 font-medium">
                              {entry.weekLabel}
                            </th>
                          ))}
                        <th className="px-3 py-2.5 font-medium">{currentWeekLabel}</th>
                        <th className="px-3 py-2.5 font-medium">Tendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendAnalysis.map((row) => (
                        <tr
                          key={`${row.entityKey}-${row.key}`}
                          className="border-b border-border-soft/60 last:border-0"
                        >
                          {granularity !== "global" && (
                            <td className="px-3 py-2.5 text-foreground">
                              <div className="font-medium">{row.entityLabel}</div>
                              {row.entityPathLabel !== row.entityLabel && (
                                <div className="text-xs text-muted-soft">{row.entityPathLabel}</div>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2.5 font-medium text-foreground">{row.label}</td>
                          {row.values.map((value, index) => (
                            <td
                              key={`${row.entityKey}-${row.key}-${value.weekLabel}-${index}`}
                              className="px-3 py-2.5 tabular-nums text-muted"
                            >
                              {formatMetricValue(value.value, value.rawValue, row.isPercent)}
                            </td>
                          ))}
                          <td className="px-3 py-2.5">
                            <TrendBadge trend={row.trend} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showTrends && trendAnalysis.length === 0 && (
                <p className="text-sm text-muted">
                  Pas assez de semaines comparables pour détecter des tendances à ce niveau.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
