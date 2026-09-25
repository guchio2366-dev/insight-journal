export type LatinField = 'nature' | 'agriculture' | 'industry' | 'population';
export interface LatinSource { label: string; url: string; period?: string }
export interface LatinStatistic { label: string; value: number; unit: string; year: string; scope: string; sourceUrl: string }
export interface LatinTopic {
  id: string;
  field: LatinField;
  title: string;
  label: string;
  summary: string;
  countries: string[];
  location: [number, number];
  extent: [number, number, number, number];
  placeLabel: string;
  sections: { title: string; body: string }[];
  relatedIds: string[];
  sources: LatinSource[];
  stats?: LatinStatistic[];
}
export interface LatinClimateCity {
  id: string; name: string; countryCode: string; longitude: number; latitude: number;
  temperatureC: (number|null)[]; precipitationMm: (number|null)[];
  period: string; stationName: string; stationId: string; elevationM?: number;
  summary: string; sourceUrl: string; sourceName: string;
}
