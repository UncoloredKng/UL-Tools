"use client";

import { useCallback, useRef, useState } from "react";
import {
  CalendarRange,
  Plus,
  Trash2,
  Euro,
  ChevronUp,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { TIMELINE_COLORS, type TimelineItem } from "@/types/strat-builder";
import { useStratStore } from "@/store/useStratStore";
import {
  addDays,
  collectOptions,
  computeBar,
  diffDays,
  weekTicks,
} from "@/lib/stratBuilder";
import { Card } from "@/components/ui/Card";
import { Input, FieldLabel } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { TagField } from "@/components/strat-builder/TagField";
import { CommentSection } from "@/components/strat-builder/CommentSection";
import { cn } from "@/lib/cn";

const CATEGORY_STYLE = {
  platforms: "bg-sky-400/20 text-sky-300",
  audiences: "bg-violet-400/20 text-violet-300",
  assets: "bg-amber-400/20 text-amber-300",
} as const;

type DragMode = "move" | "resize-start" | "resize-end";

function Chip({
  tone,
  children,
}: {
  tone: keyof typeof CATEGORY_STYLE;
  children: React.ReactNode;
}) {
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
      {item.description && (
        <p className="text-xs leading-snug text-muted-soft">{item.description}</p>
      )}
      <p className="text-[11px] text-muted-soft">
        {item.startDate} → {item.endDate}
      </p>
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
        </div>
      ) : (
        <span className="text-xs text-muted-soft">Aucune sélection</span>
      )}
    </div>
  );
}

