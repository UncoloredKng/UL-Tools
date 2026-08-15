import type { ExcelTable } from "@/types/prompt-builder";
import {
  buildGridFromPaste,
  findHeaderRowIndex,
  isKpiHeaderCell,
  normalizeMetricLabel,
  parseNumericCell,
  rowHasNumericValues,
  type ExpandedGrid,
} from "@/lib/tcdGrid";

export type TcdGranularity = "global" | "platform" | "campaign" | "adset";

export type HierarchyColumnType = "platform" | "campaign" | "adset" | "creative";

export interface TcdMetric {
  key: string;
  label: string;
  value: number | null;
  rawValue: string;
  isPercent: boolean;
  columnIndex: number;
}

export interface HierarchyColumn {
  type: HierarchyColumnType;
  columnIndex: number;
  headerLabel: string;
}

export interface EntityPath {
  platform: string;
  campaign: string;
  adset: string;
  creative: string;
}

export interface TcdEntity {
  key: string;
  label: string;
  pathLabel: string;
  path: EntityPath;
  metrics: TcdMetric[];
}

export interface ParsedTcd {
  metrics: TcdMetric[];
  headerLabels: string[];
  hierarchyColumns: HierarchyColumn[];
  entities: TcdEntity[];
  availableGranularities: TcdGranularity[];
  warnings: string[];
}

const VALUE_ROW_HINTS = ["total", "global", "totaux", "ensemble", "all"];

const HIERARCHY_HEADER_PATTERNS: Record<HierarchyColumnType, string[]> = {
  platform: [
    "plateforme",
    "platform",
    "publisher",
    "reseau",
    "network",
    "media",
    "source",
    "canal",
    "channel",
  ],
  campaign: ["campagne", "campaign", "campaign name", "nom campagne", "nom de campagne"],
  adset: [
    "adset",
    "ad set",
    "adset name",
    "nom adset",
    "jeu de pub",
    "jeu pub",
    "ensemble de pub",
    "ensemble pub",
    "ad group",
    "adgroup",
    "line item",
    "set de pub",
  ],
  creative: [
    "crea",
    "creative",
    "ad name",
    "nom annonce",
    "annonce",
    "publicite",
    "publicité",
    "ad",
    "asset",
    "format crea",
  ],
};

function classifyHierarchyHeader(header: string): HierarchyColumnType | null {
  const normalized = normalizeMetricLabel(header);
  if (!normalized) return null;

  for (const type of ["platform", "campaign", "adset", "creative"] as HierarchyColumnType[]) {
    if (HIERARCHY_HEADER_PATTERNS[type].some((pattern) => normalized.includes(pattern))) {
      return type;
    }
  }

  return null;
}

function isTotalLabel(value: string): boolean {
  const normalized = normalizeMetricLabel(value);
  if (!normalized) return true;
  return VALUE_ROW_HINTS.some((hint) => normalized === hint || normalized.includes(hint));
}

function detectHierarchyColumns(
  headerRow: string[],
  kpiStartColumn: number
): HierarchyColumn[] {
  const columns: HierarchyColumn[] = [];

  for (let col = 0; col < kpiStartColumn; col++) {
    const header = headerRow[col]?.trim() ?? "";
    if (!header) continue;

    const type = classifyHierarchyHeader(header);
    if (type) {
      columns.push({ type, columnIndex: col, headerLabel: header });
    }
  }

  if (columns.length > 0) return columns;

  if (kpiStartColumn >= 1) {
    const fallbackTypes: HierarchyColumnType[] = ["platform", "campaign", "adset", "creative"];
    for (let col = 0; col < Math.min(kpiStartColumn, fallbackTypes.length); col++) {
      columns.push({
        type: fallbackTypes[col],
        columnIndex: col,
        headerLabel: headerRow[col]?.trim() || fallbackTypes[col],
      });
    }
  }

  return columns;
}

function detectKpiColumns(
  headerRow: string[],
  startColumn: number,
  boldRow?: boolean[]
): { metrics: Omit<TcdMetric, "value" | "rawValue">[]; kpiStartColumn: number } {
  const metrics: Omit<TcdMetric, "value" | "rawValue">[] = [];
  let firstKpiColumn = startColumn;

  for (let col = startColumn; col < headerRow.length; col++) {
    const label = headerRow[col]?.trim() ?? "";
    const isBoldHeader = boldRow?.[col] ?? false;
    if (!isKpiHeaderCell(label, { allowBold: isBoldHeader })) continue;

    const key = normalizeMetricLabel(label);
    if (!key || metrics.some((metric) => metric.key === key)) continue;

    if (metrics.length === 0) firstKpiColumn = col;
    metrics.push({ key, label, isPercent: false, columnIndex: col });
  }

  return { metrics, kpiStartColumn: metrics.length > 0 ? firstKpiColumn : startColumn };
}

