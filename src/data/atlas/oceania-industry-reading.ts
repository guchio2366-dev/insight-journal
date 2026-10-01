import placeData from '../../../public/assets/atlas/oceania-industry-v2/places.json';

export type OceaniaIndustryMark = {
  id: string;
  country: string;
  name: string;
  coordinates: [number, number];
  kind: 'port' | 'processing' | 'city';
  note: string;
  sourceUrl: string;
};

export type OceaniaIndustryReadingTheme = {
  id: string;
  title: string;
  takeaway: string;
  explanation: string;
  countryCodes: string[];
  sources: {title: string; url: string}[];
  marks: OceaniaIndustryMark[];
};

export const oceaniaIndustryRepresentativeMarks = placeData.places as OceaniaIndustryMark[];
const marks = (...ids: string[]) => oceaniaIndustryRepresentativeMarks.filter(mark => ids.includes(mark.id));

export const oceaniaIndustryMapReading = {
  takeaway: '資源の分布に、加工技術・港・市場・地域の合意を重ねて産業を読む。',
  mineLegend: '豪州の稼働鉱山：2025版・347地点。鉱種を示し、生産量・埋蔵量は示しません。',
  representativeLegend: '代表地点：港・加工地区・都市の位置。固定サイズの印で、件数・生産量・産業割合の比較には使いません。',
  coverage: '豪州の鉱山一覧と、NZ・PNG・ソロモン諸島・フィジーの5代表地点を掲載。印がない国・島にも産業があり、未収録をゼロとは読めません。',
  comparison: '鉱山の鉱種分布と代表地点を残し、作物・家畜の分布や人口集中を重ねて、原料・加工・市場の関係を比べます。港へ向かう線や航路は、この地図では推定しません。',
  kinds: [
    {kind: 'port', label: '港の代表位置'},
    {kind: 'processing', label: '採掘・加工地区の代表位置'},
    {kind: 'city', label: 'サービスを読む都市の代表位置'},
  ],
} as const;

export const oceaniaIndustryReadingThemes: OceaniaIndustryReadingTheme[] = [
  {
    id: 'australia-minerals',
    title: '豪州：鉱床から加工・輸出へ',
    takeaway: '鉱種の分布と、資源を使える製品にする技術を一緒に読む。',
    explanation: '2025版の鉱山地点には鉄鉱石・石炭・金銀・銅などが含まれます。鉄鉱石は採掘後の破砕・選別や、鉱石に応じた処理を経て利用されます。鉱床があっても、加工技術や採算、市場との接続が産業の条件になります。347点は豪州の原資料にある稼働鉱山の数で、生産量や地域の豊かさの順位ではありません。',
    countryCodes: ['AUS'],
    sources: [
      {title: 'Geoscience Australia：Australian Operating Mines Map 2025', url: 'https://doi.org/10.26186/150821'},
      {title: 'Geoscience Australia：鉄鉱石の採掘と加工（2025年更新）', url: 'https://www.ga.gov.au/education/minerals-energy/australian-mineral-facts/iron'},
    ],
    marks: [],
  },
  {
    id: 'new-zealand-processing',
    title: 'NZ：農林産物を加工し市場へ',
    takeaway: '牧畜・林業の分布と、乳製品・木材の加工や港を重ねる。',
    explanation: 'NZの木材加工には製材・合板・パルプなどの工程があります。タウランガ港は、2018年を扱う運輸省の報告で木材・紙製品・乳製品の輸出と結び付けられています。原料が育つ条件に、加工技術、輸送設備、市場への接続を加えて読みます。港の印は農場や工場の一覧でも、現在の輸出量でもありません。',
    countryCodes: ['NZL'],
    sources: [
      {title: 'NZ MPI：木材加工の工程', url: 'https://www.mpi.govt.nz/forestry/forest-industry-and-workforce/the-wood-processing-sector-in-new-zealand'},
      {title: 'NZ運輸省：上部北島の供給網（2019年報告・2018年状況）', url: 'https://www.transport.govt.nz/assets/Uploads/Report/UNISCS-Interim-progress-report-on-the-Upper-North-Island-Supply-Chain-Strategy_Final.pdf'},
      {title: 'Port of Tauranga：港の代表位置（2011）', url: 'https://www.port-tauranga.co.nz/wp-content/uploads/Location-and-Transport-Links.pdf'},
    ],
    marks: marks('tauranga-port'),
  },
  {
    id: 'png-resources-and-port',
    title: 'PNG：資源開発と交通・地域協議',
    takeaway: '鉱床だけでなく、鉱石処理・輸送設備・土地をめぐる協議を読む。',
    explanation: 'リヒールの2023年末時点の技術報告は、金の採掘・処理に電力、水、資材、交通施設が必要なことと、土地所有者との協議を説明しています。ラエ港は別の事例として一般貨物・コンテナの接点を示します。地域に届く便益は制度や合意にも関わります。この2地点の間の鉱物輸送は資料で確認していないため、結ぶ線はありません。',
    countryCodes: ['PNG'],
    sources: [
      {title: 'Newmont：Lihir技術報告（2024年2月・2023年末時点）', url: 'https://www.sec.gov/Archives/edgar/data/1164727/000116472724000016/exhibit967-lihiroperatio.htm'},
      {title: 'PNG MRA：鉱山開発の地域協議と便益配分', url: 'https://mra.gov.pg/developmentcoordination/mineprojectcoordination/'},
      {title: 'PNG Ports：ラエ港の機能と位置（2026年10月確認）', url: 'https://www.pngports.com.pg/index.php/port-information/ports-of-png/lae-port'},
    ],
    marks: marks('lihir-project', 'lae-port'),
  },
  {
    id: 'islands-processing-and-services',
    title: '島々：水産加工と港のサービス',
    takeaway: '海の資源を仕事につなぐ加工と、島外の市場をつなぐサービスを読む。',
    explanation: 'ソロモン諸島のノロでは、水揚げ・加工・缶詰製造・コンテナへの積込みが同じ港湾地域に集まります。加工設備や技能、投資、漁業行政が地域の仕事を支えます。フィジーのスバは島間船や貨客船を扱う港湾都市です。フィジー全国には観光に加え金融・保険・製造業・農業もあり、島の産業を一つの資源だけで説明できません。',
    countryCodes: ['SLB', 'FJI'],
    sources: [
      {title: 'FFA：ノロの水産加工と地域の仕事（2025年11月25日）', url: 'https://www.ffa.int/2025/11/a-town-built-by-tuna-ffa-head-visits-noros-unique-tuna-hub/'},
      {title: 'SIPA：ノロ港の主埠頭位置（2026年10月確認）', url: 'https://www.sipa.com.sb/media/1404/fact-sheet-noro.pdf'},
      {title: 'Fiji Ports：スバ市の位置と港のサービス（2026年10月確認）', url: 'https://fijiports.com.fj/our-story/our-facilities/'},
      {title: '豪州DFAT：フィジー全国の産業（2026年10月確認）', url: 'https://www.dfat.gov.au/geo/fiji/fiji-country-brief'},
    ],
    marks: marks('noro-port', 'suva-city'),
  },
];
