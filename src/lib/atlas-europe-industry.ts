/** Europe-only industry contract. Country GDP indicators remain supplementary. */
import { europeIndustryGroups, europeIndustryProfiles, type EuropeIndustryGroup } from '../data/atlas/europe/industry-catalog.ts';
export { europeIndustryGroups, type EuropeIndustryGroup };
export const europeIndustryCountries = ['DEU','GBR','FRA','ITA'] as const;
export const europeIndustrySectors = ['resources','manufacturing','services'] as const;
export type EuropeIndustrySector = typeof europeIndustrySectors[number];
export const europeIndustryColors:Record<EuropeIndustryGroup,string>={
 '石油・天然ガス':'#926020','電力供給':'#6c7421','自動車完成車・部品':'#4e70a3','工作機械':'#466b73','基礎・特殊化学':'#80568b','医薬品':'#94596a','民間航空機':'#286c9b','半導体製造装置':'#645aa3','鉄鋼':'#686565','風力発電設備':'#477652','繊維・衣服':'#a55770','食品・飲料加工':'#996720','金融・保険':'#695aa1','観光':'#548364','港湾・物流':'#287d80','ITサービス':'#356b8e','通信ネットワーク機器':'#367b83','鉄鉱石':'#76614d','紙・パルプ・包装紙':'#6a7850','銅採鉱・精錬':'#a65c35','窒素肥料':'#79763c',
};
/** Older URLs resolve to a specific product; split industries remain separate choices. */
const aliases:Record<string,EuropeIndustryGroup>={'エネルギー':'石油・天然ガス','発電':'電力供給','自動車・機械':'自動車完成車・部品','化学・医薬品':'基礎・特殊化学','航空機':'民間航空機','金融':'金融・保険','港湾物流':'港湾・物流','食品加工':'食品・飲料加工','情報・研究':'ITサービス','鉱業・素材':'鉄鉱石','銅':'銅採鉱・精錬'};
export function normaliseEuropeIndustryGroup(value:unknown):EuropeIndustryGroup|undefined{return europeIndustryGroups.find(group=>group===value)??(typeof value==='string'?aliases[value]:undefined);}
export function isEuropeIndustryCountry(code:string){return (europeIndustryCountries as readonly string[]).includes(code);}
export const europeIndustryMembership:Record<string,readonly EuropeIndustryGroup[]>={
 johan:['石油・天然ガス'],ormen:['石油・天然ガス'],nyhamna:['石油・天然ガス'],pernis:['石油・天然ガス','基礎・特殊化学'],kvilldal:['電力供給'],gravelines:['電力供給'],kiruna:['鉄鉱石'],lubin:['銅採鉱・精錬'],glogow:['銅採鉱・精錬'],
 munich:['自動車完成車・部品'],mlada:['自動車完成車・部品'],kvasiny:['自動車完成車・部品'],lombardy_tools:['工作機械'],rotterdam:['基礎・特殊化学','港湾・物流'],ludwigshafen:['基礎・特殊化学'],kalundborg:['医薬品'],toulouse:['民間航空機'],hamburg:['民間航空機','港湾・物流'],brasov:['民間航空機'],veldhoven:['半導体製造装置'],oberkochen:['半導体製造装置'],duisburg_steel:['鉄鋼'],italy_steel:['鉄鋼'],cuxhaven_wind:['風力発電設備'],aalborg_wind:['風力発電設備'],hull_wind:['風力発電設備'],portugal_textile:['繊維・衣服'],prato_textile:['繊維・衣服'],parma_food:['食品・飲料加工'],germany_food:['食品・飲料加工'],france_food:['食品・飲料加工'],spain_food:['食品・飲料加工'],ireland_pharma:['医薬品'],swiss_pharma:['医薬品'],oulu:['通信ネットワーク機器','ITサービス'],kista:['通信ネットワーク機器','ITサービス'],kaukas:['紙・パルプ・包装紙'],sluiskil_fertiliser:['窒素肥料'],
 frankfurt:['金融・保険'],london_finance:['金融・保険'],adriatic_tourism:['観光'],tyrol_tourism:['観光'],wageningen_food:['ITサービス'],ireland_it:['ITサービス'],
};
export function europeIndustryMatches(id:string,group:EuropeIndustryGroup|undefined){return !group||europeIndustryMembership[id]?.includes(group)===true;}
export const europeIndustryGroupCopy=europeIndustryProfiles;
export const europeIndustrySectorCopy:Record<EuropeIndustrySector,{label:string;overview:string;reason:string;groups:readonly EuropeIndustryGroup[];labels:readonly string[];compactLabels:readonly string[]}>={
 resources:{label:'資源・エネルギー',overview:'ノルウェー沖の石油・ガス、北部スウェーデンの鉄鉱石、ポーランド南西部の銅は鉱床に、ノルウェーの水力は水系・落差に立地し、沿岸の処理・精製とフランスの原子力が燃料・電力の供給を支えます。',reason:'資源を採る場所と、使える燃料・素材・電力へ変える設備を分けます。海底資源、鉱床、水系の位置に港・加工・送電網が結び付きます。世界比が小さくても、EUの域内供給は特定の国や企業に集中する場合があります。',groups:['石油・天然ガス','電力供給','鉄鉱石','銅採鉱・精錬'],labels:['johan','nyhamna','kiruna','glogow','kvilldal','gravelines','pernis'],compactLabels:['johan','nyhamna','kiruna','kvilldal','glogow']},
 manufacturing:{label:'製造業',overview:'ドイツ・中東欧の自動車、北イタリアの工作機械・繊維・食品、ライン川沿いの化学、北欧の医薬品・通信機器・紙、北海周辺の風力設備など、原料・港・技能・研究開発と市場が異なる集積を支えます。',reason:'完成品と部品、原料の加工と装置の製造を分けます。ASML・ZEISSの露光装置、航空機の組立と部材、風車のナセルと羽根は、専門技能を分業する例です。一次農業と食品加工も別活動です。実際の調達・輸送量を確認できない線は描きません。',groups:['自動車完成車・部品','工作機械','基礎・特殊化学','医薬品','民間航空機','半導体製造装置','鉄鋼','風力発電設備','繊維・衣服','食品・飲料加工','通信ネットワーク機器','紙・パルプ・包装紙','窒素肥料','銅採鉱・精錬','石油・天然ガス'],labels:['oulu','kaukas','kalundborg','cuxhaven_wind','veldhoven','ludwigshafen','mlada','lombardy_tools','prato_textile','toulouse','portugal_textile'],compactLabels:['oulu','kaukas','kalundborg','veldhoven','mlada','toulouse','portugal_textile']},
 services:{label:'サービス業',overview:'北海の港湾・物流、ロンドンとフランクフルトの金融、アイルランドの国際IT取引と北欧の研究、アドリア海沿岸・アルプスの観光が、交通・制度・専門人材・景観に支えられて分布します。',reason:'物流は港と内陸市場、金融は機関と人材、ITは研究・契約拠点、観光は景観・季節・宿泊設備と結び付きます。付加価値、取引高、宿泊数は別指標です。サービスに物品の生産−使用＝輸出という式を当てません。',groups:['金融・保険','観光','港湾・物流','ITサービス'],labels:['ireland_it','london_finance','rotterdam','frankfurt','kista','adriatic_tourism','tyrol_tourism'],compactLabels:['london_finance','rotterdam','kista','adriatic_tourism','tyrol_tourism']},
};
export const europeIndustryOverviewLabels=europeIndustrySectorCopy.resources.labels;
const sectorSites:Record<EuropeIndustrySector,readonly string[]>={
 resources:['johan','ormen','nyhamna','pernis','kiruna','lubin','glogow','kvilldal','gravelines'],
 manufacturing:['rotterdam','ludwigshafen','kaukas','munich','mlada','kvasiny','toulouse','hamburg','brasov','veldhoven','kalundborg','oulu','kista','portugal_textile','prato_textile','parma_food','germany_food','france_food','spain_food','ireland_pharma','swiss_pharma','pernis','glogow','lombardy_tools','oberkochen','duisburg_steel','italy_steel','cuxhaven_wind','aalborg_wind','hull_wind','sluiskil_fertiliser'],
 services:['rotterdam','hamburg','frankfurt','london_finance','adriatic_tourism','tyrol_tourism','oulu','kista','wageningen_food','ireland_it'],
};
export function normaliseEuropeIndustrySector(value:unknown):EuropeIndustrySector|undefined{return europeIndustrySectors.find(sector=>sector===value);}
export function europeIndustrySectorForGroup(value:EuropeIndustryGroup|undefined):EuropeIndustrySector{const group=normaliseEuropeIndustryGroup(value);return europeIndustrySectors.find(sector=>!!group&&europeIndustrySectorCopy[sector].groups.includes(group))??'resources';}
export function europeIndustryInSector(id:string,sector:EuropeIndustrySector){return sectorSites[sector].includes(id);}
export function europeIndustryGroupsForSite(id:string,sector:EuropeIndustrySector){return (europeIndustryMembership[id]??[]).filter(group=>europeIndustrySectorCopy[sector].groups.includes(group));}
export function europeIndustrySectorForSite(id:string|undefined):EuropeIndustrySector{return europeIndustrySectors.find(sector=>!!id&&europeIndustryInSector(id,sector))??'resources';}
export function europeIndustryGroupReading(group:EuropeIndustryGroup,sector:EuropeIndustrySector){
 if(sector==='manufacturing'&&group==='石油・天然ガス')return {overview:'ロッテルダム港のペルニスでは、原油の搬入・精製・化学設備が近接し、燃料と石油化学原料を作ります。',reason:'ここは資源を採取する海上油田ではなく、輸入原油を加工する工程です。港・貯蔵・連続した加工設備が立地を支えます。地図下のノルウェー輸出統計は別の国・工程の規模です。'};
 if(sector==='manufacturing'&&group==='銅採鉱・精錬')return {overview:'ポーランド南西部のグウォグフには製錬・電解精製設備があり、鉱山・選鉱で得た精鉱を加工用の銅に変えます。',reason:'製造業では素材を作る工程を示します。ルビン周辺の採鉱・選鉱は資源・エネルギーに掲載し、精鉱中の含有銅と電気銅の量を合算しません。'};
 return europeIndustryGroupCopy[group];
}
export const europeIndustrySiteLabels:Record<string,string>={johan:'石油採取',ormen:'ガス採取',nyhamna:'ガス処理',pernis:'石油精製',kiruna:'鉄鉱石',kaukas:'紙・パルプ',lubin:'銅採鉱',glogow:'銅精錬',kvilldal:'水力発電',gravelines:'原子力発電',munich:'自動車',mlada:'自動車',kvasiny:'自動車',lombardy_tools:'工作機械',rotterdam:'化学・港湾',ludwigshafen:'化学',toulouse:'航空機組立',hamburg:'航空機・港湾',brasov:'航空機部材',veldhoven:'半導体装置',oberkochen:'露光光学系',oulu:'通信機器',kista:'通信・IT研究',kalundborg:'医薬品原薬',duisburg_steel:'鉄鋼',italy_steel:'鉄鋼（全国）',cuxhaven_wind:'風車ナセル',aalborg_wind:'風車の羽根',hull_wind:'風車の羽根',sluiskil_fertiliser:'窒素肥料',wageningen_food:'食品技術研究',ireland_it:'ITサービス',frankfurt:'金融・中央銀行',london_finance:'金融・保険',adriatic_tourism:'海岸観光',tyrol_tourism:'山地観光',portugal_textile:'繊維・衣服',prato_textile:'繊維・衣服',parma_food:'食品加工',germany_food:'食品（全国）',france_food:'食品（全国）',spain_food:'食品（全国）',ireland_pharma:'医薬品（輸出）',swiss_pharma:'医薬品（輸出）'};
export const europeIndustrySiteRelations:Record<string,Partial<Record<EuropeIndustrySector,string>>>={
 pernis:{resources:'輸入原油を燃料・石油化学原料へ変える精製工程です。輸入の産出地や量をこの点から推定しません。',manufacturing:'精製と化学の複合拠点です。各製品の量・付加価値は合算していません。'},
 glogow:{resources:'銅精鉱から粗銅・電気銅へ変える製錬・精製工程です。',manufacturing:'採鉱・選鉱で得た精鉱を加工用の銅へ変えます。採鉱と精錬は別工程です。'},
 oulu:{manufacturing:'Nokiaの2025年資料で5G無線・ベースバンド製品の導入と製造を確認した拠点です。',services:'通信技術・ソフトウェア・標準化の研究開発を示します。製造量と研究人数を同じ値にはしません。'},
 kista:{manufacturing:'通信機器に関わる研究・試験・事業化の地区です。稼働工場や機器生産量を示す点ではありません。',services:'企業・研究機関・大学が連携する情報技術の研究地区です。'},
 wageningen_food:{services:'食品の研究・事業化を示す補足拠点です。ITサービスの輸出額・雇用や食品の製造量としては数えません。'},
 hamburg:{services:'同じ都市圏の港湾機能を示します。航空機工場と港の座標は概略の都市圏目印で、敷地境界ではありません。'},
};
export const europeIndustryServiceSources:Record<string,{url:string;label:string;body:string}>={
 rotterdam:{url:'https://www.portofrotterdam.com/en/logistics',label:'ロッテルダム港：物流・内陸接続',body:'北海の海港に船舶輸送、鉄道・内陸水運、保管・積替えの機能が集まります。港の設備と内陸交通が貨物をつなぎます。製造業の化学工程と区別し、点や線から取扱量は推定しません。'},
 hamburg:{url:'https://www.hamburg-port-authority.de/en/',label:'Hamburg Port Authority：港湾・鉄道・道路',body:'ハンブルク港では水路、港湾鉄道、道路の施設を介して貨物輸送・港湾管理が集まります。航空機を製造する拠点と同じ都市圏ですが、ここでは海港と内陸交通のサービス機能を読みます。'},
};