function readPathFromRow(
  row: string[],
  hierarchyColumns: HierarchyColumn[],
  filled: EntityPath
): EntityPath {
  const path: EntityPath = { ...filled };

  for (const column of hierarchyColumns) {
    const value = row[column.columnIndex]?.trim() ?? "";
    if (!value || isTotalLabel(value)) continue;

    if (column.type === "platform") path.platform = value;
    if (column.type === "campaign") path.campaign = value;
    if (column.type === "adset") path.adset = value;
    if (column.type === "creative") path.creative = value;
  }

  return path;
}

function pathAtGranularity(path: EntityPath, granularity: TcdGranularity): string {
  if (granularity === "global") return "__global__";

  const parts: string[] = [];
  if (path.platform) parts.push(normalizeMetricLabel(path.platform));
  if (granularity === "platform") return parts.join("/") || "__unknown_platform__";

  if (path.campaign) parts.push(normalizeMetricLabel(path.campaign));
  if (granularity === "campaign") return parts.join("/") || "__unknown_campaign__";

  if (path.adset) parts.push(normalizeMetricLabel(path.adset));
  return parts.join("/") || "__unknown_adset__";
}

function labelAtGranularity(path: EntityPath, granularity: TcdGranularity): string {
  if (granularity === "global") return "Total campagne";
  if (granularity === "platform") return path.platform || "Plateforme inconnue";
  if (granularity === "campaign") return path.campaign || "Campagne inconnue";
  return path.adset || "Adset inconnu";
}

function pathLabelAtGranularity(path: EntityPath, granularity: TcdGranularity): string {
  const parts: string[] = [];
  if (path.platform) parts.push(path.platform);
  if (granularity === "platform") return parts.join(" › ");

  if (path.campaign) parts.push(path.campaign);
  if (granularity === "campaign") return parts.join(" › ");

  if (path.adset) parts.push(path.adset);
  return parts.join(" › ");
}

function rowMatchesGranularity(
  path: EntityPath,
  granularity: TcdGranularity,
  isGlobalTotal: boolean
): boolean {
  if (granularity === "global") return isGlobalTotal;
  if (isGlobalTotal) return false;
  if (isTotalLabel(path.campaign) || isTotalLabel(path.adset)) return false;

  if (granularity === "platform") {
    return Boolean(path.platform) && !path.campaign && !path.adset && !path.creative;
  }

  if (granularity === "campaign") {
    return (
      Boolean(path.campaign) &&
      (!path.adset || isTotalLabel(path.adset)) &&
      (!path.creative || isTotalLabel(path.creative))
    );
  }

  return Boolean(path.adset) && (!path.creative || isTotalLabel(path.creative));
}

function isGlobalTotalRow(path: EntityPath, row: string[], kpiStartColumn: number): boolean {
  const labels = [
    path.platform,
    path.campaign,
    path.adset,
    path.creative,
    row.slice(0, kpiStartColumn).join(" "),
  ];
  return labels.some((label) => isTotalLabel(label));
}

function extractMetricsForRow(
  row: string[],
  kpiDefinitions: Omit<TcdMetric, "value" | "rawValue">[]
): TcdMetric[] {
  return kpiDefinitions.map((definition) => {
    const rawValue = row[definition.columnIndex]?.trim() ?? "";
    const { value, isPercent } = parseNumericCell(rawValue);
    return {
      ...definition,
      value,
      rawValue: rawValue || "—",
      isPercent,
    };
  });
}

function subtotalScore(path: EntityPath): number {
  let score = 0;
  if (isTotalLabel(path.creative)) score += 3;
  else if (!path.creative) score += 2;
  if (isTotalLabel(path.adset)) score += 2;
  else if (!path.adset) score += 1;
  if (isTotalLabel(path.campaign)) score += 1;
  return score;
}

