import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_KPI_WEIGHTS,
  DEFAULT_REPORT_MODE,
  EMPTY_DRAFT,
  type Campaign,
  type HistoryEntry,
  type KpiWeights,
  type ReportMode,
  type WeekDraft,
} from "@/types/prompt-builder";

interface CampaignStoreState {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  addCampaign: (name: string) => string;
  removeCampaign: (id: string) => void;
  setActiveCampaign: (id: string) => void;
  updateDraft: (campaignId: string, patch: Partial<WeekDraft>) => void;
  resetDraft: (campaignId: string) => void;
  validateWeek: (campaignId: string, generatedPrompt: string) => void;
  removeHistoryEntry: (campaignId: string, entryId: string) => void;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * Normalise un objet de pondération KPI potentiellement incomplet ou absent
 * (ex : données persistées avant l'ajout de cette fonctionnalité).
 */
function normalizeKpiWeights(raw: unknown): KpiWeights {
  const source = (raw ?? {}) as Partial<KpiWeights>;
  return {
    awareness: source.awareness ?? DEFAULT_KPI_WEIGHTS.awareness,
    videoViews: source.videoViews ?? DEFAULT_KPI_WEIGHTS.videoViews,
    engagement: source.engagement ?? DEFAULT_KPI_WEIGHTS.engagement,
    traffic: source.traffic ?? DEFAULT_KPI_WEIGHTS.traffic,
  };
}

function normalizeMode(raw: unknown): ReportMode {
  return raw === "lancement" || raw === "run" || raw === "bilan"
    ? raw
    : DEFAULT_REPORT_MODE;
}

/**
 * Reconstruit un WeekDraft valide à partir de données potentiellement issues
 * d'un ancien schéma (avant renommage des champs : rawData → tcdData,
 * context → contexteAutre, aiComments → oldComments, ajout de bddData, de la
 * pondération KPI, puis du mode de rapport et des champs de lancement).
 */
function normalizeDraft(raw: unknown): WeekDraft {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    weekLabel: (source.weekLabel as string) ?? "",
    mode: normalizeMode(source.mode),
    oldComments: (source.oldComments as string) ?? (source.aiComments as string) ?? "",
    contexteGlobal: (source.contexteGlobal as string) ?? "",
    contexteCrea: (source.contexteCrea as string) ?? "",
    tcdData: (source.tcdData as string) ?? (source.rawData as string) ?? "",
    bddData: (source.bddData as string) ?? "",
    benchmarks: (source.benchmarks as string) ?? "",
    contexteAutre: (source.contexteAutre as string) ?? (source.context as string) ?? "",
    useKpiWeighting: (source.useKpiWeighting as boolean) ?? false,
    kpiWeights: normalizeKpiWeights(source.kpiWeights),
  };
}

function normalizeHistoryEntry(raw: unknown): HistoryEntry {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    id: (source.id as string) ?? createId(),
    weekLabel: (source.weekLabel as string) ?? "Semaine sans nom",
    validatedAt: (source.validatedAt as number) ?? Date.now(),
    mode: normalizeMode(source.mode),
    oldComments: (source.oldComments as string) ?? (source.aiComments as string) ?? "",
    contexteGlobal: (source.contexteGlobal as string) ?? "",
    contexteCrea: (source.contexteCrea as string) ?? "",
    tcdData: (source.tcdData as string) ?? (source.rawData as string) ?? "",
    bddData: (source.bddData as string) ?? "",
    benchmarks: (source.benchmarks as string) ?? "",
    contexteAutre: (source.contexteAutre as string) ?? (source.context as string) ?? "",
    useKpiWeighting: (source.useKpiWeighting as boolean) ?? false,
    kpiWeights: normalizeKpiWeights(source.kpiWeights),
    generatedPrompt: (source.generatedPrompt as string) ?? "",
  };
}

function normalizeCampaign(raw: unknown): Campaign {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    id: (source.id as string) ?? createId(),
    name: (source.name as string) ?? "Campagne sans nom",
    createdAt: (source.createdAt as number) ?? Date.now(),
    draft: normalizeDraft(source.draft),
    history: Array.isArray(source.history)
      ? (source.history as unknown[]).map(normalizeHistoryEntry)
      : [],
  };
}

