"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, Download, FileSpreadsheet, Link2, UploadCloud } from "lucide-react";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  exportTrackingRows,
  getTrackingColumns,
  parseTrackingFiles,
} from "@/lib/trackingExtractor";
import type { AdPlatform, TrackingExportRow } from "@/types/tracking-extractor";

export default function TrackingExtractorPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<TrackingExportRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const columns = useMemo(() => getTrackingColumns(), []);

  async function handleFiles(files: File[]) {
    const acceptedFiles = files.filter((file) => /\.(xlsx|txt)$/i.test(file.name));

    setError("");
    setWarnings([]);
    setRows([]);
    setSelectedFiles(files.map((file) => file.name));

    if (acceptedFiles.length === 0) {
      setError("Ajoutez au moins un fichier .xlsx Flashtalking ou .txt Nielsen DAR.");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await parseTrackingFiles(acceptedFiles);

      setRows(result.rows);
      setWarnings(result.warnings);

      if (result.rows.length === 0) {
        setWarnings((current) => [
          ...current,
          "Aucun Placement_ID exploitable n'a été trouvé dans les fichiers importés.",
        ]);
      }
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Impossible de traiter les fichiers importés."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <ToolPageHeader
        title="Extracteur Tracking"
        description="Fusionnez Flashtalking et Nielsen DAR par Placement_ID, puis exportez un Excel propre."
        icon={Link2}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="p-5">
          <CardHeader className="mb-4">
            <CardTitle>Importer les fichiers</CardTitle>
            <CardDescription>
              Déposez un ou plusieurs fichiers .xlsx et .txt. Le traitement reste local dans le navigateur.
            </CardDescription>
          </CardHeader>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              void handleFiles(Array.from(event.dataTransfer.files));
            }}
            className={cn(
              "flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition-colors",
              isDragging
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border-soft bg-surface-soft text-muted hover:border-accent/70 hover:bg-surface-hover"
            )}
          >
            <UploadCloud className="mb-4 h-10 w-10 text-accent" strokeWidth={1.8} />
            <span className="text-base font-semibold text-foreground">
              Glissez-déposez vos fichiers
            </span>
            <span className="mt-2 max-w-64 text-sm leading-relaxed">
              ou cliquez pour sélectionner les exports Flashtalking .xlsx et Nielsen DAR .txt.
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.txt"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleFiles(Array.from(event.target.files ?? []));
              event.currentTarget.value = "";
            }}
          />

          <div className="mt-5 flex flex-col gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={rows.length === 0}
              onClick={() => exportTrackingRows(rows)}
            >
              <Download className="h-4 w-4" />
              Télécharger l&apos;Excel
            </Button>

            <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-soft">
                Fichiers chargés
              </p>
              {selectedFiles.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
                  {selectedFiles.map((fileName) => (
                    <li key={fileName} className="truncate">
                      {fileName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Aucun fichier sélectionné pour le moment.
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <CardHeader>
              <CardTitle>Résultats fusionnés</CardTitle>
              <CardDescription>
                {rows.length > 0
                  ? `${rows.length} ligne${rows.length > 1 ? "s" : ""} prête${
                      rows.length > 1 ? "s" : ""
                    } à exporter.`
                  : "Le tableau apparaîtra après import et parsing des fichiers."}
              </CardDescription>
            </CardHeader>
            {isProcessing && (
              <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                Traitement en cours...
              </span>
            )}
          </div>

          {(error || warnings.length > 0) && (
            <div className="mb-4 flex flex-col gap-2">
              {error && (
                <StatusMessage tone="danger">
                  {error}
                </StatusMessage>
              )}
              {warnings.map((warning) => (
                <StatusMessage key={warning}>{warning}</StatusMessage>
              ))}
            </div>
          )}

          {rows.length > 0 ? (
            <div className="max-h-[620px] overflow-auto rounded-xl border border-border-soft bg-surface-soft">
              <table className="w-full min-w-[1320px] table-fixed border-collapse text-left text-xs">
                <colgroup>
                  {columns.map((column) => (
                    <col key={column} className={getColumnWidthClass(column)} />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-10 bg-[#262626] text-foreground shadow-[0_1px_0_var(--color-border-soft)]">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="border-r border-border-soft px-3 py-3 text-[11px] font-semibold uppercase tracking-wide last:border-r-0"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={`${row["Nom_Adset/Ad"]}-${rowIndex}`}
                      className="border-b border-border-soft last:border-b-0 hover:bg-surface-hover/70"
                    >
                      {columns.map((column) => (
                        <td
                          key={column}
                          className={cn(
                            "border-r border-border-soft px-3 py-3 align-top text-foreground last:border-r-0",
                            column === "Régie" && getPlatformCellClass(row["Régie"]),
                            column.startsWith("URL") && "font-mono text-[11px] leading-relaxed text-muted"
                          )}
                        >
                          {column === "Régie" ? (
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                getPlatformBadgeClass(row["Régie"])
                              )}
                            >
                              {getRowValue(row, column)}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "block",
                                column.startsWith("URL")
                                  ? "whitespace-normal break-all"
                                  : "truncate"
                              )}
                              title={getRowValue(row, column)}
                            >
                              {getRowValue(row, column) || "—"}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border-soft bg-surface-soft p-8 text-center">
              <FileSpreadsheet className="mb-4 h-10 w-10 text-muted-soft" strokeWidth={1.8} />
              <p className="text-sm font-medium text-foreground">Aucun résultat pour l&apos;instant</p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Importez un fichier Flashtalking .xlsx. Si le fichier Nielsen DAR .txt manque,
                les colonnes Nielsen resteront simplement vides.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function getRowValue(row: TrackingExportRow, column: string): string {
  return String(row[column as keyof TrackingExportRow] ?? "");
}

function getColumnWidthClass(column: string): string {
  if (column === "Placement ID") {
    return "w-[140px]";
  }

  if (column === "Régie") {
    return "w-[120px]";
  }

  if (column === "Nom_Adset/Ad") {
    return "w-[300px]";
  }

  return "w-[190px]";
}

function getPlatformCellClass(platform: AdPlatform): string {
  const platformClasses: Record<AdPlatform, string> = {
    Meta: "bg-sky-200/15",
    TikTok: "bg-rose-200/15",
    Snapchat: "bg-yellow-200/15",
    Pinterest: "bg-pink-200/15",
    Inconnue: "bg-stone-200/10",
  };

  return platformClasses[platform];
}

function getPlatformBadgeClass(platform: AdPlatform): string {
  const platformClasses: Record<AdPlatform, string> = {
    Meta: "bg-sky-200/85 text-sky-950",
    TikTok: "bg-rose-200/85 text-rose-950",
    Snapchat: "bg-yellow-200/85 text-yellow-950",
    Pinterest: "bg-pink-200/85 text-pink-950",
    Inconnue: "bg-stone-200/80 text-stone-950",
  };

  return platformClasses[platform];
}

function StatusMessage({
  children,
  tone = "warning",
}: {
  children: React.ReactNode;
  tone?: "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
        tone === "danger"
          ? "border-danger/40 bg-danger-soft text-foreground"
          : "border-border-soft bg-surface-soft text-muted"
      )}
    >
      <AlertCircle
        className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "danger" ? "text-danger" : "text-accent")}
      />
      <span>{children}</span>
    </div>
  );
}