function pickPreferredEntity(existing: TcdEntity, incoming: TcdEntity): TcdEntity {
  const existingScore = subtotalScore(existing.path);
  const incomingScore = subtotalScore(incoming.path);
  if (incomingScore !== existingScore) {
    return incomingScore > existingScore ? incoming : existing;
  }

  const existingFilled = existing.metrics.filter((metric) => metric.value !== null).length;
  const incomingFilled = incoming.metrics.filter((metric) => metric.value !== null).length;
  return incomingFilled > existingFilled ? incoming : existing;
}

function inferAvailableGranularities(hierarchyColumns: HierarchyColumn[]): TcdGranularity[] {
  const levels: TcdGranularity[] = ["global"];
  const types = new Set(hierarchyColumns.map((column) => column.type));

  if (types.has("platform")) levels.push("platform");
  if (types.has("campaign")) levels.push("campaign");
  if (types.has("adset")) levels.push("adset");

  if (levels.length === 1 && hierarchyColumns.length > 0) {
    levels.push("campaign", "adset");
  }

  return levels;
}

function aggregateFromLeafRows(
  rows: string[][],
  headerRowIndex: number,
  hierarchyColumns: HierarchyColumn[],
  kpiDefinitions: Omit<TcdMetric, "value" | "rawValue">[],
  kpiStartColumn: number,
  granularity: TcdGranularity
): TcdEntity[] {
  const leafMap = new Map<string, TcdEntity>();
  let filledPath: EntityPath = {
    platform: "",
    campaign: "",
    adset: "",
    creative: "",
  };

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    if (!rowHasNumericValues(row, kpiStartColumn)) continue;

    filledPath = readPathFromRow(row, hierarchyColumns, filledPath);
    if (isGlobalTotalRow(filledPath, row, kpiStartColumn)) continue;

    const key = pathAtGranularity(filledPath, granularity);
    if (key.includes("__unknown")) continue;

    const metrics = extractMetricsForRow(row, kpiDefinitions);
    const candidate: TcdEntity = {
      key,
      label: labelAtGranularity(filledPath, granularity),
      pathLabel: pathLabelAtGranularity(filledPath, granularity),
      path: { ...filledPath },
      metrics,
    };

    const existing = leafMap.get(key);
    leafMap.set(key, existing ? pickPreferredEntity(existing, candidate) : candidate);
  }

  return [...leafMap.values()].sort((a, b) => a.pathLabel.localeCompare(b.pathLabel, "fr"));
}

function parseEntitiesFromGrid(
  grid: ExpandedGrid,
  granularity: TcdGranularity,
  warnings: string[]
): {
  entities: TcdEntity[];
  hierarchyColumns: HierarchyColumn[];
  kpiDefinitions: Omit<TcdMetric, "value" | "rawValue">[];
} {
  const { grid: rows, bold } = grid;
  if (rows.length === 0) {
    return { entities: [], hierarchyColumns: [], kpiDefinitions: [] };
  }

  const headerRowIndex = findHeaderRowIndex(rows, bold.length > 0 ? bold : undefined);
  const headerRow = rows[headerRowIndex] ?? [];
  const dimensionStart = headerRowIndex === 0 ? 1 : 0;
  const { metrics: kpiDefinitions, kpiStartColumn } = detectKpiColumns(
    headerRow,
    dimensionStart,
    bold[headerRowIndex]
  );

  if (kpiDefinitions.length === 0) {
    warnings.push(
      "Aucun en-tête KPI détecté dans votre collage TCD. Vérifiez la ligne d'en-têtes de colonnes."
    );
    return { entities: [], hierarchyColumns: [], kpiDefinitions: [] };
  }

  const hierarchyColumns = detectHierarchyColumns(headerRow, kpiStartColumn);
  const entityMap = new Map<string, TcdEntity>();
  let filledPath: EntityPath = {
    platform: "",
    campaign: "",
    adset: "",
    creative: "",
  };

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    if (!rowHasNumericValues(row, kpiStartColumn)) continue;

    filledPath = readPathFromRow(row, hierarchyColumns, filledPath);
    const isGlobalTotal = isGlobalTotalRow(filledPath, row, kpiStartColumn);
    if (!rowMatchesGranularity(filledPath, granularity, isGlobalTotal)) continue;

    const metrics = extractMetricsForRow(row, kpiDefinitions).filter(
      (metric) => metric.value !== null || metric.rawValue !== "—"
    );
    if (metrics.length === 0) continue;

    const key = pathAtGranularity(filledPath, granularity);
    entityMap.set(key, {
      key,
      label: labelAtGranularity(filledPath, granularity),
      pathLabel: pathLabelAtGranularity(filledPath, granularity),
      path: { ...filledPath },
      metrics,
    });
  }

  if (entityMap.size === 0 && granularity !== "global") {
    warnings.push(
      `Aucune ligne explicite au niveau « ${granularity} » : lecture depuis les lignes les plus détaillées du TCD.`
    );
    return {
      entities: aggregateFromLeafRows(
        rows,
        headerRowIndex,
        hierarchyColumns,
        kpiDefinitions,
        kpiStartColumn,
        granularity
      ),
      hierarchyColumns,
      kpiDefinitions,
    };
  }

  return {
    entities: [...entityMap.values()].sort((a, b) => a.pathLabel.localeCompare(b.pathLabel, "fr")),
    hierarchyColumns,
    kpiDefinitions,
  };
}

