"use client";

import { useState } from "react";
import { Archive, ChevronDown, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { copyToClipboard } from "@/lib/clipboard";
import type { HistoryEntry, ReportMode } from "@/types/prompt-builder";

interface HistoryListProps {
  history: HistoryEntry[];
  onRemove: (entryId: string) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const REPORT_MODE_BADGES: Record<ReportMode, string> = {
  lancement: "🌱 Lancement",
  run: "📈 Run",
  bilan: "🏁 Bilan",
};

export function HistoryList({ history, onRemove }: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Archive className="h-4 w-4 text-accent" />
        <h2 className="text-base font-semibold text-foreground">
          Historique des semaines
        </h2>
        {history.length > 0 && (
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-muted">
            {history.length}
          </span>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted">
          Aucune semaine archivée pour le moment. Générez un prompt puis validez-le
          pour le retrouver ici.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <li
                key={entry.id}
                className="overflow-hidden rounded-xl border border-border-soft bg-surface-soft"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {entry.weekLabel}
                      </p>
                      <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-muted">
                        {REPORT_MODE_BADGES[entry.mode]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-soft">
                      Archivée le {formatDate(entry.validatedAt)}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-soft transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-border-soft px-3.5 py-3">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted">
                      {entry.generatedPrompt}
                    </pre>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(entry.generatedPrompt)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copier
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onRemove(entry.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
