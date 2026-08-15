import {
  parseTcdData,
  type TcdEntity,
  type TcdGranularity,
  type TcdMetric,
} from "@/lib/tcdParser";
import type { ExcelTable } from "@/types/prompt-builder";

export type MetricTrend = "up" | "down" | "stable" | "volatile" | "insufficient";

export interface MetricComparison {
  key: string;
  label: string;
  referenceValue: number | null;
  referenceRaw: string;
  currentValue: number | null;
  currentRaw: string;
  isPercent: boolean;
  deltaPoints: number | null;
  evolutionPercent: number | null;
  status: "matched" | "new" | "removed";
}

export interface EntityMetricComparison extends MetricComparison {
  entityKey: string;
  entityLabel: string;
  entityPathLabel: string;
}

export interface TcdComparisonResult {
  granularity: TcdGranularity;
  comparisons: EntityMetricComparison[];
  entityCount: number;
  referenceMetricCount: number;
  currentMetricCount: number;
  matchedCount: number;
  hierarchyColumns: string[];
  warnings: string[];
}

export interface MetricTrendAnalysis {
  key: string;
  label: string;
  entityKey: string;
  entityLabel: string;
  entityPathLabel: string;
  isPercent: boolean;
  values: { weekLabel: string; value: number | null; rawValue: string }[];
  trend: MetricTrend;
  cumulativeEvolutionPercent: number | null;
}

const STABLE_THRESHOLD = 2;

const GRANULARITY_LABELS: Record<TcdGranularity, string> = {
  global: "Global",
  platform: "Plateforme",
  campaign: "Campagne",
  adset: "Adset",
};

export function getGranularityLabel(granularity: TcdGranularity): string {
  return GRANULARITY_LABELS[granularity];
}

function indexEntityMetrics(entities: TcdEntity[]): Map<string, Map<string, TcdMetric>> {
  const result = new Map<string, Map<string, TcdMetric>>();
  for (const entity of entities) {
    result.set(entity.key, new Map(entity.metrics.map((metric) => [metric.key, metric])));
  }
  return result;
}

function computeEvolution(
  reference: number,
  current: number,
  isPercent: boolean
): { deltaPoints: number | null; evolutionPercent: number | null } {
  if (isPercent) {
    const deltaPoints = current - reference;
    const evolutionPercent =
      reference !== 0 ? ((current - reference) / Math.abs(reference)) * 100 : null;
    return { deltaPoints, evolutionPercent };
  }

  if (reference === 0) {
    return { deltaPoints: null, evolutionPercent: current === 0 ? 0 : null };
  }

  return {
    deltaPoints: null,
    evolutionPercent: ((current - reference) / Math.abs(reference)) * 100,
  };
}

function compareEntityMetrics(
  entityKey: string,
  entityLabel: string,
  entityPathLabel: string,
  referenceMetrics: Map<string, TcdMetric> | undefined,
  currentMetrics: Map<string, TcdMetric> | undefined,
  selectedKpiKeys: string[]
): EntityMetricComparison[] {
  const allKeys = new Set<string>([
    ...(referenceMetrics?.keys() ?? []),
    ...(currentMetrics?.keys() ?? []),
  ]);

  const comparisons: EntityMetricComparison[] = [];

  for (const key of allKeys) {
    if (selectedKpiKeys.length > 0 && !selectedKpiKeys.includes(key)) continue;

    const referenceMetric = referenceMetrics?.get(key);
    const currentMetric = currentMetrics?.get(key);

    if (referenceMetric && currentMetric) {
      const isPercent = referenceMetric.isPercent || currentMetric.isPercent;
      const { deltaPoints, evolutionPercent } =
        referenceMetric.value !== null && currentMetric.value !== null
          ? computeEvolution(referenceMetric.value, currentMetric.value, isPercent)
          : { deltaPoints: null, evolutionPercent: null };

      comparisons.push({
        entityKey,
        entityLabel,
        entityPathLabel,
        key,
        label: currentMetric.label || referenceMetric.label,
        referenceValue: referenceMetric.value,
        referenceRaw: referenceMetric.rawValue,
        currentValue: currentMetric.value,
        currentRaw: currentMetric.rawValue,
        isPercent,
        deltaPoints,
        evolutionPercent,
        status: "matched",
      });
      continue;
    }

    if (currentMetric) {
      comparisons.push({
        entityKey,
        entityLabel,
        entityPathLabel,
        key,
        label: currentMetric.label,
        referenceValue: null,
        referenceRaw: "—",
        currentValue: currentMetric.value,
        currentRaw: currentMetric.rawValue,
        isPercent: currentMetric.isPercent,
        deltaPoints: null,
        evolutionPercent: null,
        status: "new",
      });
      continue;
    }

    if (referenceMetric) {
      comparisons.push({
        entityKey,
        entityLabel,
        entityPathLabel,
        key,
        label: referenceMetric.label,
        referenceValue: referenceMetric.value,
        referenceRaw: referenceMetric.rawValue,
        currentValue: null,
        currentRaw: "—",
        isPercent: referenceMetric.isPercent,
        deltaPoints: null,
        evolutionPercent: null,
        status: "removed",
      });
    }
  }

  return comparisons;
}

