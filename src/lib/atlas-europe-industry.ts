/** Industry is the regional axis; country GDP indicators are supplementary. */
export const europeIndustryCountries = ['DEU', 'GBR', 'FRA', 'ITA'] as const;
export const europeIndustryGroups = ['エネルギー','鉱業・素材','自動車・機械','化学・医薬品','航空機','港湾物流','観光','金融','繊維・衣服','食品加工','銅','発電','情報・研究'] as const;
export type EuropeIndustryGroup = typeof europeIndustryGroups[number];
export const europeIndustryColors:Record<EuropeIndustryGroup,string>={
  'エネルギー':'#a06a24','鉱業・素材':'#76614d','自動車・機械':'#4e70a3','化学・医薬品':'#8a5b91','航空機':'#286c9b',
  '港湾物流':'#287d80','観光':'#548364','金融':'#695aa1','繊維・衣服':'#ac6176','食品加工':'#ad7636','銅':'#ae6241','発電':'#7a7e29','情報・研究':'#356b8e',
};
/** Named anchors cover all ten sectors and separate northern resources from
 * central manufacturing. Remaining evidence points still carry sector color. */
export const europeIndustryOverviewLabels=['johan','kiruna','rotterdam','munich','kalundborg','toulouse','adriatic_tourism','london_finance','prato_textile','parma_food'] as const;
export function normaliseEuropeIndustryGroup(value: unknown): EuropeIndustryGroup | undefined {
  return europeIndustryGroups.find(group => group === value);
}
export function isEuropeIndustryCountry(code: string): boolean {
  return (europeIndustryCountries as readonly string[]).includes(code);
}
/** A place may contribute evidence to several industries; it is never assigned exclusively. */
export const europeIndustryMembership:Record<string,readonly EuropeIndustryGroup[]> = {
  ormen:['エネルギー'],nyhamna:['エネルギー'],pernis:['エネルギー','化学・医薬品'],lubin:['銅'],glogow:['銅'],kvilldal:['発電'],gravelines:['発電'],kista:['情報・研究'],
  johan:['エネルギー'],rotterdam:['化学・医薬品','港湾物流'],ludwigshafen:['化学・医薬品'],
  kiruna:['鉱業・素材'],kaukas:['鉱業・素材','エネルギー'],
  munich:['自動車・機械'],mlada:['自動車・機械'],kvasiny:['自動車・機械'],
  toulouse:['航空機'],hamburg:['航空機','港湾物流'],brasov:['航空機'],
  veldhoven:['自動車・機械'],kalundborg:['化学・医薬品'],oulu:['自動車・機械','情報・研究'],
  frankfurt:['金融'],london_finance:['金融'],adriatic_tourism:['観光'],tyrol_tourism:['観光'],portugal_textile:['繊維・衣服'],prato_textile:['繊維・衣服'],parma_food:['食品加工'],wageningen_food:['食品加工','情報・研究'],
};
export function europeIndustryMatches(id:string,group:EuropeIndustryGroup|undefined){return !group||europeIndustryMembership[id]?.includes(group)===true;}
export const europeIndustryGroupCopy:Record<EuropeIndustryGroup,{overview:string;reason:string}> = {
  '銅':{overview:'ポーランド南西部のルビン周辺に銅鉱山、グウォグフに精錬・精製設備があります。',reason:'鉱石を採取し、選鉱して銅を回収し、精製した銅を加工用素材にします。鉱山と精錬所は同じ地点ではなく、銅は電気機器・配線などに使われます。'},
  '発電':{overview:'ノルウェーの水力とフランス北部の原子力を、電力へ変換する異なる立地の例として示します。',reason:'水力は水系と落差、原子力は発電設備と冷却・送電の条件に結び付きます。掲載地点は欧州の全電源や発電量順位を示さず、設備の位置から稼働率は推定しません。'},
  '情報・研究':{overview:'オウルとストックホルムのキスタには通信・デジタル技術の企業と研究機関、ワーヘニンゲンには食品研究の集積があります。',reason:'技術者、大学・研究機関、企業の交流と試験環境が知識を集めます。通信機器を作る工程は製造業、設計・ソフトウェア・共同研究はサービス業として関係を分けて読みます。'},
  'エネルギー':{overview:'ノルウェー沖に石油・天然ガスの採取、沿岸にガス処理、北海の港に石油精製があり、フィンランド南東部には木質バイオ燃料の加工があります。',reason:'海底資源の位置と陸上の加工・送電設備が立地を決めます。石油と木質燃料はエネルギー源も工程も異なるため、点を合算した生産量は示しません。'},
  '鉱業・素材':{overview:'北部スウェーデンの鉄鉱石とフィンランドの木材加工は、北欧にある異なる素材産業の例です。',reason:'鉱床や森林という原料の位置に、輸送と加工設備が結び付きます。資源の面積を生産量に読み替えません。'},
  '自動車・機械':{overview:'ドイツ南部からチェコに自動車の生産拠点が並び、オランダやフィンランドには機械・装置の開発拠点もあります。',reason:'部品供給、熟練労働、研究開発と市場への交通が国境を越えた生産網を支えます。各都市は全産業の代表ではありません。'},
  '化学・医薬品':{overview:'ライン川下流の港湾・内陸に化学の工程が集まり、デンマークには医薬品原薬の生産拠点があります。',reason:'港の原料搬入、河川沿いの輸送、連続した加工工程と研究開発が立地を支えます。化学と医薬品の生産量は同じ尺度ではありません。'},
  '航空機':{overview:'トゥールーズ、ハンブルク、ルーマニアのブラショフに航空機の組立・部材生産の拠点があります。',reason:'大型部材の分業と輸送、専門技能が国境を越えた生産網を形づくります。線は実際の輸送量を示しません。'},
  '港湾物流':{overview:'北海に面するロッテルダムとハンブルクが、欧州の海上輸送と内陸の生産網をつなぎます。',reason:'海港から河川・鉄道・道路を通じて内陸市場へアクセスできる位置が、保管・加工・配送の集積を支えます。'},
  '観光':{overview:'アドリア海沿岸の海岸観光と、チロル州のアルプス山地観光が離れて分布します。',reason:'海岸・山地の景観、季節の気候、交通アクセスと宿泊施設の蓄積が需要の分布に関わります。EurostatとStatistics Austriaの値は対象範囲が異なり、合算しません。'},
  '金融':{overview:'ロンドンの金融・専門サービス街とフランクフルトの欧州中央銀行に金融機能が集まります。',reason:'金融機関や専門人材、企業・行政との近接が都市への集積を支えます。二地点の機能は異なり、点の数は金融雇用や取引額ではありません。'},
  '繊維・衣服':{overview:'ポルトガル北部のポルト・ブラガ周辺とイタリア中部のプラートに繊維・衣服の産業地区があります。',reason:'製造技術と熟練労働、設計から生産までの事業者の連携が立地を支えます。掲載地区は欧州全体の企業数順位ではありません。'},
  '食品加工':{overview:'イタリア北部のパルマ周辺に食品製造・研究開発、オランダ東部のワーヘニンゲン周辺に食品技術の産学集積があります。',reason:'原料調達、加工設備、技術と流通が結び付きます。製造拠点と研究集積を同一の生産量として扱いません。'},
};

