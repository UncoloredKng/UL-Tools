export type AdPlatform = "Meta" | "TikTok" | "Snapchat" | "Pinterest" | "Inconnue";

export interface TrackingSourceRow {
  placementId: string;
  placementName: string;
  platform: AdPlatform;
  flashtalkingImpressionUrl: string;
  flashtalkingClickUrl: string;
  nielsenImpressionUrl: string;
  nielsenClickUrl: string;
}

export interface TrackingExportRow {
  "Placement ID": string;
  "Régie": AdPlatform;
  "Nom_Adset/Ad": string;
  "URL Clic Flashtalking": string;
  "URL Impression Flashtalking": string;
  "URL Impression Nielsen": string;
  "URL Clic Nielsen": string;
}

export interface TrackingParseResult {
  rows: TrackingExportRow[];
  sourceRows: TrackingSourceRow[];
  warnings: string[];
}
