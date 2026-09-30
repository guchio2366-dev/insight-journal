import type { OverviewRegionId } from './country-overview';

export interface RegionOverviewSource {
  id: string;
  label: string;
  publisher: string;
  url: string;
}
export interface RegionOverviewSection {
  id: string;
  heading: string;
  body: string;
  sourceIds: string[];
}
export interface RegionOverview {
  title: string;
  introduction: string;
  introductionSourceIds: string[];
  status: 'ready' | 'planned';
  checkedAt?: string;
  sections: RegionOverviewSection[];
  sources: RegionOverviewSource[];
}

// Regional orientation only. Country-level topic articles remain separate placeholders.
// Membership counts and institutional descriptions were checked against the linked
// official sources on the date below; do not silently treat the EU as all of Europe.
export const europeOverview: RegionOverview = {
  title: 'ヨーロッパの概要',
  introduction: 'ヨーロッパ（欧州）は、ユーラシア大陸の西部に広がる地域です。国ごとの歴史や政治制度と、国境を越えた協力の両方から、現在の姿を見ていきます。',
  introductionSourceIds: ['europe-geography'],
  status: 'ready',
  checkedAt: '2026-09-30',
  sections: [
    {
      id: 'geography',
      heading: '地域の特徴',
      body: '欧州は大西洋に面し、南は地中海を隔ててアフリカと向き合います。北部の寒冷な地域から南部の地中海沿岸まで、気候や自然環境には幅があります。東ではアジアと陸続きで、欧州の範囲の区切り方は資料や目的によって異なります。',
      sourceIds: ['europe-geography'],
    },
    {
      id: 'history',
      heading: '戦後の協力と東西の分断',
      body: '第二次世界大戦後、フランスや西ドイツなど西欧の6か国は、戦争の再発を防ぐため石炭・鉄鋼を共同で管理する仕組みをつくりました。これが現在のEUにつながります。一方、米ソ対立による冷戦は欧州を東西に分けました。1989年のベルリンの壁崩壊後、中東欧の国々も後にEUへ加わりました。',
      sourceIds: ['eu-postwar', 'eu-cold-war', 'eu-enlargement'],
    },
    {
      id: 'politics',
      heading: '国ごとに異なる政治の仕組み',
      body: '欧州の政治の仕組みは一様ではありません。例えばスウェーデンには国王がおり、ドイツには大統領がいます。両国では首相が政府を率いますが、地方との権限分担は異なります。ドイツは独自の憲法を持つ州が集まる連邦国家です。',
      sourceIds: ['sweden-system', 'germany-system'],
    },
    {
      id: 'european-union',
      heading: 'EUでは何を共同で決めるのか',
      body: 'EU（欧州連合）は欧州の27か国が参加する政治・経済の連合です。イギリス、ノルウェー、スイスなどは加盟しておらず、欧州全体とは範囲が異なります。加盟国は独立した国のまま、条約で定めた分野を共通の機関で決めます。加盟国以外との貿易政策はEUが担い、教育では各国を支援するなど、役割は分野により異なります。',
      sourceIds: ['eu-enlargement', 'non-eu-europe', 'eu-institutions', 'eu-powers'],
    },
  ],
  sources: [
    { id: 'europe-geography', label: '欧州の地理的な範囲', publisher: '欧州環境庁（EEA）', url: 'https://www.eea.europa.eu/en/analysis/publications/92-826-5409-5/page003new.html' },
    { id: 'non-eu-europe', label: 'EUに加盟していない西欧諸国', publisher: '欧州対外行動庁（EEAS）', url: 'https://www.eeas.europa.eu/eeas/western-europe_en?page_lang=en' },
    { id: 'eu-postwar', label: '戦後の協力（1945〜1959年）', publisher: '欧州連合', url: 'https://european-union.europa.eu/principles-countries-history/history-eu/1945-59_en' },
    { id: 'eu-cold-war', label: '東西の分断の変化（1980〜1989年）', publisher: '欧州連合', url: 'https://european-union.europa.eu/principles-countries-history/history-eu/1980-89_en' },
    { id: 'eu-enlargement', label: 'EUの加盟国と拡大の歴史', publisher: '欧州連合', url: 'https://european-union.europa.eu/principles-countries-history/eu-enlargement_en' },
    { id: 'sweden-system', label: 'スウェーデンの政治制度', publisher: '欧州連合', url: 'https://european-union.europa.eu/principles-countries-history/eu-countries/sweden_en' },
    { id: 'germany-system', label: 'ドイツの政治制度', publisher: '欧州連合', url: 'https://european-union.europa.eu/principles-countries-history/eu-countries/germany_en' },
    { id: 'eu-institutions', label: '加盟国とEUの共通機関の関係', publisher: '欧州連合出版局', url: 'https://op.europa.eu/en/publication-detail/-/publication/9a6a89dc-4ed7-4bb9-a9f7-53d7f1fb1dae' },
    { id: 'eu-powers', label: 'EUと加盟国の役割分担', publisher: '欧州委員会', url: 'https://commission.europa.eu/about/role/law/areas-eu-action_en' },
  ],
};

const labels: Record<OverviewRegionId, string> = {
  'north-america': '北米', europe: '欧州', 'latin-america': '中南米',
  'west-asia': '西アジア・中東', africa: 'アフリカ', oceania: 'オセアニア',
  'east-asia': '東アジア', 'southeast-asia': '東南アジア',
  'south-central-asia': '南・中央アジア', 'south-asia': '南アジア', 'central-asia': '中央アジア',
};

export function getRegionOverview(regionId: OverviewRegionId, label = labels[regionId]): RegionOverview {
  if (regionId === 'europe') return europeOverview;
  return {
    title: `${label}の概況`,
    introduction: `${label}全体の特徴を説明する本文を準備しています。地図で国・地域を選ぶと、各国の解説項目を確認できます。`,
    introductionSourceIds: [],
    status: 'planned',
    sections: [
      { id: 'geography', heading: '地域の特徴', body: '位置や自然環境、国・地域のつながりを説明する本文を準備しています。', sourceIds: [] },
      { id: 'history', heading: '歴史的な背景', body: '現在の地域の姿につながる歴史を説明する本文を準備しています。', sourceIds: [] },
      { id: 'politics', heading: '政治の仕組み', body: '各国の政治制度や地域ごとの違いを説明する本文を準備しています。', sourceIds: [] },
      { id: 'cooperation', heading: '国境を越えた関係', body: '地域内外の協力や交流を説明する本文を準備しています。', sourceIds: [] },
    ],
    sources: [],
  };
}
