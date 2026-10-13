import data from '../data/atlas/europe/main-language-ts024-2021.json' with { type: 'json' };
import type { CultureGeometry } from './atlas-europe-population-cases.ts';

export const europeMainLanguage = data;
export type EuropeLanguageChoice = { languageCategory?: string; languageArea?: string };
export const europeLanguageColors = ['#e8f2f2', '#bddcd9', '#80bdb4', '#418f91', '#176279'] as const;
export const europeLanguageDefault = 'other';
const areaByCode = new Map(data.areas.map(area => [area.code, area]));

export function normaliseEuropeLanguageChoice(input: EuropeLanguageChoice | URLSearchParams): EuropeLanguageChoice {
  const get = (key: 'languageCategory' | 'languageArea') => input instanceof URLSearchParams ? input.get(key) : input[key];
  const category = data.categories.find(item => item.id === get('languageCategory'));
  const area = areaByCode.get(get('languageArea') ?? '');
  return { languageCategory: category?.id ?? europeLanguageDefault, ...(area ? { languageArea: area.code } : {}) };
}
export function europeLanguageReading(choice: EuropeLanguageChoice) {
  const state = normaliseEuropeLanguageChoice(choice);
  const categoryIndex = data.categories.findIndex(item => item.id === state.languageCategory);
  const category = data.categories[categoryIndex];
  const area = areaByCode.get(state.languageArea ?? '');
  const count = area ? area.counts[categoryIndex] : null;
  const share = area && count !== null ? count / area.denominator * 100 : null;
  return { category, area, count, share };
}
export function europeLanguageBreaks(categoryId: string) {
  return categoryId === europeLanguageDefault ? [2, 5, 10, 20] : [0.1, 0.5, 1, 3];
}
export function europeLanguageColor(share: number | null, categoryId: string): string {
  if (share === null || !Number.isFinite(share)) return '#b8bec7';
  const breaks = europeLanguageBreaks(categoryId);
  return europeLanguageColors[breaks.findIndex(value => share < value) < 0 ? 4 : breaks.findIndex(value => share < value)];
}
export function europeLanguageMapData(geometry: CultureGeometry, choice: EuropeLanguageChoice) {
  const state = normaliseEuropeLanguageChoice(choice);
  const categoryIndex = data.categories.findIndex(item => item.id === state.languageCategory);
  return { type: 'FeatureCollection' as const, features: geometry.features.map(feature => {
    const area = areaByCode.get(feature.properties.code);
    const count = area?.counts[categoryIndex] ?? null;
    const share = area && count !== null ? count / area.denominator * 100 : null;
    return { type: 'Feature' as const, id: feature.properties.code, geometry: feature.geometry, properties: {
      code: feature.properties.code, name: area?.name ?? feature.properties.name ?? feature.properties.code,
      count, denominator: area?.denominator ?? null, share,
      fill: europeLanguageColor(share, state.languageCategory!), selected: feature.properties.code === state.languageArea,
    } };
  }) };
}
