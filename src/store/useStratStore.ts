import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeDocument } from "@/lib/stratBuilder";
import {
  BLOCK_META,
  TIMELINE_COLORS,
  type Asset,
  type AssetGroup,
  type Audience,
  type BlockType,
  type Objective,
  type Platform,
  type StratBlock,
  type StratDocument,
  type TimelineItem,
} from "@/types/strat-builder";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// --- Factories -------------------------------------------------------------

export function createAudience(): Audience {
  return { id: createId(), name: "", potential: "", status: "todo" };
}

export function createPlatform(name = ""): Platform {
  return { id: createId(), name, audiences: [createAudience()] };
}

export function createObjective(): Objective {
  return { id: createId(), goal: "", approach: "", status: "todo" };
}

export function createAsset(recommended = false): Asset {
  return { id: createId(), name: "", assetType: "", duration: "", recommended };
}

export function createAssetGroup(name = ""): AssetGroup {
  return { id: createId(), name, assets: [createAsset()] };
}

export function createBlock(type: BlockType): StratBlock {
  const base = {
    id: createId(),
    title: BLOCK_META[type].label,
    notes: "",
    collapsed: false,
  };
  switch (type) {
    case "platform-audience":
      return { ...base, type, platforms: [createPlatform()] };
    case "objectives":
      return { ...base, type, objectives: [createObjective()] };
    case "assets":
      return { ...base, type, groups: [createAssetGroup()] };
  }
}

export function createTimelineItem(startDate: string): TimelineItem {
  return {
    id: createId(),
    label: "Nouvelle ligne",
    description: "",
    startDate,
    endDate: addDays(startDate, 6),
    platforms: [],
    audiences: [],
    assets: [],
    budget: "",
    smartbidding: true,
    audienceBudgets: {},
    color: TIMELINE_COLORS[0],
  };
}

function createDocument(): StratDocument {
  const start = today();
  return {
    name: "",
    blocks: [createBlock("platform-audience"), createBlock("objectives")],
    timeline: {
      startDate: start,
      endDate: addDays(start, 27),
      items: [],
    },
  };
}

// --- Store -----------------------------------------------------------------

interface StratStoreState {
  document: StratDocument;
  setName: (name: string) => void;
  addBlock: (type: BlockType) => void;
  removeBlock: (blockId: string) => void;
  moveBlock: (blockId: string, direction: "up" | "down") => void;
  /** Met à jour un bloc via une recette immutable (non persistée). */
  updateBlock: (blockId: string, recipe: (block: StratBlock) => StratBlock) => void;
  setTimelineRange: (field: "startDate" | "endDate", value: string) => void;
  addTimelineItem: () => void;
  removeTimelineItem: (itemId: string) => void;
  moveTimelineItem: (itemId: string, direction: "up" | "down") => void;
  updateTimelineItem: (itemId: string, patch: Partial<TimelineItem>) => void;
  /** Remplace tout le document (import JSON). */
  loadDocument: (document: StratDocument) => void;
  reset: () => void;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useStratStore = create<StratStoreState>()(
  persist(
    (set) => ({
      document: createDocument(),

      setName: (name) =>
        set((state) => ({ document: { ...state.document, name } })),

      addBlock: (type) =>
        set((state) => ({
          document: {
            ...state.document,
            blocks: [...state.document.blocks, createBlock(type)],
          },
        })),

      removeBlock: (blockId) =>
        set((state) => ({
          document: {
            ...state.document,
            blocks: state.document.blocks.filter((b) => b.id !== blockId),
          },
        })),

      moveBlock: (blockId, direction) =>
        set((state) => {
          const blocks = [...state.document.blocks];
          const index = blocks.findIndex((b) => b.id === blockId);
          if (index === -1) return state;
          const target = direction === "up" ? index - 1 : index + 1;
          if (target < 0 || target >= blocks.length) return state;
          [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
          return { document: { ...state.document, blocks } };
        }),

      updateBlock: (blockId, recipe) =>
        set((state) => ({
          document: {
            ...state.document,
            blocks: state.document.blocks.map((b) =>
              b.id === blockId ? recipe(b) : b
            ),
          },
        })),

      setTimelineRange: (field, value) =>
        set((state) => ({
          document: {
            ...state.document,
            timeline: { ...state.document.timeline, [field]: value },
          },
        })),

      addTimelineItem: () =>
        set((state) => ({
          document: {
            ...state.document,
            timeline: {
              ...state.document.timeline,
              items: [
                ...state.document.timeline.items,
                createTimelineItem(state.document.timeline.startDate),
              ],
            },
          },
        })),

      removeTimelineItem: (itemId) =>
        set((state) => ({
          document: {
            ...state.document,
            timeline: {
              ...state.document.timeline,
              items: state.document.timeline.items.filter(
                (item) => item.id !== itemId
              ),
            },
          },
        })),

      moveTimelineItem: (itemId, direction) =>
        set((state) => {
          const items = [...state.document.timeline.items];
          const index = items.findIndex((item) => item.id === itemId);
          if (index === -1) return state;
          const target = direction === "up" ? index - 1 : index + 1;
          if (target < 0 || target >= items.length) return state;
          [items[index], items[target]] = [items[target], items[index]];
          return {
            document: {
              ...state.document,
              timeline: { ...state.document.timeline, items },
            },
          };
        }),

      updateTimelineItem: (itemId, patch) =>
        set((state) => ({
          document: {
            ...state.document,
            timeline: {
              ...state.document.timeline,
              items: state.document.timeline.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item
              ),
            },
          },
        })),

      loadDocument: (document) => set({ document }),

      reset: () => set({ document: createDocument() }),
    }),
    {
      name: "ul-toolbox-strat-builder",
      version: 3,
      migrate: (persisted) => {
        // Normalise l'état persisté vers le schéma courant (smartbidding,
        // groupes d'adsets, blocs repliables, sous-titres de lignes…).
        const state = persisted as { document?: unknown } | undefined;
        if (state?.document) {
          return {
            ...(state as object),
            document: normalizeDocument(state.document as Parameters<typeof normalizeDocument>[0]),
          } as StratStoreState;
        }
        return state as StratStoreState;
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
    }
  )
);

/**
 * Évite les mismatches d'hydratation Next.js : le store persist lit
 * localStorage uniquement côté client.
 */
export function useStratStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useStratStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (hydrated) return;
    return useStratStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return hydrated;
}
