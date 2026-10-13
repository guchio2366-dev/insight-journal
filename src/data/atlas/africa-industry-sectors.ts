import {africaIndustryLocations,africaIndustryCommodities,type AfricaIndustryLocation} from './africa-industry-locations.ts';

export type AfricaIndustrySector='resources'|'manufacturing'|'services';
export type IndustrySource={label:string;url:string};
export type AfricaSectorIndustry={id:string;sector:AfricaIndustrySector;label:string;color:string;reading:string;reason:string;sources:readonly IndustrySource[]};
export type AfricaSectorSite=AfricaIndustryLocation & {roles:readonly {sector:AfricaIndustrySector;industry:string;stage:string}[]};
const source=(label:string,url:string):IndustrySource=>({label,url});
const ibm=source('IBM Research Africa・拠点と研究分野（2026年10月確認）','https://research.ibm.com/labs/africa');
const kengen=source('KenGen・Olkaria地熱発電と送電（2026年10月確認）','https://www.kengen.co.ke/our-business/energy-generation/geothermal/');
const quantum=source('First Quantum・Kansanshi採掘と精錬（2026年10月確認）','https://www.first-quantum.com/operations/kansanshi/');
const dangote=source('Dangote・Ibeju-Lekkiの精製・肥料施設（2026年5月20日）','https://www.dangote.com/refinery-listing-will-democratise-africas-industrial-prosperity-dangote/');
const bonny=source('米国商務省ITA・Bonny IslandのLNG加工（2025年9月8日）','https://www.trade.gov/country-commercial-guides/nigeria-oil-gas-and-mining-sectors');

