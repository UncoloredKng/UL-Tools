"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import type { Campaign } from "@/types/prompt-builder";

interface CampaignSwitcherProps {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRemove: (id: string) => void;
}

export function CampaignSwitcher({
  campaigns,
  activeCampaignId,
  onSelect,
  onCreate,
  onRemove,
}: CampaignSwitcherProps) {
  const [isCreating, setIsCreating] = useState(campaigns.length === 0);
  const [name, setName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
    setIsCreating(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <span className="shrink-0 text-sm font-medium text-muted">Campagne</span>

        {isCreating ? (
          <div className="flex w-full items-center gap-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setIsCreating(false);
                  setName("");
                }
              }}
              placeholder="Nom de la nouvelle campagne (ex : Client X — Meta Ads)"
              className="max-w-sm"
            />
            <Button size="sm" variant="primary" onClick={handleCreate}>
              Créer
            </Button>
            {campaigns.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="relative w-full max-w-sm">
            <select
              value={activeCampaignId ?? ""}
              onChange={(e) => onSelect(e.target.value)}
              className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border-soft bg-surface-soft px-3.5 pr-9 text-sm font-medium text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/40"
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
          </div>
        )}
      </div>

      {!isCreating && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle campagne
          </Button>
          {activeCampaignId && (
            <>
              {confirmingDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted">Supprimer ?</span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      onRemove(activeCampaignId);
                      setConfirmingDelete(false);
                    }}
                  >
                    Confirmer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Supprimer la campagne"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