export function compareTcd(
  referenceText: string,
  referenceTable: ExcelTable | null,
  currentText: string,
  currentTable: ExcelTable | null,
  granularity: TcdGranularity = "global",
  selectedKpiKeys: string[] = [],
  selectedEntityKeys: string[] = []
): TcdComparisonResult {
  const referenceParsed = parseTcdData(referenceText, referenceTable, granularity);
  const currentParsed = parseTcdData(currentText, currentTable, granularity);
  const referenceByEntity = indexEntityMetrics(referenceParsed.entities);
  const currentByEntity = indexEntityMetrics(currentParsed.entities);
  const allEntityKeys = new Set([...referenceByEntity.keys(), ...currentByEntity.keys()]);
  const comparisons: EntityMetricComparison[] = [];

  for (const entityKey of allEntityKeys) {
    if (selectedEntityKeys.length > 0 && !selectedEntityKeys.includes(entityKey)) continue;

    const referenceEntity = referenceParsed.entities.find((entity) => entity.key === entityKey);
    const currentEntity = currentParsed.entities.find((entity) => entity.key === entityKey);

    comparisons.push(
      ...compareEntityMetrics(
        entityKey,
        currentEntity?.label || referenceEntity?.label || entityKey,
        currentEntity?.pathLabel || referenceEntity?.pathLabel || entityKey,
        referenceByEntity.get(entityKey),
        currentByEntity.get(entityKey),
        selectedKpiKeys
      )
    );
  }

  comparisons.sort((a, b) => {
    const pathCompare = a.entityPathLabel.localeCompare(b.entityPathLabel, "fr");
    if (pathCompare !== 0) return pathCompare;
    if (a.status === "matched" && b.status !== "matched") return -1;
    if (b.status === "matched" && a.status !== "matched") return 1;
    return a.label.localeCompare(b.label, "fr");
  });

  const hierarchyColumns = [
    ...new Set(
      [...referenceParsed.hierarchyColumns, ...currentParsed.hierarchyColumns].map(
        (column) => column.headerLabel
      )
    ),
  ];

  return {
    granularity,
    comparisons,
    entityCount: allEntityKeys.size,
    referenceMetricCount: referenceParsed.entities.reduce(
      (count, entity) => count + entity.metrics.length,
      0
    ),
    currentMetricCount: currentParsed.entities.reduce(
      (count, entity) => count + entity.metrics.length,
      0
    ),
    matchedCount: comparisons.filter((item) => item.status === "matched").length,
    hierarchyColumns,
    warnings: [...referenceParsed.warnings, ...currentParsed.warnings],
  };
}

