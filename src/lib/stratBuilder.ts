import type { StratDocument, TimelineItem } from "@/types/strat-builder";

const DAY_MS = 86_400_000;

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Format court "12 janv." pour l'axe de la timeline. */
export function formatShort(iso: string): string {
  return parseDate(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export interface AvailableOptions {
  platforms: string[];
  audiences: string[];
  assets: string[];
}

/** Agrège les plateformes, audiences et assets saisis dans les blocs. */
export function collectOptions(document: StratDocument): AvailableOptions {
  const platforms = new Set<string>();
  const audiences = new Set<string>();
  const assets = new Set<string>();

  for (const block of document.blocks) {
    if (block.type === "platform-audience") {
      for (const platform of block.platforms) {
        if (platform.name.trim()) platforms.add(platform.name.trim());
        for (const audience of platform.audiences) {
          if (audience.name.trim()) audiences.add(audience.name.trim());
        }
      }
    }
    if (block.type === "assets") {
      for (const asset of block.assets) {
        if (asset.name.trim()) assets.add(asset.name.trim());
      }
    }
  }

  return {
    platforms: [...platforms],
    audiences: [...audiences],
    assets: [...assets],
  };
}

export interface BarGeometry {
  leftPct: number;
  widthPct: number;
  visible: boolean;
}

/**
 * Position et largeur (en %) d'une barre de timeline dans la plage visible,
 * bornées à [0, 100]. `visible` est false si l'item est hors plage.
 */
export function computeBar(
  item: TimelineItem,
  rangeStart: string,
  rangeEnd: string
): BarGeometry {
  const totalDays = Math.max(diffDays(rangeStart, rangeEnd) + 1, 1);
  const startOffset = diffDays(rangeStart, item.startDate);
  const endOffset = diffDays(rangeStart, item.endDate) + 1;

  const clampedStart = Math.max(0, Math.min(startOffset, totalDays));
  const clampedEnd = Math.max(0, Math.min(endOffset, totalDays));
  const span = clampedEnd - clampedStart;

  return {
    leftPct: (clampedStart / totalDays) * 100,
    widthPct: (span / totalDays) * 100,
    visible: span > 0,
  };
}

/** Ticks hebdomadaires (label + position %) pour l'axe temporel. */
export function weekTicks(
  rangeStart: string,
  rangeEnd: string
): { label: string; leftPct: number }[] {
  const totalDays = Math.max(diffDays(rangeStart, rangeEnd) + 1, 1);
  const ticks: { label: string; leftPct: number }[] = [];
  for (let day = 0; day < totalDays; day += 7) {
    ticks.push({
      label: formatShort(addDays(rangeStart, day)),
      leftPct: (day / totalDays) * 100,
    });
  }
  return ticks;
}

// --- Import / Export -------------------------------------------------------

/** Retire les caractères interdits dans un nom de fichier. */
function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "").trim();
}

/** Nom de fichier : "Strat Builder - [Nom de la stratégie].json". */
export function strategyFileName(document: StratDocument): string {
  const name = sanitizeFileName(document.name) || "Sans titre";
  return `Strat Builder - ${name}.json`;
}

/** Déclenche le téléchargement du document courant au format JSON. */
export function downloadStrategy(document: StratDocument): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = strategyFileName(document);
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Normalise un document importé : garantit la présence des champs récents
 * (smartbidding, budgets par audience) pour la rétrocompatibilité.
 */
function normalizeDocument(raw: StratDocument): StratDocument {
  const rawItems = (raw.timeline?.items ?? []) as Partial<TimelineItem>[];
  const items: TimelineItem[] = rawItems.map(
    (item) =>
      ({
        ...item,
        platforms: item.platforms ?? [],
        audiences: item.audiences ?? [],
        assets: item.assets ?? [],
        smartbidding: item.smartbidding ?? true,
        audienceBudgets: item.audienceBudgets ?? {},
      }) as TimelineItem
  );

  return {
    name: raw.name ?? "",
    blocks: raw.blocks ?? [],
    timeline: {
      startDate: raw.timeline?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: raw.timeline?.endDate ?? new Date().toISOString().slice(0, 10),
      items,
    },
  };
}

/** Parse et valide le contenu d'un fichier de stratégie importé. */
export function parseStrategyFile(text: string): StratDocument {
  const parsed = JSON.parse(text) as StratDocument;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray(parsed.blocks) ||
    !parsed.timeline
  ) {
    throw new Error("Format de fichier invalide");
  }
  return normalizeDocument(parsed);
}
