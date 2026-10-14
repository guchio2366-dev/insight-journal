import { advancedSectors } from './advanced.ts';
import { energySectors } from './energy.ts';
import { metalsSectors } from './metals.ts';

export const sectors = [...advancedSectors, ...energySectors, ...metalsSectors];
export const checkedAt = '2026-10-14';
export const groups = [
  { id: 'advanced', label: '先端製造', ids: ['semiconductor', 'solar', 'battery'], purpose: '工程ごとの分業を見る', note: '設計・材料から製造へ。工程を選び、各工程の代表拠点を比べる。' },
  { id: 'energy', label: 'エネルギー', ids: ['gas', 'oil'], purpose: '産地と輸送・需要地を見る', note: '産地、液化・精製、受入・需要地。確認できた供給の実例を一つずつ重ねる。' },
  { id: 'metals', label: 'ベースメタル', ids: ['copper', 'steel'], purpose: '原料から加工・利用を見る', note: '鉱山・原料と製錬・製鉄、加工・需要地をたどる。鉱石と金属の数量は別に読む。' },
];
export const stageColors = ['#226d78', '#956322', '#705c9b', '#b64c39'];
