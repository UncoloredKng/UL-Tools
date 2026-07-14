import * as XLSX from "xlsx";
import {
  DDS_COLUMNS,
  type DdsDocument,
  type DdsRow,
} from "@/types/dds-creator";

/**
 * Ligne aplatie prête pour l'affichage/export : une ligne = un asset, enrichie
 * des métadonnées de regroupement (rowspan) pour recréer les cellules
 * fusionnées FUNNEL / PUBLISHER / SEGMENT du modèle Excel.
 */
export interface DdsFlatRow extends DdsRow {
  phaseId: string;
  publisherId: string;
  segmentId: string;
  isPhaseStart: boolean;
  phaseRowSpan: number;
  isPublisherStart: boolean;
  publisherRowSpan: number;
  isSegmentStart: boolean;
  segmentRowSpan: number;
}

function charCount(value: string): number | "" {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.length : "";
}

/**
 * Transforme le document hiérarchique en une liste de lignes à plat.
 * Les compteurs de caractères (Title / Description) sont dérivés
 * automatiquement du contenu saisi.
 */
export function flattenDocument(document: DdsDocument): DdsFlatRow[] {
  const rows: DdsFlatRow[] = [];

  for (const phase of document.phases) {
    const phaseRowSpan = phase.publishers.reduce(
      (total, publisher) =>
        total +
        publisher.segments.reduce(
          (segTotal, segment) => segTotal + Math.max(segment.assets.length, 1),
          0
        ),
      0
    );
    let phaseStarted = false;

    for (const publisher of phase.publishers) {
      const publisherRowSpan = publisher.segments.reduce(
        (segTotal, segment) => segTotal + Math.max(segment.assets.length, 1),
        0
      );
      let publisherStarted = false;

      for (const segment of publisher.segments) {
        const segmentRowSpan = Math.max(segment.assets.length, 1);
        let segmentStarted = false;

        for (const asset of segment.assets) {
          rows.push({
            phaseId: phase.id,
            publisherId: publisher.id,
            segmentId: segment.id,
            funnel: phase.funnel,
            publisher: publisher.name,
            segment: segment.name,
            assetType: asset.assetType,
            assetName: asset.assetName,
            device: asset.device,
            link: asset.link,
            adCopy: asset.adCopy,
            cta: asset.cta,
            title: asset.title,
            titleRule: asset.titleRule,
            titleChars: charCount(asset.title),
            descriptionLinkAd: asset.descriptionLinkAd,
            descriptionRule: asset.descriptionRule,
            descriptionChars: charCount(asset.descriptionLinkAd),
            specPublisher: publisher.name,
            format: asset.format,
            specName: asset.specName,
            specIndications: asset.specIndications,
            fileName: asset.fileName,
            sizmekLink: asset.sizmekLink,
            assetId: asset.assetId,
            redirectionDevice: asset.redirectionDevice,
            redirectionUrl: asset.redirectionUrl,
            isPhaseStart: !phaseStarted,
            phaseRowSpan,
            isPublisherStart: !publisherStarted,
            publisherRowSpan,
            isSegmentStart: !segmentStarted,
            segmentRowSpan,
          });
          phaseStarted = true;
          publisherStarted = true;
          segmentStarted = true;
        }
      }
    }
  }

  return rows;
}

export function documentIsEmpty(rows: DdsFlatRow[]): boolean {
  return rows.length === 0;
}

/** Nettoie une chaîne pour la réutiliser dans un nom de fichier. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function buildExportFilename(document: DdsDocument): string {
  const base = slugify(document.campaignName) || "campagne";
  return `DDS_${base}.xlsx`;
}

/**
 * Construit le classeur Excel du Doc de structure : bloc d'en-tête (campagne /
 * annonceur / agence), ligne de titres de colonnes, lignes de données, puis
 * fusion des cellules FUNNEL / PUBLISHER / SEGMENT (et du bloc SPECS par
 * publisher) pour reproduire la mise en forme du modèle.
 */
export function exportDdsDocument(document: DdsDocument) {
  const rows = flattenDocument(document);
  const aoa: (string | number)[][] = [];
  const merges: XLSX.Range[] = [];

  aoa.push(["CAMPAIGN NAME ON SIZMEK", document.campaignName]);
  aoa.push(["CAMPAIGN ID", document.campaignId]);
  aoa.push(["ADVERTISER", document.advertiser]);
  aoa.push(["AGENCY", document.agency]);
  aoa.push([]);

  const headerRowIndex = aoa.length;
  aoa.push(DDS_COLUMNS.map((column) => column.header));

  const firstDataRow = aoa.length;
  for (const row of rows) {
    aoa.push(
      DDS_COLUMNS.map((column) => {
        const value = row[column.key];
        return typeof value === "number" ? value : String(value ?? "");
      })
    );
  }

  const columnIndex = (key: keyof DdsRow) =>
    DDS_COLUMNS.findIndex((column) => column.key === key);

  const funnelCol = columnIndex("funnel");
  const publisherCol = columnIndex("publisher");
  const segmentCol = columnIndex("segment");
  const specPublisherCol = columnIndex("specPublisher");
  const formatCol = columnIndex("format");
  const specNameCol = columnIndex("specName");
  const specIndicationsCol = columnIndex("specIndications");

  rows.forEach((row, index) => {
    const excelRow = firstDataRow + index;

    if (row.isPhaseStart && row.phaseRowSpan > 1) {
      merges.push({
        s: { r: excelRow, c: funnelCol },
        e: { r: excelRow + row.phaseRowSpan - 1, c: funnelCol },
      });
    }

    if (row.isPublisherStart && row.publisherRowSpan > 1) {
      for (const col of [publisherCol, specPublisherCol, formatCol, specNameCol, specIndicationsCol]) {
        merges.push({
          s: { r: excelRow, c: col },
          e: { r: excelRow + row.publisherRowSpan - 1, c: col },
        });
      }
    }

    if (row.isSegmentStart && row.segmentRowSpan > 1) {
      merges.push({
        s: { r: excelRow, c: segmentCol },
        e: { r: excelRow + row.segmentRowSpan - 1, c: segmentCol },
      });
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet["!cols"] = DDS_COLUMNS.map((column) => ({ wch: column.width }));
  worksheet["!merges"] = merges;
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: Math.max(firstDataRow - 1, headerRowIndex), c: DDS_COLUMNS.length - 1 },
    }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Doc de structure");
  XLSX.writeFile(workbook, buildExportFilename(document));
}
