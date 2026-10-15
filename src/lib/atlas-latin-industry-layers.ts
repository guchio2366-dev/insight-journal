import raw from '../data/atlas/latin-america/industry-sectors.json';

export type LatinIndustrySector='resources'|'manufacturing'|'services';
export type IndustrySourceSite=(typeof raw.sites)[number];
const mineAndProcessing=new Set(['cerro-verde','araxa-niobium','catalao-niobium']);

/** Declared map memberships retain the resource chain and its related processing references. */
export function industrySiteViews(sector:string){
 return raw.sites.flatMap(site=>{
  const mining=mineAndProcessing.has(site.id),energy=site.industry==='hydro';
  const belongs=sector==='services'?site.stageKind==='service':sector==='resources'?
   site.sectors.includes('resources')||mining||energy:
   sector==='manufacturing'&&site.stageKind==='processing'&&!energy;
  if(!belongs)return [];
  const stage=sector==='resources'&&mining?(site.industry==='copper'?'銅鉱石の採掘':'ニオブ鉱の採掘'):
   sector==='manufacturing'&&mining?(site.industry==='copper'?'選鉱・電解採取':'フェロニオブ製造'):site.stage;
  return [{...site,sourceStage:site.stage,stage,stageKind:sector==='resources'&&mining?'extraction':site.stageKind,mapSector:sector}];
 });
}
export const industryIdsInSector=(sector:string)=>new Set(industrySiteViews(sector).map(s=>s.industry));
export const industrySectorsForSite=(id:string)=>(['resources','manufacturing','services'] as const).filter(sector=>industrySiteViews(sector).some(s=>s.id===id));
export const industryReferenceSites=(sector:string)=>sector==='manufacturing'?raw.sites.filter(s=>s.industry==='shrimp'&&s.stageKind==='extraction'):[];
export function industryNameInSector(id:string,sector:string){
 const phaseNames:Record<string,Record<string,string>>={copper:{resources:'銅（採掘・加工）',manufacturing:'選鉱・銅精製'},lithium:{resources:'リチウム資源・化合物',manufacturing:'リチウム化合物'},niobium:{resources:'ニオブ鉱',manufacturing:'フェロニオブ'}};
 return phaseNames[id]?.[sector]??raw.industries.find(i=>i.id===id)?.label??id;
}

export type IndustryMapCaption={id:string;sector:LatinIndustrySector;place:string;text:string;sites:string[]};
/** A few sourced geographic captions are reading aids, not a menu of products. */
export const industryMapCaptions:IndustryMapCaption[]=[
 {id:'andes-copper',sector:'resources',place:'チリ・ペルー',text:'銅鉱石',sites:['chuquicamata','cerro-verde']},
 {id:'andes-lithium',sector:'resources',place:'アンデスの塩湖',text:'リチウム',sites:['atacama','jujuy-lithium','salta-lithium','catamarca-lithium']},
 {id:'brazil-metals',sector:'resources',place:'ブラジル',text:'鉄鉱石・ニオブ',sites:['minas-iron','araxa-niobium','catalao-niobium']},
 {id:'brazil-oil',sector:'resources',place:'ブラジル沖',text:'原油',sites:['santos-basin']},
 {id:'guyana-oil',sector:'resources',place:'ガイアナ沖',text:'原油',sites:['liza-oil']},
 {id:'parana-hydro',sector:'resources',place:'パラナ川',text:'水力',sites:['itaipu']},
 {id:'colombia-coal',sector:'resources',place:'コロンビア',text:'石炭',sites:['guajira-coal','cesar-coal']},
 {id:'para-bauxite',sector:'resources',place:'パラ州',text:'ボーキサイト',sites:['paragominas']},
 {id:'cr-medical',sector:'manufacturing',place:'コスタリカ',text:'医療機器',sites:['heredia','coyol','cartago']},
 {id:'peru-fish',sector:'manufacturing',place:'ペルー沿岸',text:'魚粉・魚油',sites:['chimbote-fishmeal','callao-fishmeal','pisco-fishmeal','chimbote-fish-oil','pisco-fish-oil']},
 {id:'sp-factories',sector:'manufacturing',place:'サンパウロ州',text:'車・航空機・果汁',sites:['sorocaba-auto','sjc-aviation','gaviao','botucatu-aviation','catanduva-juice','sp-juice']},
 {id:'rosario-soy',sector:'manufacturing',place:'ロサリオ圏',text:'大豆加工',sites:['vgg','san-martin-food']},
 {id:'ecuador-shrimp',sector:'manufacturing',place:'エクアドル',text:'冷凍エビ',sites:['duran-shrimp']},
 {id:'brazil-food-fuel',sector:'manufacturing',place:'ブラジル中西部',text:'肉・エタノール',sites:['mt-beef','goias-beef','mt-corn-ethanol','goias-ethanol']},
 {id:'para-aluminum',sector:'manufacturing',place:'パラ州',text:'アルミナ・製錬',sites:['alunorte','albras']},
 {id:'uruguay-pulp',sector:'manufacturing',place:'ウルグアイ',text:'パルプ',sites:['paso','fray']},
 {id:'panama-logistics',sector:'services',place:'パナマ',text:'運河・物流',sites:['panama-canal']},
 {id:'cr-services',sector:'services',place:'コスタリカ',text:'企業サービス',sites:['heredia-corporate','sj-corporate']},
 {id:'caribbean-tourism',sector:'services',place:'カリブ地域',text:'観光',sites:['montego','la-romana','nassau-tourism']},
 {id:'sp-finance',sector:'services',place:'サンパウロ',text:'金融',sites:['b3']},
 {id:'recife-it',sector:'services',place:'ペルナンブコ州',text:'IT',sites:['recife','caruaru']},
];

