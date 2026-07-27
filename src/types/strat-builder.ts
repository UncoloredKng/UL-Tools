/**
 * Modèle de données du "Strat Builder".
 *
 * Un document de stratégie est composé :
 *  - d'une liste de blocs modulaires (ajoutables / retirables à la volée),
 *    chacun avec une zone de notes en texte riche + un corps spécifique au type ;
 *  - d'une timeline (grille type Gantt) pour ébaucher le plan média.
 */

/**
 * Indicateur de statut à 3 niveaux, réutilisé dans plusieurs blocs.
 * Le sens (label) dépend du contexte, mais la couleur reste cohérente :
 *  - "todo"  → rouge/orange (à construire / non validé)
 *  - "wip"   → jaune (réflexion / partiellement validé)
 *  - "done"  → vert (validé)
 */
export type StatusLevel = "todo" | "wip" | "done";

export const STATUS_ORDER: StatusLevel[] = ["todo", "wip", "done"];

export interface StatusMeta {
  dot: string;
  label: string;
}

/** Libellés du statut dans le contexte "Audiences". */
export const AUDIENCE_STATUS: Record<StatusLevel, StatusMeta> = {
  todo: { dot: "bg-danger", label: "À construire" },
  wip: { dot: "bg-amber-400", label: "Réflexion" },
  done: { dot: "bg-accent", label: "Validé" },
};

/**
 * Statut à 4 niveaux propre aux objectifs (ajoute "réflexion" entre
 * "non validé" et "partiellement validé").
 */
export type ObjectiveStatus = "todo" | "reflection" | "wip" | "done";

export const OBJECTIVE_STATUS_ORDER: ObjectiveStatus[] = [
  "todo",
  "reflection",
  "wip",
  "done",
];

/** Libellés du statut dans le contexte "Objectifs". */
export const OBJECTIVE_STATUS: Record<ObjectiveStatus, StatusMeta> = {
  todo: { dot: "bg-danger", label: "Non validé" },
  reflection: { dot: "bg-sky-400", label: "Réflexion" },
  wip: { dot: "bg-amber-400", label: "Partiellement validé" },
  done: { dot: "bg-accent", label: "Validé à 100%" },
};

// --- Blocs -----------------------------------------------------------------

export type BlockType = "platform-audience" | "objectives" | "assets";

export interface BlockMeta {
  label: string;
  description: string;
}

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  "platform-audience": {
    label: "Plateformes / Audiences",
    description: "Plateformes à activer et audiences par plateforme.",
  },
  objectives: {
    label: "Objectifs",
    description: "Objectifs détaillés de la campagne et suivi de validation.",
  },
  assets: {
    label: "Assets",
    description: "Inventaire et recommandations d'assets créatifs.",
  },
};

interface BaseBlock {
  id: string;
  type: BlockType;
  title: string;
  /** Notes libres au format HTML (éditeur riche). */
  notes: string;
  /** Bloc replié (corps masqué) pour gagner de la place. */
  collapsed: boolean;
}

// Plateformes / Audiences

export interface Audience {
  id: string;
  name: string;
  potential: string;
  status: StatusLevel;
}

export interface Platform {
  id: string;
  name: string;
  audiences: Audience[];
}

export interface PlatformAudienceBlock extends BaseBlock {
  type: "platform-audience";
  platforms: Platform[];
}

// Objectifs

export interface Objective {
  id: string;
  goal: string;
  /** Comment on compte répondre à cet objectif. */
  approach: string;
  status: ObjectiveStatus;
}

export interface ObjectivesBlock extends BaseBlock {
  type: "objectives";
  objectives: Objective[];
}

// Assets

export interface Asset {
  id: string;
  name: string;
  assetType: string;
  /** Durée facultative (ex. "15s", "6s"). Vide si non applicable. */
  duration: string;
  /** true = asset recommandé à faire valider par le client. */
  recommended: boolean;
}

/**
 * Groupe de créas correspondant à un adset / ciblage dédié
 * (ex. "Creator", "Brand"). Permet d'organiser les assets en blocs distincts
 * et d'assigner chaque créa à son adset.
 */
export interface AssetGroup {
  id: string;
  name: string;
  assets: Asset[];
}

export interface AssetsBlock extends BaseBlock {
  type: "assets";
  groups: AssetGroup[];
}

export type StratBlock =
  | PlatformAudienceBlock
  | ObjectivesBlock
  | AssetsBlock;

// --- Timeline --------------------------------------------------------------

export interface TimelineItem {
  id: string;
  label: string;
  /** Sous-titre / mini-description de la ligne. */
  description: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  platforms: string[];
  audiences: string[];
  assets: string[];
  budget: string;
  /**
   * true = budget global sur la ligne (Smartbidding).
   * false = un budget par audience (voir `audienceBudgets`).
   */
  smartbidding: boolean;
  /** Budget par audience (clé = nom d'audience) quand Smartbidding est off. */
  audienceBudgets: Record<string, string>;
  /** Couleur d'accent de la barre (classe de fond Tailwind). */
  color: string;
}

export interface Timeline {
  startDate: string;
  endDate: string;
  items: TimelineItem[];
}

/** Palette de couleurs disponibles pour les barres de timeline. */
export const TIMELINE_COLORS = [
  "bg-accent",
  "bg-sky-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-teal-400",
] as const;

// --- Document --------------------------------------------------------------

export interface StratDocument {
  name: string;
  blocks: StratBlock[];
  timeline: Timeline;
}

// --- Suggestions -----------------------------------------------------------

export const PLATFORM_SUGGESTIONS = [
  "META",
  "TikTok",
  "Snapchat",
  "Pinterest",
  "YouTube",
  "LinkedIn",
  "X (Twitter)",
  "Reddit",
] as const;

export const ASSET_TYPES = [
  "Fixe",
  "Vidéo",
  "Carrousel",
  "Collection",
  "Story",
  "GIF / Animé",
  "UGC / Créateur",
] as const;
