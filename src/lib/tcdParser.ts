import type { ExcelTable } from "@/types/prompt-builder";

export interface TcdMetric {
  /** Clé normalisée pour le rapprochement inter-semaines */
  key: string;
  /** Libellé affiché (en-tête de colonne tel que collé) */
  label: string;
  value: number | null;
  rawValue: string;
  isPercent: boolean;
  columnIndex: number;
}

export interface ParsedTcd {
  metrics: TcdMetric[];
  /** En-têtes détectés dans le collage, dans l'ordre des colonnes */
  headerLabels: string[];
  warnings: string[];
}

interface ExpandedGrid {
  grid: string[][];
  bold: boolean[][];
}

const EMPTY_VALUE_MARKERS = new Set(["", "-", "—", "–", "n/a", "na", "nd", "null"]);

/** Libellés de dimension (1ʳᵉ colonne), jamais des KPI. */
const DIMENSION_HEADER_HINTS = [
  "segment",
  "format",
  "plateforme",
  "campagne",
  "line item",
  "nom",
  "libelle",
  "media",
  "dimension",
  "row labels",
  "libelles de lignes",
];

const VALUE_ROW_HINTS = ["total", "global", "totaux", "ensemble"];

/**
 * Normalise un libellé KPI pour le rapprochement entre semaines
 * (minuscules, sans accents, sans ponctuation superflue).
 */
export function normalizeMetricLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

/**
 * Parse une cellule numérique issue d'Excel (formats FR/US, %, devises, espaces).
 */
export function parseNumericCell(raw: string): { value: number | null; isPercent: boolean } {
  let s = raw.trim().replace(/\u00a0/g, " ");
  if (EMPTY_VALUE_MARKERS.has(s.toLowerCase())) {
    return { value: null, isPercent: false };
  }

  const isPercent = s.includes("%");
  s = s.replace(/[%€$£\s]/g, "");

  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      s = parts.join("");
    } else {
      s = s.replace(",", ".");
    }
  }

  const num = Number.parseFloat(s);
  return { value: Number.isFinite(num) ? num : null, isPercent };
}