export function parseTcdData(
  text: string,
  table: ExcelTable | null = null,
  granularity: TcdGranularity = "global"
): ParsedTcd {
  const warnings: string[] = [];

  if (!text.trim() && !table) {
    return {
      metrics: [],
      headerLabels: [],
      hierarchyColumns: [],
      entities: [],
      availableGranularities: ["global"],
      warnings: ["Aucune donnée TCD fournie."],
    };
  }

  const grid = buildGridFromPaste(text, table);
  const { entities, hierarchyColumns, kpiDefinitions } = parseEntitiesFromGrid(
    grid,
    granularity,
    warnings
  );

  const globalEntity =
    entities.find((entity) => entity.key === "__global__") ??
    (granularity === "global" ? entities[0] : undefined);

  if (hierarchyColumns.length === 0) {
    warnings.push(
      "Colonnes hiérarchiques BM non détectées dans le collage : seule la vue globale est disponible."
    );
  }

  return {
    metrics: globalEntity?.metrics ?? [],
    headerLabels: kpiDefinitions.map((definition) => definition.label),
    hierarchyColumns,
    entities,
    availableGranularities: inferAvailableGranularities(hierarchyColumns),
    warnings,
  };
}

export function listAvailableKpiHeaders(
  referenceText: string,
  referenceTable: ExcelTable | null,
  currentText: string,
  currentTable: ExcelTable | null,
  granularity: TcdGranularity = "global"
): { key: string; label: string }[] {
  const current = parseTcdData(currentText, currentTable, granularity);
  const reference = parseTcdData(referenceText, referenceTable, granularity);
  const ordered: { key: string; label: string }[] = [];
  const seen = new Set<string>();

  const collect = (entities: TcdEntity[]) => {
    for (const entity of entities) {
      for (const metric of entity.metrics) {
        if (seen.has(metric.key)) continue;
        seen.add(metric.key);
        ordered.push({ key: metric.key, label: metric.label });
      }
    }
  };

  collect(current.entities);
  collect(reference.entities);

  return ordered;
}

export function listAvailableEntities(
  referenceText: string,
  referenceTable: ExcelTable | null,
  currentText: string,
  currentTable: ExcelTable | null,
  granularity: TcdGranularity
): { key: string; label: string; pathLabel: string }[] {
  const current = parseTcdData(currentText, currentTable, granularity);
  const reference = parseTcdData(referenceText, referenceTable, granularity);
  const byKey = new Map<string, { key: string; label: string; pathLabel: string }>();

  for (const entity of [...reference.entities, ...current.entities]) {
    if (!byKey.has(entity.key)) {
      byKey.set(entity.key, {
        key: entity.key,
        label: entity.label,
        pathLabel: entity.pathLabel,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => a.pathLabel.localeCompare(b.pathLabel, "fr"));
}

export function listAvailableGranularities(
  referenceText: string,
  referenceTable: ExcelTable | null,
  currentText: string,
  currentTable: ExcelTable | null
): TcdGranularity[] {
  const current = parseTcdData(currentText, currentTable, "global");
  const reference = parseTcdData(referenceText, referenceTable, "global");
  const levels = new Set<TcdGranularity>();

  for (const level of [...current.availableGranularities, ...reference.availableGranularities]) {
    levels.add(level);
  }

  return [...levels];
}

export { normalizeMetricLabel, parseNumericCell };
