import type { ExcelTable } from "@/types/prompt-builder";

export interface ExpandedGrid {
  grid: string[][];
  bold: boolean[][];
}

const EMPTY_VALUE_MARKERS = new Set(["", "-", "—", "–", "n/a", "na", "nd", "null"]);

const DIMENSION_HEADER_HINTS = [
  "segment",
  "format",
  "line item",
  "nom",
  "libelle",
  "dimension",
  "row labels",
  "libelles de lignes",
];

export function normalizeMetricLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

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

export function isKpiHeaderCell(cell: string, options?: { allowBold?: boolean }): boolean {
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

function scoreHeaderRow(row: string[], startColumn: number, boldRow?: boolean[]): number {
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

export function findHeaderRowIndex(grid: string[][], boldGrid?: boolean[][]): number {
  let bestIndex = 0;
  let bestScore = 0;

  for (let rowIndex = 0; rowIndex < Math.min(12, grid.length); rowIndex++) {
    const startColumn =
      rowIndex === 0 || isDimensionColumn(grid, rowIndex, boldGrid) ? 1 : 0;
    const score = scoreHeaderRow(grid[rowIndex] ?? [], startColumn, boldGrid?.[rowIndex]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  return bestScore > 0 ? bestIndex : 0;
}

export function rowHasNumericValues(row: string[], fromColumn: number): boolean {
  for (let col = fromColumn; col < row.length; col++) {
    if (parseNumericCell(row[col] ?? "").value !== null) return true;
  }
  return false;
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

export function buildGridFromPaste(text: string, table: ExcelTable | null): ExpandedGrid {
  if (table) {
    return expandExcelTable(table);
  }
  return { grid: parseTextGrid(text), bold: [] };
}