function splitTextRow(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((cell) => cell.trim());
  }
  return line
    .split(/\s{2,}/)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function parseTextGrid(text: string): string[][] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => splitTextRow(line.trimEnd()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function isDimensionHeader(cell: string): boolean {
  const normalized = normalizeMetricLabel(cell);
  if (!normalized) return false;
  return DIMENSION_HEADER_HINTS.some((hint) => normalized.includes(hint));
}

/**
 * En-tête KPI : tout libellé textuel collé en colonne (hors dimensions),
 * sans liste prédéfinie — l'ordre et les libellés viennent du TCD utilisateur.
 */
function isKpiHeaderCell(cell: string, options?: { allowBold?: boolean }): boolean {
  const trimmed = cell.trim();
  if (!trimmed || trimmed.length > 64) return false;
  if (isDimensionHeader(trimmed)) return false;

  const { value } = parseNumericCell(trimmed);
  if (value !== null && !options?.allowBold) return false;

  return true;
}

function isDimensionColumn(
  grid: string[][],
  headerRowIndex: number,
  boldGrid?: boolean[][]
): boolean {
  const headerFirst = grid[headerRowIndex]?.[0] ?? "";
  if (!headerFirst.trim()) return true;
  if (isDimensionHeader(headerFirst)) return true;

  let textLabels = 0;
  for (let row = headerRowIndex + 1; row < Math.min(headerRowIndex + 8, grid.length); row++) {
    const cell = grid[row]?.[0] ?? "";
    if (!cell.trim()) continue;
    if (parseNumericCell(cell).value === null || boldGrid?.[row]?.[0]) {
      textLabels++;
    }
  }

  return textLabels >= 2;
}

function scoreHeaderRow(
  row: string[],
  startColumn: number,
  boldRow?: boolean[]
): number {
  let score = 0;
  for (let col = startColumn; col < row.length; col++) {
    const cell = row[col] ?? "";
    const isBold = boldRow?.[col] ?? false;
    if (isKpiHeaderCell(cell, { allowBold: isBold })) {
      score += isBold ? 2 : 1;
    }
  }
  return score;
}

function findHeaderRowIndex(grid: string[][], boldGrid?: boolean[][]): number {
  let bestIndex = 0;
  let bestScore = 0;

  for (let rowIndex = 0; rowIndex < Math.min(12, grid.length); rowIndex++) {
    const startColumn =
      rowIndex === 0 || isDimensionColumn(grid, rowIndex, boldGrid) ? 1 : 0;
    const score = scoreHeaderRow(
      grid[rowIndex] ?? [],
      startColumn,
      boldGrid?.[rowIndex]
    );
    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  return bestScore > 0 ? bestIndex : 0;
}

function rowHasNumericValues(row: string[], fromColumn: number): boolean {
  for (let col = fromColumn; col < row.length; col++) {
    if (parseNumericCell(row[col] ?? "").value !== null) return true;
  }
  return false;
}

function findValueRowIndex(
  grid: string[][],
  headerRowIndex: number,
  startColumn: number
): number {
  for (let rowIndex = headerRowIndex + 1; rowIndex < grid.length; rowIndex++) {
    const rowLabel = normalizeMetricLabel(grid[rowIndex]?.[0] ?? "");
    if (VALUE_ROW_HINTS.some((hint) => rowLabel.includes(hint))) {
      return rowIndex;
    }
  }

  for (let rowIndex = grid.length - 1; rowIndex > headerRowIndex; rowIndex--) {
    const row = grid[rowIndex] ?? [];
    const rowLabel = normalizeMetricLabel(row[0] ?? "");
    if (VALUE_ROW_HINTS.some((hint) => rowLabel.includes(hint))) {
      return rowIndex;
    }
    if (rowHasNumericValues(row, startColumn)) {
      return rowIndex;
    }
  }

  return headerRowIndex + 1 < grid.length ? headerRowIndex + 1 : -1;
}

function extractMetricsFromGrid(
  grid: string[][],
  boldGrid: boolean[][] | undefined,
  warnings: string[]
): TcdMetric[] {
  if (grid.length === 0) return [];

  const headerRowIndex = findHeaderRowIndex(grid, boldGrid);
  const headerRow = grid[headerRowIndex] ?? [];
  const startColumn = isDimensionColumn(grid, headerRowIndex, boldGrid) ? 1 : 0;
  const valueRowIndex = findValueRowIndex(grid, headerRowIndex, startColumn);

  if (valueRowIndex < 0) {
    warnings.push(
      "Impossible de trouver une ligne de valeurs dans le TCD collé (ligne « Total » ou dernière ligne numérique)."
    );
    return [];
  }

  const valueRow = grid[valueRowIndex] ?? [];
  const valueRowLabel = normalizeMetricLabel(valueRow[0] ?? "");
  const usedTotalRow = VALUE_ROW_HINTS.some((hint) => valueRowLabel.includes(hint));

  if (!usedTotalRow && grid.length - headerRowIndex > 2) {
    warnings.push(
      "Ligne « Total » non détectée dans le collage : lecture sur la dernière ligne numérique disponible."
    );
  }

  const metrics: TcdMetric[] = [];
  const seenKeys = new Set<string>();

  for (let col = startColumn; col < headerRow.length; col++) {
    const label = headerRow[col]?.trim() ?? "";
    const isBoldHeader = boldGrid?.[headerRowIndex]?.[col] ?? false;
    if (!isKpiHeaderCell(label, { allowBold: isBoldHeader })) continue;

    const key = normalizeMetricLabel(label);
    if (!key || seenKeys.has(key)) continue;

    const rawValue = valueRow[col]?.trim() ?? "";
    const { value, isPercent } = parseNumericCell(rawValue);
    if (value === null && !rawValue) continue;

    seenKeys.add(key);
    metrics.push({
      key,
      label,
      value,
      rawValue: rawValue || "—",
      isPercent,
      columnIndex: col,
    });
  }

  if (metrics.length === 0) {
    warnings.push(
      "Aucun en-tête KPI détecté dans votre collage TCD. Vérifiez la ligne d'en-têtes de colonnes."
    );
  }

  return metrics;
}

function expandExcelTable(table: ExcelTable): ExpandedGrid {
  const maxCols = table.rows.reduce(
    (max, row) => max + row.reduce((sum, cell) => sum + cell.colSpan, 0),
    0
  );
  const grid: string[][] = [];
  const bold: boolean[][] = [];
  const occupied: boolean[][] = [];

  for (const row of table.rows) {
    let gridRow: string[] = [];
    let boldRow: boolean[] = [];
    let colIndex = 0;

    while (occupied[grid.length]?.[colIndex]) {
      gridRow.push("");
      boldRow.push(false);
      colIndex++;
    }

    for (const cell of row) {
      while (occupied[grid.length]?.[colIndex]) {
        gridRow.push("");
        boldRow.push(false);
        colIndex++;
      }

      gridRow.push(cell.text);
      boldRow.push(cell.bold);
      for (let r = 0; r < cell.rowSpan; r++) {
        for (let c = 0; c < cell.colSpan; c++) {
          if (r === 0 && c === 0) continue;
          if (!occupied[grid.length + r]) occupied[grid.length + r] = [];
          occupied[grid.length + r][colIndex + c] = true;
        }
      }
      colIndex += cell.colSpan;
    }

    while (gridRow.length < maxCols) {
      if (occupied[grid.length]?.[gridRow.length]) {
        gridRow.push("");
        boldRow.push(false);
      } else {
        break;
      }
    }

    grid.push(gridRow);
    bold.push(boldRow);
  }

  return { grid, bold };
}

function buildGridFromPaste(text: string, table: ExcelTable | null): ExpandedGrid {
  if (table) {
    return expandExcelTable(table);
  }
  return { grid: parseTextGrid(text), bold: [] };
}

/**
 * Extrait les KPI à partir du collage TCD (champ Prompt Builder).
 * Les en-têtes et leur ordre sont entièrement déduits des données collées.
 */
export function parseTcdData(text: string, table: ExcelTable | null = null): ParsedTcd {
  const warnings: string[] = [];

  if (!text.trim() && !table) {
    return { metrics: [], headerLabels: [], warnings: ["Aucune donnée TCD fournie."] };
  }

  const { grid, bold } = buildGridFromPaste(text, table);
  const metrics = extractMetricsFromGrid(grid, bold.length > 0 ? bold : undefined, warnings);
  const headerLabels = metrics.map((metric) => metric.label);

  return { metrics, headerLabels, warnings };
}

/**
 * KPI disponibles pour le filtre UI : ordre du TCD actuel, puis complément depuis la semaine de référence.
 */
export function listAvailableKpiHeaders(
  referenceText: string,
  referenceTable: ExcelTable | null,
  currentText: string,
  currentTable: ExcelTable | null
): { key: string; label: string }[] {
  const current = parseTcdData(currentText, currentTable).metrics;
  const reference = parseTcdData(referenceText, referenceTable).metrics;
  const ordered: { key: string; label: string }[] = [];
  const seen = new Set<string>();

  for (const metric of current) {
    if (seen.has(metric.key)) continue;
    seen.add(metric.key);
    ordered.push({ key: metric.key, label: metric.label });
  }

  for (const metric of reference) {
    if (seen.has(metric.key)) continue;
    seen.add(metric.key);
    ordered.push({ key: metric.key, label: metric.label });
  }

  return ordered;
}
