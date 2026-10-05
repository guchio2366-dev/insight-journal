import {readCanadaPopulationState,writeCanadaPopulationState,canadaPopulationFrame,formatCanadaPopulationValue,canadaPopulationDensityColor,populationDensityColors} from '../lib/atlas-canada-population';
import {formatCanadaIndustryValue,type CanadaIndustryState} from '../lib/atlas-canada-industry';
import {isCanadaDemographicTopic} from '../lib/atlas-canada-demographics';
import {canadaIndustryRegions,canadaIndustrySectors} from '../data/atlas/canada/industry-reading';

/** The source question stays visible; CMA population and provincial GDP have separate denominators. */
export function renderPopulationIndustryComparison(root:HTMLElement,config:any,industry:CanadaIndustryState){
 const requested=new URL(location.href).searchParams.get('populationReturn'),raw=requested&&!isCanadaDemographicTopic(new URL('?'+requested,location.href).searchParams.get('topic'))?requested:null,context=root.querySelector<HTMLElement>('[data-canada-population-industry-context]'),back=root.querySelector<HTMLAnchorElement>('[data-canada-population-industry-return]');
 if(!context||!back)return false;context.hidden=back.hidden=!raw;if(!raw)return false;
 const data=config.population,state=readCanadaPopulationState(new URL('?'+raw,location.href),data.cmas.map((r:any)=>r.id)),selected=[state.cma,state.compare].filter(Boolean),records=data.cmas.filter((r:any)=>selected.includes(r.id)),map=root.querySelector<SVGSVGElement>('[data-canada-population-industry-map]')!;
 const target=writeCanadaPopulationState(new URL(back.getAttribute('href')!,location.href),state);back.href=target.href;back.textContent=`${records.map((r:any)=>r.name.split('（')[0]).join('・')}の${state.year}年${state.metric==='density'?'人口密度':'人口'}比較へ戻る`;
 const metric=config.metrics.find((m:any)=>m.id===industry.metric),province=config.data.find((r:any)=>r.id===industry.province&&r.year===industry.year),other=config.data.find((r:any)=>r.id===industry.compare&&r.year===industry.year),cell=(r:any)=>`${r.name} ${formatCanadaIndustryValue(r.values[industry.metric].value)}%`;
 const populationValues=records.map((r:any)=>{const v=state.metric==='density'?r.density2021:r.population[state.year];return `${r.name.split('（')[0]} ${formatCanadaPopulationValue(v.value,state.metric)}${state.metric==='density'?'人/km²':'人'}${v.symbol?' '+v.symbol:''}`;}).join(' / ');
 const omitted=records.flatMap((r:any)=>(data.geometry.find((g:any)=>g.id===r.id)?.provinceCodes??[]).map((code:string)=>config.provinces.find((p:any)=>p.code===code)).filter((p:any)=>p&&![industry.province,industry.compare].includes(p.id)).map((p:any)=>`${r.name.split('（')[0]}の${p.name}`));
 const scope=root.querySelector<HTMLElement>('[data-canada-population-industry-scope]')!;scope.hidden=!omitted.length;scope.textContent=omitted.length?`州をまたぐ都市圏もあります。現在、左では${omitted.join('・')}を選択していません。`:'';
 root.querySelector<HTMLElement>('[data-canada-population-industry-text]')!.textContent=`元の${state.year}年${state.metric==='density'?'人口密度':'都市圏人口'}：${populationValues}。左は${industry.year}年の州内GDP構成、${metric.name}：${cell(province)}${other?' / '+cell(other):''}。都市圏の集中と州の産業構成を、場所の対応として照合します。都市の雇用数・GDPではなく、人口集中の原因をこの2図だけで決めません。`;
 if(!data.geometry?.every((g:any)=>Array.isArray(g.rings))){map.replaceChildren();map.hidden=true;root.querySelector<HTMLElement>('[data-canada-population-industry-legend]')!.textContent=root.dataset.populationGeometryState==='error'?'元の都市圏境界を取得できませんでした。元の人口ページと出典を確認できます。':'元の都市圏分布を読み込んでいます。';return true;}
 map.hidden=false;
 if(industry.sector){
  const sector=canadaIndustrySectors.find(s=>s.id===industry.sector)!,region=canadaIndustryRegions.find(r=>r.id===industry.region);
  root.querySelector<HTMLElement>('[data-canada-population-industry-text]')!.textContent='元図'+state.year+'年'+(state.metric==='density'?'人口密度':'都市圏人口')+'：'+populationValues+'。左は'+(region?.name??sector.label)+'の地域を読む案内点です。都市圏の人口集積と産業地域の位置を照合します。関連統計は'+industry.year+'年の州内GDP構成、'+metric.name+'：'+cell(province)+(other?' / '+cell(other):'')+'。都市の雇用数・GDPではなく、人口集積の原因をこの2図だけで決めません。';
 }
 const frame=canadaPopulationFrame(state,data.geometry),factor=frame[2]/760,max=Math.max(...data.cmas.flatMap((r:any)=>[r.population[2016].value??0,r.population[2021].value??0])),ns='http://www.w3.org/2000/svg',project=([lon,lat]:number[])=>[(lon+145)/95*900,(85-lat)/45*580];
 const el=(tag:string,attrs:Record<string,string>={})=>{const e=root.ownerDocument.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
 const line=(ring:number[][])=>ring.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;}).join('')+'Z';
 map.setAttribute('viewBox',frame.join(' '));map.replaceChildren();
 for(const f of data.land){const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();map.append(el('path',{d:rings.map(line).join(''),fill:f.properties.code==='CAN'?'#e6ead7':'#dbded7',stroke:'#bcc9b9','stroke-width':'0.6','fill-rule':'evenodd'}));}
 for(const g of data.geometry){if(state.only&&!selected.includes(g.id))continue;const r=data.cmas.find((r:any)=>r.id===g.id),v=state.metric==='density'?r.density2021:r.population[state.year],chosen=selected.includes(g.id),group=el('g');group.dataset.populationIndustryCma=g.id;
  const title=el('title');title.textContent=`${r.name} ${state.year}年 ${formatCanadaPopulationValue(v.value,state.metric)} ${state.metric==='density'?'人/km²':'人'}${v.symbol?' '+v.symbol:''}`;group.append(title);
  group.append(el('path',{d:g.rings.map(line).join(''),fill:state.metric==='density'?canadaPopulationDensityColor(v.value):'#c7d9bc',stroke:chosen?'#a64125':'#567968','stroke-width':chosen?'1.2':'0.5','fill-rule':'evenodd'}));
  if(state.metric==='population'&&v.value!==null){const circle=el('circle',{cx:String(g.point[0]),cy:String(g.point[1]),r:String(Math.sqrt(v.value/max)*22*factor),fill:'#426d84','fill-opacity':'.62',stroke:chosen?'#a64125':'#fff','stroke-width':'0.6'});circle.dataset.populationIndustrySymbol='';group.append(circle);}
  if(chosen){const label=el('text',{x:String(g.point[0]+7*factor),y:String(g.point[1]-26*factor)});label.style.cssText=`font-size:${22*factor}px;paint-order:stroke;stroke:#fff;stroke-width:${3*factor}px;fill:#254539`;label.textContent=r.name.split('（')[0];label.dataset.populationIndustryLabel=g.id;group.append(label);}map.append(group);
 }
 const key=el('g',{transform:`translate(${frame[0]+12*factor},${frame[1]+12*factor}) scale(${factor})`});key.dataset.populationIndustryScale='';key.append(el('rect',{width:state.metric==='density'?'710':'320',height:'57',fill:'#fff','fill-opacity':'.94'}));
 const text=(x:number,y:number,value:string)=>{const t=el('text',{x:String(x),y:String(y)});t.style.fontSize='20px';t.textContent=value;key.append(t);};
 if(state.metric==='population')for(const [count,x] of [[1000000,25],[5000000,165]]){const circle=el('circle',{cx:String(x),cy:'27',r:String(Math.sqrt(count/max)*22),fill:'#426d84','fill-opacity':'.62'});circle.dataset.populationIndustryLegendCount=String(count);key.append(circle);text(x+27,34,count===1000000?'100万人':'500万人');}
 else{for(const [i,label] of ['50未満','50–150未満','150–300未満','300–600未満','600以上'].entries()){const swatch=el('rect',{x:String(i*135+5),y:'10',width:'24',height:'20',fill:populationDensityColors[i]});swatch.dataset.populationIndustryDensitySwatch=String(i);key.append(swatch);text(i*135+5,51,label);}text(676,26,'人/km²');}
 map.append(key);
 root.querySelector<HTMLElement>('[data-canada-population-industry-legend]')!.textContent=`元図：${state.metric==='density'?'2021年・人口密度（人/km²）':state.year+'年・人口（円の面積）'}／2021年CMA境界。表示用の円中心は居住地点ではありません。左の6色は州内GDP構成%で、年と範囲が異なります。`;
 if(industry.sector){const legend=root.querySelector<HTMLElement>('[data-canada-population-industry-legend]')!;legend.textContent='元図：'+(state.metric==='density'?'2021年・人口密度（人/km²）':state.year+'年・人口（円の面積）')+'／2021年CMA境界。左の3分野の点は同じ大きさの地域案内で、数量を表しません。GDPは関連統計で確認します。';}
 return true;
}
