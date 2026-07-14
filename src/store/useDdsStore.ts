import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getPublisherConfig,
  type DdsAsset,
  type DdsDocument,
  type DdsPhase,
  type DdsPublisher,
  type DdsSegment,
} from "@/types/dds-creator";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createAsset(publisher: string): DdsAsset {
  const config = getPublisherConfig(publisher);
  return {
    id: createId(),
    assetType: "",
    assetName: "",
    device: config.defaultDevice,
    link: "",
    adCopy: "",
    cta: "",
    title: "",
    titleRule: config.titleRule,
    descriptionLinkAd: "",
    descriptionRule: config.descriptionRule,
    format: config.defaultFormat,
    specName: publisher ? `${publisher}_${config.defaultFormat}` : "",
    specIndications: config.specIndications,
    fileName: "",
    sizmekLink: "",
    assetId: "",
    redirectionDevice: "",
    redirectionUrl: "",
  };
}

export function createSegment(publisher: string): DdsSegment {
  return {
    id: createId(),
    name: "",
    assets: [createAsset(publisher)],
  };
}

export function createPublisher(name = "Meta"): DdsPublisher {
  return {
    id: createId(),
    name,
    segments: [createSegment(name)],
  };
}

export function createPhase(funnel = ""): DdsPhase {
  return {
    id: createId(),
    funnel,
    publishers: [createPublisher()],
  };
}

function createDocument(): DdsDocument {
  return {
    campaignName: "",
    campaignId: "",
    advertiser: "UL",
    agency: "HAVAS",
    phases: [createPhase("Awareness")],
  };
}

interface DdsStoreState {
  document: DdsDocument;
  setCampaignField: (
    field: "campaignName" | "campaignId" | "advertiser" | "agency",
    value: string
  ) => void;
  addPhase: () => void;
  removePhase: (phaseId: string) => void;
  updatePhaseFunnel: (phaseId: string, funnel: string) => void;
  addPublisher: (phaseId: string) => void;
  removePublisher: (phaseId: string, publisherId: string) => void;
  updatePublisherName: (phaseId: string, publisherId: string, name: string) => void;
  addSegment: (phaseId: string, publisherId: string) => void;
  removeSegment: (phaseId: string, publisherId: string, segmentId: string) => void;
  updateSegmentName: (
    phaseId: string,
    publisherId: string,
    segmentId: string,
    name: string
  ) => void;
  addAsset: (phaseId: string, publisherId: string, segmentId: string) => void;
  removeAsset: (
    phaseId: string,
    publisherId: string,
    segmentId: string,
    assetId: string
  ) => void;
  updateAsset: (
    phaseId: string,
    publisherId: string,
    segmentId: string,
    assetId: string,
    patch: Partial<DdsAsset>
  ) => void;
  reset: () => void;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * Applique une transformation à un asset ciblé par son chemin
 * phase → publisher → segment → asset, en préservant l'immutabilité.
 */
function mapPhases(
  phases: DdsPhase[],
  phaseId: string,
  updater: (phase: DdsPhase) => DdsPhase
): DdsPhase[] {
  return phases.map((phase) => (phase.id === phaseId ? updater(phase) : phase));
}

function mapPublishers(
  publishers: DdsPublisher[],
  publisherId: string,
  updater: (publisher: DdsPublisher) => DdsPublisher
): DdsPublisher[] {
  return publishers.map((publisher) =>
    publisher.id === publisherId ? updater(publisher) : publisher
  );
}

function mapSegments(
  segments: DdsSegment[],
  segmentId: string,
  updater: (segment: DdsSegment) => DdsSegment
): DdsSegment[] {
  return segments.map((segment) =>
    segment.id === segmentId ? updater(segment) : segment
  );
}

export const useDdsStore = create<DdsStoreState>()(
  persist(
    (set) => ({
      document: createDocument(),

      setCampaignField: (field, value) =>
        set((state) => ({ document: { ...state.document, [field]: value } })),

      addPhase: () =>
        set((state) => ({
          document: {
            ...state.document,
            phases: [...state.document.phases, createPhase()],
          },
        })),

      removePhase: (phaseId) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: state.document.phases.filter((phase) => phase.id !== phaseId),
          },
        })),

      updatePhaseFunnel: (phaseId, funnel) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              funnel,
            })),
          },
        })),

      addPublisher: (phaseId) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: [...phase.publishers, createPublisher()],
            })),
          },
        })),

      removePublisher: (phaseId, publisherId) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: phase.publishers.filter((p) => p.id !== publisherId),
            })),
          },
        })),

      updatePublisherName: (phaseId, publisherId, name) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: mapPublishers(phase.publishers, publisherId, (publisher) => {
                const config = getPublisherConfig(name);
                return {
                  ...publisher,
                  name,
                  // Réaligne les valeurs dérivées de la régie (device, règles,
                  // nom de spec) sur la nouvelle sélection.
                  segments: publisher.segments.map((segment) => ({
                    ...segment,
                    assets: segment.assets.map((asset) => ({
                      ...asset,
                      device: config.defaultDevice,
                      titleRule: config.titleRule,
                      descriptionRule: config.descriptionRule,
                      format: config.defaultFormat,
                      specName: `${name}_${config.defaultFormat}`,
                    })),
                  })),
                };
              }),
            })),
          },
        })),

      addSegment: (phaseId, publisherId) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: mapPublishers(phase.publishers, publisherId, (publisher) => ({
                ...publisher,
                segments: [...publisher.segments, createSegment(publisher.name)],
              })),
            })),
          },
        })),

      removeSegment: (phaseId, publisherId, segmentId) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: mapPublishers(phase.publishers, publisherId, (publisher) => ({
                ...publisher,
                segments: publisher.segments.filter((s) => s.id !== segmentId),
              })),
            })),
          },
        })),

      updateSegmentName: (phaseId, publisherId, segmentId, name) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: mapPublishers(phase.publishers, publisherId, (publisher) => ({
                ...publisher,
                segments: mapSegments(publisher.segments, segmentId, (segment) => ({
                  ...segment,
                  name,
                })),
              })),
            })),
          },
        })),

      addAsset: (phaseId, publisherId, segmentId) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: mapPublishers(phase.publishers, publisherId, (publisher) => ({
                ...publisher,
                segments: mapSegments(publisher.segments, segmentId, (segment) => ({
                  ...segment,
                  assets: [...segment.assets, createAsset(publisher.name)],
                })),
              })),
            })),
          },
        })),

      removeAsset: (phaseId, publisherId, segmentId, assetId) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: mapPublishers(phase.publishers, publisherId, (publisher) => ({
                ...publisher,
                segments: mapSegments(publisher.segments, segmentId, (segment) => ({
                  ...segment,
                  assets: segment.assets.filter((a) => a.id !== assetId),
                })),
              })),
            })),
          },
        })),

      updateAsset: (phaseId, publisherId, segmentId, assetId, patch) =>
        set((state) => ({
          document: {
            ...state.document,
            phases: mapPhases(state.document.phases, phaseId, (phase) => ({
              ...phase,
              publishers: mapPublishers(phase.publishers, publisherId, (publisher) => ({
                ...publisher,
                segments: mapSegments(publisher.segments, segmentId, (segment) => ({
                  ...segment,
                  assets: segment.assets.map((asset) =>
                    asset.id === assetId ? { ...asset, ...patch } : asset
                  ),
                })),
              })),
            })),
          },
        })),

      reset: () => set({ document: createDocument() }),
    }),
    {
      name: "ul-toolbox-dds-creator",
      version: 1,
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
export function useDdsStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useDdsStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useDdsStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return hydrated;
}
