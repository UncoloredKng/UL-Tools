/**
 * Modèle de données du "Doc de Structure" (DDS).
 *
 * Hiérarchie : Document → Phases (funnel) → Publishers → Segments (audiences)
 * → Assets. Chaque asset correspond à une ligne du tableau final.
 */

export interface DdsAsset {
  id: string;
  assetType: string;
  assetName: string;
  device: string;
  link: string;
  adCopy: string;
  cta: string;
  title: string;
  titleRule: string;
  descriptionLinkAd: string;
  descriptionRule: string;
  format: string;
  specName: string;
  specIndications: string;
  fileName: string;
  sizmekLink: string;
  assetId: string;
  redirectionDevice: string;
  redirectionUrl: string;
}

export interface DdsSegment {
  id: string;
  name: string;
  assets: DdsAsset[];
}

export interface DdsPublisher {
  id: string;
  name: string;
  segments: DdsSegment[];
}

export interface DdsPhase {
  id: string;
  funnel: string;
  publishers: DdsPublisher[];
}

export interface DdsDocument {
  campaignName: string;
  campaignId: string;
  advertiser: string;
  agency: string;
  phases: DdsPhase[];
}

/**
 * Configuration par régie : valeurs par défaut pré-remplies dans le formulaire
 * en fonction du publisher sélectionné (devices disponibles, règles de wording,
 * format...).
 */
export interface PublisherConfig {
  devices: string[];
  defaultDevice: string;
  defaultFormat: string;
  titleRule: string;
  descriptionRule: string;
  specIndications: string;
}

export const PUBLISHERS = [
  "Meta",
  "TikTok",
  "Snapchat",
  "Pinterest",
  "LinkedIn",
  "Youtube",
  "X (Twitter)",
  "Reddit",
] as const;

export type PublisherName = (typeof PUBLISHERS)[number];

const GENERIC_CONFIG: PublisherConfig = {
  devices: ["Mobile & Desktop", "Mobile", "Desktop"],
  defaultDevice: "Mobile & Desktop",
  defaultFormat: "Vidéo Ad",
  titleRule: "",
  descriptionRule: "",
  specIndications: "",
};

export const PUBLISHER_CONFIG: Record<string, PublisherConfig> = {
  Meta: {
    devices: ["Mobile & Desktop", "Mobile", "Desktop"],
    defaultDevice: "Mobile & Desktop",
    defaultFormat: "Vidéo Ad",
    titleRule: "Max 40 characters",
    descriptionRule:
      "Recommendation up to 125 characters, more than 125 characters is possible but they will be hidden in first step",
    specIndications: "",
  },
  TikTok: {
    devices: ["Mobile & Desktop", "Mobile"],
    defaultDevice: "Mobile & Desktop",
    defaultFormat: "Vidéo Ad",
    titleRule: "",
    descriptionRule: "Max 100 characters, NO Emojis, NO #",
    specIndications: "",
  },
  Snapchat: {
    devices: ["Mobile"],
    defaultDevice: "Mobile",
    defaultFormat: "Vidéo Ad",
    titleRule: "Max 34 characters (Brand name + Headline)",
    descriptionRule: "",
    specIndications: "",
  },
  Pinterest: {
    devices: ["Mobile & Desktop", "Mobile", "Desktop"],
    defaultDevice: "Mobile & Desktop",
    defaultFormat: "Vidéo Ad",
    titleRule: "Max 100 characters",
    descriptionRule: "Max 500 characters",
    specIndications: "",
  },
  LinkedIn: {
    devices: ["Mobile & Desktop", "Mobile", "Desktop"],
    defaultDevice: "Mobile & Desktop",
    defaultFormat: "Vidéo Ad",
    titleRule: "Max 70 characters (headline)",
    descriptionRule: "Intro text up to 150 characters recommended",
    specIndications: "",
  },
  Youtube: {
    devices: ["CTV", "Desktop", "Mobile"],
    defaultDevice: "CTV",
    defaultFormat: "Vidéo Ad",
    titleRule: "",
    descriptionRule: "",
    specIndications: "",
  },
  "X (Twitter)": {
    devices: ["Mobile & Desktop", "Mobile", "Desktop"],
    defaultDevice: "Mobile & Desktop",
    defaultFormat: "Vidéo Ad",
    titleRule: "Max 70 characters",
    descriptionRule: "Max 280 characters",
    specIndications: "",
  },
  Reddit: {
    devices: ["Mobile & Desktop", "Mobile", "Desktop"],
    defaultDevice: "Mobile & Desktop",
    defaultFormat: "Vidéo Ad",
    titleRule: "Max 300 characters",
    descriptionRule: "",
    specIndications: "",
  },
};

