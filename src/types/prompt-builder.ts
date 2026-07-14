export interface KpiWeights {
  awareness: number;
  videoViews: number;
  engagement: number;
  traffic: number;
}

export type ReportMode = "lancement" | "run" | "bilan";

/**
 * Représentation structurée d'une cellule collée depuis Excel/Google Sheets
 * (issue du parsing du `text/html` du presse-papiers). Ne conserve que ce
 * qui est nécessaire pour reconstituer visuellement la hiérarchie du
 * tableau source : fusions de cellules, mise en gras et alignement.
 */
export interface ExcelCell {
  text: string;
  colSpan: number;
  rowSpan: number;
  bold: boolean;
  align: "left" | "center" | "right" | null;
}

export interface ExcelTable {
  rows: ExcelCell[][];
}

export interface WeekDraft {
  weekLabel: string;
  mode: ReportMode;
  oldComments: string;
  contexteGlobal: string;
  contexteCrea: string;
  tcdData: string;
  tcdTable: ExcelTable | null;
  bddData: string;
  bddTable: ExcelTable | null;
  benchmarks: string;
  benchmarksTable: ExcelTable | null;
  contexteAutre: string;
  useKpiWeighting: boolean;
  kpiWeights: KpiWeights;
}

export interface HistoryEntry {
  id: string;
  weekLabel: string;
  validatedAt: number;
  mode: ReportMode;
  oldComments: string;
  contexteGlobal: string;
  contexteCrea: string;
  tcdData: string;
  bddData: string;
  benchmarks: string;
  contexteAutre: string;
  useKpiWeighting: boolean;
  kpiWeights: KpiWeights;
  generatedPrompt: string;
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: number;
  draft: WeekDraft;
  history: HistoryEntry[];
}

export const DEFAULT_KPI_WEIGHTS: KpiWeights = {
  awareness: 5,
  videoViews: 5,
  engagement: 5,
  traffic: 5,
};

export const DEFAULT_REPORT_MODE: ReportMode = "run";

export const EMPTY_DRAFT: WeekDraft = {
  weekLabel: "",
  mode: DEFAULT_REPORT_MODE,
  oldComments: "",
  contexteGlobal: "",
  contexteCrea: "",
  tcdData: "",
  tcdTable: null,
  bddData: "",
  bddTable: null,
  benchmarks: "",
  benchmarksTable: null,
  contexteAutre: "",
  useKpiWeighting: false,
  kpiWeights: { ...DEFAULT_KPI_WEIGHTS },
};