export const europeIndustrySectors = ['resources','manufacturing','services'] as const;
export type EuropeIndustrySector = typeof europeIndustrySectors[number];
export const europeIndustrySectorCopy:Record<EuropeIndustrySector,{label:string;overview:string;reason:string;groups:readonly EuropeIndustryGroup[];labels:readonly string[]}> = {
 resources:{label:'資源・エネルギー',overview:'北海・ノルウェー海の石油・ガス、北部スウェーデンの鉄鉱石、ポーランド南西部の銅が離れて分布します。沿岸のガス処理と石油精製、銅の精錬、北欧の木質燃料、水力とフランス北部の原子力は、採った資源を使える素材・燃料・電力へ変える拠点です。',reason:'鉱床・海底資源・森林・水系の位置と、港・加工設備・送電への接続が立地を支えます。原料を採る場所と利用可能な状態にする場所を分けて読みます。鉱石・燃料・電力は単位が異なり、点の数を生産量として比較しません。',groups:['エネルギー','鉱業・素材','銅','発電'],labels:['johan','ormen','nyhamna','pernis','kiruna','kaukas','lubin','glogow','kvilldal','gravelines']},
 manufacturing:{label:'製造業',overview:'ドイツ南部からチェコの自動車、フランス・ドイツ・ルーマニアの航空機、ライン川沿いの化学、デンマークの医薬品が見られます。北欧の木材・通信機器、オランダの半導体装置、ポルトガルとイタリアの繊維、北イタリアの食品加工、ポーランドの銅精錬にも異なる集積があります。',reason:'部品・原料の調達、専門技能、研究開発、交通と市場への接続が生産拠点を結びます。港の石油精製は燃料と化学原料を作り、銅精錬は加工に使う素材を作ります。調達先を確認できない組合せの輸送線は描きません。',groups:['自動車・機械','化学・医薬品','航空機','繊維・衣服','食品加工','鉱業・素材','銅','エネルギー'],labels:['munich','mlada','toulouse','hamburg','brasov','ludwigshafen','kalundborg','veldhoven','oulu','kaukas','portugal_textile','prato_textile','parma_food','glogow','pernis']},
 services:{label:'サービス業',overview:'北海の港には海上・内陸物流、ロンドンとフランクフルトには金融機能が集まります。北欧の通信・デジタル研究とオランダの食品研究には人と情報が集まり、アドリア海沿岸とアルプスには海岸・山地の観光需要が分布します。',reason:'港と内陸交通、企業・行政と専門人材、大学・研究機関の交流が活動を集めます。観光は景観・季節・交通と宿泊施設の蓄積に支えられます。施設の所在地と広域の宿泊統計を区別し、点の数でサービス雇用を比較しません。',groups:['港湾物流','金融','情報・研究','観光'],labels:['rotterdam','hamburg','london_finance','frankfurt','oulu','kista','wageningen_food','adriatic_tourism','tyrol_tourism']},
};
/** Per-site membership separates extraction from manufacture; shared IDs keep coordinates identical. */
const sectorSites:Record<EuropeIndustrySector,readonly string[]> = {
 resources:['johan','ormen','nyhamna','pernis','kiruna','kaukas','lubin','glogow','kvilldal','gravelines'],
 manufacturing:['rotterdam','ludwigshafen','kaukas','munich','mlada','kvasiny','toulouse','hamburg','brasov','veldhoven','kalundborg','oulu','portugal_textile','prato_textile','parma_food','pernis','glogow'],
 services:['rotterdam','hamburg','frankfurt','london_finance','adriatic_tourism','tyrol_tourism','oulu','kista','wageningen_food'],
};
export function normaliseEuropeIndustrySector(value:unknown):EuropeIndustrySector|undefined{return europeIndustrySectors.find(sector=>sector===value);}
export function europeIndustrySectorForGroup(group:EuropeIndustryGroup|undefined):EuropeIndustrySector{return group&&europeIndustrySectorCopy.resources.groups.includes(group)?'resources':group&&europeIndustrySectorCopy.manufacturing.groups.includes(group)?'manufacturing':group&&europeIndustrySectorCopy.services.groups.includes(group)?'services':'resources';}
export function europeIndustryInSector(id:string,sector:EuropeIndustrySector){return sectorSites[sector].includes(id);}
export function europeIndustryGroupsForSite(id:string,sector:EuropeIndustrySector){return (europeIndustryMembership[id]??[]).filter(group=>europeIndustrySectorCopy[sector].groups.includes(group));}
export const europeIndustrySiteLabels:Record<string,string>={johan:'石油採取',ormen:'ガス採取',nyhamna:'ガス処理',pernis:'石油精製',kiruna:'鉄鉱石',kaukas:'木材・パルプ',lubin:'銅採鉱',glogow:'銅精錬',kvilldal:'水力発電',gravelines:'原子力発電',veldhoven:'半導体装置',oulu:'通信技術',kista:'情報・研究',kalundborg:'医薬品',wageningen_food:'食品研究'};
export const europeIndustrySiteRelations:Record<string,Partial<Record<EuropeIndustrySector,string>>>={
 pernis:{resources:'利用可能な状態へ：輸入原油を燃料と石油化学原料に変える精製・貯蔵の拠点です。原油の産出地をこの点から推定しません。',manufacturing:'何を作るか：精製工程と化学生産が同じ場所にあり、燃料と化学製品の原料・製品を作ります。'},
 glogow:{resources:'利用可能な状態へ：銅精鉱から粗銅を得て、電解精製した銅を作る工程です。',manufacturing:'調達・用途：ポーランドの鉱山・選鉱工程の精鉱を使い、加工用の電気銅を作ります。鉱石採取そのものとは別工程です。'},
 kaukas:{resources:'利用可能な状態へ：木材加工と木質由来の燃料生産が結びつきます。森林被覆と工場所在地は別の情報です。',manufacturing:'調達・用途：木材を加工してパルプを作り、紙・包装などの材料にします。'},
 oulu:{manufacturing:'何を作るか：Nokiaの2025年資料は5G無線・ベースバンド製品の新製品導入と製造を説明しています。',services:'人・情報の集積：無線技術・ソフトウェア・標準化の研究開発が企業と技術者を集めます。'},
 wageningen_food:{services:'人・情報の集積：食品企業、研究機関、行政をつなぐ研究・事業化の集積です。研究機能を食品の製造量に置き換えません。'},
 hamburg:{services:'物流の集積：海港・内陸交通を介する港湾機能を読みます。航空機の製造工程は製造業で扱います。'},
};