const shortPlaces:Record<string,string>={
 'chuquicamata':'チュキカマタ','cerro-verde':'セロ・ベルデ','atacama':'アタカマ塩湖','salar-carmen':'サラール・デル・カルメン',
 'carajas':'カラジャス','paragominas':'パラゴミナス','albras':'バルカレナ','alunorte':'バルカレナ','santos-basin':'サントス海盆',
 'replan':'パウリニア','reduc':'ドゥケ・デ・カシアス','revap':'サンジョゼ周辺','itaipu':'イタイプ','tubarao':'ツバロン','contagem':'コンタジェン',
 'zarate':'サラテ','gaviao':'ガビアン・ペイショト','paso':'パソ・デ・ロス・トロス','fray':'フライ・ベントス','heredia':'エレディア',
 'coyol':'コヨル','cartago':'カルタゴ','b3':'サンパウロ','byma':'ブエノスアイレス','recife':'レシフェ','caruaru':'カルアル',
 'panama-canal':'パナマ運河','montevideo-pulp':'モンテビデオ','montego':'モンテゴベイ','la-romana':'ラ・ロマーナ',
 'vgg':'ロサリオ圏','san-martin-food':'ロサリオ圏','bahia-logistics':'バイアブランカ','madeira-logistics':'サンルイス圏',
 'araxa-niobium':'アラシャ','catalao-niobium':'カタロン','neuquen-oil':'ネウケン州','liza-oil':'リザ油田','madeira-hydro':'マデイラ川',
 'tres-lagoas-pulp':'トレスラゴアス','catanduva-juice':'カタンドゥバ','sorocaba-auto':'ソロカバ','sjc-aviation':'サンジョゼ周辺','botucatu-aviation':'ボツカツ',
 'chimbote-fishmeal':'チンボテ','callao-fishmeal':'カヤオ','pisco-fishmeal':'ピスコ','chimbote-fish-oil':'チンボテ','pisco-fish-oil':'ピスコ',
 'londrina-coffee':'ロンドリーナ','heredia-corporate':'エレディア','sj-corporate':'サンホセ圏','nassau-tourism':'ナッソー','duran-shrimp':'ドゥラン',
};
export function industryPlaceName(site:{id:string;place:string;regionIds?:string[]}){
 return shortPlaces[site.id]??raw.regions.find(r=>site.regionIds?.includes(r.id))?.label??site.place;
}
export function industryClusterName(sites:{id:string;place:string;country:string;regionIds?:string[]}[]){
 const names=[...new Set(sites.map(industryPlaceName))];if(names.length===1)return names[0];
 const countries:Record<string,string>={Brazil:'ブラジル',Argentina:'アルゼンチン',Chile:'チリ',Peru:'ペルー',Ecuador:'エクアドル',Colombia:'コロンビア','Costa Rica':'コスタリカ',Uruguay:'ウルグアイ',Panama:'パナマ'};
 return (countries[sites[0].country]??sites[0].country)+'・'+sites.length+'例';
}