export const africaIndustrySectors:readonly {id:AfricaIndustrySector;label:string;overview:string;why:string}[]=[
 {id:'resources',label:'資源',overview:'資源が採れる場所と、エネルギーとして使える場所を読む',why:'地下の地質が油・ガスや鉱石の位置を決めます。採掘だけでは製品にならず、選鉱・精錬・輸送や電力が必要です。地熱は地下の熱を発電に使い、送電網へ接続します。丸は採掘地域、四角は加工・発電の利用拠点です。'},
 {id:'manufacturing',label:'製造業',overview:'何を作り、どこから原料を受け取り、どこで使うかを読む',why:'銅の精錬、油・ガスの加工、肥料、食品、自動車・航空機、衣料は異なる工程です。原料に近い立地に加え、電力・技能・市場・供給網・港への接続が製造を支えます。カンサンシの銅やソヨのガスは資源と加工の両方に関わります。'},
 {id:'services',label:'サービス業',overview:'人・情報・物が集まり、企業や暮らしを支える場所を読む',why:'ナイロビの金融と情報技術、カサブランカの金融・専門サービス、ヨハネスブルクの企業・研究、ラゴスの港湾物流は、都市の人材・取引・通信・市場を結びます。工場や採掘とは役割が異なり、港湾では食品加工と物流が重なります。'}
];
export const africaIndustryMapScope='点は資料で確認した産地・加工地域・都市の代表位置。点の大きさは産出量・雇用・GDPを表しません。産地境界や物流経路は描いていません。';
const existing=(id:string)=>africaIndustryCommodities.find(row=>row.id===id)!;
const manufacturing=(id:string,label:string,color:string,reading:string,reason:string,sources:readonly IndustrySource[]):AfricaSectorIndustry=>({id,sector:'manufacturing',label,color,reading,reason,sources});
export const africaSectorIndustries:readonly AfricaSectorIndustry[]=[
 ...africaIndustryCommodities.filter(row=>['energy','metals','gems'].includes(row.kind)).map(row=>({id:row.id,sector:'resources' as const,label:row.label,color:row.color,reading:row.reading,reason:row.selectionReason,sources:row.sources})),
 {id:'electricity',sector:'resources',label:'地熱・発電',color:'#547f48',reading:'オルカリアでは地溝帯の地下熱から蒸気を取り出し、発電して国の送電網へ接続します。',reason:'採掘量ではなく、熱を利用できる発電地域を採用。送電経路や発電量の面は推定しません。',sources:[kengen]},
 manufacturing('copper-smelting','銅精錬','#aa6b45','カンサンシでは採掘と銅精錬が重なります。銅は電線・電動車・再生可能エネルギー設備などへ使われます。','鉱石の採掘と金属へ加工する工程を分けて読むために採用。地点の規模や物流経路は未取得。',[quantum]),
 manufacturing('oil-refining','石油精製・石化','#a76464','ラゴス東部では原油を燃料や石油化学製品へ加工します。原油の採掘地域と、製品を作る場所は同じではありません。','Dangoteが所在地と製品に言及するIbeju-Lekki周辺を採用。能力・販売量は点へ換算しません。',[dangote]),
 manufacturing('gas-processing','ガス処理・LNG','#9b8745','ソヨとボニー島では天然ガスを加工・液化し、輸送や利用へつなぎます。ガス田の点とは工程が異なります。','既存ソヨとITAが明記するボニー島の操業施設を採用。将来の増設計画を現在の能力へ足しません。',[...existing('gas').sources,bonny]),
 manufacturing('fertilizer','肥料','#718c48','ラゴス東部には肥料製造施設があります。肥料は農業の生産に用いる投入材で、原料・エネルギー・販路への接続が必要です。','資料が実在を確認するDangote Fertiliserを採用。訪問資料だけでは化学工程や地点別生産量を確定しません。',[dangote]),
 manufacturing('automotive','自動車','#4e8798','タンジェと南アフリカの製造地域では、自動車・部品を作ります。技能と部品供給網、国内外の市場への接続が重要です。',existing('automotive-aerospace').selectionReason,existing('automotive-aerospace').sources),
 manufacturing('aerospace','航空機関連','#6e73a3','カサブランカ周辺では航空機関連の部品・製造が集積し、技能、企業の供給網、空港との接続を使います。','既存のモロッコ航空機産業資料が示す地域を、自動車の拠点から分けて表示します。',existing('automotive-aerospace').sources),
 ...['textile-apparel','food-processing'].map(id=>{const row=existing(id);return manufacturing(id,row.label,row.color,row.reading,row.selectionReason,row.sources);}),
 {id:'finance',sector:'services',label:'金融・専門サービス',color:'#7c6598',reading:'ナイロビの証券取引とカサブランカの金融・専門サービスは、都市の企業・人材・情報の集積を利用します。',reason:'取引所の所在地と金融拠点の公表資料を使用。都市GDPや雇用規模は推定しません。',sources:africaIndustryLocations.filter(row=>['nairobi-services','casablanca-services'].includes(row.id)).flatMap(row=>row.sources)},
 {id:'business-services',sector:'services',label:'企業サービス',color:'#87734d',reading:'ヨハネスブルクでは鉱業の歴史を背景に企業活動が集まります。企業を支える都市の市場と技能を読みます。',reason:'既存の世界銀行都市経済資料の範囲に限定。金融取引所や都市全体の規模へ置き換えません。',sources:africaIndustryLocations.find(row=>row.id==='johannesburg-services')!.sources},
 {id:'digital',sector:'services',label:'情報技術・研究',color:'#3f7f93',reading:'IBMのナイロビとヨハネスブルクの研究拠点は、計算技術を水・農業・交通・医療などへ使い、産学官との連携を行います。',reason:'実在する二つの研究拠点と研究分野を採用。全都市のIT企業分布や話題の投資計画は推定しません。',sources:[ibm]},
 {id:'logistics',sector:'services',label:'港湾物流',color:'#498469',reading:'ラゴスのアパパ港では海運と道路・鉄道・水路が接続し、原料・製品を運ぶ物流を支えます。',reason:'港湾庁の既存公表資料を採用。製造と物流の重なりを残し、輸送経路や取扱量は描きません。',sources:africaIndustryLocations.find(row=>row.id==='lagos')!.sources}
];

