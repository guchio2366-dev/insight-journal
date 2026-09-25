import countryData from './africa-countries.json' with {type:'json'};
import statistics from './africa-statistics.json' with {type:'json'};
export type Field = 'nature' | 'agriculture' | 'industry' | 'population';
export type Region = 'all' | 'north' | 'west' | 'central' | 'east' | 'south';
export const countries = countryData;
export const regionNames: Record<Region,string> = {all:'アフリカ全体',north:'北アフリカ',west:'西アフリカ',central:'中部アフリカ',east:'東アフリカ',south:'南部アフリカ'};
export const fields: Record<Field,{label:string;title:string;summary:string}> = {
  nature:{label:'自然環境',title:'雨の量と、利用できる水は同じではない',summary:'国土に降る雨と、国内で生まれる再生可能な淡水を読み比べます。乾燥地域でも、国外を水源とする川や灌漑が暮らしを支える場合があります。'},
  agriculture:{label:'農林業',title:'耕地の広さ、森林、収量を分けて読む',summary:'農地が広い国と、穀物の単位面積当たり収量が高い国は一致しません。耕地・森林・生産性・経済への寄与を切り替え、土地利用と農業の役割を確かめます。'},
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
export type State={field:Field;metric:string;year:number;place:string;compare:string;region:Region;zoom:'all'|'region'|'country'};
export function readState(search:string):State {
  const p=new URLSearchParams(search);
  const field=(p.get('field')??'nature') as Field;
  const safeField=Object.hasOwn(fields,field)?field:'nature';
  const metric=metrics.find(m=>m.id===p.get('metric')&&m.field===safeField)??metrics.find(m=>m.field===safeField)!;
  const exists=(code:string|null)=>countries.some(c=>c.code===code);
  const region=p.get('region')??'all';
  const zoom=p.get('zoom')??'all';
  const place=exists(p.get('place'))?p.get('place')!:'EGY';
  return {field:safeField,metric:metric.id,year:years.includes(Number(p.get('year')))?Number(p.get('year')):2021,place,compare:exists(p.get('compare'))&&p.get('compare')!==place?p.get('compare')!:'',region:Object.hasOwn(regionNames,region)?region as Region:'all',zoom:['all','region','country'].includes(zoom)?zoom as State['zoom']:'all'};
}
export function writeState(state:State,url:URL) {
  for(const [key,value] of Object.entries(state)) value===''?url.searchParams.delete(key):url.searchParams.set(key,String(value));
  return url;
}
export function rankedCountries(state:State) {
  return countries.filter(c=>state.region==='all'||c.region===state.region)
    .map(c=>({...c,value:valueAt(state.metric,c.code,state.year)}))
    .sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity)||a.name.localeCompare(b.name,'ja'));
}
