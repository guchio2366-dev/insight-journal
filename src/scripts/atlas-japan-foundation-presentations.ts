import type {JapanState} from '../lib/atlas-japan-state';
import {japanAgricultureProducts,japanAgricultureSites,japanAgricultureSources,japanAgricultureReading,getJapanAgricultureReading} from '../data/atlas/japan-agriculture-v2';
import {japanPopulationPlaces,getJapanPopulationReading} from '../data/atlas/japan-population-v2';
import {japanNatureCities,riverLabels,getJapanNatureReading} from '../data/atlas/japan-nature-v2';
import type {JapanNatureLayers} from './atlas-japan-nature-layers';
export type FoundationLabel={id:string;title:string;subtitle:string;point:[number,number];color:string;kind:'city'|'site'|'feature';selected:boolean;muted?:boolean};
type Presentation={title:string;period:string;method:string;reading:{title:string;overview:string;reason:string;gap:string};legend:{label:string;color:string}[];labels:FoundationLabel[];selection?:{title:string;body:string;source:string}};
export function japanFoundationPresentation(state:JapanState,nature?:JapanNatureLayers|null):Presentation|null{
 if(state.field==='industry')return null;
 if(state.field==='agriculture'){
  const reading=getJapanAgricultureReading(state.topic,state.site),selected=japanAgricultureSites.find(s=>s.id===state.site);
  const products=japanAgricultureProducts.filter(p=>state.topic==='all'||p.id===state.topic);
  return {title:state.topic==='forest'?'森林と木材利用':state.topic==='all'?'農畜産業の代表的な産地':products[0]?.title+'の代表産地',period:'出典別・概略位置',method:japanAgricultureReading.method,reading:{...reading,gap:japanAgricultureReading.gap},legend:products.map(p=>({label:p.title,color:p.color})),labels:state.topic==='forest'?[]:japanAgricultureSites.map(s=>({id:s.id,title:s.name.split('｜')[0],subtitle:s.name.split('｜')[1],point:s.coordinates,color:japanAgricultureProducts.find(p=>p.id===s.products[0])!.color,kind:'site',selected:state.site===s.id,muted:state.topic!=='all'&&!s.products.some(id=>id===state.topic)})),selection:selected?{title:selected.name,body:selected.overview+' '+selected.coordinateMethod,source:japanAgricultureSources.find(s=>s.id===selected.sourceIds[0])!.href}:undefined};
 }
 if(state.field==='natural'){
  const reading=getJapanNatureReading(state.topic,state.feature),city=japanNatureCities.find(c=>c.id===state.city);
  const labels:FoundationLabel[]=state.topic==='water'?riverLabels.map(r=>({id:r.id,title:r.name,subtitle:'収録区間・概略位置',point:r.coordinates,color:'#27799b',kind:'feature',selected:state.feature===r.id})):['climate','stations'].includes(state.topic)?japanNatureCities.map(c=>({id:c.id,title:c.name,subtitle:c.coordinates[1].toFixed(1)+'°N',point:c.coordinates,color:'#446e65',kind:'city',selected:state.city===c.id})):[];
  const period=state.topic==='elevation'?'ETOPO 2022・60秒':state.topic==='precipitation'?'1991–2020年・0.25°':state.topic==='groundwater'?'WHYMAP 2008・1:25,000,000':state.topic==='water'?'世界資料・概略図':'1991–2020年・気候区分0.1°';
  return {title:reading.title,period,method:state.topic==='elevation'?'500m間隔の等高線と段階色。原格子約1–2km。':state.topic==='precipitation'?'250mm間隔の等雨量線と段階色。原格子約20–28km。':reading.gap,reading,legend:nature?.legend(state.topic)??[],labels,selection:city?{title:city.name+'の観測所',body:city.stationName+'。1991–2020年の地点平年値を右上の雨温図で確認できます。全国図の縮尺は変わりません。',source:city.sourceUrl}:state.feature?{title:reading.title,body:reading.overview,source:reading.source??'https://www.naturalearthdata.com/'}:undefined};
 }
 const reading=getJapanPopulationReading(state.topic,state.city??undefined),place=japanPopulationPlaces.find(p=>p.id===state.city);
 return {title:state.topic==='urban'?'都市域と人口密度':'人口密度と都市・平野',period:'2020年・5km集約',method:'GHSL推計・人/km²。5km集約値を元の画素で切り出し、基図でマスク。主要地点は位置の参照で人口規模や平野の範囲を表しません。透明な陸地は0値または欠測です。',reading,legend:[],labels:japanPopulationPlaces.map(p=>({id:p.id,title:p.name,subtitle:p.plain,point:p.coordinates,color:'#28627f',kind:'city',selected:state.city===p.id})),selection:place?{title:place.name+'・'+place.plain,body:place.coordinateMethod,source:place.sourceUrl}:undefined};
}
