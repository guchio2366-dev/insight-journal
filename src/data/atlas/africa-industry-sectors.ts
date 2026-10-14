import {africaIndustryLocations,africaIndustryCommodities,type AfricaIndustryLocation} from './africa-industry-locations.ts';
import {africaIndustryExpanded,africaIndustryRetiredCombinedIds} from './africa-industry-expanded.ts';
import {africaIndustryApprovedSites} from './africa-industry-approved-sites.ts';

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
 {id:'resources',label:'資源・エネルギー',overview:'南部の銅帯と白金族・クロム岩体、ギニアのボーキサイト、モロッコのリン鉱石、ギニア湾岸の原油・ガスが異なる供給網をつくります。',why:'コンゴ民主共和国南部の銅・コバルトと南アフリカのブッシュフェルト岩体は地質による集積で、銅精錬・電池材料や鉄合金への加工には別の電力・輸送条件が必要です。'},
 {id:'manufacturing',label:'製造業',overview:'モロッコ北部の自動車・航空機とリン酸肥料、エジプトの鉄鋼・セメント、東西アフリカの衣料・食品加工が港や都市市場に集まります。',why:'タンジェの組立とジョルフ・ラスファルの肥料は欧州向け港湾と投入材、スエズの鉄鋼・セメントは港・ガス・都市建設需要に結び付きます。'},
 {id:'services',label:'サービス業',overview:'タンジェ・メッドとスエズの物流、ナイロビの決済、アビジャンの地域証券取引、マラケシュ・ルクソールの観光が異なる地理条件を使います。',why:'タンジェ・メッドは海峡の航路、アビジャンは8加盟国の市場接続、マラケシュとルクソールは歴史資産が立地の核です。ナイロビの事業者住所はサービス利用地域とは異なります。'}
];
export const africaIndustryMapScope='点は資料で確認した産地・加工地域・都市の代表位置。点の大きさは産出量・雇用・GDPを表しません。産地境界や物流経路は描いていません。';
const existing=(id:string)=>africaIndustryCommodities.find(row=>row.id===id)!;
const manufacturing=(id:string,label:string,color:string,reading:string,reason:string,sources:readonly IndustrySource[]):AfricaSectorIndustry=>({id,sector:'manufacturing',label,color,reading,reason,sources});
export const africaSectorIndustries:readonly AfricaSectorIndustry[]=[
 ...africaIndustryCommodities.filter(row=>['energy','metals','gems'].includes(row.kind)&&!africaIndustryRetiredCombinedIds.includes(row.id as typeof africaIndustryRetiredCombinedIds[number])).map(row=>({id:row.id,sector:'resources' as const,label:row.id==='gas'?'天然ガス・液化天然ガス（LNG）':row.label,color:row.color,reading:row.reading,reason:row.selectionReason,sources:row.sources})),
 {id:'electricity',sector:'resources',label:'地熱・再生可能電力',color:'#547f48',reading:'ケニアのオルカリアでは地溝帯の地下熱、エジプトのアスワン近郊では砂漠の強い日射を発電に使い、送電網へ接続します。',reason:'オルカリアVの設備容量172MWとベンバン複合地区1.8GWは設備能力で、発電量や世界シェアではありません。',sources:[kengen,{label:'Masdar・ベンバン太陽光',url:'https://masdar.ae/en/renewables/our-projects/benban'}]},
 manufacturing('copper-smelting','銅精錬','#aa6b45','カンサンシでは採掘と銅精錬が重なります。銅は電線・電動車・再生可能エネルギー設備などへ使われます。','鉱石の採掘と金属へ加工する工程を分けて読むために採用。地点の規模や物流経路は未取得。',[quantum]),
 manufacturing('oil-refining','石油精製・石化','#a76464','ラゴス東部では原油を燃料や石油化学製品へ加工します。原油の採掘地域と、製品を作る場所は同じではありません。','Dangoteが所在地と製品に言及するIbeju-Lekki周辺を採用。能力・販売量は点へ換算しません。',[dangote]),
 manufacturing('gas-processing','ガス処理・液化天然ガス（LNG）','#9b8745','ソヨとボニー島では天然ガスを加工・液化し、輸送や利用へつなぎます。ガス田の点とは工程が異なります。','既存ソヨとITAが明記するボニー島の操業施設を採用。将来の増設計画を現在の能力へ足しません。',[...existing('gas').sources,bonny]),
 manufacturing('fertilizer','肥料','#718c48','ラゴス東部には肥料製造施設があります。肥料は農業の生産に用いる投入材で、原料・エネルギー・販路への接続が必要です。','資料が実在を確認するDangote Fertiliserを採用。訪問資料だけでは化学工程や地点別生産量を確定しません。',[dangote]),
 manufacturing('automotive','自動車','#4e8798','タンジェと南アフリカの製造地域では、自動車・部品を作ります。技能と部品供給網、国内外の市場への接続が重要です。',existing('automotive-aerospace').selectionReason,existing('automotive-aerospace').sources),
 manufacturing('aerospace','航空機関連','#6e73a3','カサブランカ周辺では航空機関連の部品・製造が集積し、技能、企業の供給網、空港との接続を使います。','既存のモロッコ航空機産業資料が示す地域を、自動車の拠点から分けて表示します。',existing('automotive-aerospace').sources),
 ...['textile-apparel','food-processing'].map(id=>{const row=existing(id);return manufacturing(id,row.label,row.color,row.reading,row.selectionReason,row.sources);}),
 {id:'finance',sector:'services',label:'金融・専門サービス',color:'#7c6598',reading:'アビジャンには8加盟国の地域証券取引所があり、ナイロビとカサブランカにも金融・専門サービスの拠点があります。都市の企業・人材・情報の集積を利用します。',reason:'アビジャンの取引所は西アフリカ8加盟国を結びます。時価総額は残高で、都市GDPや金融付加価値の代わりにはしません。',sources:[...africaIndustryLocations.filter(row=>['nairobi-services','casablanca-services'].includes(row.id)).flatMap(row=>row.sources),{label:'BRVM・地域証券取引所',url:'https://www.brvm.org/en/node/61597'}]},
 {id:'business-services',sector:'services',label:'企業サービス',color:'#87734d',reading:'ヨハネスブルクには企業の管理・専門サービスが集まり、ケニアの輸出加工区では業務委託サービスの輸出・雇用が記録されます。両者の統計範囲は異なります。',reason:'ケニアの2023年輸出加工区では業務委託が区内雇用の5.98%、輸出の2.95%。ヨハネスブルクの企業サービス量として配賦しません。',sources:[...africaIndustryLocations.find(row=>row.id==='johannesburg-services')!.sources,{label:'ケニア輸出加工区庁・2023年部門別実績',url:'https://epzakenya.com/wp-content/uploads/2024/11/EPZ-Annual-Performance-Report-year-2023_popular-version.pdf'}]},
 {id:'digital',sector:'services',label:'情報技術・研究',color:'#3f7f93',reading:'IBMのナイロビとヨハネスブルクの研究拠点は、計算技術を水・農業・交通・医療などへ使い、産学官との連携を行います。',reason:'実在する二つの研究拠点と研究分野を採用。全都市のIT企業分布や話題の投資計画は推定しません。',sources:[ibm]},
 {id:'logistics',sector:'services',label:'港湾物流',color:'#498469',reading:'ラゴスのアパパ港、ジブラルタル海峡に近いタンジェ・メッド、スエズ運河は異なる海運・市場への結節点です。',reason:'2025年タンジェ・メッド港のコンテナ取扱は約1,111万TEU。港の取扱は物流の付加価値ではありません。',sources:[...africaIndustryLocations.find(row=>row.id==='lagos')!.sources,{label:'タンジェ・メッド港2026年パンフレット',url:'https://www.tangermedport.com/wp-content/uploads/documentation/2026/Brochure-Port-2026-VANG.pdf'}]},
 ...africaIndustryExpanded
];