export function getPublisherConfig(publisher: string): PublisherConfig {
  return PUBLISHER_CONFIG[publisher] ?? GENERIC_CONFIG;
}

export const FUNNEL_SUGGESTIONS = [
  "Awareness",
  "Consideration",
  "Conversion",
] as const;

/**
 * Colonnes du "Doc de structure", dans l'ordre exact du modèle Excel de
 * référence. Le groupe `main` correspond au brief créa/wording, le groupe
 * `specs` au bloc de spécifications techniques situé à droite.
 */
export interface DdsColumn {
  key: keyof DdsRow;
  header: string;
  group: "main" | "specs";
  width: number;
}

export interface DdsRow {
  funnel: string;
  publisher: string;
  segment: string;
  assetType: string;
  assetName: string;
  device: string;
  link: string;
  adCopy: string;
  cta: string;
  title: string;
  titleRule: string;
  titleChars: number | "";
  descriptionLinkAd: string;
  descriptionRule: string;
  descriptionChars: number | "";
  specPublisher: string;
  format: string;
  specName: string;
  specIndications: string;
  fileName: string;
  sizmekLink: string;
  assetId: string;
  redirectionDevice: string;
  redirectionUrl: string;
}

export const DDS_COLUMNS: DdsColumn[] = [
  { key: "funnel", header: "FUNNEL", group: "main", width: 16 },
  { key: "publisher", header: "PUBLISHER", group: "main", width: 14 },
  { key: "segment", header: "SEGMENT", group: "main", width: 40 },
  { key: "assetType", header: "ASSET TYPE", group: "main", width: 22 },
  { key: "assetName", header: "ASSET NAME", group: "main", width: 18 },
  { key: "device", header: "DEVICE", group: "main", width: 16 },
  { key: "link", header: "LINK", group: "main", width: 40 },
  { key: "adCopy", header: "AD COPY (cf onglets par média)", group: "main", width: 40 },
  { key: "cta", header: "CTA", group: "main", width: 14 },
  { key: "title", header: "Title", group: "main", width: 24 },
  { key: "titleRule", header: "Title rule", group: "main", width: 22 },
  { key: "titleChars", header: "Number of characters, space include", group: "main", width: 14 },
  { key: "descriptionLinkAd", header: "Description Link AD", group: "main", width: 40 },
  { key: "descriptionRule", header: "Description rule", group: "main", width: 40 },
  { key: "descriptionChars", header: "Number of characters, space include", group: "main", width: 14 },
  { key: "specPublisher", header: "PUBLISHER", group: "specs", width: 14 },
  { key: "format", header: "FORMAT", group: "specs", width: 14 },
  { key: "specName", header: "NOM SPEC", group: "specs", width: 20 },
  { key: "specIndications", header: "SPECS indications (see detailed doc)", group: "specs", width: 40 },
  { key: "fileName", header: "File name", group: "specs", width: 26 },
  { key: "sizmekLink", header: "Liens Sizmek (ou URL Youtube)", group: "specs", width: 40 },
  { key: "assetId", header: "Asset ID", group: "specs", width: 16 },
  {
    key: "redirectionDevice",
    header: "REDIRECTION FOR DESKTOP/MOBILE/TABLET ONLY",
    group: "specs",
    width: 22,
  },
  { key: "redirectionUrl", header: "URL de redirection", group: "specs", width: 40 },
];
