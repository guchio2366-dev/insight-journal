import europeCountries from './europe/countries.json';
import africaCountries from './africa-countries.json';
import oceaniaGeography from './oceania-countries.json';
import westAsiaData from './west-asia.json';
import { oceaniaNames } from './oceania';
import { japaneseNames, regionFeatures } from './regional-atlas';
import type { AtlasNewsRegion } from '../../scripts/atlas-news';

export type OverviewRegionId = 'north-america' | 'europe' | 'latin-america' | 'west-asia' | 'africa' | 'oceania' | 'east-asia' | 'southeast-asia' | 'south-central-asia' | 'south-asia' | 'central-asia';
export type OverviewTopicId = 'agriculture' | 'nature' | 'industry' | 'population' | 'politics';
export interface OverviewCountry { code: string; name: string }
export interface OverviewTopic {
  id: OverviewTopicId;
  label: string;
  introduction: string;
  sections: { heading: string; placeholder: string }[];
}
export interface OverviewRegion {
  id: OverviewRegionId;
  label: string;
  path: string;
  mapPath: string;
  newsRegion: AtlasNewsRegion;
  countries: OverviewCountry[];
  defaultCountry: string;
  fields: { id: Exclude<OverviewTopicId, 'politics'>; label: string; href: string | null }[];
  peers: OverviewRegionId[];
}

// These are editorial placeholders, not published descriptions of any country.
export const overviewTopics: OverviewTopic[] = [
  { id: 'agriculture', label: '農林業', introduction: '作物・家畜・森林の利用を、自然条件や地域ごとの違いと結び付けて説明する予定です。本文は準備中です。', sections: [
    { heading: '農業と主な作物', placeholder: '主な作物と産地、栽培を支える土地や水の条件を整理します。' },
    { heading: '畜産と林業', placeholder: '飼育される家畜や森林の利用について、地域ごとの特徴を整理します。' },
    { heading: '生産と暮らしのつながり', placeholder: '生産物が国内でどのように利用され、貿易や地域の暮らしにどう関わるかを説明します。' },
  ] },
  { id: 'nature', label: '自然環境', introduction: '気候・地形・水資源を通して、この国・地域の自然環境を説明する予定です。本文は準備中です。', sections: [
    { heading: '気候と季節の変化', placeholder: '気温や降水量の季節変化と、国内の気候の違いを整理します。' },
    { heading: '地形と水資源', placeholder: '山地・平野・河川などの位置と、水が利用される条件を説明します。' },
    { heading: '自然環境と土地の利用', placeholder: '自然条件と農業・都市などの土地利用の関係を整理します。' },
  ] },
  { id: 'industry', label: '主要産業', introduction: '主な産業が何を生産し、どこに集まり、国内外の経済とどう結び付いているかを説明する予定です。本文は準備中です。', sections: [
    { heading: '産業の構成と主な拠点', placeholder: '産業の構成と、生産・雇用が集まる地域を整理します。' },
    { heading: '製造業・資源・エネルギー', placeholder: '主要な製品や資源、エネルギーの生産と利用について説明します。' },
    { heading: 'サービス業と貿易', placeholder: '商業・金融・観光などの役割と、国内外を結ぶ取引や輸送を整理します。' },
  ] },
  { id: 'population', label: '人口', introduction: '人口の分布や変化を、都市・移動・社会の多様性と結び付けて説明する予定です。本文は準備中です。', sections: [
    { heading: '人口分布と都市', placeholder: '人々が暮らす地域と主な都市について、人口の集中や分散を整理します。' },
    { heading: '言語・民族・宗教', placeholder: '言語・民族・宗教の構成を、それぞれの定義と資料の対象範囲を示して説明します。' },
    { heading: '人口の変化と人の移動', placeholder: '年齢構成や人口増減、国内外の移動について、資料の対象年を明記して整理します。' },
  ] },
  { id: 'politics', label: '政治', introduction: '政治制度の仕組みやその成立の経緯、国内外の主な論点を説明する予定です。本文は準備中です。', sections: [
    { heading: '政治制度と意思決定', placeholder: '行政・議会・司法などの役割と、意思決定の仕組みを説明します。' },
    { heading: '政治の歩みと現在の論点', placeholder: '現在の制度につながる経緯と主な論点を、確認時点を示して整理します。' },
    { heading: '外交と周辺地域との関係', placeholder: '周辺地域や国際機関との関係を、背景と出典に基づいて説明します。' },
  ] },
];

