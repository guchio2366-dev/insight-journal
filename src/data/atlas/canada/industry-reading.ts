/**
 * Reading anchors reuse the existing 2021 CMA geometry's EPSG:4326 anchor.
 * They locate a city-region for a broader regional example; fixed-size marks
 * do not identify a plant, resource deposit, route or quantity distribution.
 * GDP references remain province-wide broad classifications.
 */
export const canadaIndustrySectors = [
  {id:'all',label:'全産業',color:'#435965',symbol:'全'},
  {id:'manufacturing',label:'製造業',color:'#9c6344',symbol:'製'},
  {id:'resources',label:'資源・エネルギー',color:'#81733f',symbol:'資'},
  {id:'services',label:'サービス業',color:'#357080',symbol:'サ'},
] as const;

export type CanadaIndustrySector = typeof canadaIndustrySectors[number]['id'];
export type CanadaIndustryGDPMetric = 'mining'|'manufacturing'|'services';
export type CanadaIndustryRegion = {
  id:string;
  sector:Exclude<CanadaIndustrySector,'all'>;
  gdpMetric:CanadaIndustryGDPMetric;
  province:string;
  name:string;
  coordinates:readonly [number,number];
  cmaId:string;
  coordinateSource:string;
  sourceURL:string;
  sourceYear:number;
  scope:string;
  lead:string;
  explanation:string;
};

export const canadaIndustrySources = {
  gdp:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610040001',
  energy:'https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/province-territory-energy-profiles/alberta.html',
  transport:'https://tc.canada.ca/en/corporate-services/transparency/corporate-management-reporting/transportation-canada-annual-reports/transportation-canada-2024/role-canada-s-transportation-network',
} as const;

export const canadaIndustryOverview = {
  name:'資源・加工・輸送・市場をつなぐ',
  lead:'資源の場所に加工・輸送・市場が重なり、地域の産業を支える。',
  explanation:'代表地域の案内点から、アルバータの資源、オンタリオ・ケベックの加工、BCの輸送を読みます。点は工場所在地や数量ではありません。統計は州全体のGDP構成比として分けて確かめます。',
  scope:'4つの地域事例。全国の産業分布を網羅する図ではありません。',
};

const coordinateSource='src/data/atlas/canada/population-geometry.json（2021年CMA境界の既存anchor）';

export const canadaIndustryRegions:readonly CanadaIndustryRegion[] = [
  {
    id:'alberta-energy',sector:'resources',gdpMetric:'mining',province:'Alberta',
    name:'アルバータ／Edmonton周辺',coordinates:[-113.8611922,53.4738839],cmaId:'835',coordinateSource,
    sourceURL:canadaIndustrySources.energy,sourceYear:2023,
    scope:'Edmonton都市圏の位置を入口に読む州内の資源事例。オイルサンド・施設・輸送経路の地点図ではありません。',
    lead:'北部の石油資源から、Edmonton・Hardistyの集荷、加工・輸送、市場へつながる。',
    explanation:'CERの2023年の生産事例では、アルバータ北部のオイルサンドから得た原油が加工や希釈を経て集荷拠点に集まり、パイプラインが他州や米国の市場へつなぎます。州のGDP表はNAICS 21の鉱業・採石・石油ガス採取で、石油だけや資源産業全体の数値ではありません。',
  },
  {
    id:'ontario-manufacturing',sector:'manufacturing',gdpMetric:'manufacturing',province:'Ontario',
    name:'オンタリオ／Toronto周辺',coordinates:[-79.5783623,43.9284373],cmaId:'535',coordinateSource,
    sourceURL:canadaIndustrySources.transport,sourceYear:2024,
    scope:'Toronto都市圏の位置を入口に読むオンタリオと中央輸送回廊。個別工場の所在地・数量ではありません。',
    lead:'加工活動を、五大湖・セントローレンス沿いの交通と市場につなげて読む。',
    explanation:'Transport Canadaの2024年報告は、オンタリオとケベックを含む中央輸送回廊で、道路・鉄道・五大湖／セントローレンス水路が果たす役割を説明しています。製造業の立地は原料に加え、人・製品を運び買い手につながる条件と合わせて読みます。統計は州全体の製造業（NAICS 31–33）のGDP割合で、Torontoや自動車など一分野の値ではありません。',
  },
  {
    id:'quebec-manufacturing',sector:'manufacturing',gdpMetric:'manufacturing',province:'Quebec',
    name:'ケベック／Montréal周辺',coordinates:[-73.7274822,45.5732256],cmaId:'462',coordinateSource,
    sourceURL:canadaIndustrySources.transport,sourceYear:2024,
    scope:'Montréal都市圏の位置を入口に読むケベックと中央輸送回廊。個別工場の所在地・数量ではありません。',
    lead:'オンタリオとケベックを比較し、加工を支える輸送と市場のつながりを読む。',
    explanation:'中央輸送回廊の道路・鉄道・五大湖／セントローレンス水路を、両州の位置とともに確認します。州内GDP割合が高いことは、全国最大の製造業金額を意味しません。州全体の製造業（NAICS 31–33）を参照し、Montréalや航空宇宙など一分野の規模に読み替えません。',
  },
  {
    id:'bc-transport-services',sector:'services',gdpMetric:'services',province:'British Columbia',
    name:'BC／Vancouver周辺',coordinates:[-122.8458127,49.2521586],cmaId:'933',coordinateSource,
    sourceURL:canadaIndustrySources.transport,sourceYear:2024,
    scope:'Vancouver都市圏の位置を入口に読むBCの輸送事例。港・施設の所在地、輸送量、サービス全体の分布ではありません。',
    lead:'太平洋側の港・鉄道・道路と国境のつながりを、人口と仕事の位置へ結ぶ。',
    explanation:'Transport Canadaの2024年報告は、BCの港・鉄道・道路・米国との陸上国境を結ぶ交通を説明しています。サービス生産産業（T003）は運輸だけでなく、商業・専門サービス・教育・医療・公的活動なども含みます。この輸送事例を、州全体のサービスGDP割合の原因やVancouverの産業規模と同一視しません。',
  },
];

export const canadaIndustryGDPScope:Record<CanadaIndustryGDPMetric,string> = {
  mining:'州全体の鉱業・採石・石油ガス採取（NAICS 21）の州内GDP割合。資源・エネルギー全体の値ではありません。',
  manufacturing:'州全体の製造業（NAICS 31–33）の州内GDP割合。都市・工場・細分野の値ではありません。',
  services:'州全体のサービス生産産業（T003）の州内GDP割合。都市・港湾・運輸だけの値ではありません。',
};
