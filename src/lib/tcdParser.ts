import type { ExcelTable } from "@/types/prompt-builder";

export interface TcdMetric {
  /** Clé normalisée pour le rapprochement inter-semaines */
  key: string;
  /** Libellé affiché (première occurrence rencontrée) */
  label: string;
  value: number | null;
  rawValue: string;
  isPercent: boolean;
}

export interface ParsedTcd {
  metrics: TcdMetric[];
  warnings: string[];
}

const EMPTY_VALUE_MARKERS = new Set(["", "-", "—", "–", "n/a", "na", "nd", "null"]);

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

function isLikelyLabel(cell: string): boolean {
  const { value } = parseNumericCell(cell);
  if (value !== null) return false;
  return cell.trim().length > 0;
}

function findTotalColumnIndex(headerRows: string[][]): number | null {
  for (const row of headerRows) {
    for (let col = 0; col < row.length; col++) {
      const normalized = normalizeMetricLabel(row[col] ?? "");
      if (normalized.includes("total") || normalized === "global") {
        return col;
      }
    }
  }
  return null;
}

function extractMetricsFromGrid(
  grid: string[][],
  warnings: string[]
): TcdMetric[] {
  if (grid.length === 0) return [];

  const headerRows = grid.slice(0, Math.min(3, grid.length));
  const totalColumnIndex = findTotalColumnIndex(headerRows);
  const metrics: TcdMetric[] = [];
  const seenKeys = new Set<string>();

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
    const row = grid[rowIndex];
    if (row.length === 0) continue;

    let labelIndex = -1;
    for (let col = 0; col < row.length; col++) {
      if (isLikelyLabel(row[col] ?? "")) {
        labelIndex = col;
        break;
      }
    }
    if (labelIndex < 0) continue;

    const label = row[labelIndex]?.trim() ?? "";
    const key = normalizeMetricLabel(label);
    if (!key || seenKeys.has(key)) continue;

    let valueCell: string | null = null;
    if (totalColumnIndex !== null && totalColumnIndex < row.length && totalColumnIndex !== labelIndex) {
      valueCell = row[totalColumnIndex] ?? null;
    }

    if (!valueCell || !parseNumericCell(valueCell).value) {
      for (let col = row.length - 1; col > labelIndex; col--) {
        const candidate = row[col] ?? "";
        if (parseNumericCell(candidate).value !== null) {
          valueCell = candidate;
          break;
        }
      }
    }

    if (!valueCell) continue;

    const { value, isPercent } = parseNumericCell(valueCell);
    if (value === null) continue;

    seenKeys.add(key);
    metrics.push({ key, label, value, rawValue: valueCell.trim(), isPercent });
  }

  if (metrics.length === 0) {
    warnings.push(
      "Aucun KPI numérique détecté. Vérifiez que la première colonne contient les libellés et qu'une colonne de valeurs est présente."
    );
  }

  return metrics;
}

function expandExcelTable(table: ExcelTable): string[][] {
  const maxCols = table.rows.reduce(
    (max, row) => max + row.reduce((sum, cell) => sum + cell.colSpan, 0),
    0
  );
  const grid: string[][] = [];
  const occupied: boolean[][] = [];

  for (const row of table.rows) {
    let gridRow: string[] = [];
    let colIndex = 0;

    while (occupied[grid.length]?.[colIndex]) {
      gridRow.push("");
      colIndex++;
    }

    for (const cell of row) {
      while (occupied[grid.length]?.[colIndex]) {
        gridRow.push("");
        colIndex++;
      }

      gridRow.push(cell.text);
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
      } else {
        break;
      }
    }

    grid.push(gridRow);
  }

  return grid;
}

/**
 * Extrait les KPI numériques d'un TCD collé depuis Excel.
 * Utilise la structure Excel si disponible, sinon le texte brut.
 */
export function parseTcdData(text: string, table: ExcelTable | null = null): ParsedTcd {
  const warnings: string[] = [];

  if (!text.trim() && !table) {
    return { metrics: [], warnings: ["Aucune donnée TCD fournie."] };
  }

  const grid = table ? expandExcelTable(table) : parseTextGrid(text);
  const metrics = extractMetricsFromGrid(grid, warnings);

  return { metrics, warnings };
}
