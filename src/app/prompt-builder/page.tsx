"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { CampaignSwitcher } from "@/components/prompt-builder/CampaignSwitcher";
import { WeekDataForm } from "@/components/prompt-builder/WeekDataForm";
import { GeneratedPromptPanel } from "@/components/prompt-builder/GeneratedPromptPanel";
import { HistoryList } from "@/components/prompt-builder/HistoryList";
import { TcdComparator } from "@/components/prompt-builder/TcdComparator";
import { useCampaignStore, useCampaignStoreHydrated } from "@/store/useCampaignStore";
import type { Campaign } from "@/types/prompt-builder";

export default function PromptBuilderPage() {
  const hydrated = useCampaignStoreHydrated();
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const addCampaign = useCampaignStore((s) => s.addCampaign);
  const removeCampaign = useCampaignStore((s) => s.removeCampaign);
  const setActiveCampaign = useCampaignStore((s) => s.setActiveCampaign);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-14 sm:px-10">
      <ToolPageHeader
        title="Prompt Builder"
        description="Assemblez un brief d'analyse hebdomadaire prêt à envoyer à votre IA."
        icon={Sparkles}
      />

      {!hydrated ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
          Chargement des campagnes…
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <CampaignSwitcher
            campaigns={campaigns}
            activeCampaignId={activeCampaignId}
            onSelect={setActiveCampaign}
            onCreate={addCampaign}
            onRemove={removeCampaign}
          />

          {activeCampaign ? (
            <CampaignWorkspace key={activeCampaign.id} campaign={activeCampaign} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
              <p className="text-sm text-muted">
                Créez votre première campagne ci-dessus pour commencer à
                construire vos prompts hebdomadaires.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignWorkspace({ campaign }: { campaign: Campaign }) {
  const updateDraft = useCampaignStore((s) => s.updateDraft);
  const resetDraft = useCampaignStore((s) => s.resetDraft);
  const validateWeek = useCampaignStore((s) => s.validateWeek);
  const removeHistoryEntry = useCampaignStore((s) => s.removeHistoryEntry);

  const [generatedPrompt, setGeneratedPrompt] = useState("");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <WeekDataForm
          campaign={campaign}
          onUpdateDraft={(patch) => updateDraft(campaign.id, patch)}
          onResetDraft={() => resetDraft(campaign.id)}
          onGenerate={setGeneratedPrompt}
        />
        <GeneratedPromptPanel
          prompt={generatedPrompt}
          onValidate={() => {
            validateWeek(campaign.id, generatedPrompt);
            setGeneratedPrompt("");
          }}
        />
        <TcdComparator draft={campaign.draft} history={campaign.history} />
      </div>
      <div className="lg:col-span-1">
        <HistoryList
          history={campaign.history}
          onRemove={(entryId) => removeHistoryEntry(campaign.id, entryId)}
        />
      </div>
    </div>
  );
}