const namesOnly = (countries: OverviewCountry[]): OverviewCountry[] =>
  [...new Map(countries.map(country => [country.code, { code: country.code, name: country.name }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
const regionalCountries = (id: 'east-asia' | 'southeast-asia' | 'south-central-asia' | 'latin-america', subregion?: string) =>
  namesOnly(regionFeatures(id).filter(feature => !subregion || feature.properties.subregion === subregion)
    .map(({ properties: country }) => ({ code: country.code, name: japaneseNames[country.code] ?? country.name })));

const asiaPeers: OverviewRegionId[] = ['east-asia', 'southeast-asia', 'south-asia', 'central-asia', 'west-asia'];
const americaPeers: OverviewRegionId[] = ['north-america', 'latin-america'];
type RegionInput = Pick<OverviewRegion, 'id' | 'label' | 'newsRegion' | 'countries' | 'defaultCountry' | 'peers'>;
function makeRegion(input: RegionInput): OverviewRegion {
  const isAsia = ['east-asia', 'southeast-asia', 'south-central-asia', 'south-asia', 'central-asia'].includes(input.id);
  const mapPath = `/atlas/${isAsia ? 'asia/' : ''}${input.id}/`;
  return {
    ...input, countries: namesOnly(input.countries), mapPath, path: `${mapPath}overview/`,
    fields: overviewTopics.filter(topic => topic.id !== 'politics').map(topic => ({
      id: topic.id as Exclude<OverviewTopicId, 'politics'>, label: topic.label,
      href: input.id === 'oceania' ? null : input.id === 'africa' ? `${mapPath}?field=${topic.id}` : `${mapPath}${topic.id}/`,
    })),
  };
}

export const overviewRegions: OverviewRegion[] = [
  makeRegion({ id: 'north-america', label: '北米', newsRegion: 'north-america', countries: ['USA', 'CAN', 'MEX'].map(code => ({ code, name: japaneseNames[code] })), defaultCountry: 'USA', peers: americaPeers }),
  makeRegion({ id: 'europe', label: '欧州', newsRegion: 'europe', countries: europeCountries, defaultCountry: 'GBR', peers: ['europe'] }),
  makeRegion({ id: 'latin-america', label: '中南米', newsRegion: 'latin-america', countries: regionalCountries('latin-america'), defaultCountry: 'BRA', peers: americaPeers }),
  makeRegion({ id: 'west-asia', label: '西アジア・中東', newsRegion: 'west-asia', countries: westAsiaData.countries, defaultCountry: 'SAU', peers: asiaPeers }),
  makeRegion({ id: 'africa', label: 'アフリカ', newsRegion: 'africa', countries: africaCountries, defaultCountry: 'EGY', peers: ['africa'] }),
  makeRegion({ id: 'oceania', label: 'オセアニア', newsRegion: 'oceania', countries: oceaniaGeography.features.filter(feature => feature.properties.kind === 'oceania').map(({ properties: country }) => ({ code: country.code, name: oceaniaNames[country.code] ?? country.name })), defaultCountry: 'AUS', peers: ['oceania'] }),
  makeRegion({ id: 'east-asia', label: '東アジア', newsRegion: 'east-asia', countries: regionalCountries('east-asia'), defaultCountry: 'JPN', peers: asiaPeers }),
  makeRegion({ id: 'southeast-asia', label: '東南アジア', newsRegion: 'southeast-asia', countries: regionalCountries('southeast-asia'), defaultCountry: 'IDN', peers: asiaPeers }),
  makeRegion({ id: 'south-central-asia', label: '南・中央アジア', newsRegion: 'south-central-asia', countries: regionalCountries('south-central-asia'), defaultCountry: 'IND', peers: [...asiaPeers.slice(0, 2), 'south-central-asia', ...asiaPeers.slice(2)] }),
  makeRegion({ id: 'south-asia', label: '南アジア', newsRegion: 'south-central-asia', countries: regionalCountries('south-central-asia', 'Southern Asia'), defaultCountry: 'IND', peers: asiaPeers }),
  makeRegion({ id: 'central-asia', label: '中央アジア', newsRegion: 'south-central-asia', countries: regionalCountries('south-central-asia', 'Central Asia'), defaultCountry: 'KAZ', peers: asiaPeers }),
];

export function getOverviewRegion(id: string): OverviewRegion {
  return overviewRegions.find(region => region.id === id) ?? overviewRegions[0];
}
