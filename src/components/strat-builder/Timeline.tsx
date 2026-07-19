"use client";

import { CalendarRange, Plus, Trash2, Euro } from "lucide-react";
import { TIMELINE_COLORS, type TimelineItem } from "@/types/strat-builder";
import { useStratStore } from "@/store/useStratStore";
import { collectOptions, computeBar, weekTicks } from "@/lib/stratBuilder";
import { Card } from "@/components/ui/Card";
import { Input, FieldLabel } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { TagField } from "@/components/strat-builder/TagField";
import { cn } from "@/lib/cn";

const CATEGORY_STYLE = {
  platforms: "bg-sky-400/20 text-sky-300",
  audiences: "bg-violet-400/20 text-violet-300",
  assets: "bg-amber-400/20 text-amber-300",
} as const;

function Chip({ tone, children }: { tone: keyof typeof CATEGORY_STYLE; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        CATEGORY_STYLE[tone]
      )}
    >
      {children}
    </span>
  );
}

/** Résumé compact des sélections, affiché dans la colonne de gauche du Gantt. */
function ItemSummary({ item }: { item: TimelineItem }) {
  const hasContent =
    item.platforms.length ||
    item.audiences.length ||
    item.assets.length ||
    item.budget ||
    !item.smartbidding;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.color)} />
        <span className="truncate text-sm font-medium text-foreground">
          {item.label || "Sans intitulé"}
        </span>
      </div>
      {hasContent ? (
        <div className="flex flex-wrap gap-1">
          {item.platforms.map((p) => (
            <Chip key={`p-${p}`} tone="platforms">
              {p}
            </Chip>
          ))}
          {item.audiences.map((a) => (
            <Chip key={`a-${a}`} tone="audiences">
              {a}
              {!item.smartbidding && item.audienceBudgets[a] ? (
                <span className="opacity-80">· {item.audienceBudgets[a]}</span>
              ) : null}
            </Chip>
          ))}
          {item.assets.map((s) => (
            <Chip key={`s-${s}`} tone="assets">
              {s}
            </Chip>
          ))}
          {item.smartbidding && item.budget ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              <Euro className="h-3 w-3" />
              {item.budget}
            </span>
          ) : null}
          {item.smartbidding ? (
            <span className="rounded-full border border-border-soft px-2 py-0.5 text-[11px] text-muted-soft">
              Smartbidding
            </span>
          ) : null}
        </div>
      ) : (
        <span className="text-xs text-muted-soft">Aucune sélection</span>
      )}
    </div>
  );
}

