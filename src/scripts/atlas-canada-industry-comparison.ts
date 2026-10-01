import {readCanadaIndustryState,writeCanadaIndustryState,industryShareColor,formatCanadaIndustryValue,canadaIndustryColors} from '../lib/atlas-canada-industry';
import type {CanadaNatureState} from '../lib/atlas-canada-nature';

/** Keep the source statistic and its geography beside the evidence being compared. */
export function renderIndustryNatureComparison(root:HTMLElement,config:any,nature:CanadaNatureState){
 delete root.dataset.canadaIndustryWaterGroup;
 const raw=new URL(location.href).searchParams.get('industryReturn'),context=root.querySelector<HTMLElement>('[data-canada-industry-context]')!,layer=root.querySelector<SVGElement>('[data-canada-industry-context-map]')!,legend=root.querySelector<HTMLElement>('[data-canada-industry-context-legend]')!,back=root.querySelector<HTMLAnchorElement>('[data-canada-industry-return]')!,mini=root.querySelector<SVGSVGElement>('[data-canada-industry-context-mini-map]')!;
 context.hidden=back.hidden=!raw;legend.hidden=!raw||nature.view==='landform';layer.style.display=raw&&nature.view!=='landform'?'':'none';mini.style.display=raw&&nature.view==='landform'?'':'none';
 if(!raw)return false;
 const data=config.industry,state=readCanadaIndustryState(new URL('?'+raw,location.href),data.years,data.provinces.map((p:any)=>p.id)),target=new URL(back.getAttribute('href')!,location.href);target.search=writeCanadaIndustryState(new URL(target.pathname,target),state).search;back.href=target.href;
 const metric=data.metrics.find((m:any)=>m.id===state.metric),rows=data.data.filter((r:any)=>r.year===state.year),selected=[state.province,state.compare].filter(Boolean),row=rows.find((r:any)=>r.id===state.province),city=config.cities.find((c:any)=>c.id===nature.city).name;
 const label=`${state.year}年 ${metric.name}の州内GDP割合（%）。境界2021年。`;
 root.querySelector<HTMLElement>('[data-canada-industry-context-heading]')!.textContent=state.metric==='manufacturing'?'加工業の構成と水路の位置を比べる':state.metric==='services'?'サービスの構成と沿岸の位置を比べる':'採取の構成と山地・内陸を照合する';
 const original=state.metric==='manufacturing'?'St. Lawrence':state.metric==='services'?'Fraser':null;
 const lakes=state.metric==='manufacturing'&&nature.view==='water'&&nature.water==='St. Lawrence';
 if(lakes)root.dataset.canadaIndustryWaterGroup='great-lakes';
 const water=lakes?`現在は五大湖5湖とSt. Lawrence上流${nature.only?'だけ':'を選び全水系'}を表示。` :nature.water?`現在は${nature.water}${nature.only?'だけ':'を選び全水系'}を表示。${original&&nature.water!==original?`比較入口の${original}とは別の水系です。`:''}`:'現在は全水系を表示。';
 const question=state.metric==='manufacturing'?'五大湖・St. Lawrence沿いのON・QCを、中央輸送回廊の位置として追います。':state.metric==='services'?'BCの沿岸・Vancouverの位置を、太平洋側の交通と市場につなげて読みます。':'Albertaの内陸と西部の山地を照合し、資源が市場へ届くための加工・輸送の条件を考えます。';
 root.querySelector<HTMLElement>('[data-canada-industry-context-text]')!.textContent=`${row.name} ${formatCanadaIndustryValue(row.values[state.metric].value)}%（${state.year}年）。${nature.view==='water'?water+question:nature.view==='landform'?question:`${city}の気候は1観測地点。州全体の産業割合とは対象が異なります。`} 色は州内GDP割合で、鉱床・工場の場所ではありません。`;
 legend.textContent=`${label} ${lakes?'湖は青、比較する五大湖とSt. Lawrence上流の縁・線を赤で強調。米国側も含み、全河道・航路・輸送量の線ではありません。下流から大西洋までの連続線は本資料にありません。':''}水系：Natural Earth 1:50mの概形。気候：ECCC 1991–2020年平年値（地点）。`;
 function appendScale(target:HTMLElement){const scale=root.ownerDocument.createElement('span');scale.dataset.canadaIndustryContextScale='';scale.style.cssText='display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:5px';for(const [i,text] of ['0–5%未満','5–15%未満','15–30%未満','30–60%未満','60–80%未満','80–100%'].entries()){const item=root.ownerDocument.createElement('span'),swatch=root.ownerDocument.createElement('i');item.style.cssText='display:inline-flex;align-items:center;gap:4px';swatch.style.cssText=`display:inline-block;width:16px;height:12px;border:1px solid #667d69;background:${canadaIndustryColors[i]}`;swatch.setAttribute('aria-hidden','true');item.append(swatch,root.ownerDocument.createTextNode(text));scale.append(item);}target.append(scale);}
 appendScale(legend);
 const ns='http://www.w3.org/2000/svg';layer.replaceChildren();
 for(const g of data.geometry){if(state.only&&!selected.includes(g.id))continue;const r=rows.find((r:any)=>r.id===g.id),p=root.ownerDocument.createElementNS(ns,'path');p.setAttribute('d',g.path);p.setAttribute('fill',industryShareColor(r.values[state.metric].value));p.setAttribute('fill-rule','evenodd');p.setAttribute('stroke',selected.includes(g.id)?'#aa382e':'#fff');p.setAttribute('stroke-width',selected.includes(g.id)?'2':'0.7');p.dataset.canadaIndustryContextProvince=g.id;const title=root.ownerDocument.createElementNS(ns,'title');title.textContent=`${r.name} ${label} ${formatCanadaIndustryValue(r.values[state.metric].value)}%`;p.append(title);layer.append(p);}
 const copy=layer.cloneNode(true) as SVGElement;copy.style.display='';mini.replaceChildren(copy);
 const miniLabel=root.querySelector<HTMLElement>('[data-canada-industry-context-mini-legend]')!;miniLabel.hidden=nature.view!=='landform';miniLabel.textContent=`元の分布：${label} 地形図は別投影のため、重ねず左右で照合します。`;appendScale(miniLabel);
 return true;
}
