import { religions, missingColor } from '../data/atlas/population.ts';
import { populationColor } from './atlas-population-data.ts';

// A bounded result preserves the publisher's interval; it is never replaced by a midpoint.
export type ReligiousShare =
  | { status: 'value'; value: number }
  | { status: 'bounded'; lower: number; upper: number; upperExclusive: boolean }
  | { status: 'missing' | 'suppressed'; reason: string };
export type ReligiousRow = { id: string; shares: Record<string, ReligiousShare> };
export type ReligionData = {
  version: 1;
  period: '2023–2024';
  universe: 'adults';
  source: { url: string; title: string; copyright: string };
  national: Record<string, ReligiousShare>;
  rows: ReligiousRow[];
};
export const religionDominantColors: Record<string, string> = {
  catholic: '#9b4f67',
  southern_baptist: '#d47a3e',
  mainline_protestant: '#4f8067',
  nondenominational: '#d5ad42',
  other_conservative_protestant: '#9d6550',
  latter_day_saints: '#626aa3',
  black_protestant: '#345b78',
  other: '#8b6d9d',
  unreported: missingColor,
};
export type ReligionDominantRow = {id: string; category: string; group: string | null};
export type ReligionDominantData = {
  version: 1;
  year: 2020;
  universe: 'congregation-linked adherents';
  geography: string;
  source: {url: string; title: string; citation: string};
  categories: {id: string; label: string; count: number}[];
  rows: ReligionDominantRow[];
};
export function validateReligionDominantData(data: any): data is ReligionDominantData {
  const ids = Object.keys(religionDominantColors);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const rowIds = rows.map((row: any) => row.id);
  const counts = new Map(ids.map(id => [id, 0]));
  for (const row of rows) if (ids.includes(row?.category)) counts.set(row.category, counts.get(row.category)! + 1);
  return data?.version === 1 && data.year === 2020 && data.universe === 'congregation-linked adherents'
    && typeof data.geography === 'string' && data.source?.url === 'https://www.usreligioncensus.org/node/1639'
    && rows.length === 3108 && new Set(rowIds).size === rows.length
    && rows.every((row: any) => /^county:\d{5}$/.test(row?.id) && ids.includes(row.category)
      && (row.category === 'unreported' ? row.group === null : typeof row.group === 'string' && row.group.length > 0))
    && categories.length === ids.length && new Set(categories.map((item: any) => item.id)).size === ids.length
    && categories.every((item: any) => ids.includes(item.id) && typeof item.label === 'string'
      && Number.isInteger(item.count) && item.count === counts.get(item.id));
}
export function validReligiousShare(value: unknown): value is ReligiousShare {
  if (!value || typeof value !== 'object') return false;
  const v = value as any;
  const percentage = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
  if (v.status === 'value') return percentage(v.value);
  if (v.status === 'bounded') return percentage(v.lower) && percentage(v.upper) && v.lower < v.upper && typeof v.upperExclusive === 'boolean';
  return ['missing', 'suppressed'].includes(v.status) && typeof v.reason === 'string' && v.reason.length > 0;
}
export function validateReligionData(data: any): data is ReligionData {
  const shares = (value: any) => value && Object.keys(value).length === religions.length && religions.every(([id]) => validReligiousShare(value[id]));
  const states = new Set(['01','02','04','05','06','08','09','10','11','12','13','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','44','45','46','47','48','49','50','51','53','54','55','56']);
  return data?.version === 1 && data.period === '2023–2024' && data.universe === 'adults'
    && typeof data.source?.url === 'string' && data.source.url.startsWith('https://www.pewresearch.org/')
    && typeof data.source.title === 'string' && typeof data.source.copyright === 'string'
    && shares(data.national) && Array.isArray(data.rows)
    && new Set(data.rows.map((r: any) => r.id)).size === data.rows.length
    && data.rows.every((r: any) => typeof r.id === 'string' && r.id.startsWith('state:') && states.has(r.id.slice(6)) && shares(r.shares));
}
export function religiousShareLabel(share?: ReligiousShare): string {
  if (!share || share.status === 'missing') return '未取得';
  if (share.status === 'suppressed') return '非公表';
  if (share.status === 'value') return `${share.value.toLocaleString('ja-JP')}%`;
  if (share.lower === 0 && share.upperExclusive) return `${share.upper}%未満`;
  return `${share.lower}%以上・${share.upper}%${share.upperExclusive ? '未満' : '以下'}`;
}
export function religiousShareColor(share?: ReligiousShare): string {
  if (!share || share.status === 'missing' || share.status === 'suppressed') return missingColor;
  if (share.status === 'value') return populationColor(share.value, 'religion');
  // Includes zero when the source says <1: zero and >0 occupy different bins.
  const upper = share.upperExclusive ? share.upper - Number.EPSILON * Math.max(1, share.upper) : share.upper;
  const lowColor = populationColor(share.lower, 'religion');
  return lowColor === populationColor(upper, 'religion') ? lowColor : missingColor;
}
