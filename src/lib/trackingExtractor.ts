import * as XLSX from "xlsx";
import type {
  AdPlatform,
  TrackingExportRow,
  TrackingParseResult,
  TrackingSourceRow,
} from "@/types/tracking-extractor";

type WorksheetRow = Record<string, unknown>;
type NielsenContext = "impression" | "click";

const urlFromImgRegex = /src="([^"]+)"/;
const nielsenPlacementRegex = /Sboff_(\d+)\)\sPlacement/;
const platformSortRank: Record<AdPlatform, number> = {
  Meta: 0,
  TikTok: 1,
  Snapchat: 2,
  Pinterest: 3,
  Inconnue: 4,
};
const trackingColumnWidths: Record<keyof TrackingExportRow, number> = {
  "Placement ID": 18,
  "Régie": 14,
  "Nom_Adset/Ad": 42,
  "URL Clic Flashtalking": 56,
  "URL Impression Flashtalking": 56,
  "URL Impression Nielsen": 56,
  "URL Clic Nielsen": 56,
};

export async function parseTrackingFiles(files: File[]): Promise<TrackingParseResult> {
  const rowsByPlacementId = new Map<string, TrackingSourceRow>();
  const warnings: string[] = [];

  for (const file of files) {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith(".xlsx")) {
      await parseFlashtalkingFile(file, rowsByPlacementId, warnings);
      continue;
    }

    if (lowerName.endsWith(".txt")) {
      const text = await file.text();
      parseNielsenText(text, rowsByPlacementId);
      continue;
    }

    warnings.push(`${file.name} ignoré : seuls les fichiers .xlsx et .txt sont acceptés.`);
  }

  const sourceRows = Array.from(rowsByPlacementId.values()).sort((a, b) => {
    const platformComparison = platformSortRank[a.platform] - platformSortRank[b.platform];

    if (platformComparison !== 0) {
      return platformComparison;
    }

    return a.placementName.localeCompare(b.placementName, "fr", { numeric: true });
  });

  return {
    rows: sourceRows.map(formatExportRow),
    sourceRows,
    warnings,
  };
}

export function exportTrackingRows(rows: TrackingExportRow[], filename = "tracking-extractor.xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: getTrackingColumns() });
  const workbook = XLSX.utils.book_new();

  worksheet["!cols"] = getTrackingColumns().map((column) => ({
    wch: trackingColumnWidths[column as keyof TrackingExportRow] ?? 24,
  }));
  worksheet["!autofilter"] = { ref: worksheet["!ref"] ?? "A1:G1" };

  XLSX.utils.book_append_sheet(workbook, worksheet, "Tracking");
  XLSX.writeFile(workbook, filename);
}

export function getTrackingColumns(): string[] {
  return [
    "Placement ID",
    "Régie",
    "Nom_Adset/Ad",
    "URL Clic Flashtalking",
    "URL Impression Flashtalking",
    "URL Impression Nielsen",
    "URL Clic Nielsen",
  ];
}

async function parseFlashtalkingFile(
  file: File,
  rowsByPlacementId: Map<string, TrackingSourceRow>,
  warnings: string[]
) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    warnings.push(`${file.name} ignoré : aucun onglet trouvé.`);
    return;
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<WorksheetRow>(worksheet, {
    defval: "",
    range: 10,
  });
  const platform = detectPlatform(file.name);

  for (const row of rows) {
    const placementId = findCell(row, ["Placement_ID", "Placement ID", "PlacementID"]);

    if (!placementId) {
      continue;
    }

    const placementName = findCell(row, ["PlacementName", "Placement Name", "Placement"]);
    const pixelValue = findCell(row, ["pixel", "Impression Pixel", "Impression Tag"]);
    const clickUrl = findCell(row, ["Static_Clicktag1", "Static Clicktag1", "Clicktag1"]);
    const impressionUrl = pixelValue.match(urlFromImgRegex)?.[1] ?? pixelValue;
    const existing = getOrCreateSourceRow(rowsByPlacementId, placementId);

    existing.platform = platform;
    existing.placementName = placementName || existing.placementName;
    existing.flashtalkingImpressionUrl = impressionUrl;
    existing.flashtalkingClickUrl = clickUrl;
  }
}

function parseNielsenText(text: string, rowsByPlacementId: Map<string, TrackingSourceRow>) {
  let context: NielsenContext | null = null;
  let currentPlacementId = "";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (/SECURE 1x1 VIEW PIXELS/i.test(line)) {
      context = "impression";
      currentPlacementId = "";
      continue;
    }

    if (/SECURE 1x1 CLICK PIXELS/i.test(line)) {
      context = "click";
      currentPlacementId = "";
      continue;
    }

    const placementMatch = line.match(nielsenPlacementRegex);

    if (placementMatch?.[1]) {
      currentPlacementId = placementMatch[1];
    }

    const url = line.match(urlFromImgRegex)?.[1];

    if (!context || !currentPlacementId || !url) {
      continue;
    }

    const existing = getOrCreateSourceRow(rowsByPlacementId, currentPlacementId);

    if (context === "impression") {
      existing.nielsenImpressionUrl = url;
    } else {
      existing.nielsenClickUrl = url;
    }
  }
}

function formatExportRow(row: TrackingSourceRow): TrackingExportRow {
  return {
    "Placement ID": row.placementId,
    "Régie": row.platform,
    "Nom_Adset/Ad": row.placementName,
    "URL Clic Flashtalking": row.flashtalkingClickUrl,
    "URL Impression Flashtalking": row.flashtalkingImpressionUrl,
    "URL Impression Nielsen": row.nielsenImpressionUrl,
    "URL Clic Nielsen": row.nielsenClickUrl,
  };
}

function getOrCreateSourceRow(
  rowsByPlacementId: Map<string, TrackingSourceRow>,
  placementId: string
) {
  const existing = rowsByPlacementId.get(placementId);

  if (existing) {
    return existing;
  }

  const row: TrackingSourceRow = {
    placementId,
    placementName: placementId,
    platform: "Inconnue",
    flashtalkingImpressionUrl: "",
    flashtalkingClickUrl: "",
    nielsenImpressionUrl: "",
    nielsenClickUrl: "",
  };

  rowsByPlacementId.set(placementId, row);
  return row;
}

function detectPlatform(filename: string): AdPlatform {
  if (/tiktok/i.test(filename)) {
    return "TikTok";
  }

  if (/facebook|meta/i.test(filename)) {
    return "Meta";
  }

  if (/snapchat|snap/i.test(filename)) {
    return "Snapchat";
  }

  if (/pinterest|pin/i.test(filename)) {
    return "Pinterest";
  }

  return "Inconnue";
}

function findCell(row: WorksheetRow, candidates: string[]): string {
  const entries = Object.entries(row);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const exactMatch = entries.find(([header]) => normalizeHeader(header) === normalizedCandidate);

    if (exactMatch) {
      return toCellString(exactMatch[1]);
    }
  }

  const fuzzyMatch = entries.find(([header]) => {
    const normalizedHeader = normalizeHeader(header);

    return candidates.some((candidate) => normalizedHeader.includes(normalizeHeader(candidate)));
  });

  return fuzzyMatch ? toCellString(fuzzyMatch[1]) : "";
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toCellString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}
