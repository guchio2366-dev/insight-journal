import resourceData from '../data/atlas/mexico/industry-adopted-resources.json' with {type:'json'};
import manufacturingData from '../data/atlas/mexico/industry-adopted-manufacturing.json' with {type:'json'};
import foodData from '../data/atlas/mexico/industry-adopted-food-precision.json' with {type:'json'};
import serviceData from '../data/atlas/mexico/industry-adopted-services.json' with {type:'json'};

export type AdoptedSector='resources'|'manufacturing'|'services';
export type AdoptedStatus='available'|'zero'|'confidential'|'unknown'|'unretrieved';
export type AdoptedSource={title:string;url:string;year:number|string;scope:string};
export type AdoptedIndicator={label:string;value:number|null;unit:string;year:number|string;definition:string;sourceIds:string[];status:'observed'|'estimate'|'unconfirmed';denominator?:{label:string;value:number;unit:string};note?:string};
export type AdoptedRegion={state:string;stage:string;note:string;sourceIds:string[]};
export type AdoptedIndustry={id:string;label:string;family:string;sectors:AdoptedSector[];overview:string;why:string;process:string;boundary:string;map:{kind:'quantity'|'employment'|'guide';year:number|string;unit:string;definition:string;sourceIds:string[];nationalTotal?:number;values:{state:string;value:number|null;status:AdoptedStatus}[];regions:AdoptedRegion[]};statistics:{domestic:AdoptedIndicator[];world:AdoptedIndicator[];trade:AdoptedIndicator[]}};
export const adoptedIndustries=[...resourceData.industries,...manufacturingData.industries,...foodData.industries,...serviceData.industries] as AdoptedIndustry[];
export const adoptedSources={...resourceData.sources,...manufacturingData.sources,...foodData.sources,...serviceData.sources} as Record<string,AdoptedSource>;
export const adoptedSectors=[
 {id:'resources',label:'資源・エネルギー',lead:'どこで採り、どこで使える原料・燃料になるか',overview:'湾岸・南東部の原油とガス、北西部の銅、内陸部の金・銀・亜鉛を比べます。採取と処理・精製は別の工程です。',why:'鉱床や油ガス田の位置に、電力・水・加工設備と輸送条件が重なります。米国からのガス輸入と国内精製も、供給を支える活動として読みます。'},
 {id:'manufacturing',label:'製造業',lead:'どこで何を作り、どこから調達し、どこで使うか',overview:'北部とバヒオの自動車・部品、チワワやハリスコの電子機器、各地の機械・家電、食品・飲料、精密製品と素材を比べます。',why:'市場との距離、部品と加工企業の集積、技術者、原料・エネルギーの調達が立地を支えます。輸出の大きさと国内で生む価値は別に確かめます。'},
 {id:'services',label:'サービス業',lead:'人・情報・商品・資金が、どこに集まるか',overview:'観光、物流、専門・金融、情報技術と業務支援、建設・不動産を比べます。産業から地域を選び、来訪者や企業・住民の需要と結びます。',why:'人口と企業の需要、人材・情報へのアクセス、国境・港、観光資源が集中を支えます。統計の所在地が本社の場合、現場の活動場所とは分けて読みます。'},
] as const;
export const adoptedFamilyLabels:Record<string,string>={energy:'原油・ガス・精製',minerals:'金属資源',automotive:'自動車・部品',electronics:'電子・通信機器',equipment:'機械・家電',materials:'金属・化学',precision:'医療・航空・医薬',food:'食品・飲料',textiles:'衣服',tourism:'観光',logistics:'物流',business:'専門・金融・IT',built:'建設・不動産'};
export const adoptedFamilyColors:Record<string,string>={energy:'#9a6036',minerals:'#816547',automotive:'#2f6f5e',electronics:'#356e89',equipment:'#71628c',materials:'#636d85',precision:'#8b5d7c',food:'#8c7132',textiles:'#65753b',tourism:'#267b73',logistics:'#667e3d',business:'#426e8c',built:'#886951'};
export function adoptedIndustry(id:string|null){return adoptedIndustries.find(i=>i.id===id);}
export function adoptedGroups(sector:AdoptedSector){
 const groups=new Map<string,{id:string;label:string;color:string;industries:AdoptedIndustry[]}>();
 for(const item of adoptedIndustries.filter(i=>i.sectors.includes(sector))){
  // Manufacturing's dense product set shares stable, industry-led label slots.
  const id=sector==='manufacturing'?item.family:item.id;
  if(!groups.has(id))groups.set(id,{id,label:sector==='manufacturing'?(adoptedFamilyLabels[id]??item.label):item.label,color:adoptedFamilyColors[item.family]??'#436f60',industries:[]});
  groups.get(id)!.industries.push(item);
 }
 return [...groups.values()];
}
export type AdoptedState={sector:AdoptedSector;industry:string|null;state:string|null;only:boolean;frame:number[]|null};
const aliases:Record<string,string>={transport:'automotive',electronics:'computers',mining:'copper',metals:'steel',finance:'finance','construction-real-estate':'construction'};
export function readAdoptedState(url:URL):AdoptedState{
 const p=url.searchParams,candidate=p.get('subsector')??p.get('industry')??p.get('metric'),id=candidate?aliases[candidate]??candidate:null,item=adoptedIndustry(id);
 const wanted=p.get('sector'),sector=(adoptedSectors.some(s=>s.id===wanted)?wanted:item?.sectors[0]??'resources') as AdoptedSector;
 const industry=item?.sectors.includes(sector)?item.id:null,code=p.get('state');
 const parts=p.get('industryFrame')?.split(',')??[],values=parts.map(Number);
 const frame=parts.length===4&&parts.every(n=>n.trim()!=='')&&values.every(Number.isFinite)&&values[2]>=180&&values[2]<=1800&&values[3]>=100&&values[3]<=1200&&Math.abs(values[0])<2000&&Math.abs(values[1])<2000?values:null;
 return {sector,industry,state:code&&/^(0[1-9]|[12][0-9]|3[0-2])$/.test(code)?code:null,only:!!industry&&p.get('only')==='1',frame};
}
export function writeAdoptedState(url:URL,state:AdoptedState):URL{
 const next=new URL(url);for(const key of ['metric','compare','industry','zoom','exportOverlay','legacy'])next.searchParams.delete(key);
 next.searchParams.set('sector',state.sector);next.searchParams.set('subsector',state.industry??'all');
 for(const [key,value] of Object.entries({state:state.state,only:state.only&&state.industry?'1':null,industryFrame:state.frame?.map(n=>Number(n.toFixed(3))).join(',')}))value?next.searchParams.set(key,value):next.searchParams.delete(key);
 return next;
}
export const adoptedStatusText:Record<AdoptedStatus,string>={available:'公開値',zero:'明示された0',confidential:'秘匿',unknown:'未把握・所在地を特定できない',unretrieved:'未取得'};
export function formatAdoptedValue(value:number|null,unit:string,status='observed'){
 if(value===null)return '未確認';
 return `${value.toLocaleString('ja-JP',{maximumFractionDigits:Number.isInteger(value)?0:3})} ${unit}${status==='estimate'?'（推計）':''}`;
}
export function adoptedShare(indicator:AdoptedIndicator){
 // Some published indicators are already percentages. Their denominator is
 // retained as context, never a second division of a percentage by people/USD.
 return indicator.value!==null&&indicator.unit!=='%'&&indicator.denominator&&indicator.unit===indicator.denominator.unit&&indicator.denominator.value>0?indicator.value/indicator.denominator.value*100:null;
}
export function adoptedMapValue(item:AdoptedIndustry|null,state:string){return item?.map.values.find(v=>v.state===state)??{state,value:null,status:'unretrieved' as AdoptedStatus};}
export const adoptedMapColors=['#eef0dd','#d1dfb8','#a7c78a','#75aa6d','#407e57','#205b43'];
export function adoptedMapColor(value:number|null,status:AdoptedStatus,nationalTotal:number|undefined,maximum:number){
 if(status==='zero')return '#ffffff';if(status!=='available'||value===null)return `url(#ma-${status})`;
 const share=nationalTotal&&nationalTotal>0?value/nationalTotal*100:null;
 const scale=share??(maximum>0?value/maximum*100:0);
 const steps=share===null?[10,25,50,70,90]:[1,5,10,20,40];
 return adoptedMapColors[steps.findIndex(n=>scale<n)===-1?5:steps.findIndex(n=>scale<n)];
}
export type LabelBox=[number,number,number,number];
/** Deterministic slots allocated from all peers, never from the current selection. */
export function placeAdoptedLabels(groups:{id:string;points:number[][]}[],width:number,height:number,labelWidth:number,labelHeight:number):Map<string,LabelBox>{
 const occupied:LabelBox[]=[],result=new Map<string,LabelBox>(),gap=5;
 const ordered=[...groups].sort((a,b)=>{
  const mean=(g:typeof a)=>g.points.reduce((n,p)=>n+p[1],0)/Math.max(1,g.points.length);
  return mean(a)-mean(b)||a.id.localeCompare(b.id);
 });
 for(const group of ordered){
  const x=group.points.reduce((n,p)=>n+p[0],0)/Math.max(1,group.points.length),y=group.points.reduce((n,p)=>n+p[1],0)/Math.max(1,group.points.length);
  const candidates:LabelBox[]=[];
  for(let top=5;top+labelHeight<=height-5;top+=5)for(let left=5;left+labelWidth<=width-5;left+=5)candidates.push([left,top,left+labelWidth,top+labelHeight]);
  candidates.sort((a,b)=>(a[0]+labelWidth/2-x)**2+(a[1]+labelHeight/2-y)**2-((b[0]+labelWidth/2-x)**2+(b[1]+labelHeight/2-y)**2)||a[1]-b[1]||a[0]-b[0]);
  const box=candidates.find(b=>!occupied.some(o=>b[0]<o[2]+gap&&b[2]>o[0]-gap&&b[1]<o[3]+gap&&b[3]>o[1]-gap));
  if(box){occupied.push(box);result.set(group.id,box);}
 }
 return result;
}
