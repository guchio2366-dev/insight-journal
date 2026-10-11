import oceania from '../../../public/assets/atlas/oceania-physical-v1/manifest.json';
import russia from '../../../public/assets/atlas/russia-physical-v1/manifest.json';

type Region = 'oceania' | 'russia';
const manifests = {oceania, russia};

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