const role=(sector:AfricaIndustrySector,industry:string,stage:string)=>({sector,industry,stage});
function roles(row:AfricaIndustryLocation){
 if(row.geographicScope==='country')return [];
 if(row.id==='soyo-gas')return [role('resources','gas','加工・利用'),role('manufacturing','gas-processing','ガス加工・LNG')];
 if(row.id==='lagos')return [role('manufacturing','food-processing','砂糖・塩・製粉'),role('services','logistics','港湾物流')];
 if(row.id==='casablanca-industry')return [role('manufacturing','aerospace','航空機関連製造')];
 if(row.commodityIds?.includes('automotive-aerospace'))return [role('manufacturing','automotive','自動車・部品製造')];
 if(row.commodityIds?.includes('urban-services'))return [role('services',row.id==='johannesburg-services'?'business-services':'finance','都市のサービス')];
 return (row.commodityIds??[]).map(id=>role(row.kind==='manufacturing'?'manufacturing':'resources',id,row.kind==='manufacturing'?'製造':'採掘'));
}
function added(id:string,label:string,coordinates:[number,number],reading:string,note:string,sources:readonly IndustrySource[],roles: AfricaSectorSite['roles'],period='2026年10月確認'):AfricaSectorSite {
 return {id,label,mapLabel:label,kind:'manufacturing',coordinates,title:label,reading,note,scope:africaIndustryMapScope,sources,roles,evidencePeriod:period,status:'production',geographicScope:'region'};
}
export const africaSectorSites:readonly AfricaSectorSite[]=[
 ...africaIndustryLocations.map(row=>({...row,roles:roles(row)})),
 added('kansanshi-copper','カンサンシ：銅採掘・精錬',[26.4,-12.1],'カンサンシはソルウェジ近郊の銅・金の採掘地域で、2015年に銅精錬所が稼働しました。鉱石を金属へ加工し、電線や電動車などの材料へつなぎます。','ソルウェジ近郊の概略代表位置（0.1度）。鉱山・炉の実測座標や鉱区境界ではありません。',[quantum],[role('resources','copper-cobalt','銅採掘'),role('manufacturing','copper-smelting','銅精錬')]),
 added('olkaria-power','オルカリア：地熱発電',[36.3,-.9],'ナイバシャ湖に隣接するオルカリアでは、地下の熱から得た蒸気で発電し、国の送電網へ接続します。地質だけでなく掘削・発電・送電の設備が、使える電力を支えます。','KenGenが公表する地域の概略代表位置（0.1度）。発電所群や熱資源の境界、送電経路ではありません。',[kengen],[role('resources','electricity','地熱を利用した発電')]),
 added('lekki-refining','ラゴス東部：石油精製・石化',[3.9,6.5],'DangoteはIbeju-Lekkiの精製施設と、燃料・石油化学製品の製造を公表しています。採掘地から原油を受け、利用先が必要とする製品へ加工する段階です。','Ibeju-Lekki周辺の概略代表位置（0.1度）。個別炉・敷地の実測位置や原油の輸送経路は示しません。',[dangote],[role('manufacturing','oil-refining','燃料・石油化学製品の加工')],'2026年5月20日'),
 added('lekki-fertilizer','ラゴス東部：肥料製造',[3.9,6.5],'2026年5月のDangote公表資料はラゴスの肥料施設への訪問を記録しています。農業へ供給する投入材の製造拠点として、精製施設と同じ周辺地域に示します。','地域の重なりは代表位置を共有するためで、工場敷地の一致を示しません。資料だけでは化学工程・生産量を確定しません。',[dangote],[role('manufacturing','fertilizer','肥料製造')],'2026年5月20日'),
 added('bonny-lng','ボニー島：ガス処理・LNG',[7.2,4.4],'ITAはボニー島のNLNG施設で六つのLNG生産設備が操業すると記録しています。採掘したガスを液化し輸送へつなぐ工程です。増設計画は現在の操業から分けて読みます。','ボニー島周辺の概略代表位置（0.1度）。ガス田の位置、敷地、パイプラインや輸送先の面は示しません。',[bonny],[role('manufacturing','gas-processing','LNG生産')],'2025年9月8日'),
 ...([['nairobi-digital','ナイロビ：情報技術研究',[36.8,-1.3]],['johannesburg-digital','ヨハネスブルク：情報技術研究',[28,-26.2]]] as const).map(([id,label,coordinates])=>added(id,label,[...coordinates], 'IBMはこの都市の研究拠点の所在地と、水・農業・交通・医療・金融包摂などに使う計算技術の研究を公表しています。人材と産学官の連携が情報を使う仕事を支えます。','既存の都市代表位置を共用。研究所の番地の実測座標、全IT企業の分布や雇用量ではありません。',[ibm],[role('services','digital','情報技術研究')]))
];
export const africaIndustryNationalReferences=africaSectorSites.filter(row=>row.geographicScope==='country');
export const africaSectorSiteById=(id:string)=>africaSectorSites.find(row=>row.id===id);
export const africaSectorIndustryById=(id:string)=>africaSectorIndustries.find(row=>row.id===id);
export const africaIndustrySectorSites=(sector:AfricaIndustrySector)=>africaSectorSites.filter(row=>row.roles.some(role=>role.sector===sector));
/** Old combined categories remain valid inbound links, now resolved to an explicit role. */
export function canonicalAfricaIndustry(id:string,site=''){
 if(id==='automotive-aerospace')return site==='casablanca-industry'?'aerospace':'automotive';
 if(id==='urban-services')return site==='lagos'?'logistics':site==='johannesburg-services'?'business-services':'finance';
 return africaSectorIndustryById(id)?.id??'';
}
export function canonicalAfricaIndustrySector(requested:string,industry='',site=''):AfricaIndustrySector {
 const valid=africaIndustrySectors.find(row=>row.id===requested)?.id;
 return valid??africaSectorIndustryById(canonicalAfricaIndustry(industry,site))?.sector??africaSectorSiteById(site)?.roles[0]?.sector??'resources';
}