export const europeIndustryServiceSources:Record<string,{url:string;label:string;body:string}>={
 rotterdam:{url:'https://www.portofrotterdam.com/en/logistics',label:'ロッテルダム港：物流・内陸接続',body:'北海の海港に船舶輸送、鉄道・内陸水運、保管・積替えの機能が集まります。港の設備と内陸交通が貨物をつなぎます。製造業の化学工程と区別し、点や線から取扱量は推定しません。'},
 hamburg:{url:'https://www.hamburg-port-authority.de/en/',label:'Hamburg Port Authority：港湾・鉄道・道路',body:'ハンブルク港では水路、港湾鉄道、道路の施設を介して貨物輸送・港湾管理が集まります。航空機を製造する拠点と同じ都市圏ですが、ここでは海港と内陸交通のサービス機能を読みます。'},
};

export function europeIndustrySectorForSite(id:string|undefined):EuropeIndustrySector{return europeIndustrySectors.find(sector=>!!id&&europeIndustryInSector(id,sector))??'resources';}

export function europeIndustryGroupReading(group:EuropeIndustryGroup,sector:EuropeIndustrySector){
 if(sector==='manufacturing'&&group==='鉱業・素材')return {overview:'フィンランド南東部のカウカスに木材を加工するパルプ工場があります。北部スウェーデンの鉄鉱石採取は資源・エネルギーで別に読みます。',reason:'木材を加工して紙・包装などに使う繊維原料へ変える工程です。森林被覆と工場所在地を分け、工場の位置から木材の供給圏は推定しません。'};
 if(sector==='manufacturing'&&group==='エネルギー')return {overview:'ペルニスに石油精製と化学、カウカスの工場地区に木質由来の燃料加工があり、異なる原料から使用可能な燃料を作ります。',reason:'原油の精製や木材加工の副産物の利用は、原料・設備・輸送と結び付きます。海上で資源を採る位置は資源・エネルギーで読みます。'};
 if(sector==='manufacturing'&&group==='食品加工')return {overview:'イタリア北部のパルマ周辺に製粉・パスタ工場と食品の研究開発が集まります。ワーヘニンゲンの食品研究集積はサービス業で別に読みます。',reason:'小麦などの原料調達と製粉・食品の加工工程、製品開発が近接します。研究拠点を食品の製造量として集計しません。'};
 return europeIndustryGroupCopy[group];
}
