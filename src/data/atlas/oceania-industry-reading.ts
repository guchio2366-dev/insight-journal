import placeData from '../../../public/assets/atlas/oceania-industry-v2/places.json';

export type OceaniaIndustryMark = {
  id: string;
  country: string;
  name: string;
  coordinates: [number, number];
  kind: 'port' | 'processing' | 'city';
  note: string;
  sourceUrl: string;
  labelOffsetPx?: [number, number];
  coordinateMeaning?: 'urban-centre-guide-not-factory';
};
export type OceaniaIndustrySector = 'resources' | 'manufacturing' | 'services';
export const oceaniaIndustrySectors: Record<OceaniaIndustrySector, {title:string; takeaway:string; explanation:string}> = {
  resources: {title:'資源・エネルギー',takeaway:'豪州の鉱種分布とPNGの金鉱石処理を読む。',explanation:'鉱山347点は2025版の稼働地点で、量や埋蔵量を示しません。PNGのリヒールは2023年末の採掘・鉱石処理地区です。採掘から利用可能な状態への処理までをこの分野に含めます。'},
  manufacturing: {title:'製造業',takeaway:'鋼材・水産缶詰・乳製品・木材を、加工の技術と場所から読む。',explanation:'豪州ポートケンブラの鋼材生産、ソロモン諸島ノロの水産缶詰、NZのSynlaitの乳加工とPan Pacのパルプ加工を代表例にします。NZの2点は、企業の工程と住所を読むための保存済み都市中心の案内位置です。工場の入口・敷地や全工場の分布は示しません。港の点や総牛密度を工場・酪農地帯の位置には置き換えません。'},
  services: {title:'サービス業',takeaway:'港の輸送と都市の管理・市場の機能を読む。',explanation:'NZのタウランガ、PNGのラエ、ソロモン諸島のノロ、フィジーのスバは港や都市の代表地点です。物流・情報・観光などの機能を見ます。線で結ぶ輸送経路や都市別産業割合は資料から推定しません。'},
};
export const oceaniaIndustryMarkSectors: Record<string,OceaniaIndustrySector[]> = {
  'tauranga-port':['services'],'lihir-project':['resources'],'lae-port':['services'],'noro-port':['manufacturing','services'],'suva-city':['services'],'port-kembla-steel':['manufacturing'],'nz-dairy-guide':['manufacturing'],'nz-wood-guide':['manufacturing'],
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
  coverage: '豪州の鉱山一覧と、豪州・NZ・PNG・ソロモン諸島・フィジーの8代表地点を掲載。NZの乳加工・木材加工の2点は都市中心の案内位置で、工場敷地ではありません。印がない国・島にも産業があり、未収録をゼロとは読めません。',
  comparison: '鉱山の鉱種分布と代表地点を残し、作物・家畜の分布や人口集中を重ねて、原料・加工・市場の関係を比べます。港へ向かう線や航路は、この地図では推定しません。',
  kinds: [
    {kind: 'port', label: '港の代表位置'},
    {kind: 'processing', label: '採掘・加工の代表位置／都市案内'},
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
      {title: 'BlueScope：ポートケンブラの鋼材生産（2026年10月確認）',url:'https://www.bluescope.com/illawarra'},
      {title:'GHSL：ウォロンゴン都市中心の代表座標（2020年人口・2025年境界）',url:'https://doi.org/10.2905/1a338be6-7eaf-480c-9664-3a8ade88cbcd'},
    ],
    marks: marks('port-kembla-steel'),
  },
  {
    id: 'new-zealand-processing',
    title: 'NZ：農林産物を加工し市場へ',
    takeaway: '牧畜・林業の分布と、乳製品・木材の加工や港を重ねる。',
    explanation: 'Synlaitの公式沿革はDunsandelでの乳加工開始（2008年）と乳児用粉乳施設（2011年）を記録しています。Pan Pacの公式資料はホークスベイで木材チップからパルプを作る工程を説明し、製材も同社の工程として紹介しています。新しい2点は、これらの企業の拠点と工程を読むクライストチャーチ・ナピアの都市案内位置です。乳牛・肉牛を総牛密度から分けず、案内点を工場敷地や森林分布には置き換えません。タウランガ港は2018年を扱う運輸省の報告で木材・紙製品・乳製品の輸出に結び付けられますが、工場別の行先や輸送線は示しません。',
    countryCodes: ['NZL'],
    sources: [
      {title: 'NZ MPI：木材加工の工程', url: 'https://www.mpi.govt.nz/forestry/forest-industry-and-workforce/the-wood-processing-sector-in-new-zealand'},
      {title: 'NZ運輸省：上部北島の供給網（2019年報告・2018年状況）', url: 'https://www.transport.govt.nz/assets/Uploads/Report/UNISCS-Interim-progress-report-on-the-Upper-North-Island-Supply-Chain-Strategy_Final.pdf'},
      {title: 'Port of Tauranga：港の代表位置（2011）', url: 'https://www.port-tauranga.co.nz/wp-content/uploads/Location-and-Transport-Links.pdf'},
      {title:'Synlait：Dunsandel乳加工・粉乳施設の公式沿革（2008・2011年の記録、2026年10月確認）',url:'https://www.synlait.com/history/'},
      {title:'Synlait：Dunsandelの公式所在地（2026年10月確認）',url:'https://www.synlait.com/contact/'},
      {title:'Pan Pac：ホークスベイのパルプ加工の工程（2026年10月確認）',url:'https://www.panpac.co.nz/pulp/'},
      {title:'Pan Pac：公式所在地の案内（本社・Otago事務所、2026年10月確認）',url:'https://www.panpac.co.nz/contact/'},
      {title:'Mari Rivero, I. et al. (2026). GHS-UCDB R2024A V1.2 — GHS Urban Centre Database 2025. European Commission, Joint Research Centre [Dataset]（案内に使うクライストチャーチ・ナピア都市中心、2020年人口・2025年範囲、CC BY 4.0）',url:'https://doi.org/10.2905/1a338be6-7eaf-480c-9664-3a8ade88cbcd'},
    ],
    marks: marks('tauranga-port','nz-dairy-guide','nz-wood-guide'),
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
