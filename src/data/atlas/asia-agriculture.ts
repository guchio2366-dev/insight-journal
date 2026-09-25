import manifest from '../../../public/assets/atlas/asia-agriculture-v1/manifest.json';

export type AsiaRiceRegionId = 'east-asia' | 'southeast-asia' | 'south-central-asia';
export type AsiaRiceGrid = {
  schemaVersion: 1;
  regionId: AsiaRiceRegionId;
  bounds: [number, number, number, number];
  width: number;
  height: number;
  cellSize: number;
  units: 'ha';
  year: 2020;
  order: 'row-major-north-to-south';
  positiveCells: [number, number][];
  validRuns: [number, number][];
};
export const asiaRiceManifest = manifest;
export const asiaRiceLayers = manifest.regions;
export const asiaRiceLegend = [
  { min: 1, label: '1–10ha未満', color: '#d9f0a3' },
  { min: 10, label: '10–100ha未満', color: '#addd8e' },
  { min: 100, label: '100–1,000ha未満', color: '#78c679' },
  { min: 1000, label: '1,000–5,000ha未満', color: '#31a354' },
  { min: 5000, label: '5,000ha以上', color: '#006837' },
];

export const asiaRiceSources = [
  { id: 'mapspam', label: 'IFPRI MapSPAM 2020 v2r2 / CGIAR Climate Action Data Hub', href: 'https://cgiar-climate-data-hub.github.io/catalog/spam2020/' },
  { id: 'water', label: 'IRRI：稲作の水管理', href: 'https://ricetoday.irri.org/how-much-water-does-rice-use/' },
  { id: 'area', label: 'FAO：収穫面積と複数回の作付け', href: 'https://www.fao.org/4/a0135e/A0135E07.htm' },
];

export const asiaRiceReading = {
  title: '米の分布を、雨の季節と水の確保から読む',
  definition: '収穫面積は、その年に収穫した作付けの面積。同じ1haの田で米を2回作れば、収穫面積は2haとなる。地図の色は5分格子ごとの収穫面積で、水田が土地を占める割合や収量ではない。',
  relationship: '稲作では作物が必要とする水を、雨や灌漑（川・貯水池・地下水などから農地へ水を供給すること）で確保する。雨温図では降水量の多い月と少ない月を読み、分布図と比べる。雨温図だけで、その場所の灌漑の有無や作付け回数は判定できない。',
  caveat: '2020年を基準とするモデル推計。国・地域の統計と土地条件を使って作物を格子へ配分したもので、個々の水田を直接観測した地図ではない。色のない場所には1ha未満・0・データなしが含まれる。',
  scaleNote: '1格子は緯度・経度それぞれ5分（1/12度）。南北約9km、東西の幅は緯度で変わる。色の単位はha/格子で、面積当たりの密度ではない。',
  attribution: 'IFPRI (2026), MapSPAM 2020 v2r2, DOI:10.7910/DVN/SWPENT. CGIAR Climate Action Data Hub経由。抽出・地域マスク・色分け：Insight Journal。農業の派生データ・画像はCC BY-SA 4.0。',
};

export const asiaRiceRegionNotes: Record<AsiaRiceRegionId, { takeaway: string; reading: string; sources: string[] }> = {
  'east-asia': {
    takeaway: '南北に離れた米の生産地を、夏の気温と水の季節から比べる。',
    reading: 'この推計図では中国東部・南部だけでなく、東北部、日本、朝鮮半島にも米の分布が見える。まず同じ凡例で分布のまとまりを探し、近くの都市の雨温図と比べる。冬の寒さが強い地域にも分布があるため、年間平均だけでなく生育期に当たる季節へ目を向ける。',
    sources: ['mapspam', 'water'],
  },
  'southeast-asia': {
    takeaway: '大陸部と島々の稲作を、雨季・乾季と合わせて読む。',
    reading: 'この推計図では大陸部の平野から島嶼部まで米の分布が見える。雨温図で雨の季節性を比べ、降水だけで足りない時期をどう補うか考える。収穫面積には複数回の作付けも数えるため、色の濃さをそのまま水田の土地面積と読み替えない。',
    sources: ['mapspam', 'water', 'area'],
  },
  'south-central-asia': {
    takeaway: '広い生産域と局地的な分布を、水の確保から比べる。',
    reading: 'この推計図では南アジアの広い分布域と、中央アジアの局地的な分布を比べられる。雨の少ない地域でも水を確保すれば稲作は成り立つため、気候区分だけで作物の有無を決めない。地図は灌漑・天水の合計で、両者の内訳は表示していない。',
    sources: ['mapspam', 'water'],
  },
};

/** Boundaries are [west, south, east, north]; north/west inclusive. */
export function readAsiaRiceCell(grid: AsiaRiceGrid, lng: number, lat: number):
  | { status: 'outside' | 'nodata'; harvestedHa: null }
  | { status: 'value'; harvestedHa: number; index: number; coordinates: [number, number] } {
  const [west, south, east, north] = grid.bounds;
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < west || lng >= east || lat <= south || lat > north) {
    return { status: 'outside', harvestedHa: null };
  }
  const col = Math.floor((lng-west)/grid.cellSize);
  const row = Math.floor((north-lat)/grid.cellSize);
  if (col < 0 || row < 0 || col >= grid.width || row >= grid.height) return { status: 'outside', harvestedHa: null };
  const index = row*grid.width+col;
  let low = 0, high = grid.validRuns.length-1, valid = false;
  while (low <= high) {
    const mid = (low+high) >>> 1;
    const [start, length] = grid.validRuns[mid];
    if (index < start) high = mid-1;
    else if (index >= start+length) low = mid+1;
    else { valid = true; break; }
  }
  if (!valid) return { status: 'nodata', harvestedHa: null };
  low = 0; high = grid.positiveCells.length-1;
  let harvestedHa = 0;
  while (low <= high) {
    const mid = (low+high) >>> 1;
    const [id, value] = grid.positiveCells[mid];
    if (index < id) high = mid-1;
    else if (index > id) low = mid+1;
    else { harvestedHa = value; break; }
  }
  return { status: 'value', harvestedHa, index, coordinates: [west+(col+.5)*grid.cellSize, north-(row+.5)*grid.cellSize] };
}

export function getAsiaRiceLayer(regionId: string) {
  return asiaRiceLayers.find(layer => layer.regionId === regionId);
}