function detectTrend(values: number[]): MetricTrend {
  if (values.length < 3) return "insufficient";

  const directions: (-1 | 0 | 1)[] = [];
  for (let i = 1; i < values.length; i++) {
    const previous = values[i - 1];
    const current = values[i];
    if (previous === current) {
      directions.push(0);
      continue;
    }
    directions.push(current > previous ? 1 : -1);
  }

  const nonZero = directions.filter((direction) => direction !== 0);
  if (nonZero.length === 0) return "stable";

  const allSame = nonZero.every((direction) => direction === nonZero[0]);
  if (!allSame) return "volatile";

  const cumulativeChange =
    values[0] !== 0 ? Math.abs(((values[values.length - 1] - values[0]) / values[0]) * 100) : 0;
  if (cumulativeChange <= STABLE_THRESHOLD) return "stable";

  return nonZero[0] === 1 ? "up" : "down";
}

export interface WeekTcdSource {
  weekLabel: string;
  tcdData: string;
  tcdTable?: ExcelTable | null;
}

export function analyzeMetricTrends(
  weeks: WeekTcdSource[],
  granularity: TcdGranularity = "global",
  selectedKpiKeys: string[] = [],
  selectedEntityKeys: string[] = []
): MetricTrendAnalysis[] {
  if (weeks.length < 2) return [];

  const parsedWeeks = weeks.map((week) => ({
    weekLabel: week.weekLabel,
    parsed: parseTcdData(week.tcdData, week.tcdTable ?? null, granularity),
  }));

  const entityKeys = new Set<string>();
  parsedWeeks.forEach(({ parsed }) => {
    parsed.entities.forEach((entity) => entityKeys.add(entity.key));
  });

  const analyses: MetricTrendAnalysis[] = [];

  for (const entityKey of entityKeys) {
    if (selectedEntityKeys.length > 0 && !selectedEntityKeys.includes(entityKey)) continue;

    const kpiKeys = new Set<string>();
    parsedWeeks.forEach(({ parsed }) => {
      const entity = parsed.entities.find((item) => item.key === entityKey);
      entity?.metrics.forEach((metric) => kpiKeys.add(metric.key));
    });

    for (const kpiKey of kpiKeys) {
      if (selectedKpiKeys.length > 0 && !selectedKpiKeys.includes(kpiKey)) continue;

      const values: MetricTrendAnalysis["values"] = [];
      let label = kpiKey;
      let entityLabel = entityKey;
      let entityPathLabel = entityKey;
      let isPercent = false;

      for (const { weekLabel, parsed } of parsedWeeks) {
        const entity = parsed.entities.find((item) => item.key === entityKey);
        const metric = entity?.metrics.find((item) => item.key === kpiKey);
        if (entity) {
          entityLabel = entity.label;
          entityPathLabel = entity.pathLabel;
        }
        if (metric) {
          label = metric.label;
          isPercent = metric.isPercent;
        }
        values.push({
          weekLabel,
          value: metric?.value ?? null,
          rawValue: metric?.rawValue ?? "—",
        });
      }

      const numericValues = values.map((item) => item.value).filter((v): v is number => v !== null);
      const first = numericValues[0];
      const last = numericValues[numericValues.length - 1];

      analyses.push({
        key: kpiKey,
        label,
        entityKey,
        entityLabel,
        entityPathLabel,
        isPercent,
        values,
        trend: detectTrend(numericValues),
        cumulativeEvolutionPercent:
          first !== undefined && last !== undefined && first !== 0
            ? ((last - first) / Math.abs(first)) * 100
            : null,
      });
    }
  }

  const sorted = analyses.sort((a, b) => {
    const pathCompare = a.entityPathLabel.localeCompare(b.entityPathLabel, "fr");
    if (pathCompare !== 0) return pathCompare;
    return a.label.localeCompare(b.label, "fr");
  });

  return sorted;
}

export function formatEvolution(value: number | null, isPercent: boolean): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  if (isPercent) {
    return `${sign}${value.toFixed(1)} pt`;
  }
  return `${sign}${value.toFixed(1)} %`;
}

export function formatMetricValue(value: number | null, rawValue: string, isPercent: boolean): string {
  if (rawValue && rawValue !== "—") return rawValue;
  if (value === null) return "—";
  if (isPercent) return `${value.toFixed(2)} %`;
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}