/** Barre Gantt déplaçable / redimensionnable. */
function DraggableBar({
  item,
  rangeStart,
  rangeEnd,
  getTrack,
}: {
  item: TimelineItem;
  rangeStart: string;
  rangeEnd: string;
  getTrack: () => HTMLDivElement | null;
}) {
  const updateItem = useStratStore((s) => s.updateTimelineItem);
  const bar = computeBar(item, rangeStart, rangeEnd);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    origStart: string;
    origEnd: string;
  } | null>(null);

  const onPointerDown = useCallback(
    (mode: DragMode, event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const track = getTrack();
      if (!track) return;

      dragRef.current = {
        mode,
        startX: event.clientX,
        origStart: item.startDate,
        origEnd: item.endDate,
      };

      const totalDays = Math.max(diffDays(rangeStart, rangeEnd) + 1, 1);
      const trackWidth = track.getBoundingClientRect().width;
      const dayWidth = trackWidth / totalDays;

      const target = event.currentTarget as HTMLElement;
      target.setPointerCapture(event.pointerId);

      function onMove(ev: PointerEvent) {
        const drag = dragRef.current;
        if (!drag) return;
        const deltaDays = Math.round((ev.clientX - drag.startX) / dayWidth);
        if (drag.mode === "move") {
          let nextStart = addDays(drag.origStart, deltaDays);
          let nextEnd = addDays(drag.origEnd, deltaDays);
          const duration = diffDays(drag.origStart, drag.origEnd);
          if (diffDays(rangeStart, nextStart) < 0) {
            nextStart = rangeStart;
            nextEnd = addDays(nextStart, duration);
          }
          if (diffDays(nextEnd, rangeEnd) < 0) {
            nextEnd = rangeEnd;
            nextStart = addDays(nextEnd, -duration);
          }
          updateItem(item.id, { startDate: nextStart, endDate: nextEnd });
          return;
        }
        if (drag.mode === "resize-start") {
          let nextStart = addDays(drag.origStart, deltaDays);
          if (diffDays(nextStart, drag.origEnd) < 0) {
            nextStart = drag.origEnd;
          }
          if (diffDays(rangeStart, nextStart) < 0) nextStart = rangeStart;
          updateItem(item.id, { startDate: nextStart });
          return;
        }
        let nextEnd = addDays(drag.origEnd, deltaDays);
        if (diffDays(drag.origStart, nextEnd) < 0) nextEnd = drag.origStart;
        if (diffDays(nextEnd, rangeEnd) < 0) nextEnd = rangeEnd;
        updateItem(item.id, { endDate: nextEnd });
      }

      function onUp(ev: PointerEvent) {
        dragRef.current = null;
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [getTrack, item.endDate, item.id, item.startDate, rangeEnd, rangeStart, updateItem]
  );

  if (!bar.visible) return null;

  return (
    <div
      className={cn(
        "absolute top-1/2 flex h-7 -translate-y-1/2 items-center rounded-md text-xs font-medium text-accent-foreground shadow-sm",
        item.color
      )}
      style={{ left: `${bar.leftPct}%`, width: `${Math.max(bar.widthPct, 1.5)}%` }}
      title="Glisser pour déplacer · poignées pour redimensionner"
    >
      <button
        type="button"
        aria-label="Redimensionner le début"
        onPointerDown={(e) => onPointerDown("resize-start", e)}
        className="h-full w-2 shrink-0 cursor-ew-resize rounded-l-md bg-black/20 hover:bg-black/35"
      />
      <button
        type="button"
        aria-label="Déplacer la barre"
        onPointerDown={(e) => onPointerDown("move", e)}
        className="flex min-w-0 flex-1 cursor-grab items-center gap-1 overflow-hidden px-1 active:cursor-grabbing"
      >
        <span className="truncate">{item.label}</span>
      </button>
      <button
        type="button"
        aria-label="Redimensionner la fin"
        onPointerDown={(e) => onPointerDown("resize-end", e)}
        className="h-full w-2 shrink-0 cursor-ew-resize rounded-r-md bg-black/20 hover:bg-black/35"
      />
    </div>
  );
}

/** Édition rapide directement dans la colonne Gantt. */
function InlineEditor({
  item,
  options,
}: {
  item: TimelineItem;
  options: ReturnType<typeof collectOptions>;
}) {
  const updateItem = useStratStore((s) => s.updateTimelineItem);

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border-soft pt-2">
      <Input
        value={item.label}
        onChange={(e) => updateItem(item.id, { label: e.target.value })}
        placeholder="Intitulé"
        className="h-8 text-sm"
      />
      <Input
        value={item.description}
        onChange={(e) => updateItem(item.id, { description: e.target.value })}
        placeholder="Sous-titre"
        className="h-8 text-sm"
      />
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={item.startDate}
          onChange={(e) => updateItem(item.id, { startDate: e.target.value })}
          className="h-8 flex-1 text-xs"
        />
        <span className="text-muted-soft">→</span>
        <Input
          type="date"
          value={item.endDate}
          onChange={(e) => updateItem(item.id, { endDate: e.target.value })}
          className="h-8 flex-1 text-xs"
        />
      </div>
      {item.smartbidding && (
        <div className="relative">
          <Euro className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-soft" />
          <Input
            value={item.budget}
            onChange={(e) => updateItem(item.id, { budget: e.target.value })}
            placeholder="Budget"
            className="h-8 pl-8 text-sm"
          />
        </div>
      )}
      <TagField
        label="Plateformes"
        options={options.platforms}
        values={item.platforms}
        onChange={(platforms) => updateItem(item.id, { platforms })}
        accent={CATEGORY_STYLE.platforms}
      />
      <TagField
        label="Audiences"
        options={options.audiences}
        values={item.audiences}
        onChange={(audiences) => updateItem(item.id, { audiences })}
        accent={CATEGORY_STYLE.audiences}
      />
      <TagField
        label="Assets"
        options={options.assets}
        values={item.assets}
        onChange={(assets) => updateItem(item.id, { assets })}
        accent={CATEGORY_STYLE.assets}
      />
      <div className="flex flex-wrap items-center gap-1">
        {TIMELINE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Couleur ${color}`}
            onClick={() => updateItem(item.id, { color })}
            className={cn(
              "h-4 w-4 rounded-full border-2 transition-transform",
              color,
              item.color === color
                ? "border-foreground scale-110"
                : "border-transparent hover:scale-110"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  options,
  isFirst,
  isLast,
}: {
  item: TimelineItem;
  options: ReturnType<typeof collectOptions>;
  isFirst: boolean;
  isLast: boolean;
}) {
  const updateItem = useStratStore((s) => s.updateTimelineItem);
  const removeItem = useStratStore((s) => s.removeTimelineItem);
  const moveItem = useStratStore((s) => s.moveTimelineItem);

  function setAudienceBudget(audience: string, value: string) {
    updateItem(item.id, {
      audienceBudgets: { ...item.audienceBudgets, [audience]: value },
    });
  }

  return (
    <div className="rounded-xl border border-border-soft bg-surface-soft/60 p-3.5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => moveItem(item.id, "up")}
            aria-label="Monter la ligne"
            className="flex h-4 w-5 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => moveItem(item.id, "down")}
            aria-label="Descendre la ligne"
            className="flex h-4 w-5 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
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

      <Input
        value={item.description}
        onChange={(e) => updateItem(item.id, { description: e.target.value })}
        placeholder="Sous-titre / description courte de la ligne (option.)"
        className="mb-3 h-9 text-sm"
      />

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
  const addTimelineComment = useStratStore((s) => s.addTimelineComment);
  const removeTimelineComment = useStratStore((s) => s.removeTimelineComment);

  const { timeline } = document;
  const options = collectOptions(document);
  const ticks = weekTicks(timeline.startDate, timeline.endDate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const trackRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
              Glissez les barres pour déplacer / redimensionner. Cliquez une
              ligne pour éditer dates, assets, etc.
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

      <div className="mb-6 overflow-x-auto rounded-xl border border-border-soft bg-surface-soft/40">
        <div className="min-w-[860px]">
          <div className="flex border-b border-border-soft">
            <div className="w-72 shrink-0 border-r border-border-soft px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-soft">
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
              const isEditing = editingId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex border-b border-border-soft/60 last:border-b-0"
                >
                  <div className="w-72 shrink-0 border-r border-border-soft px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingId((id) => (id === item.id ? null : item.id))
                      }
                      className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted hover:text-accent"
                    >
                      <Pencil className="h-3 w-3" />
                      {isEditing ? "Fermer l'édition" : "Éditer ici"}
                    </button>
                    <ItemSummary item={item} />
                    {isEditing && <InlineEditor item={item} options={options} />}
                  </div>
                  <div
                    className="relative min-h-[64px] flex-1"
                    ref={(node) => {
                      if (node) trackRefs.current.set(item.id, node);
                      else trackRefs.current.delete(item.id);
                    }}
                  >
                    {ticks.map((tick, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-l border-border-soft/40"
                        style={{ left: `${tick.leftPct}%` }}
                      />
                    ))}
                    <DraggableBar
                      item={item}
                      rangeStart={timeline.startDate}
                      rangeEnd={timeline.endDate}
                      getTrack={() => trackRefs.current.get(item.id) ?? null}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {timeline.items.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            options={options}
            isFirst={index === 0}
            isLast={index === timeline.items.length - 1}
          />
        ))}
      </div>

      <Button variant="secondary" onClick={addItem} className="mt-4 self-start">
        <Plus className="h-4 w-4" />
        Ajouter une ligne
      </Button>

      <CommentSection
        comments={timeline.comments ?? []}
        onAdd={addTimelineComment}
        onRemove={removeTimelineComment}
      />
    </Card>
  );
}
