import oceania from '../../../public/assets/atlas/oceania-physical-v1/manifest.json';
import russia from '../../../public/assets/atlas/russia-physical-v1/manifest.json';
import oceaniaRivers from '../../../public/assets/atlas/oceania-rivers-v1.json';
import russiaRivers from '../../../public/assets/atlas/russia-rivers-v1.json';

type Region = 'oceania' | 'russia';
const manifests = {oceania, russia};
const riverSources = {oceania: oceaniaRivers, russia: russiaRivers};
const riverNamesJa: Record<string, string> = {Volga:'ボルガ川',Ob:'オビ川',Yenisey:'エニセイ川',Lena:'レナ川',Amur:'アムール川',Murray:'マレー川',Darling:'ダーリング川',Waikato:'ワイカト川'};

export function regionalRiverLayer(region: Region) {
 const data = riverSources[region];
 return {
  id: 'rivers', field: 'nature' as const, title: '主要河川の位置', period: 'Natural Earth 1:50m v5.1.2',
  unit: '河川線・流向は示さない', kind: 'rivers' as const,
  legend: [{label: '収録した名称付き河川線', color: '#24658c'}],
  sources: [{title: 'Natural Earth, Rivers and Lake Centerlines 1:50m v5.1.2（Public domain）', url: data.sourceUrl,
   note: '原本の River 線のうち名称を確認した代表河川のみを表示。線の座標順から流向や河口を推定しません。'}],
  coverage: `${data.rivers.map(r => riverNamesJa[r.name]).join('、')}の原本河川線を国・地域の輪郭内に表示。主要河川の代表例で、全河川、流向・河口、流量、流域境界、地下水や利用可能水量は示しません。国境付近は輪郭で切り抜いています。`,
  resolution: 'Natural Earth 1:50m の線・代表例'
 };
}

const escapeRiver = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderRegionalRivers(region: Region, project: (position: number[]) => number[], clip: string, scale: number): string {
 return riverSources[region].rivers.map(river => {
  const paths = river.lines.map(line => line.map((point, i) => {const [x, y] = project(point);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join('')).join('');
  const [x, y] = project(river.labelPosition);
  return `<g data-river-name="${escapeRiver(river.name)}" role="button" tabindex="0" aria-label="${escapeRiver(riverNamesJa[river.name])}を読む" aria-pressed="false"><path d="${paths}" clip-path="url(#${clip})" fill="none" stroke="#24658c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"><title>${escapeRiver(riverNamesJa[river.name])}（${escapeRiver(river.name)}）：原本の河川中心線。流向は示しません。</title></path><path d="${paths}" clip-path="url(#${clip})" fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><text x="${x.toFixed(2)}" y="${(y-5*scale).toFixed(2)}" text-anchor="middle" font-size="${(13*scale).toFixed(2)}" fill="#164d6f" stroke="#fffefa" stroke-width="${(2.5*scale).toFixed(2)}" paint-order="stroke">${escapeRiver(riverNamesJa[river.name])}</text></g>`;
 }).join('');
}

export function physicalLayer(region: Region, type: 'precipitation' | 'elevation') {
 const manifest = manifests[region];
 const bounds = region === 'oceania' ? [110, -58, 250, 25] : [18, 40, 191, 83];
 if (type === 'precipitation') {
  const data = manifest.gpcc;
  return {
   id: 'precipitation', field: 'nature' as const, title: '年降水量と250 mm間隔の等雨量線',
   period: '1991–2020年の平年値', unit: 'mm／年', kind: 'raster' as const,
   image: `/assets/atlas/${region}-physical-v1/precipitation.png`, bounds,
   legend: data.colors.map((color, i) => ({color, label: i === 0 ? '0〜250 mm未満' : i === data.colors.length - 1 ? '4,000 mm以上' : `${i * 250}〜${(i + 1) * 250} mm未満`})),
   sources: [{title: `${data.citation}（CC BY 4.0、原本から加工）`, url: data.sourceUrl, note: '12か月の平年値を合計。線は元0.25°格子から250 mm刻みで補間。'}],
   coverage: '1991–2020年の月別平年値12か月を合計した年降水量。青が濃いほど多雨です。線は250 mm間隔で、雨量観測点や河川・利用可能な水量を示しません。欠測セルは推定せず、国境で切り抜いています。',
   resolution: '原本0.25°格子・等雨量線は補間'
  };
 }
 const data = manifest.etopo;
 return {
  id: 'elevation', field: 'nature' as const, title: '地形の標高と500 m間隔の等高線',
  period: 'ETOPO 2022年版', unit: 'm（海抜）', kind: 'raster' as const,
  image: `/assets/atlas/${region}-physical-v1/elevation.png`, bounds,
  legend: data.colors.map((color, i) => ({color, label: i === 0 ? '0 m未満' : i === data.colors.length - 1 ? '6,000 m以上' : `${(i - 1) * 500}〜${i * 500} m未満`})),
  sources: [{title: 'NOAA NCEI, ETOPO 2022 60″ surface elevation（米国政府公開資料、原本から加工）', url: data.sourceUrl, note: '陸上標高を500 m階級で塗り分け、等高線は元60秒格子から補間。'}],
  coverage: '標高のある陸域を海抜500 mごとの段階色で表示します。線は500 m間隔の等高線です。海底深度、山頂の厳密な高さ、地形の名称や地質を示しません。表示画像は元60秒格子を縮小したものです。',
  resolution: '元60秒格子・表示画像は縮小'
 };
}
