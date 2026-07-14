"use client";

import { cn } from "@/lib/cn";
import type { DdsFlatRow } from "@/lib/ddsCreator";
import { DDS_COLUMNS, type DdsRow } from "@/types/dds-creator";

/** Colonnes fusionnées et niveau de regroupement associé. */
const MERGE_GROUP: Partial<Record<keyof DdsRow, "phase" | "publisher" | "segment">> = {
  funnel: "phase",
  publisher: "publisher",
  segment: "segment",
  specPublisher: "publisher",
  format: "publisher",
  specName: "publisher",
  specIndications: "publisher",
};

function shouldRenderCell(row: DdsFlatRow, key: keyof DdsRow): boolean {
  const group = MERGE_GROUP[key];
  if (group === "phase") return row.isPhaseStart;
  if (group === "publisher") return row.isPublisherStart;
  if (group === "segment") return row.isSegmentStart;
  return true;
}

function cellRowSpan(row: DdsFlatRow, key: keyof DdsRow): number {
  const group = MERGE_GROUP[key];
  if (group === "phase") return row.phaseRowSpan;
  if (group === "publisher") return row.publisherRowSpan;
  if (group === "segment") return row.segmentRowSpan;
  return 1;
}

const mainColumnsCount = DDS_COLUMNS.filter((column) => column.group === "main").length;
const specsColumnsCount = DDS_COLUMNS.filter((column) => column.group === "specs").length;

export function DdsPreviewTable({ rows }: { rows: DdsFlatRow[] }) {
  return (
    <div className="max-h-[640px] overflow-auto rounded-xl border border-border-soft bg-surface-soft">
      <table className="min-w-[2200px] border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#262626] text-foreground">
            <th
              colSpan={mainColumnsCount}
              className="border-b border-r border-border px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-accent"
            >
              Brief créa &amp; wording
            </th>
            <th
              colSpan={specsColumnsCount}
              className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-sky-300"
            >
              Specs techniques
            </th>
          </tr>
          <tr className="bg-[#2f2f2f] text-foreground shadow-[0_1px_0_var(--color-border)]">
            {DDS_COLUMNS.map((column) => (
              <th
                key={`${column.group}-${column.key}`}
                className="border-r border-border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide last:border-r-0"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={`${row.segmentId}-${rowIndex}`}
              className="border-b border-border-soft last:border-b-0"
            >
              {DDS_COLUMNS.map((column) => {
                if (!shouldRenderCell(row, column.key)) {
                  return null;
                }

                const rowSpan = cellRowSpan(row, column.key);
                const value = row[column.key];
                const displayValue =
                  value === "" || value === null || value === undefined
                    ? "—"
                    : String(value);
                const isGrouped = Boolean(MERGE_GROUP[column.key]);

                return (
                  <td
                    key={column.key}
                    rowSpan={rowSpan}
                    className={cn(
                      "border-r border-border-soft px-3 py-2.5 align-top last:border-r-0",
                      isGrouped
                        ? "bg-surface font-medium text-foreground"
                        : "text-muted",
                      column.key === "funnel" && "bg-accent-soft text-foreground"
                    )}
                  >
                    <span className="block max-w-[280px] whitespace-pre-wrap break-words">
                      {displayValue}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
