import {projectCanadaMap,canadaLegacyPoint} from '../lib/atlas-canada-map-presentation';
import {canadaIndustryPilot as pilot,pilotIndustryLabel,readPilotState,writePilotState,type PilotState,type PilotCluster} from '../lib/atlas-canada-industry-pilot';
import population from '../data/atlas/canada/population.json';
import {readCanadaPopulationState,writeCanadaPopulationState,copyCanadaPopulationMapState} from '../lib/atlas-canada-population';
import {isCanadaDemographicTopic} from '../lib/atlas-canada-demographics';
type Metric={id:string;label:string;gdp:number;employment:number|null;gdpCodes:string[];provinces:{id:string;name:string;gdp:number}[]};
const ns='http://www.w3.org/2000/svg';
const fmt=(n:number)=>n.toLocaleString('ja-JP',{maximumFractionDigits:1});
export function initCanadaIndustryPilot(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-ca-industry-config]')!.textContent!),metrics:Metric[]=config.metrics,total=metrics[0];
 const q=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const svg=q<SVGSVGElement>('[data-ca-map]'),stage=q('[data-ca-map-frame]'),overlay=q('[data-ca-labels]');
 const getState=()=>readPilotState(new URL(location.href),total.provinces.map(p=>p.id));
 let state=getState(),frame:number[]=[],initialFrame:number[]=[],drag:{x:number;y:number;frame:number[];moved:boolean}|null=null;
 const element=(tag:string,attrs:Record<string,string|number>)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 function fit(){
  const points=pilot.clusters.map(c=>projectCanadaMap(c.coordinates)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  const ratio=(stage.clientWidth||940)/(stage.clientHeight||510),width=Math.max(bounds[2]-bounds[0]+120,(bounds[3]-bounds[1]+200)*ratio),height=width/ratio;
  initialFrame=[(bounds[0]+bounds[2]-width)/2,(bounds[1]+bounds[3]-height)/2+20,width,height];
 }
 function clusters(){return pilot.clusters.filter(c=>c.sectors.includes(state.sector)&&(!state.only||c.industry===state.industry));}
 function chooseIndustry(id:string){state.industry=state.industry===id?null:id;state.site=null;state.only=false;save();}
 function chooseSite(c:PilotCluster){state.industry=c.industry;state.site=c.id;save();}
 const stageLabel=(c:PilotCluster)=>state.sector==='manufacturing'&&c.id==='sudbury'?'精錬・金属製品':c.stage;
 function save(){state.frame=frame.slice();const url=writePilotState(new URL(location.href),state);if(url.href!==location.href)history.pushState(null,'',url);render();}
 function labels(){
  const matrix=svg.getScreenCTM?.();if(!matrix)return;
  const rect=stage.getBoundingClientRect(),w=rect.width,h=rect.height,selectedFocus=(document.activeElement as HTMLElement)?.dataset?.caMarker;
  overlay.replaceChildren();
  const lines=element('svg',{width:'100%',height:'100%','aria-hidden':'true'});lines.classList.add('ca-pilot-connectors');overlay.append(lines);
  const screen=(coordinates:number[])=>{const [x,y]=projectCanadaMap(coordinates);return [matrix.a*x+matrix.c*y+matrix.e-rect.x,matrix.b*x+matrix.d*y+matrix.f-rect.y];};
  const visible=clusters().map(c=>({c,point:screen(c.coordinates)})).filter(({point:[x,y]})=>x>=0&&x<=w&&y>=0&&y<=h);
  const groups=new Map<string,typeof visible>();
  for(const item of visible){const key=item.c.coordinates.join(',');groups.set(key,[...(groups.get(key)??[]),item]);}
  const occupied:number[][]=[[0,0,w-85,q('.ca-pilot-map-key').getBoundingClientRect().height+8],[w-90,0,w,162],[0,h-28,w,h],...visible.map(({point:[x,y]})=>[x-12,y-12,x+12,y+12])];
  const overlaps=(a:number[],b:number[])=>a[0]<b[2]+4&&a[2]>b[0]-4&&a[1]<b[3]+4&&a[3]>b[1]-4;
  // A source-documented supply relation. Its curve is schematic, never a surveyed route.
  for(const flow of pilot.flows.filter(f=>f.sector===state.sector&&(!state.only||state.industry===f.industry))){
   const from=visible.find(v=>v.c.id===flow.from),to=visible.find(v=>v.c.id===flow.to);if(!from||!to)continue;
   const [a,b]=from.point,[c,d]=to.point,color=pilot.industries.find(i=>i.id===flow.industry)!.color;
   const path=element('path',{d:`M${a},${b} Q${Math.max(a,c)+45},${(b+d)/2} ${c},${d}`,fill:'none',stroke:color,'stroke-width':state.industry===flow.industry?2.5:1.4,'stroke-dasharray':'5 4','data-ca-flow':flow.id});
   const title=element('title',{});title.textContent=flow.label;path.append(title);lines.append(path);
   const arrow=element('path',{d:`M${c-4},${d-10} L${c},${d} L${c+7},${d-8}`,fill:'none',stroke:color,'stroke-width':2});lines.append(arrow);
  }
  // Place the dense eastern clusters first so offshore labels stay beside the
  // Atlantic anchors rather than being displaced across the whole country.
  const ordered=[...groups.values()].sort((a,b)=>Number(b.some(v=>v.c.id===state.site))-Number(a.some(v=>v.c.id===state.site))||b[0].point[0]-a[0].point[0]);
  for(const group of ordered){
   const [x,y]=group[0].point,card=document.createElement('div');card.className='ca-pilot-map-label';
   if(state.industry&&!group.some(v=>v.c.industry===state.industry))card.classList.add('is-context');
   lines.append(element('circle',{cx:x,cy:y,r:2.2,fill:'#304b45','data-ca-anchor':group[0].c.id}));
   for(const [{c},index]of group.map((item,index)=>[item,index] as const)){
    const color=pilot.industries.find(i=>i.id===c.industry)!.color,cx=x+(index-(group.length-1)/2)*10,processing=/精|製|構造体|部品|機体/.test(c.stage),attrs={'data-ca-cluster':c.id,'data-industry':c.industry,'data-coordinate':c.coordinates.join(','),'aria-hidden':'true',fill:color,stroke:'#fff','stroke-width':1.2};
    const mark=processing?element('rect',{...attrs,x:cx-4,y:y-4,width:8,height:8}):element('circle',{...attrs,cx,cy:y,r:4.5});
    if(state.industry&&c.industry!==state.industry)mark.setAttribute('opacity','.55');lines.append(mark);
    if(c.industry===state.industry)lines.append(element('circle',{cx,cy:y,r:8,fill:'none',stroke:color,'stroke-width':1.6}));
   }
   const place=document.createElement('small');place.textContent=group[0].c.place;card.append(place);
   for(const {c}of group){const item=pilot.industries.find(i=>i.id===c.industry)!,button=document.createElement('button');button.type='button';button.dataset.caMarker=c.id;button.setAttribute('aria-pressed',String(c.id===state.site));button.className=c.industry===state.industry?'is-highlighted':'';button.style.setProperty('--pilot-color',item.color);
    const label=document.createElement('strong');label.textContent=pilotIndustryLabel(c.industry,state.sector);const icon=document.createElement('i');icon.className=/精|製|構造体|部品|機体/.test(c.stage)?'is-processing':'';icon.setAttribute('aria-hidden','true');label.prepend(icon);
    button.append(label);button.setAttribute('aria-label',`${pilotIndustryLabel(c.industry,state.sector)} · ${c.place} · ${stageLabel(c)}`);button.addEventListener('click',()=>chooseSite(c));card.append(button);
   }
   overlay.append(card);const cw=card.offsetWidth||154,ch=card.offsetHeight||58;const offsets:number[][]=[];
   for(let dy=-260;dy<=260;dy+=26)for(let dx=-310;dx<=310;dx+=32)offsets.push([dx,dy]);offsets.sort((a,b)=>a[0]**2+a[1]**2-b[0]**2-b[1]**2);
   let box:number[]|undefined;
   for(const [dx,dy]of offsets){const left=Math.max(5,Math.min(w-cw-5,x+dx-cw/2)),top=Math.max(5,Math.min(h-ch-32,y+dy-ch/2)),candidate=[left,top,left+cw,top+ch];if(!occupied.some(b=>overlaps(candidate,b))){box=candidate;break;}}
   if(!box)for(let top=80;top<h-ch-32&&!box;top+=10)for(let left=5;left<w-cw-5;left+=10){const candidate=[left,top,left+cw,top+ch];if(!occupied.some(b=>overlaps(candidate,b))){box=candidate;break;}}
   if(!box){card.remove();root.dataset.labelsIncomplete='true';continue;}
   occupied.push(box);card.style.left=box[0]+'px';card.style.top=box[1]+'px';
   const endX=Math.max(box[0],Math.min(box[2],x)),endY=Math.max(box[1],Math.min(box[3],y));
   lines.append(element('line',{x1:x,y1:y,x2:endX,y2:endY,stroke:group.some(v=>v.c.industry===state.industry)?'#354c48':'#8a9c94','stroke-width':1}));

  }
  if(selectedFocus)overlay.querySelector<HTMLButtonElement>(`[data-ca-marker="${selectedFocus}"]`)?.focus({preventScroll:true});
 }
 function camera(){svg.setAttribute('viewBox',frame.join(' '));delete root.dataset.labelsIncomplete;labels();(root as any).canadaIndustryView={...state,frame:frame.slice(),initialFrame:initialFrame.slice(),province:state.province,subsector:state.industry??'all'};}
 function statistics(){
  const item=pilot.industries.find(i=>i.id===state.industry),id=item?.metrics[state.sector]??state.sector,m=metrics.find(m=>m.id===id)!;
  const name=m.id==='resources'?'採掘・電気等の供給（NAICS 21＋22）':m.id==='services'?'既存のサービス統計（不動産を除く）':m.label;
  q('[data-ca-stat-title]').textContent=name;q('[data-ca-stat-scope]').textContent=`2021年 · ${item&&!item.metrics[state.sector]?'選んだ産業の一致統計は未収録。分類の参考値を表示。':'全国の統計区分。地図の集積の数量ではありません。'}`;
  q('[data-ca-stat-gdp]').textContent=fmt(m.gdp);q('[data-ca-stat-employment]').textContent=m.employment===null?'未取得':fmt(m.employment);
  q('[data-ca-stat-note]').textContent=m.id==='refining'?'NAICS 324：石油と石炭の製品製造。精製に対応する雇用の細分類は未取得。':m.id==='metals'?'NAICS 331＋332：一次金属・金属製品。ニッケル・アルミだけの値ではありません。':m.id==='mining'?'NAICS 212：鉱業全体。ニッケルだけの生産量・雇用ではありません。':m.id==='utilities'?'NAICS 22：電力・ガス・水道。水力発電だけの値ではありません。':'GDPは13州・準州計。雇用は準州を除く全国。統計分類は地図の学習分類とは別です。';
  const ranked=[...m.provinces].sort((a,b)=>b.gdp-a.gdp);q('[data-ca-ranking-scope]').textContent=`${name} · 2021年 · 百万CAD。棒の尺度は各列で同じ。`;
  const ranking=q('[data-ca-ranking]');ranking.replaceChildren();
  for(const p of ranked.slice(0,5)){const li=document.createElement('li'),name=document.createElement('span'),value=document.createElement('b'),track=document.createElement('i'),bar=document.createElement('span');name.textContent=p.name;value.textContent=fmt(p.gdp);bar.style.width=(p.gdp/ranked[0].gdp*100)+'%';track.append(bar);li.append(name,value,track);ranking.append(li);}
  const table=document.createElement('table');table.innerHTML='<thead><tr><th scope="col">州・準州</th><th scope="col">GDP（百万CAD）</th></tr></thead>';const tbody=document.createElement('tbody');for(const p of ranked){const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.scope='row';th.textContent=p.name;td.textContent=fmt(p.gdp);tr.append(th,td);tbody.append(tr);}table.append(tbody);q('[data-ca-numbers]').replaceChildren(table);
  const p=m.provinces.find(p=>p.id===state.province);q('[data-ca-value]').hidden=!p;if(p)q('[data-ca-value]').textContent=`${p.name} · 2021年 · ${name} · ${fmt(p.gdp)}百万CAD`;
  const oil=state.sector==='resources'&&(!state.industry||['oil-gas','refining'].includes(state.industry));q('[data-ca-international]').hidden=!oil;
  q('[data-ca-port-statistics]').hidden=state.sector!=='services';q('[data-ca-process]').hidden=oil||state.sector==='services';
  q('[data-ca-process-copy]').textContent=state.industry==='nickel'?(state.sector==='resources'?'確認された実流通：ヴォイジーズ・ベイの精鉱をロングハーバーへ海上輸送し、ニッケル・銅・コバルトに加工。':'概念的な用途：精錬した高純度ニッケル → 合金 → 航空宇宙・電子機器など。特定の組立工場への納入を示しません。'):state.industry==='aluminum'?'工程：アルミナ → 電気分解 → アルミ金属。ケマノ → キティマットの製錬への送電は操業者が示す関係です。個々の製品工場への販売先は未収録です。':'採掘・原料処理 → 素材・燃料 → 製品・利用という概念的な工程。資料で確認できない拠点間の取引・輸送量は補いません。';
 }
 function render(){
  const sector=pilot.sectors.find(s=>s.id===state.sector)!,item=pilot.industries.find(i=>i.id===state.industry),site=pilot.clusters.find(c=>c.id===state.site);
  root.dataset.industrySubsector=state.industry??'all';q('#ca-industry-panel').setAttribute('aria-labelledby','ca-sector-'+state.sector);
  for(const b of root.querySelectorAll<HTMLElement>('[data-ca-sector]')){const active=b.dataset.caSector===state.sector;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
  for(const row of root.querySelectorAll<HTMLElement>('[data-ca-subtabs]'))row.hidden=row.dataset.caSubtabs!==state.sector;
  for(const b of root.querySelectorAll<HTMLElement>('[data-ca-subsector]'))b.setAttribute('aria-pressed',String(b.dataset.caSubsector===state.industry));
  q('[data-ca-breadcrumb]').textContent=sector.insight;q('[data-ca-title]').textContent=item?pilotIndustryLabel(item.id,state.sector):sector.label;q('[data-ca-lead]').textContent=sector.insight;
  q('[data-ca-heading]').textContent=item?'主な集積の位置':state.sector==='resources'?'西部の資源と各地の加工・電力':state.sector==='manufacturing'?'中央部の組立と各地の素材・燃料':'都市の専門機能と東西の物流';
  q('[data-ca-reading]').textContent=item?.overview??sector.overview;q('[data-ca-why]').textContent=item?.why??sector.why;
  q('[data-ca-site-reading]').hidden=!site;if(site){q('[data-ca-site-title]').textContent=site.place+'｜'+stageLabel(site);q('[data-ca-site-copy]').textContent=site.note||`${site.place}の${pilotIndustryLabel(site.industry,state.sector)}。${stageLabel(site)}の地域案内位置です。`;const refs=q('[data-ca-site-sources]');refs.replaceChildren();for(const id of site.sources){const s=pilot.sources[id as keyof typeof pilot.sources],a=document.createElement('a');a.href=s.url;a.textContent=s.title;refs.append(a);}}
  q('[data-ca-clear]').hidden=!item;q('[data-ca-only-wrap]').hidden=!item;q<HTMLInputElement>('[data-ca-only]').checked=state.only;
  const other=site?.sectors.find(s=>s!==state.sector),overlap=q<HTMLButtonElement>('[data-ca-overlap]');overlap.hidden=!other;if(other)overlap.textContent=`同じ拠点を${other==='resources'?'資源・エネルギー':'製造業'}で読む`;
  const list=q('[data-ca-site-list]');list.replaceChildren();for(const c of pilot.clusters.filter(c=>c.sectors.includes(state.sector))){const b=document.createElement('button');b.type='button';b.textContent=`${pilotIndustryLabel(c.industry,state.sector)} · ${c.place}`;b.setAttribute('aria-pressed',String(c.id===state.site));b.addEventListener('click',()=>chooseSite(c));list.append(b);}
  q('[data-ca-map-caption]').textContent=`${sector.label}${state.only?' · 選択産業のみ':''}${state.sector==='resources'?' · 破線矢印＝確認された精鉱輸送（海路は模式）':''}`;
  const raw=new URL(location.href).searchParams.get('populationReturn'),wrap=q('[data-ca-population-return-wrap]');wrap.hidden=true;if(raw){const source=new URL('?'+raw,location.href);if(!isCanadaDemographicTopic(source.searchParams.get('topic'))){const p=readCanadaPopulationState(source,population.cmas.map(c=>c.id)),back=q<HTMLAnchorElement>('[data-canada-population-industry-return]');back.href=copyCanadaPopulationMapState(source,writeCanadaPopulationState(new URL(back.getAttribute('href')!,location.href),p)).href;back.textContent=`元の${p.year}年${p.metric==='density'?'人口密度':'都市圏人口'}比較へ戻る`;wrap.hidden=false;}}
  statistics();camera();requestAnimationFrame(camera);
 }
 for(const b of root.querySelectorAll<HTMLElement>('[data-ca-sector]'))b.addEventListener('click',()=>{state={...state,sector:b.dataset.caSector as PilotState['sector'],industry:null,site:null,only:false,province:null};save();});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ca-subsector]'))b.addEventListener('click',()=>chooseIndustry(b.dataset.caSubsector!));
 q('[data-ca-clear]').addEventListener('click',()=>{state.industry=null;state.site=null;state.only=false;save();});q<HTMLInputElement>('[data-ca-only]').addEventListener('change',e=>{state.only=(e.target as HTMLInputElement).checked;save();});
 q('[data-ca-overlap]').addEventListener('click',()=>{const site=pilot.clusters.find(c=>c.id===state.site)!;state.sector=site.sectors.find(s=>s!==state.sector) as PilotState['sector'];state.only=false;save();});
 q('[data-ca-international-place]').addEventListener('click',()=>{state.sector='resources';state.industry='oil-gas';state.site='athabasca';state.only=false;save();});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ca-place]'))b.addEventListener('click',()=>{state.province=b.dataset.caPlace!;save();});
 const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-ca-sector]')];q('[role=tablist]').addEventListener('keydown',(event)=>{const e=event as KeyboardEvent,i=tabs.indexOf(document.activeElement as HTMLButtonElement);if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[j].click();tabs[j].focus();});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ca-camera]'))b.addEventListener('click',()=>{const action=b.dataset.caCamera;if(action==='reset'){fit();frame=initialFrame.slice();}else if(action==='whole'){const points=config.geometry.flatMap((g:any)=>[canadaLegacyPoint(g.bounds.slice(0,2)),canadaLegacyPoint(g.bounds.slice(2,4))]),xs=points.map((p:number[])=>p[0]),ys=points.map((p:number[])=>p[1]),ratio=frame[2]/frame[3],w=Math.max(Math.max(...xs)-Math.min(...xs),(Math.max(...ys)-Math.min(...ys))*ratio)*1.08;frame=[(Math.min(...xs)+Math.max(...xs)-w)/2,(Math.min(...ys)+Math.max(...ys)-w/ratio)/2,w,w/ratio];}else{const factor=action==='in'?.8:1.25,w=Math.max(150,Math.min(2600,frame[2]*factor)),h=w*frame[3]/frame[2];frame=[frame[0]+(frame[2]-w)/2,frame[1]+(frame[3]-h)/2,w,h];}save();});
 svg.addEventListener('keydown',e=>{if(e.target!==svg)return;const delta:Record<string,number[]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(delta[e.key]){e.preventDefault();frame[0]+=delta[e.key][0]*frame[2]*.1;frame[1]+=delta[e.key][1]*frame[3]*.1;save();}});
 svg.addEventListener('pointerdown',e=>{if(e.button===0)drag={x:e.clientX,y:e.clientY,frame:frame.slice(),moved:false};});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;drag.moved=true;svg.setPointerCapture(e.pointerId);const m=svg.getScreenCTM()!;frame=[drag.frame[0]-dx/m.a,drag.frame[1]-dy/m.d,drag.frame[2],drag.frame[3]];camera();});
 svg.addEventListener('pointerup',()=>{if(drag?.moved)save();drag=null;});svg.addEventListener('pointercancel',()=>{drag=null;});
 window.addEventListener('popstate',()=>{state=getState();frame=state.frame??initialFrame.slice();render();});window.addEventListener('resize',()=>{fit();if(!state.frame)frame=initialFrame.slice();camera();});document.fonts?.ready.then(camera);
 fit();frame=state.frame??initialFrame.slice();render();
}
