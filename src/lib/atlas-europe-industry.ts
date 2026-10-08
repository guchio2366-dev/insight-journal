/** Industry is the regional axis; country GDP indicators are supplementary. */
export const europeIndustryCountries = ['DEU', 'GBR', 'FRA', 'ITA'] as const;
export const europeIndustryGroups = ['エネルギー','鉱業・素材','自動車・機械','化学・医薬品','航空機','港湾物流','観光','金融','繊維・衣服','食品加工'] as const;
export type EuropeIndustryGroup = typeof europeIndustryGroups[number];
export const europeIndustryColors:Record<EuropeIndustryGroup,string>={
  'エネルギー':'#a06a24','鉱業・素材':'#76614d','自動車・機械':'#4e70a3','化学・医薬品':'#8a5b91','航空機':'#286c9b',
  '港湾物流':'#287d80','観光':'#548364','金融':'#695aa1','繊維・衣服':'#ac6176','食品加工':'#ad7636',
};
/** Named anchors cover all ten sectors and separate northern resources from
 * central manufacturing. Remaining evidence points still carry sector color. */
export const europeIndustryOverviewLabels=['johan','kiruna','rotterdam','munich','kalundborg','toulouse','hamburg','adriatic_tourism','frankfurt','portugal_textile','parma_food'] as const;
export function normaliseEuropeIndustryGroup(value: unknown): EuropeIndustryGroup | undefined {
  return europeIndustryGroups.find(group => group === value);
}
export function isEuropeIndustryCountry(code: string): boolean {
  return (europeIndustryCountries as readonly string[]).includes(code);
}
/** A place may contribute evidence to several industries; it is never assigned exclusively. */
export const europeIndustryMembership:Record<string,readonly EuropeIndustryGroup[]> = {
  johan:['エネルギー'],rotterdam:['化学・医薬品','港湾物流'],ludwigshafen:['化学・医薬品'],
  kiruna:['鉱業・素材'],kaukas:['鉱業・素材','エネルギー'],
  munich:['自動車・機械'],mlada:['自動車・機械'],kvasiny:['自動車・機械'],
  toulouse:['航空機'],hamburg:['航空機','港湾物流'],brasov:['航空機'],
  veldhoven:['自動車・機械'],kalundborg:['化学・医薬品'],oulu:['自動車・機械'],
  frankfurt:['金融'],adriatic_tourism:['観光'],portugal_textile:['繊維・衣服'],parma_food:['食品加工'],
};
export function europeIndustryMatches(id:string,group:EuropeIndustryGroup|undefined){return !group||europeIndustryMembership[id]?.includes(group)===true;}
export const europeIndustryGroupCopy:Record<EuropeIndustryGroup,{overview:string;reason:string}> = {
  'エネルギー':{overview:'北海のノルウェー沖に石油生産があり、フィンランド南東部には木材を用いるバイオ燃料の加工拠点もあります。',reason:'海底資源の位置と陸上の加工・送電設備が立地を決めます。石油と木質燃料はエネルギー源も工程も異なるため、点を合算した生産量は示しません。'},
  '鉱業・素材':{overview:'北部スウェーデンの鉄鉱石とフィンランドの木材加工は、北欧にある異なる素材産業の例です。',reason:'鉱床や森林という原料の位置に、輸送と加工設備が結び付きます。資源の面積を生産量に読み替えません。'},
  '自動車・機械':{overview:'ドイツ南部からチェコに自動車の生産拠点が並び、オランダやフィンランドには機械・装置の開発拠点もあります。',reason:'部品供給、熟練労働、研究開発と市場への交通が国境を越えた生産網を支えます。各都市は全産業の代表ではありません。'},
  '化学・医薬品':{overview:'ライン川下流の港湾・内陸に化学の工程が集まり、デンマークには医薬品原薬の生産拠点があります。',reason:'港の原料搬入、河川沿いの輸送、連続した加工工程と研究開発が立地を支えます。化学と医薬品の生産量は同じ尺度ではありません。'},
  '航空機':{overview:'トゥールーズ、ハンブルク、ルーマニアのブラショフに航空機の組立・部材生産の拠点があります。',reason:'大型部材の分業と輸送、専門技能が国境を越えた生産網を形づくります。線は実際の輸送量を示しません。'},
  '港湾物流':{overview:'北海に面するロッテルダムとハンブルクが、欧州の海上輸送と内陸の生産網をつなぎます。',reason:'海港から河川・鉄道・道路を通じて内陸市場へアクセスできる位置が、保管・加工・配送の集積を支えます。'},
  '観光':{overview:'アドリア海沿岸を含む地中海の海岸地域とアルプス周辺では、宿泊需要の大きい地域が見られます。',reason:'海岸・山地の景観、季節の気候、交通アクセスと宿泊施設の蓄積が需要の分布に関わります。Eurostatの地域値はEU加盟国が対象で、欧州全域の宿泊総数ではありません。'},
  '金融':{overview:'フランクフルトには欧州中央銀行があり、欧州中部の金融・行政機能の一例となります。',reason:'金融機関や専門人材、企業・行政との近接が都市への集積を支えます。中央銀行の所在地は金融雇用や取引額のランキングではありません。'},
  '繊維・衣服':{overview:'ポルトガル北部のポルト・ブラガ周辺には繊維・衣服の製造業者が集まります。',reason:'製造技術と熟練労働、設計から生産までの事業者の連携が立地を支えます。AICEPの説明はポルトガルの集中であり、欧州全体の企業数順位ではありません。'},
  '食品加工':{overview:'イタリア北部のパルマ周辺には製粉・パスタ製造と食品研究開発の拠点があります。',reason:'原料調達、加工設備、技術と流通が結び付きます。掲載地点は欧州の食品加工を網羅する分布統計ではありません。'},
};
