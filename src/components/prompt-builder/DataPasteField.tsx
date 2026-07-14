"use client";

import { useState, type ClipboardEvent } from "react";
import { FileText, Table2 } from "lucide-react";
import { FieldLabel, Textarea } from "@/components/ui/Field";
import { ExcelTableView } from "@/components/prompt-builder/ExcelTableView";
import { formatTsvForTextarea } from "@/lib/tsv";
import { parseExcelHtmlTable } from "@/lib/excelTable";
import { cn } from "@/lib/cn";
import type { ExcelTable } from "@/types/prompt-builder";

interface DataPasteFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  table: ExcelTable | null;
  onChange: (value: string, table: ExcelTable | null) => void;
  rows?: number;
  monospace?: boolean;
}

/**
 * Champ de saisie pour des données collées depuis Excel/Google Sheets.
 * Bascule automatiquement en "Vue Excel" (grille en lecture seule qui
 * reproduit fusions de cellules, gras et alignement) dès qu'un collage
 * tabulaire est détecté, tout en gardant le texte brut modifiable en
 * dessous. Toute modification manuelle du texte invalide la vue Excel
 * (les deux ne pouvant plus être garanties synchronisées).
 */
export function DataPasteField({
  id,
  label,
  placeholder,
  value,
  table,
  onChange,
  rows = 5,
  monospace = true,
}: DataPasteFieldProps) {
  const hasTable = table !== null && table.rows.length > 0;
  const [viewMode, setViewMode] = useState<"excel" | "text">(hasTable ? "excel" : "text");
  const [pasteHint, setPasteHint] = useState(false);

  // Bascule automatiquement vers la vue adaptée dès qu'un nouveau tableau
  // est collé (ou retiré) — ajustement de l'état pendant le rendu plutôt que
  // dans un effet, pour éviter un rendu supplémentaire inutile.
  const [previousTable, setPreviousTable] = useState(table);
  if (table !== previousTable) {
    setPreviousTable(table);
    setViewMode(hasTable ? "excel" : "text");
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t")) return;
    e.preventDefault();

    const formatted = formatTsvForTextarea(text);
    const html = e.clipboardData.getData("text/html");
    const parsedTable = html ? parseExcelHtmlTable(html) : null;

    onChange(formatted, parsedTable);
    setPasteHint(true);
    setTimeout(() => setPasteHint(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id} hint={pasteHint ? "Données Excel formatées ✓" : undefined}>
          {label}
        </FieldLabel>
        {hasTable && (
          <div className="flex shrink-0 gap-0.5 rounded-lg border border-border-soft bg-surface-soft p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("excel")}
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150",
                viewMode === "excel"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              <Table2 className="h-3 w-3" />
              Vue Excel
            </button>
            <button
              type="button"
              onClick={() => setViewMode("text")}
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150",
                viewMode === "text"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              <FileText className="h-3 w-3" />
              Texte brut
            </button>
          </div>
        )}
      </div>

      <div className="mt-1.5">
        {hasTable && viewMode === "excel" && table ? (
          <ExcelTableView table={table} />
        ) : (
          <Textarea
            id={id}
            monospace={monospace}
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value, null)}
            onPaste={handlePaste}
          />
        )}
      </div>
    </div>
  );
}
