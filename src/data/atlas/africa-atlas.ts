import countryData from './africa-countries.json' with {type:'json'};
import statistics from './africa-statistics.json' with {type:'json'};
import {themes} from './africa-themes.ts';
import {africaClimateCityById} from './africa-climate-cities.ts';
export type Field = 'nature' | 'agriculture' | 'industry' | 'population';
export type Region = 'all' | 'north' | 'west' | 'central' | 'east' | 'south';
export const countries = countryData;
export const regionNames: Record<Region,string> = {all:'アフリカ全体',north:'北アフリカ',west:'西アフリカ',central:'中央アフリカ',east:'東アフリカ',south:'南部アフリカ'};
export const fields: Record<Field,{label:string;title:string;summary:string}> = {
  nature:{label:'自然環境',title:'雨の量と、利用できる水は同じではない',summary:'国土に降る雨と、国内で生まれる再生可能な淡水を読み比べます。乾燥地域でも、国外を水源とする川や灌漑が暮らしを支える場合があります。'},
  agriculture:{label:'農林業',title:'作物と家畜の分布から、生産を支える条件を読む',summary:'作物の収穫面積・生産量と家畜密度は2020年のモデル分布です。自然条件に加え、管理・交通・市場・土地の制度を考え、国全体の統計とは分けて読みます。'},
  industry:{label:'主要産業',title:'資源の豊かさと、産業の構成を読み比べる',summary:'製造業、鉱業や建設を含む工業、サービス業、天然資源レントを比較します。割合だけでは経済の規模を表せないため、一人当たりGDPも併せて確認できます。'},
  population:{label:'人口',title:'人口の規模、密度、都市化には違う地理がある',summary:'人数は円の面積、人口密度や都市人口率は国の色で表します。広い国の平均密度から都市の混雑を推測せず、人数と割合を切り替えて読みます。'}
};
export type Metric = {id:string;field:Field;label:string;unit:string;breaks:number[];note:string;timeless?:boolean;symbols?:boolean};
export const metrics:Metric[] = [
 {id:'AG.LND.PRCP.MM',field:'nature',label:'年降水量（長期平均）',unit:'mm/年',breaks:[250,500,1000,1500],timeless:true,note:'国土平均の長期的な年降水量。選択年に実際に降った雨や、都市の平年値ではありません。国ごとの基準期間は一律ではありません。'},
 {id:'ER.H2O.INTR.PC',field:'nature',label:'国内の再生可能淡水／人',unit:'m³/人',breaks:[500,1700,5000,15000],note:'国内の降水から生まれる再生可能な河川水・地下水を人口で割った値。国外からの流入、海水淡水化、配水へのアクセスは含まず、飲用可能な量を直接示しません。'},
 {id:'AG.LND.ARBL.ZS',field:'agriculture',label:'耕地の割合',unit:'%（陸地比）',breaks:[5,15,30,50],note:'一時作物、一時的な牧草地・休閑地などの面積が陸地に占める割合。永年作物や恒久的な牧草地は含みません。'},
 {id:'AG.LND.FRST.ZS',field:'agriculture',label:'森林の割合',unit:'%（陸地比）',breaks:[10,25,50,75],note:'FAOの定義に基づく森林面積の割合。天然林と人工林を区別せず、森林の質や木材生産量の指標ではありません。'},
 {id:'AG.YLD.CREL.KG',field:'agriculture',label:'穀物の単位面積収量',unit:'kg/ha',breaks:[1000,2000,3500,5000],note:'乾燥子実として収穫する穀物の生産量／収穫面積。作物構成や灌漑の違いを含む国平均で、農家ごとの生産性ではありません。'},
 {id:'NV.AGR.TOTL.ZS',field:'agriculture',label:'農林水産業の付加価値',unit:'%（GDP比）',breaks:[5,15,25,40],note:'農業・林業・漁業の付加価値がGDPに占める割合。農業就業者の割合や生産量とは異なります。'},
 {id:'NV.IND.MANF.ZS',field:'industry',label:'製造業の付加価値',unit:'%（GDP比）',breaks:[5,10,15,25],note:'製造業の付加価値／GDP。工業全体の内数なので、工業の割合に足し合わせません。'},
 {id:'NV.IND.TOTL.ZS',field:'industry',label:'工業の付加価値',unit:'%（GDP比）',breaks:[15,25,35,50],note:'鉱業、製造業、建設、電気・ガス・水道などを含む工業の付加価値／GDP。'},
 {id:'NV.SRV.TOTL.ZS',field:'industry',label:'サービス業の付加価値',unit:'%（GDP比）',breaks:[30,45,60,75],note:'卸売・小売、交通、金融、行政などのサービスの付加価値／GDP。各部門の合計とGDPには税・補助金等による差があり、必ず100%にはなりません。'},
 {id:'NY.GDP.TOTL.RT.ZS',field:'industry',label:'天然資源レント',unit:'%（GDP比）',breaks:[2,5,15,30],note:'石油・天然ガス・石炭・鉱物・森林の資源価格と採取費用の差を推計したレント／GDP。輸出額や政府の資源収入ではありません。未収録年は過去年の値で埋めません。'},
 {id:'NY.GDP.PCAP.CD',field:'industry',label:'一人当たりGDP',unit:'米ドル（名目）',breaks:[1000,2500,5000,10000],note:'当年価格の米ドルによるGDP／人口。為替と物価の影響を受けるため、時系列を実質所得の伸びと解釈しないでください。'},
 {id:'SP.POP.TOTL',field:'population',label:'人口',unit:'人',breaks:[1000000,10000000,50000000,100000000],symbols:true,note:'年央の居住人口の推計。円の面積は人数に比例します。円の位置は国を示す目印で、都市の人口や居住範囲ではありません。'},
 {id:'EN.POP.DNST',field:'population',label:'人口密度',unit:'人/km²',breaks:[25,75,150,300],note:'年央人口／陸地面積の国平均。居住可能な土地や都市だけを分母にした密度ではありません。'},
 {id:'SP.URB.TOTL.IN.ZS',field:'population',label:'都市人口の割合',unit:'%',breaks:[20,40,60,80],note:'各国の定義する都市地域に住む人口の割合。都市の定義が国により異なるため、都市化の水準の比較には限界があります。'},
 {id:'SP.POP.GROW',field:'population',label:'人口増加率',unit:'%/年',breaks:[0,1,2,3],note:'年央人口の変化から算出する年間の指数増加率。出生だけでなく死亡・移動も反映し、将来予測ではありません。'}
];
export const series = statistics.series as Record<string,Record<string,Record<string,number|null>>>;
export const sources = statistics.sources;
export const years=Array.from({length:25},(_,i)=>2000+i);
export const palette=['#eff3e6','#c6d8ad','#8bb28e','#4f876e','#20564c'];
export function metricById(id:string) { return metrics.find(m=>m.id===id)??metrics[0]; }
export function valueAt(id:string,code:string,year:number):number|null {
  if(!countries.some(c=>c.code===code&&c.statistical))return null;
  const rows=series[id]?.[code];
  if(!rows)return null;
  if(metricById(id).timeless) {
    const last=Object.keys(rows).sort().reverse().find(y=>rows[y]!==null);
    return last?rows[last]:null;
  }
  return rows[String(year)]??null;
}
export function defaultYear(id:string) {
  return [...years].reverse().find(y=>countries.filter(c=>valueAt(id,c.code,y)!==null).length>=40)??2023;
}
/** Latest retained observation for this country and indicator; never fill a missing year. */
export function latestValueAt(id:string,code:string):{year:number;value:number}|null {
  if(!countries.some(c=>c.code===code&&c.statistical))return null;
  const rows=series[id]?.[code];
  if(!rows)return null;
  const year=Object.keys(rows).map(Number).filter(Number.isFinite).sort((a,b)=>b-a).find(y=>rows[String(y)]!==null);
  return year===undefined?null:{year,value:rows[String(year)]!};
}
export function formatValue(value:number|null,metric:Metric):string {
  if(value===null)return '未収録';
  return new Intl.NumberFormat('ja-JP',{maximumFractionDigits:metric.id==='SP.POP.TOTL'?0:value>=1000?0:1}).format(value);
}
export function fillFor(value:number|null,metric:Metric):string {
  if(value===null)return 'url(#africa-missing)';
  if(metric.symbols)return '#eceadf';
  const index=metric.breaks.findIndex(b=>value<b);
  return palette[index<0?palette.length-1:index];
}
export const cropChoices=[{id:'maize',label:'とうもろこし'},{id:'rice',label:'稲'},{id:'wheat',label:'小麦'},{id:'cassava',label:'キャッサバ'},{id:'coffee',label:'コーヒー'},{id:'tea',label:'茶'}] as const;
export const livestockChoices=[{id:'cattle',label:'牛'},{id:'goats',label:'ヤギ'},{id:'sheep',label:'羊'}] as const;
export const cropMeasureChoices=[{id:'harvested',label:'収穫面積'},{id:'production',label:'生産量'}] as const;
export type Crop=typeof cropChoices[number]['id'];
export type Livestock=typeof livestockChoices[number]['id'];
export type CropMeasure=typeof cropMeasureChoices[number]['id'];
export const agriLayerKeys=[
  'crop-maize-harvested','crop-maize-production','crop-rice-harvested','crop-rice-production',
  'crop-wheat-harvested','crop-wheat-production','crop-cassava-harvested','crop-cassava-production',
  'crop-coffee-harvested','crop-tea-harvested','crop-coffee-production','crop-tea-production',
  'livestock-cattle','livestock-goats','livestock-sheep'
] as const;
export type AgriLayerKey=typeof agriLayerKeys[number];
export type State={field:Field;metric:string;year:number;place:string;compare:string;region:Region;zoom:'all'|'region'|'country'|'theme';theme:string;overview:boolean;context:string;topic:string;water:string;river:string;city:string;crop:Crop;livestock:Livestock;cropMeasure:CropMeasure;agriLayers:string|null;agriDisplay:'all'|'crops'|'livestock';agriOutline:boolean;layerClass:string;layerPoint:string;sourceState:string;view:'distribution'|'statistics'};
/** An absent layer list shows all seven products; an explicit empty list means all off. */
export function canonicalAgriLayers(value:unknown):string|null {
  if(typeof value!=='string'||value.length>2048)return null;
  if(value.trim()==='')return '';
  const selected=new Set(value.split(',').map(key=>key.trim()));
  const valid=agriLayerKeys.filter(key=>selected.has(key));
  return valid.length?valid.join(','):null;
}
export function africaAgriFocusedLayer(state:Pick<State,'topic'|'crop'|'cropMeasure'|'livestock'>):AgriLayerKey {
  if(state.topic==='livestock')return `livestock-${livestockChoices.find(row=>row.id===state.livestock)?.id??'cattle'}`;
  const crop=cropChoices.find(row=>row.id===state.crop)?.id??'maize';
  const measure=cropMeasureChoices.find(row=>row.id===state.cropMeasure)?.id??'harvested';
  return `crop-${crop}-${measure}`;
}
export function africaAgriVisibleLayers(state:Pick<State,'topic'|'crop'|'cropMeasure'|'livestock'|'agriLayers'> & Partial<Pick<State,'agriDisplay'>>):AgriLayerKey[] {
  const selected=canonicalAgriLayers(state.agriLayers);
  const keys=selected===null?[...cropChoices.map(row=>`crop-${row.id}-${state.cropMeasure}` as AgriLayerKey),...livestockChoices.map(row=>`livestock-${row.id}` as AgriLayerKey)]:selected===''?[]:selected.split(',') as AgriLayerKey[];
  return keys.filter(key=>!state.agriDisplay||state.agriDisplay==='all'||key.startsWith(state.agriDisplay==='crops'?'crop-':'livestock-'));
}
export function canonicalTopic(field:Field,metric:string,requested=''):string {
  if(field==='agriculture')return metric==='AG.LND.FRST.ZS'?'forestry':requested==='livestock'?'livestock':'farming';
  if(field==='nature')return ['climate','terrain','elevation'].includes(requested)?requested:'water';
  if(field==='population')return ['ethnicity','religion'].includes(requested)?requested:'distribution';
  return 'regional';
}
export function canonicalWater(metric:string,requested=''):string {
  return requested==='basin'?'basin':metric==='ER.H2O.INTR.PC'?'river':'rain';
}
/** Named river selections apply only to the river layer; comparison snapshots retain the source. */
export function canonicalRiver(state:Pick<State,'field'|'topic'|'water'>,requested:unknown):string {
  return state.field==='nature'&&state.topic==='water'&&state.water==='river'&&(requested==='nile'||requested==='congo')?requested:'';
}
export function defaultThemeRegion(themeId:string):Region {
  const theme=themes.find(t=>t.id===themeId)??themes[0];
  const regions=[...new Set(theme.places.map(code=>countries.find(c=>c.code===code)!.region))];
  return regions.length===1?regions[0] as Region:'all';
}
export function readState(search:string):State {
  const p=new URLSearchParams(search);
  const field=(p.get('field')??'nature') as Field;
  const safeField=Object.hasOwn(fields,field)?field:'nature';
  const metric=metrics.find(m=>m.id===p.get('metric')&&m.field===safeField)??metrics.find(m=>safeField==='agriculture'&&p.get('topic')==='livestock'?m.id==='NV.AGR.TOTL.ZS':m.field===safeField)!;
  const exists=(code:string|null)=>countries.some(c=>c.code===code);
  const defaultClimate=safeField==='nature'&&!p.has('metric')&&!p.has('theme')&&!p.has('topic');
  const zoom=p.get('zoom')??(p.has('theme')?'theme':'all');
  const theme=themes.find(t=>t.id===p.get('theme')&&t.field===safeField)??themes.find(t=>t.field===safeField)!;
  const place=exists(p.get('place'))?p.get('place')!:'';
  const region=p.get('region')??'all';
  const overview=p.get('overview')==='1'||!p.has('overview')&&!p.has('theme')&&!(safeField==='agriculture'&&(p.has('crop')||p.has('livestock')||p.get('topic')==='livestock'));
  const context=metrics.some(m=>m.id===p.get('context'))&&(p.get('context')===theme.compareMetric||p.has('sourceState')||safeField==='agriculture'&&metric.id==='AG.LND.FRST.ZS'&&p.get('context')===metric.id)?p.get('context')!:'';
  const layerClass=/^[a-zA-Z0-9_:.-]{1,100}$/.test(p.get('layerClass')??'')?p.get('layerClass')!:'';
  const point=(p.get('layerPoint')??'').split(',').map(Number);
  const layerPoint=point.length===2&&point.every(Number.isFinite)&&point[0]>=-27&&point[0]<=64&&point[1]>=-36&&point[1]<=39?point.join(','):'';
  const snapshot=p.get('sourceState')??'';
  const sourceState=snapshot.length<=1800&&!/(?:^|&)sourceState=/.test(snapshot)?snapshot:'';
  const topic=canonicalTopic(safeField,metric.id,p.get('topic')??(defaultClimate?'climate':'')),culture=safeField==='population'&&(topic==='ethnicity'||topic==='religion');
  const water=safeField==='nature'?canonicalWater(metric.id,p.get('water')??''):'';
  const river=canonicalRiver({field:safeField,topic,water},p.get('river'));
  const crop=cropChoices.find(row=>row.id===p.get('crop'))?.id??'maize';
  const livestock=livestockChoices.find(row=>row.id===p.get('livestock'))?.id??'cattle';
  const cropMeasure=cropMeasureChoices.find(row=>row.id===p.get('cropMeasure'))?.id??'harvested';
  return {field:safeField,metric:metric.id,year:years.includes(Number(p.get('year')))?Number(p.get('year')):2021,place,compare:place&&exists(p.get('compare'))&&p.get('compare')!==place?p.get('compare')!:'',region:Object.hasOwn(regionNames,region)?region as Region:'all',zoom:['all','region','country','theme'].includes(zoom)?zoom as State['zoom']:'all',theme:theme.id,overview,context:culture?'':context??'',topic,water,river,city:safeField==='nature'&&topic==='climate'&&africaClimateCityById(p.get('city')??'')?p.get('city')!:'',crop,livestock,cropMeasure,agriLayers:canonicalAgriLayers(p.get('agriLayers')),agriDisplay:p.get('agriDisplay')==='crops'?'crops':p.get('agriDisplay')==='livestock'?'livestock':'all',agriOutline:p.get('agriOutline')==='1',layerClass:culture?'':layerClass,layerPoint:culture?'':layerPoint,sourceState:culture?'':sourceState,view:culture?'distribution':p.get('view')==='statistics'||!p.has('view')&&p.has('theme')&&!p.has('topic')?'statistics':'distribution'};
}
export function africaComparisonSnapshot(state:State):string {
  return writeState({...state,context:'',sourceState:''},new URL('https://atlas.invalid/')).searchParams.toString();
}
export function writeState(state:State,url:URL) {
  state.topic=canonicalTopic(state.field,state.metric,state.topic);
  state.water=state.field==='nature'?canonicalWater(state.metric,state.water):'';
  state.river=canonicalRiver(state,state.river);
  state.city=state.field==='nature'&&state.topic==='climate'&&africaClimateCityById(state.city)?state.city:'';
  if(state.field==='population'&&(state.topic==='ethnicity'||state.topic==='religion')){state.context='';state.layerClass='';state.layerPoint='';state.sourceState='';state.view='distribution';}
  state.agriLayers=canonicalAgriLayers(state.agriLayers);
  state.agriOutline=state.agriOutline===true;
  for(const [key,value] of Object.entries(state)){
    if(key==='agriLayers'||key==='agriOutline'||key==='overview')continue;
    value===''?url.searchParams.delete(key):url.searchParams.set(key,String(value));
  }
  if(state.agriLayers===null)url.searchParams.delete('agriLayers');else url.searchParams.set('agriLayers',state.agriLayers);
  if(state.agriOutline)url.searchParams.set('agriOutline','1');else url.searchParams.delete('agriOutline');
  url.searchParams.set('overview',state.overview?'1':'0');
  return url;
}
export function rankedCountries(state:State) {
  return countries.filter(c=>state.region==='all'||c.region===state.region)
    .map(c=>({...c,value:valueAt(state.metric,c.code,state.year)}))
    .sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity)||a.name.localeCompare(b.name,'ja'));
}
