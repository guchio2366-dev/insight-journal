import {projectCanadaMap,canadaLegacyPoint} from '../lib/atlas-canada-map-presentation';
import {canadaIndustryPilot as pilot,pilotIndustryLabel,readPilotState,writePilotState,zoomPilotFrame,type PilotState,type PilotCluster} from '../lib/atlas-canada-industry-pilot';
import population from '../data/atlas/canada/population.json';
import {groupPilotLabelPoints,placePilotLabel} from '../lib/atlas-canada-industry-labels';
import {readCanadaPopulationState,writeCanadaPopulationState,copyCanadaPopulationMapState} from '../lib/atlas-canada-population';
import {isCanadaDemographicTopic} from '../lib/atlas-canada-demographics';
import {canadaIndustryEvidence,formatCanadaIndustryFact} from '../lib/atlas-canada-industry-evidence';
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
  const ratio=(stage.clientWidth||940)/(stage.clientHeight||510),width=Math.max(bounds[2]-bounds[0]+90,(bounds[3]-bounds[1]+105)*ratio),height=width/ratio;
  initialFrame=[(bounds[0]+bounds[2]-width)/2,(bounds[1]+bounds[3]-height)/2-12,width,height];
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
  const lines=element('svg',{width:'100%',height:'100%','aria-label':'産業の集積位置とラベル対応'});lines.classList.add('ca-pilot-connectors');overlay.append(lines);
  const screen=(coordinates:number[])=>{const [x,y]=projectCanadaMap(coordinates);return [matrix.a*x+matrix.c*y+matrix.e-rect.x,matrix.b*x+matrix.d*y+matrix.f-rect.y];};
  // All peers reserve their places even while only one industry is displayed.
  const visible=pilot.clusters.filter(c=>c.sectors.includes(state.sector)).map(c=>({c,point:screen(c.coordinates)})).filter(({point:[x,y]})=>x>=0&&x<=w&&y>=0&&y<=h);
  const groups=groupPilotLabelPoints(visible),keyHeight=q('.ca-pilot-map-key').getBoundingClientRect().height;
  const occupied:number[][]=[[0,0,w,keyHeight+14],[0,h-25,w,h],...visible.map(({point:[x,y]})=>[x-7,y-7,x+7,y+7])];
  // The only arrow is the source-documented supply relation. Its sea route is schematic.
  for(const flow of pilot.flows.filter(f=>f.sector===state.sector&&(!state.only||state.industry===f.industry))){
   const from=visible.find(v=>v.c.id===flow.from),to=visible.find(v=>v.c.id===flow.to);if(!from||!to)continue;
   const [a,b]=from.point,[c,d]=to.point,color=pilot.industries.find(i=>i.id===flow.industry)!.color;
   const path=element('path',{d:`M${a},${b} Q${Math.max(a,c)+35},${(b+d)/2} ${c},${d}`,fill:'none',stroke:color,'stroke-width':state.industry===flow.industry?2.5:1.4,'stroke-dasharray':'5 4','data-ca-flow':flow.id});
   const title=element('title',{});title.textContent=flow.label;path.append(title);lines.append(path);
   lines.append(element('path',{d:`M${c-4},${d-10} L${c},${d} L${c+7},${d-8}`,fill:'none',stroke:color,'stroke-width':2}));
  }
  // Keep every original guide position. City names are supplementary, never the grouping axis.
  const markOrder=[...visible].sort((a,b)=>Number(a.c.industry===state.industry)-Number(b.c.industry===state.industry)||Number(a.c.id===state.site)-Number(b.c.id===state.site));
  for(const {c,point:[x,y]}of markOrder){
   if(state.only&&c.industry!==state.industry)continue;
   const color=pilot.industries.find(i=>i.id===c.industry)!.color,processing=/精|製|選鉱|処理|加工|パルプ|紙|構造体|部品|機体/.test(c.stage);
   const peers=visible.filter(v=>v.c.coordinates.join(',')===c.coordinates.join(',')),index=peers.findIndex(v=>v.c.id===c.id),cx=x+(index-(peers.length-1)/2)*14;
   const group=element('g',{'data-ca-marker':c.id,role:'button',tabindex:'0','aria-pressed':String(c.id===state.site),'aria-label':`${pilotIndustryLabel(c.industry,state.sector)} · ${c.place} · ${stageLabel(c)}`});
   const inactive=!!c.status&&c.status!=='operating';
   const attrs={'data-ca-cluster':c.id,'data-industry':c.industry,'data-coordinate':c.coordinates.join(','),'data-status':c.status??'source-supported',fill:inactive?'#fffef7':color,stroke:inactive?color:'#fff','stroke-width':1.2,...(inactive?{'stroke-dasharray':'2 1'}:{})};
   group.append(element('circle',{cx,cy:y,r:6,fill:'transparent'}));
   group.append(processing?element('rect',{...attrs,x:cx-4,y:y-4,width:8,height:8}):element('circle',{...attrs,cx,cy:y,r:4.5}));
   if(state.industry&&c.industry!==state.industry)group.setAttribute('opacity','.5');
   if(c.industry===state.industry)group.append(element('circle',{cx,cy:y,r:7,fill:'none',stroke:color,'stroke-width':c.id===state.site?2.5:1.3,'pointer-events':'none'}));
   group.addEventListener('click',()=>chooseSite(c));group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseSite(c);}});lines.append(group);
  }
  // Selection changes emphasis, never the allocation order or a label's size.
  const ordered=groups.sort((a,b)=>b.length-a.length||a[0].c.id.localeCompare(b[0].c.id));
  for(const group of ordered){
   const industry=group[0].c.industry,item=pilot.industries.find(i=>i.id===industry)!,card=document.createElement('button');card.type='button';card.className='ca-pilot-map-label';card.dataset.caLabelGroup=industry;card.dataset.caLabelSites=group.map(v=>v.c.id).join(',');card.style.setProperty('--pilot-color',item.color);
   if(state.industry&&industry!==state.industry)card.classList.add('is-context');if(industry===state.industry)card.classList.add('is-highlighted');
   card.setAttribute('aria-pressed',String(industry===state.industry));card.setAttribute('aria-label',`${pilotIndustryLabel(industry,state.sector)}：${group.map(v=>v.c.place).join('、')}を強調`);
   const label=document.createElement('strong');label.textContent=industry==='digital'?'情報技術':industry==='uranium'?'ウラン採掘・処理':industry==='nickel'&&state.sector==='resources'?'ニッケル':pilotIndustryLabel(industry,state.sector);const icon=document.createElement('i');icon.setAttribute('aria-hidden','true');label.prepend(icon);card.append(label);
   const place=document.createElement('small');const places=[...new Set(group.map(v=>v.c.place.split(/[／〜]/)[0]))];if(state.sector==='services'){card.dataset.sector='services';for(const [index,name]of places.entries()){if(index)place.append('・');const city=document.createElement('span');city.textContent=name;city.style.display='inline-block';place.append(city);}}else place.textContent=places.length<=2?places.join('・'):places.slice(0,2).join('・')+'ほか';card.append(place);
   const statuses=[...new Set(group.filter(v=>v.c.status&&v.c.status!=='operating').map(v=>v.c.status))];if(statuses.length){const status=document.createElement('span');status.className='ca-pilot-status';status.textContent=statuses.map(s=>s==='planned'?'計画':s==='construction'?'建設':'休止').join('・');card.append(status);}
   card.addEventListener('click',()=>chooseIndustry(industry));overlay.append(card);
   const box=placePilotLabel(group.map(v=>v.point),[card.offsetWidth||110,card.offsetHeight||38],[w,h],occupied);
   if(!box){card.remove();root.dataset.labelsIncomplete='true';continue;}
   occupied.push(box);card.style.left=box[0]+'px';card.style.top=box[1]+'px';
   if(state.only&&industry!==state.industry){card.hidden=true;continue;}
   for(const {point:[x,y],c}of group){const endX=Math.max(box[0],Math.min(box[2],x)),endY=Math.max(box[1],Math.min(box[3],y));
    lines.insertBefore(element('line',{x1:x,y1:y,x2:endX,y2:endY,stroke:item.color,'stroke-width':industry===state.industry?1.4:.9,'data-ca-correspondence':c.id}),lines.firstChild);
   }
  }
  if(selectedFocus)overlay.querySelector<SVGElement>(`[data-ca-marker="${selectedFocus}"]`)?.focus({preventScroll:true});
 }
 function camera(){svg.setAttribute('viewBox',frame.join(' '));delete root.dataset.labelsIncomplete;labels();(root as any).canadaIndustryView={...state,frame:frame.slice(),initialFrame:initialFrame.slice(),province:state.province,subsector:state.industry??'all'};}
 function evidence(){
  const item=state.industry?canadaIndustryEvidence.items[state.industry]:null;
  q('[data-ca-evidence-title]').textContent=item?`${pilotIndustryLabel(state.industry!,state.sector)}｜採用の根拠`:'品目を選ぶと、採用の定量根拠を比較できます';
  q('[data-ca-evidence-reason]').textContent=item?.adoptionReason??'地図・凡例から産業を選択。地域規模、世界位置・集中度、需要・供給網を別々に読みます。';
  q('[data-ca-evidence-confidence]').textContent=item?`根拠の確信度：${item.confidence} · 資料確認 ${canadaIndustryEvidence.asOf} · 金額はCAD`:'生産・加工・完成品・サービスを分け、資料がない指標は未確認と表示します。業種GDPと観光需要GDPなど、重なる統計は合算しません。';
  for(const column of ['scale','comparison','strategy'] as const){
   const container=q(`[data-ca-evidence-${column}]`);container.replaceChildren();
   if(!item){const p=document.createElement('p');p.textContent=column==='scale'?'GDP・売上・生産・雇用から、その品目に合う尺度を使用。':column==='comparison'?'世界順位が確認できない品目は、国内集中や同一定義の比較を使用。':'対米依存、原料と製品、操業実績と将来能力を区別。';container.append(p);continue;}
   for(const fact of item[column]){
    const card=document.createElement('article');card.className='ca-evidence-fact';if(fact.value===null)card.classList.add('is-missing');
    const title=document.createElement('h4');title.textContent=fact.label;const value=document.createElement('strong');value.textContent=formatCanadaIndustryFact(fact);
    const scope=document.createElement('p');scope.className='ca-evidence-scope';scope.textContent=`${fact.year} · ${fact.geography} · 分母／対象：${fact.denominator}`;
    const definition=document.createElement('p');definition.textContent=fact.definition;const refs=document.createElement('p');
    for(const [index,id]of fact.sources.entries()){if(index)refs.append(' ／ ');const s=pilot.sources[id as keyof typeof pilot.sources],a=document.createElement('a');a.href=s.url;a.textContent=s.title;refs.append(a);}
    card.append(title,value,scope,definition,refs);container.append(card);
   }
  }
 }
 function statistics(){
  const item=pilot.industries.find(i=>i.id===state.industry),id=item?.metrics[state.sector]??state.sector,m=metrics.find(m=>m.id===id)!;
  const name=m.id==='resources'?'採掘・電気等の供給（NAICS 21＋22）':m.id==='services'?'既存のサービス統計（不動産を除く）':m.label;
  q('[data-ca-stat-title]').textContent=name;q('[data-ca-stat-scope]').textContent=`2021年 · ${item&&!item.metrics[state.sector]?'選んだ産業の一致統計は未収録。分類の参考値を表示。':'全国の統計区分。地図の集積の数量ではありません。'}`;
  q('[data-ca-stat-gdp]').textContent=fmt(m.gdp);q('[data-ca-stat-employment]').textContent=m.employment===null?'未取得':fmt(m.employment);
  q('[data-ca-stat-note]').textContent=m.id==='refining'?'NAICS 324：石油と石炭の製品製造。精製に対応する雇用の細分類は未取得。':m.id==='metals'?'NAICS 331＋332：一次金属・金属製品。ニッケル・アルミだけの値ではありません。':m.id==='mining'?'NAICS 212：鉱業全体。選択した鉱物だけの生産量・雇用ではありません。':m.id==='wood-paper'?'NAICS 321＋322：木材製品と紙製品の合計。木材・紙を個別に選んでも同じ参考値で、2表示を加算しません。':m.id==='utilities'?'NAICS 22：電力・ガス・水道。水力発電だけの値ではありません。':'GDPは13州・準州計。雇用は準州を除く全国。統計分類は地図の学習分類とは別です。';
  const ranked=[...m.provinces].sort((a,b)=>b.gdp-a.gdp);q('[data-ca-ranking-scope]').textContent=`${name} · 2021年 · 百万CAD。棒の尺度は各列で同じ。`;
  const ranking=q('[data-ca-ranking]');ranking.replaceChildren();
  for(const p of ranked.slice(0,5)){const li=document.createElement('li'),name=document.createElement('span'),value=document.createElement('b'),track=document.createElement('i'),bar=document.createElement('span');name.textContent=p.name;value.textContent=fmt(p.gdp);bar.style.width=(p.gdp/ranked[0].gdp*100)+'%';track.append(bar);li.append(name,value,track);ranking.append(li);}
  const table=document.createElement('table');table.innerHTML='<thead><tr><th scope="col">州・準州</th><th scope="col">GDP（百万CAD）</th></tr></thead>';const tbody=document.createElement('tbody');for(const p of ranked){const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.scope='row';th.textContent=p.name;td.textContent=fmt(p.gdp);tr.append(th,td);tbody.append(tr);}table.append(tbody);q('[data-ca-numbers]').replaceChildren(table);
  const p=m.provinces.find(p=>p.id===state.province);q('[data-ca-value]').hidden=!p;if(p)q('[data-ca-value]').textContent=`${p.name} · 2021年 · ${name} · ${fmt(p.gdp)}百万CAD`;
  const oil=state.sector==='resources'&&(!state.industry||['oil-gas','refining'].includes(state.industry));q('[data-ca-international]').hidden=!oil;
  q('[data-ca-port-statistics]').hidden=state.sector!=='services';q('[data-ca-process]').hidden=oil||state.sector==='services';
  q('[data-ca-process-copy]').textContent=state.industry==='uranium'?'確認された実流通：マッカーサーリバーの鉱石をキー湖へ、シガー湖の鉱石をマクリーン湖へ道路輸送して処理。線の近さから作った納入関係ではありません。':state.industry==='potash'?'工程：カリを含む鉱床 → 採掘・選鉱 → 肥料原料。個々の農場への販売先や輸送量は未収録です。':state.industry==='nickel'?(state.sector==='resources'?'確認された実流通：ヴォイジーズ・ベイの精鉱をロングハーバーへ海上輸送し、ニッケル・銅・コバルトに加工。':'概念的な用途：精錬した高純度ニッケル → 合金 → 航空宇宙・電子機器など。特定の組立工場への納入を示しません。'):state.industry==='aluminum'?'工程：アルミナ → 電気分解 → アルミ金属。ケマノ → キティマットの製錬への送電は操業者が示す関係です。個々の製品工場への販売先は未収録です。':'採掘・原料処理 → 素材・燃料 → 製品・利用という概念的な工程。資料で確認できない拠点間の取引・輸送量は補いません。';
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
  q('[data-ca-site-reading]').hidden=!site;if(site){q('[data-ca-site-title]').textContent=site.place+'｜'+stageLabel(site);q('[data-ca-site-copy]').textContent=(site.asOf?`資料時点 ${site.asOf}。`:'')+(site.note||`${site.place}の${pilotIndustryLabel(site.industry,state.sector)}。${stageLabel(site)}の地域案内位置です。`);const refs=q('[data-ca-site-sources]');refs.replaceChildren();for(const id of site.sources){const s=pilot.sources[id as keyof typeof pilot.sources],a=document.createElement('a');a.href=s.url;a.textContent=s.title;refs.append(a);}}
  q('[data-ca-clear]').hidden=!item;q('[data-ca-only-wrap]').hidden=!item;q<HTMLInputElement>('[data-ca-only]').checked=state.only;
  const other=site?.sectors.find(s=>s!==state.sector),overlap=q<HTMLButtonElement>('[data-ca-overlap]');overlap.hidden=!other;if(other)overlap.textContent=`同じ拠点を${other==='resources'?'資源・エネルギー':'製造業'}で読む`;
  const list=q('[data-ca-site-list]');list.replaceChildren();for(const c of pilot.clusters.filter(c=>c.sectors.includes(state.sector))){const b=document.createElement('button');b.type='button';b.textContent=`${pilotIndustryLabel(c.industry,state.sector)} · ${c.place}`;b.setAttribute('aria-pressed',String(c.id===state.site));b.addEventListener('click',()=>chooseSite(c));list.append(b);}
  q('[data-ca-map-caption]').textContent=`${sector.label}${state.only?' · 選択産業のみ':''}${state.sector==='resources'?' · 破線矢印＝確認された精鉱輸送（海路は模式）':''}`;
  const raw=new URL(location.href).searchParams.get('populationReturn'),wrap=q('[data-ca-population-return-wrap]');wrap.hidden=true;if(raw){const source=new URL('?'+raw,location.href);if(!isCanadaDemographicTopic(source.searchParams.get('topic'))){const p=readCanadaPopulationState(source,population.cmas.map(c=>c.id)),back=q<HTMLAnchorElement>('[data-canada-population-industry-return]');back.href=copyCanadaPopulationMapState(source,writeCanadaPopulationState(new URL(back.getAttribute('href')!,location.href),p)).href;back.textContent=`元の${p.year}年${p.metric==='density'?'人口密度':'都市圏人口'}比較へ戻る`;wrap.hidden=false;}}
  evidence();statistics();camera();requestAnimationFrame(camera);
 }
 for(const b of root.querySelectorAll<HTMLElement>('[data-ca-sector]'))b.addEventListener('click',()=>{state={...state,sector:b.dataset.caSector as PilotState['sector'],industry:null,site:null,only:false,province:null};save();});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ca-subsector]'))b.addEventListener('click',()=>chooseIndustry(b.dataset.caSubsector!));
 q('[data-ca-clear]').addEventListener('click',()=>{state.industry=null;state.site=null;state.only=false;save();});q<HTMLInputElement>('[data-ca-only]').addEventListener('change',e=>{state.only=(e.target as HTMLInputElement).checked;save();});
 q('[data-ca-overlap]').addEventListener('click',()=>{const site=pilot.clusters.find(c=>c.id===state.site)!;state.sector=site.sectors.find(s=>s!==state.sector) as PilotState['sector'];state.only=false;save();});
 q('[data-ca-international-place]').addEventListener('click',()=>{state.sector='resources';state.industry='oil-gas';state.site='athabasca';state.only=false;save();});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ca-place]'))b.addEventListener('click',()=>{state.province=b.dataset.caPlace!;save();});
 const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-ca-sector]')];q('[role=tablist]').addEventListener('keydown',(event)=>{const e=event as KeyboardEvent,i=tabs.indexOf(document.activeElement as HTMLButtonElement);if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[j].click();tabs[j].focus();});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ca-camera]'))b.addEventListener('click',()=>{const action=b.dataset.caCamera;if(action==='reset'){fit();frame=initialFrame.slice();}else if(action==='whole'){const points=config.geometry.flatMap((g:any)=>[canadaLegacyPoint(g.bounds.slice(0,2)),canadaLegacyPoint(g.bounds.slice(2,4))]),xs=points.map((p:number[])=>p[0]),ys=points.map((p:number[])=>p[1]),ratio=frame[2]/frame[3],w=Math.max(Math.max(...xs)-Math.min(...xs),(Math.max(...ys)-Math.min(...ys))*ratio)*1.08;frame=[(Math.min(...xs)+Math.max(...xs)-w)/2,(Math.min(...ys)+Math.max(...ys)-w/ratio)/2,w,w/ratio];}else frame=zoomPilotFrame(frame,action==='in'?.8:1.25);save();});
 svg.addEventListener('keydown',e=>{if(e.target!==svg)return;const delta:Record<string,number[]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(delta[e.key]){e.preventDefault();frame[0]+=delta[e.key][0]*frame[2]*.1;frame[1]+=delta[e.key][1]*frame[3]*.1;save();}});
 svg.addEventListener('pointerdown',e=>{if(e.button===0)drag={x:e.clientX,y:e.clientY,frame:frame.slice(),moved:false};});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;drag.moved=true;svg.setPointerCapture(e.pointerId);const m=svg.getScreenCTM()!;frame=[drag.frame[0]-dx/m.a,drag.frame[1]-dy/m.d,drag.frame[2],drag.frame[3]];camera();});
 svg.addEventListener('pointerup',()=>{if(drag?.moved)save();drag=null;});svg.addEventListener('pointercancel',()=>{drag=null;});
 window.addEventListener('popstate',()=>{state=getState();frame=state.frame??initialFrame.slice();render();});window.addEventListener('resize',()=>{fit();if(!state.frame)frame=initialFrame.slice();camera();});document.fonts?.ready.then(camera);
 fit();frame=state.frame??initialFrame.slice();render();
}