function ItemCard({
  item,
  options,
}: {
  item: TimelineItem;
  options: ReturnType<typeof collectOptions>;
}) {
  const updateItem = useStratStore((s) => s.updateTimelineItem);
  const removeItem = useStratStore((s) => s.removeTimelineItem);

  function setAudienceBudget(audience: string, value: string) {
    updateItem(item.id, {
      audienceBudgets: { ...item.audienceBudgets, [audience]: value },
    });
  }

  return (
    <div className="rounded-xl border border-border-soft bg-surface-soft/60 p-3.5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={cn("h-3 w-3 shrink-0 rounded-full", item.color)} />
        <Input
          value={item.label}
          onChange={(e) => updateItem(item.id, { label: e.target.value })}
          placeholder="Intitulé de la ligne"
          className="h-9 min-w-[160px] flex-1 font-medium"
        />
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={item.startDate}
            onChange={(e) => updateItem(item.id, { startDate: e.target.value })}
            className="h-9 w-[9.5rem]"
          />
          <span className="text-muted-soft">→</span>
          <Input
            type="date"
            value={item.endDate}
            onChange={(e) => updateItem(item.id, { endDate: e.target.value })}
            className="h-9 w-[9.5rem]"
          />
        </div>
        {item.smartbidding && (
          <div className="relative w-36">
            <Euro className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-soft" />
            <Input
              value={item.budget}
              onChange={(e) => updateItem(item.id, { budget: e.target.value })}
              placeholder="Budget global"
              className="h-9 pl-8"
            />
          </div>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={() => removeItem(item.id)}
          aria-label="Supprimer la ligne"
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        {TIMELINE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Couleur ${color}`}
            onClick={() => updateItem(item.id, { color })}
            className={cn(
              "h-5 w-5 rounded-full border-2 transition-transform",
              color,
              item.color === color
                ? "border-foreground scale-110"
                : "border-transparent hover:scale-110"
            )}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <TagField
          label="Plateformes"
          options={options.platforms}
          values={item.platforms}
          onChange={(platforms) => updateItem(item.id, { platforms })}
          accent={CATEGORY_STYLE.platforms}
        />

        <div className="rounded-lg border border-border-soft bg-surface/40 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-soft">
              Audiences
            </span>
            <Switch
              id={`sb-${item.id}`}
              label="Smartbidding"
              checked={item.smartbidding}
              onChange={(smartbidding) => updateItem(item.id, { smartbidding })}
            />
          </div>
          <TagField
            label=""
            options={options.audiences}
            values={item.audiences}
            onChange={(audiences) => updateItem(item.id, { audiences })}
            accent={CATEGORY_STYLE.audiences}
          />
          {!item.smartbidding && item.audiences.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1.5 border-t border-border-soft pt-2.5">
              <span className="text-[11px] text-muted-soft">Budget par audience</span>
              {item.audiences.map((audience) => (
                <div key={audience} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {audience}
                  </span>
                  <div className="relative w-36">
                    <Euro className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-soft" />
                    <Input
                      value={item.audienceBudgets[audience] ?? ""}
                      onChange={(e) => setAudienceBudget(audience, e.target.value)}
                      placeholder="Budget"
                      className="h-9 pl-8"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <TagField
          label="Assets"
          options={options.assets}
          values={item.assets}
          onChange={(assets) => updateItem(item.id, { assets })}
          accent={CATEGORY_STYLE.assets}
        />
      </div>
    </div>
  );
}

export function Timeline() {
  const document = useStratStore((s) => s.document);
  const setRange = useStratStore((s) => s.setTimelineRange);
  const addItem = useStratStore((s) => s.addTimelineItem);

  const { timeline } = document;
  const options = collectOptions(document);
  const ticks = weekTicks(timeline.startDate, timeline.endDate);

  return (
    <Card className="p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <CalendarRange className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Timeline</h2>
            <p className="text-xs text-muted-soft">
              Ébauche du plan média : positionnez vos lignes dans le temps.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <FieldLabel className="text-xs">Début</FieldLabel>
            <Input
              type="date"
              value={timeline.startDate}
              onChange={(e) => setRange("startDate", e.target.value)}
              className="h-9 w-[9.5rem]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel className="text-xs">Fin</FieldLabel>
            <Input
              type="date"
              value={timeline.endDate}
              onChange={(e) => setRange("endDate", e.target.value)}
              className="h-9 w-[9.5rem]"
            />
          </div>
        </div>
      </div>

      {/* Visualisation Gantt : colonne d'info à gauche + piste temporelle à droite */}
      <div className="mb-6 overflow-x-auto rounded-xl border border-border-soft bg-surface-soft/40">
        <div className="min-w-[760px]">
          {/* En-tête axe temporel */}
          <div className="flex border-b border-border-soft">
            <div className="w-64 shrink-0 border-r border-border-soft px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-soft">
              Lignes
            </div>
            <div className="relative h-7 flex-1">
              {ticks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute top-0 flex h-full items-center border-l border-border-soft pl-1.5 text-[11px] text-muted-soft"
                  style={{ left: `${tick.leftPct}%` }}
                >
                  {tick.label}
                </div>
              ))}
            </div>
          </div>

          {timeline.items.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-soft">
              Aucune ligne. Ajoutez une ligne pour construire votre plan média.
            </div>
          ) : (
            timeline.items.map((item) => {
              const bar = computeBar(item, timeline.startDate, timeline.endDate);
              return (
                <div
                  key={item.id}
                  className="flex border-b border-border-soft/60 last:border-b-0"
                >
                  <div className="w-64 shrink-0 border-r border-border-soft px-3 py-2.5">
                    <ItemSummary item={item} />
                  </div>
                  <div className="relative min-h-[52px] flex-1">
                    {ticks.map((tick, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-l border-border-soft/40"
                        style={{ left: `${tick.leftPct}%` }}
                      />
                    ))}
                    {bar.visible && (
                      <div
                        className={cn(
                          "absolute top-1/2 flex h-7 -translate-y-1/2 items-center gap-2 overflow-hidden rounded-md px-2 text-xs font-medium text-accent-foreground",
                          item.color
                        )}
                        style={{
                          left: `${bar.leftPct}%`,
                          width: `${bar.widthPct}%`,
                        }}
                      >
                        <span className="truncate">{item.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Configuration des lignes */}
      <div className="flex flex-col gap-3">
        {timeline.items.map((item) => (
          <ItemCard key={item.id} item={item} options={options} />
        ))}
      </div>

      <Button variant="secondary" onClick={addItem} className="mt-4 self-start">
        <Plus className="h-4 w-4" />
        Ajouter une ligne
      </Button>
    </Card>
  );
}
