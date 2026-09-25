import geography from './regional-countries.json';

export type RegionalId = 'east-asia' | 'southeast-asia' | 'south-central-asia' | 'latin-america' | 'canada' | 'mexico';
export type AtlasGroup = 'asia' | 'americas';
export type CountryFeature = {
  properties: { code: string; name: string; region: string; subregion: string };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
};
export const features = geography.features as CountryFeature[];
export const regionalMaps: Record<RegionalId, { label: string; group: AtlasGroup; href: string; description: string; latitude: number; color: string }> = {
  'east-asia': { label: '東アジア', group: 'asia', href: '/atlas/asia/east-asia/', description: '日本・中国・朝鮮半島・台湾・モンゴルの位置関係を読む。', latitude: 35, color: '#94b8b8' },
  'southeast-asia': { label: '東南アジア', group: 'asia', href: '/atlas/asia/southeast-asia/', description: 'インドシナ半島から島々へ、11か国の位置関係を読む。', latitude: 10, color: '#a9bd8b' },
  'south-central-asia': { label: '南・中央アジア', group: 'asia', href: '/atlas/asia/south-central-asia/', description: 'インド周辺から中央アジアへ、海と内陸をつなげて読む。', latitude: 27, color: '#d1b176' },
  'latin-america': { label: '中南米', group: 'americas', href: '/atlas/latin-america/', description: '中米・カリブ・南米の国と地域の位置関係を読む。', latitude: -12, color: '#a9bd8b' },
  canada: { label: 'カナダ', group: 'americas', href: '/atlas/north-america/canada/', description: '北米北部に広がるカナダと周辺の位置関係を読む。', latitude: 58, color: '#94b8b8' },
  mexico: { label: 'メキシコ', group: 'americas', href: '/atlas/north-america/mexico/', description: '太平洋とメキシコ湾に面する国の位置関係を読む。', latitude: 24, color: '#d1b176' }
};
export const asiaMapIds: RegionalId[] = ['east-asia', 'southeast-asia', 'south-central-asia'];
export const americaLinks = [
  { id: 'north-america', label: '北米', href: '/atlas/north-america/' },
  { id: 'latin-america', label: '中南米', href: '/atlas/latin-america/' }
];
export const northAmericaLinks = [
  { id: 'canada', label: 'カナダ', href: regionalMaps.canada.href },
  { id: 'usa', label: '米国', href: '/atlas/north-america/' },
  { id: 'mexico', label: 'メキシコ', href: regionalMaps.mexico.href }
];
export function belongsToRegion(feature: CountryFeature, regionId: RegionalId): boolean {
  const {code, subregion, region} = feature.properties;
  if (regionId === 'canada') return code === 'CAN';
  if (regionId === 'mexico') return code === 'MEX';
  if (regionId === 'east-asia') return subregion === 'Eastern Asia';
  if (regionId === 'southeast-asia') return subregion === 'South-Eastern Asia';
  if (regionId === 'south-central-asia') return ['Southern Asia', 'Central Asia'].includes(subregion) && code !== 'IRN';
  return (region === 'South America' || ['Central America', 'Caribbean'].includes(subregion)) && code !== 'MEX';
}
export const japaneseNames: Record<string, string> = {
  AFG:'アフガニスタン', BGD:'バングラデシュ', BRN:'ブルネイ', BTN:'ブータン', CHN:'中国', IDN:'インドネシア', IND:'インド', JPN:'日本', KAZ:'カザフスタン', KGZ:'キルギス', KHM:'カンボジア', KOR:'韓国', LAO:'ラオス', LKA:'スリランカ', MDV:'モルディブ', MMR:'ミャンマー', MNG:'モンゴル', MYS:'マレーシア', NPL:'ネパール', PAK:'パキスタン', PHL:'フィリピン', PRK:'北朝鮮', SGP:'シンガポール', THA:'タイ', TJK:'タジキスタン', TLS:'東ティモール', TKM:'トルクメニスタン', TWN:'台湾', UZB:'ウズベキスタン', VNM:'ベトナム',
  CAN:'カナダ', MEX:'メキシコ', USA:'米国', ARG:'アルゼンチン', ATG:'アンティグア・バーブーダ', BHS:'バハマ', BLZ:'ベリーズ', BOL:'ボリビア', BRA:'ブラジル', BRB:'バルバドス', CHL:'チリ', COL:'コロンビア', CRI:'コスタリカ', CUB:'キューバ', DMA:'ドミニカ国', DOM:'ドミニカ共和国', ECU:'エクアドル', FLK:'フォークランド諸島（マルビナス諸島）', GRD:'グレナダ', GTM:'グアテマラ', GUY:'ガイアナ', HND:'ホンジュラス', HTI:'ハイチ', JAM:'ジャマイカ', KNA:'セントクリストファー・ネービス', LCA:'セントルシア', NIC:'ニカラグア', PAN:'パナマ', PER:'ペルー', PRI:'プエルトリコ', PRY:'パラグアイ', SLV:'エルサルバドル', SUR:'スリナム', TTO:'トリニダード・トバゴ', URY:'ウルグアイ', VCT:'セントビンセント・グレナディーン', VEN:'ベネズエラ'
};
export function regionFeatures(id: RegionalId) {
  return features.filter(feature => belongsToRegion(feature, id));
}
