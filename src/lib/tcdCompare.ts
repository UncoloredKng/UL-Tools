import type { TcdMetric } from "@/lib/tcdParser";
import { parseTcdData } from "@/lib/tcdParser";
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
  /** Variation en points de pourcentage absolus (ex : 2,5 % → 3,0 % = +0,5 pt) */
  deltaPoints: number | null;
  /** Variation relative en % (ex : 100 → 120 = +20 %) */
  evolutionPercent: number | null;
  status: "matched" | "new" | "removed";
}

export interface TcdComparisonResult {
  comparisons: MetricComparison[];
  referenceMetricCount: number;
  currentMetricCount: number;
  matchedCount: number;
  warnings: string[];
}

export interface WeekSnapshot {
  id: string;
  weekLabel: string;
  validatedAt?: number;
  isCurrent?: boolean;
}

export interface MetricTrendAnalysis {
  key: string;
  label: string;
  isPercent: boolean;
  values: { weekLabel: string; value: number | null; rawValue: string }[];
  trend: MetricTrend;
  /** Variation cumulée entre la première et la dernière semaine disponible */
  cumulativeEvolutionPercent: number | null;
}

const STABLE_THRESHOLD = 2;

function indexMetrics(metrics: TcdMetric[]): Map<string, TcdMetric> {
  return new Map(metrics.map((metric) => [metric.key, metric]));
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

/**
 * Compare deux jeux de données TCD et calcule l'évolution KPI par KPI.
 */
export function compareTcd(
  referenceText: string,
  referenceTable: ExcelTable | null,
  currentText: string,
  currentTable: ExcelTable | null,
  selectedKpiKeys: string[] = []
): TcdComparisonResult {
  const referenceParsed = parseTcdData(referenceText, referenceTable);
  const currentParsed = parseTcdData(currentText, currentTable);
  const referenceByKey = indexMetrics(referenceParsed.metrics);
  const currentByKey = indexMetrics(currentParsed.metrics);
  const allKeys = new Set([...referenceByKey.keys(), ...currentByKey.keys()]);
  const comparisons: MetricComparison[] = [];

  for (const key of allKeys) {
    const referenceMetric = referenceByKey.get(key);
    const currentMetric = currentByKey.get(key);

    if (referenceMetric && currentMetric) {
      const isPercent = referenceMetric.isPercent || currentMetric.isPercent;
      const { deltaPoints, evolutionPercent } =
        referenceMetric.value !== null && currentMetric.value !== null
          ? computeEvolution(referenceMetric.value, currentMetric.value, isPercent)
          : { deltaPoints: null, evolutionPercent: null };

      comparisons.push({
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

  comparisons.sort((a, b) => {
    if (a.status === "matched" && b.status !== "matched") return -1;
    if (b.status === "matched" && a.status !== "matched") return 1;
    return a.label.localeCompare(b.label, "fr");
  });

  const filteredComparisons =
    selectedKpiKeys.length === 0
      ? comparisons
      : comparisons.filter((item) => selectedKpiKeys.includes(item.key));

  return {
    comparisons: filteredComparisons,
    referenceMetricCount: referenceParsed.metrics.length,
    currentMetricCount: currentParsed.metrics.length,
    matchedCount: comparisons.filter((item) => item.status === "matched").length,
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

/**
 * Analyse la tendance multi-semaines d'un KPI sur l'ensemble des snapshots disponibles.
 */
export function analyzeMetricTrends(
  weeks: WeekTcdSource[],
  selectedKpiKeys: string[] = []
): MetricTrendAnalysis[] {
  if (weeks.length < 2) return [];

  const parsedWeeks = weeks.map((week) => ({
    weekLabel: week.weekLabel,
    parsed: parseTcdData(week.tcdData, week.tcdTable ?? null),
  }));

  const allKeys = new Set<string>();
  parsedWeeks.forEach(({ parsed }) => {
    parsed.metrics.forEach((metric) => allKeys.add(metric.key));
  });

  const analyses: MetricTrendAnalysis[] = [];

  for (const key of allKeys) {
    const values: MetricTrendAnalysis["values"] = [];
    let label = key;
    let isPercent = false;

    for (const { weekLabel, parsed } of parsedWeeks) {
      const metric = parsed.metrics.find((item) => item.key === key);
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
    const cumulativeEvolutionPercent =
      first !== undefined && last !== undefined && first !== 0
        ? ((last - first) / Math.abs(first)) * 100
        : null;

    analyses.push({
      key,
      label,
      isPercent,
      values,
      trend: detectTrend(numericValues),
      cumulativeEvolutionPercent,
    });
  }

  const sorted = analyses.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  if (selectedKpiKeys.length === 0) return sorted;
  return sorted.filter((item) => selectedKpiKeys.includes(item.key));
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