const role=(sector:AfricaIndustrySector,industry:string,stage:string)=>({sector,industry,stage});
function roles(row:AfricaIndustryLocation){
 if(row.geographicScope==='country')return [];
 if(row.id==='soyo-gas')return [role('resources','gas','加工・利用'),role('manufacturing','gas-processing','ガス加工・LNG')];
 if(row.id==='drc-copper-cobalt')return [role('resources','copper','銅採掘')];
 if(row.id==='zambia-copperbelt')return [role('resources','copper','銅採掘')];
 if(row.id==='bushveld-pgm-chromium')return [role('resources','pgm','白金族採掘')];
 if(row.id==='bisie-tin')return [role('resources','tin','錫石採掘')];
 if(row.id==='lagos')return [role('manufacturing','food-processing','砂糖・塩・製粉'),role('services','logistics','港湾物流')];
 if(row.id==='casablanca-industry')return [role('manufacturing','aerospace','航空機関連製造')];
 if(row.commodityIds?.includes('automotive-aerospace'))return [role('manufacturing','automotive','自動車・部品製造')];
 if(row.commodityIds?.includes('urban-services'))return [role('services',row.id==='johannesburg-services'?'business-services':'finance','都市のサービス')];
 return (row.commodityIds??[]).map(id=>role(row.kind==='manufacturing'?'manufacturing':'resources',({ 'bauxite-iron':row.id.includes('bauxite')?'bauxite':'iron-ore','pgm-chromium':'pgm','copper-cobalt':'copper','tantalum-tin':'tin'} as Record<string,string>)[id]??id,row.kind==='manufacturing'?'製造':'採掘'));
}
function added(id:string,label:string,coordinates:[number,number],reading:string,note:string,sources:readonly IndustrySource[],roles: AfricaSectorSite['roles'],period='2026年10月確認'):AfricaSectorSite {
 return {id,label,mapLabel:label,kind:'manufacturing',coordinates,title:label,reading,note,scope:africaIndustryMapScope,sources,roles,evidencePeriod:period,status:'production',geographicScope:'region'};
}
export const africaSectorSites:readonly AfricaSectorSite[]=[
 ...africaIndustryLocations.map(row=>({...row,roles:roles(row)})),
 added('kansanshi-copper','カンサンシ：銅採掘・精錬',[26.4,-12.1],'カンサンシはソルウェジ近郊の銅・金の採掘地域で、2015年に銅精錬所が稼働しました。鉱石を金属へ加工し、電線や電動車などの材料へつなぎます。','ソルウェジ近郊の概略代表位置（0.1度）。鉱山・炉の実測座標や鉱区境界ではありません。',[quantum],[role('resources','copper','銅採掘'),role('manufacturing','copper-smelting','銅精錬')]),
 added('olkaria-power','オルカリア：地熱発電',[36.3,-.9],'ナイバシャ湖に隣接するオルカリアでは、地下の熱から得た蒸気で発電し、国の送電網へ接続します。地質だけでなく掘削・発電・送電の設備が、使える電力を支えます。','KenGenが公表する地域の概略代表位置（0.1度）。発電所群や熱資源の境界、送電経路ではありません。',[kengen],[role('resources','electricity','地熱を利用した発電')]),
 added('lekki-refining','ラゴス東部：石油精製・石化',[3.9,6.5],'DangoteはIbeju-Lekkiの精製施設と、燃料・石油化学製品の製造を公表しています。採掘地から原油を受け、利用先が必要とする製品へ加工する段階です。','Ibeju-Lekki周辺の概略代表位置（0.1度）。個別炉・敷地の実測位置や原油の輸送経路は示しません。',[dangote],[role('manufacturing','oil-refining','燃料・石油化学製品の加工')],'2026年5月20日'),
 added('lekki-fertilizer','ラゴス東部：肥料製造',[3.9,6.5],'2026年5月のDangote公表資料はラゴスの肥料施設への訪問を記録しています。農業へ供給する投入材の製造拠点として、精製施設と同じ周辺地域に示します。','地域の重なりは代表位置を共有するためで、工場敷地の一致を示しません。資料だけでは化学工程・生産量を確定しません。',[dangote],[role('manufacturing','fertilizer','肥料製造')],'2026年5月20日'),
 added('bonny-lng','ボニー島：ガス処理・LNG',[7.2,4.4],'ITAはボニー島のNLNG施設で六つのLNG生産設備が操業すると記録しています。採掘したガスを液化し輸送へつなぐ工程です。増設計画は現在の操業から分けて読みます。','ボニー島周辺の概略代表位置（0.1度）。ガス田の位置、敷地、パイプラインや輸送先の面は示しません。',[bonny],[role('manufacturing','gas-processing','LNG生産')],'2025年9月8日'),
 ...([['nairobi-digital','ナイロビ：情報技術研究',[36.8,-1.3]],['johannesburg-digital','ヨハネスブルク：情報技術研究',[28,-26.2]]] as const).map(([id,label,coordinates])=>added(id,label,[...coordinates], 'IBMはこの都市の研究拠点の所在地と、水・農業・交通・医療・金融包摂などに使う計算技術の研究を公表しています。人材と産学官の連携が情報を使う仕事を支えます。','既存の都市代表位置を共用。研究所の番地の実測座標、全IT企業の分布や雇用量ではありません。',[ibm],[role('services','digital','情報技術研究')])),
 ...africaIndustryApprovedSites,
 ...[ ['drc-cobalt','drc-copper-cobalt','cobalt','コバルト採掘'],['bushveld-chromium','bushveld-pgm-chromium','chromium','クロム鉱採掘'] ] .map(([id,from,industry,stage])=>{const existing=africaIndustryLocations.find(row=>row.id===from)!;return {...existing,id,label:existing.label+`：${stage}`,mapLabel:stage,roles:[role('resources',industry,stage)],note:`${existing.note} 同じ資料の地域代表位置を別品目の案内にも共有。個別鉱山の座標・産出量の一致ではありません。`};})
];
export const africaIndustryNationalReferences=africaSectorSites.filter(row=>row.geographicScope==='country');
export const africaSectorSiteById=(id:string)=>africaSectorSites.find(row=>row.id===id);
export const africaSectorIndustryById=(id:string)=>africaSectorIndustries.find(row=>row.id===id);
export const africaIndustrySectorSites=(sector:AfricaIndustrySector)=>africaSectorSites.filter(row=>row.roles.some(role=>role.sector===sector));
/** Old combined categories remain valid inbound links, now resolved to an explicit role. */
export function canonicalAfricaIndustry(id:string,site=''){
 if(id==='automotive-aerospace')return site==='casablanca-industry'?'aerospace':'automotive';
 if(id==='urban-services')return site==='lagos'?'logistics':site==='johannesburg-services'?'business-services':'finance';
 if(id==='copper-cobalt')return site==='drc-cobalt'?'cobalt':'copper';
 if(id==='bauxite-iron')return site.includes('sishen')||site.includes('kolomela')?'iron-ore':'bauxite';
 if(id==='pgm-chromium')return site==='bushveld-chromium'?'chromium':'pgm';
 if(id==='tantalum-tin')return site==='bisie-tin'?'tin':'tantalum';
 return africaSectorIndustryById(id)?.id??'';
}
export function canonicalAfricaIndustrySector(requested:string,industry='',site=''):AfricaIndustrySector {
 const valid=africaIndustrySectors.find(row=>row.id===requested)?.id;
 return valid??africaSectorIndustryById(canonicalAfricaIndustry(industry,site))?.sector??africaSectorSiteById(site)?.roles[0]?.sector??'resources';
}
