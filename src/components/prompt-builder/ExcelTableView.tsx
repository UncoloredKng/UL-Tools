import { cn } from "@/lib/cn";
import type { ExcelTable } from "@/types/prompt-builder";

interface ExcelTableViewProps {
  table: ExcelTable;
  maxHeightClassName?: string;
}

/**
 * Reproduit visuellement (lecture seule) la disposition d'un tableau collé
 * depuis Excel/Google Sheets : fusions de cellules (colSpan/rowSpan), mise
 * en gras et alignement sont préservés. Les couleurs exactes de la feuille
 * source ne sont volontairement pas reproduites — seule la structure
 * (hiérarchie, fusions) est restituée, avec une mise en forme cohérente
 * avec le design system de l'application.
 */
export function ExcelTableView({ table, maxHeightClassName = "max-h-80" }: ExcelTableViewProps) {
  return (
    <div
      className={cn(
        "overflow-auto rounded-xl border border-border-soft bg-surface-soft",
        maxHeightClassName
      )}
    >
      <table className="w-full border-collapse text-xs">
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex === 0 ? "bg-surface-hover" : undefined}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className={cn(
                    "whitespace-pre-wrap border border-border-soft px-2.5 py-1.5 align-top text-foreground",
                    cell.bold && "font-semibold",
                    cell.align === "center" && "text-center",
                    cell.align === "right" && "text-right"
                  )}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
