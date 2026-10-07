/** Product names and their mapped measures are deliberately separate. */
export const canadaAgricultureProducts = {
  canola: { name: 'カノーラ', measure: '申告面積', color: '#b38c16', shape: 'circle', kind: 'crop', primary: true },
  wheat: { name: '小麦', measure: '申告面積', color: '#287ba0', shape: 'square', kind: 'crop', primary: true },
  beef: { name: '肉牛', measure: '肉用母牛頭数', color: '#b35354', shape: 'diamond', kind: 'livestock', primary: true },
  dairy: { name: '乳・酪農', measure: '乳牛頭数', color: '#725aa0', shape: 'diamond', kind: 'livestock', primary: true },
  pork: { name: '豚', measure: '全国頭数に占める州比率', color: '#b26489', shape: 'diamond', kind: 'livestock', primary: true },
  chicken: { name: '鶏肉', measure: '生産者数', color: '#c3762f', shape: 'diamond', kind: 'livestock', primary: true },
  soybeans: { name: '大豆', measure: '申告面積', color: '#507b32', shape: 'circle', kind: 'crop', primary: true },
  corn: { name: 'とうもろこし', measure: '申告面積', color: '#bf741c', shape: 'square', kind: 'crop', primary: true },
  lentils: { name: 'レンズ豆', measure: '申告面積', color: '#a05327', shape: 'circle', kind: 'crop', primary: true },
  potatoes: { name: 'ばれいしょ', measure: '申告面積', color: '#79543d', shape: 'square', kind: 'crop', primary: true },
  hay: { name: '干草・栽培牧草', measure: '申告面積', color: '#387c5b', shape: 'triangle', kind: 'crop', primary: false },
  pasture: { name: '放牧地', measure: '申告面積', color: '#79643d', shape: 'pentagon', kind: 'land', primary: false },
} as const;

export type CanadaAgricultureIndicatorId = keyof typeof canadaAgricultureProducts;
export const canadaAgricultureProductOrder = Object.keys(canadaAgricultureProducts) as CanadaAgricultureIndicatorId[];

/** Small screen-space marks use a stable grid, never a wider row as products grow. */
export function canadaAgricultureSymbolOffset(index: number, count: number): [number, number] {
  const columns = count <= 5 ? count : 4;
  const rows = Math.ceil(count / columns);
  return [(index % columns - (columns - 1) / 2) * 11, (Math.floor(index / columns) - (rows - 1) / 2) * 11];
}

export function canadaAgricultureMarkerPath(shape: string) {
  if (shape === 'circle') return 'M4,0A4,4 0 1 1 -4,0A4,4 0 1 1 4,0';
  if (shape === 'square') return 'M-4,-4H4V4H-4Z';
  if (shape === 'triangle') return 'M0,-4L4,4H-4Z';
  if (shape === 'diamond') return 'M0,-4L4,0L0,4L-4,0Z';
  return 'M0,-4L4,-1L2.5,4H-2.5L-4,-1Z';
}
