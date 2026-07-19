"use client";

import { Compass, RotateCcw } from "lucide-react";
import { useStratStore, useStratStoreHydrated } from "@/store/useStratStore";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Input, FieldLabel } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StratBlockCard } from "@/components/strat-builder/StratBlockCard";
import { AddBlockMenu } from "@/components/strat-builder/AddBlockMenu";
import { Timeline } from "@/components/strat-builder/Timeline";
import { StrategyIO } from "@/components/strat-builder/StrategyIO";

export default function StratBuilderPage() {
  const hydrated = useStratStoreHydrated();
  const document = useStratStore((s) => s.document);
  const setName = useStratStore((s) => s.setName);
  const reset = useStratStore((s) => s.reset);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-14 sm:px-10">
      <ToolPageHeader
        title="Strat Builder"
        description="Structurez votre réflexion stratégique et ébauchez votre plan média."
        icon={Compass}
      />

      {!hydrated ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex-1">
              <FieldLabel className="mb-1.5" htmlFor="strat-name">
                Nom de la stratégie
              </FieldLabel>
              <Input
                id="strat-name"
                value={document.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Lancement gamme Été 2026"
                className="max-w-md"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StrategyIO />
              <Button
                variant="ghost"
                onClick={() => {
                  if (
                    window.confirm(
                      "Réinitialiser toute la stratégie ? Cette action est irréversible."
                    )
                  ) {
                    reset();
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
            </div>
          </div>

          {document.blocks.map((block, index) => (
            <StratBlockCard
              key={block.id}
              block={block}
              isFirst={index === 0}
              isLast={index === document.blocks.length - 1}
            />
          ))}

          <AddBlockMenu />

          <Timeline />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-6">
            <p className="text-xs text-muted-soft">
              Sauvegardez votre stratégie au format JSON pour la partager ou la
              reprendre plus tard.
            </p>
            <StrategyIO />
          </div>
        </div>
      )}
    </div>
  );
}