export const useCampaignStore = create<CampaignStoreState>()(
  persist(
    (set) => ({
      campaigns: [],
      activeCampaignId: null,

      addCampaign: (name) => {
        const id = createId();
        const newCampaign: Campaign = {
          id,
          name: name.trim(),
          createdAt: Date.now(),
          draft: { ...EMPTY_DRAFT, kpiWeights: { ...EMPTY_DRAFT.kpiWeights } },
          history: [],
        };
        set((state) => ({
          campaigns: [...state.campaigns, newCampaign],
          activeCampaignId: id,
        }));
        return id;
      },

      removeCampaign: (id) => {
        set((state) => {
          const campaigns = state.campaigns.filter((c) => c.id !== id);
          const activeCampaignId =
            state.activeCampaignId === id
              ? campaigns[0]?.id ?? null
              : state.activeCampaignId;
          return { campaigns, activeCampaignId };
        });
      },

      setActiveCampaign: (id) => set({ activeCampaignId: id }),

      updateDraft: (campaignId, patch) => {
        set((state) => ({
          campaigns: state.campaigns.map((campaign) =>
            campaign.id === campaignId
              ? { ...campaign, draft: { ...campaign.draft, ...patch } }
              : campaign
          ),
        }));
      },

      resetDraft: (campaignId) => {
        set((state) => ({
          campaigns: state.campaigns.map((campaign) =>
            campaign.id === campaignId
              ? {
                  ...campaign,
                  draft: { ...EMPTY_DRAFT, kpiWeights: { ...EMPTY_DRAFT.kpiWeights } },
                }
              : campaign
          ),
        }));
      },

      validateWeek: (campaignId, generatedPrompt) => {
        set((state) => ({
          campaigns: state.campaigns.map((campaign) => {
            if (campaign.id !== campaignId) return campaign;
            const entry = {
              id: createId(),
              weekLabel: campaign.draft.weekLabel.trim() || "Semaine sans nom",
              validatedAt: Date.now(),
              mode: campaign.draft.mode,
              oldComments: campaign.draft.oldComments,
              contexteGlobal: campaign.draft.contexteGlobal,
              contexteCrea: campaign.draft.contexteCrea,
              tcdData: campaign.draft.tcdData,
              bddData: campaign.draft.bddData,
              benchmarks: campaign.draft.benchmarks,
              contexteAutre: campaign.draft.contexteAutre,
              useKpiWeighting: campaign.draft.useKpiWeighting,
              kpiWeights: { ...campaign.draft.kpiWeights },
              generatedPrompt,
            };
            return {
              ...campaign,
              history: [entry, ...campaign.history],
              // Le contexte de lancement (objectifs, stratégie créa/audience)
              // reste disponible en arrière-plan pour les semaines suivantes,
              // même s'il n'est plus affiché une fois passé en mode Run/Bilan.
              draft: {
                ...EMPTY_DRAFT,
                kpiWeights: { ...EMPTY_DRAFT.kpiWeights },
                mode: "run",
                contexteGlobal: campaign.draft.contexteGlobal,
                contexteCrea: campaign.draft.contexteCrea,
              },
            };
          }),
        }));
      },

      removeHistoryEntry: (campaignId, entryId) => {
        set((state) => ({
          campaigns: state.campaigns.map((campaign) =>
            campaign.id === campaignId
              ? {
                  ...campaign,
                  history: campaign.history.filter((entry) => entry.id !== entryId),
                }
              : campaign
          ),
        }));
      },
    }),
    {
      name: "ul-toolbox-prompt-builder",
      version: 2,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      // Normalise systématiquement les campagnes persistées (y compris celles
      // enregistrées avant l'ajout des champs TCD/BDD/pondération KPI) afin
      // d'éviter tout champ `undefined` côté UI.
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;
        const campaigns = Array.isArray(state.campaigns)
          ? (state.campaigns as unknown[]).map(normalizeCampaign)
          : [];
        return {
          campaigns,
          activeCampaignId: (state.activeCampaignId as string | null) ?? null,
        };
      },
    }
  )
);

/**
 * Évite les mismatches d'hydratation Next.js : le store persist lit
 * localStorage uniquement côté client, ce hook permet d'attendre que ce
 * soit fait avant d'afficher les données réelles.
 */
export function useCampaignStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useCampaignStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useCampaignStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return hydrated;
}
