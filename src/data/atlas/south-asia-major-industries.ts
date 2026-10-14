import catalog from './south-asia-major-industries.json' with {type:'json'};
import locations from './south-asia-industry-sites.json' with {type:'json'};
import type {SouthCentralIndustryGroup,SouthCentralIndustrySite} from './asia-south-central-industry';

export type SouthIndustryEvidence = typeof catalog.groups[number]['domestic'][number];
export type SouthIndustryGroup = SouthCentralIndustryGroup & typeof catalog.groups[number];
export type SouthIndustrySite = SouthCentralIndustrySite & typeof locations[number];
export const southIndustrySources=catalog.sources;
export const southIndustryCatalog=catalog.groups as SouthIndustryGroup[];
export const southIndustrySites=locations.map(site=>({...site,point:site.point as [number,number],source:southIndustrySources[site.sourceId as keyof typeof southIndustrySources]})) as SouthIndustrySite[];
export const southIndustryOverview='ベンガルの縫製とパンジャーブの織布、インド東部の石炭・鉄鋼、西岸と内陸の精製、ヒマラヤの水力、島・沿岸の観光が異なる立地を持ちます。都市の工業団地と技術人材は車両・医薬品・IT、茶産地と米の調達・加工は食品産業を支えます。';
export const southIndustryPositionMethod='点は資料に記載された都市・地区・資源地域の案内位置（WGS84・経度/緯度）。敷地・集積域の境界や施設全数ではなく、点の大きさは数量を表さない。企業本社・計画工場を稼働工場に置き換えず、取引線・輸送線は推測しない。';
