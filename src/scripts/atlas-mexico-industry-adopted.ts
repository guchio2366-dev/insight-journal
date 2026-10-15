import {adoptedGroups,adoptedSectors,readAdoptedState,writeAdoptedState,formatAdoptedValue,adoptedShare,adoptedMapColor,adoptedMapColors,adoptedStatusText,type AdoptedIndustry,type AdoptedIndicator,type AdoptedSector,type AdoptedSource} from '../lib/atlas-mexico-industry-adopted';
type Config={industries:AdoptedIndustry[];sources:Record<string,AdoptedSource>;states:{id:string;name:string}[];geometry:{id:string;point:number[]}[]};
import {mexicoSectorClusters,mexicoSectorPoints,mexicoClusterIndustryName,placeMexicoSectorLabels,mexicoSectorLabelSize} from '../lib/atlas-mexico-industry-sector-labels.ts';
const ns='http://www.w3.org/2000/svg',initial=[0,0,900,580];
export function initMexicoIndustryAdopted(root:HTMLElement){
 if(root.dataset.maReady)return;
 const config:Config=JSON.parse(root.querySelector('[data-ma-config]')!.textContent!);
 let state=readAdoptedState(new URL(location.href)),frame=state.frame??initial.slice(),drag:{x:number;y:number;frame:number[];moved:boolean;pointerId:number}|null=null,drawFrame=0;
 let mapPanel:HTMLElement,svg:SVGSVGElement,stage:HTMLElement,overlay:HTMLElement;
 const q=<T extends Element=HTMLElement>(selector:string)=>(mapPanel?.querySelector<T>(selector)??root.querySelector<T>(selector))!;
 function bindMap(){
  for(const panel of root.querySelectorAll<HTMLElement>('[data-ma-sector-map]'))panel.hidden=panel.dataset.maSectorMap!==state.sector;
  mapPanel=root.querySelector<HTMLElement>(`[data-ma-sector-map="${state.sector}"]`)!;
  svg=mapPanel.querySelector<SVGSVGElement>('[data-ma-map]')!;stage=q('[data-ma-frame]');overlay=q('[data-ma-labels]');
 }
 bindMap();
 const item=()=>config.industries.find(i=>i.id===state.industry)??null;
 const name=(code:string)=>config.states.find(s=>s.id===code)?.name??code;
 const point=(code:string)=>config.geometry.find(g=>g.id===code)!.point;
 const element=(tag:string,attrs:Record<string,string|number>)=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,String(value));return n;};
 const copy=(selector:string,value:string)=>{q(selector).textContent=value;};
 const links=(target:Element,ids:string[])=>{for(const id of [...new Set(ids)]){const source=config.sources[id];if(!source)continue;const a=document.createElement('a');a.href=source.url;a.textContent=source.title;target.append(a);}};
 const save=()=>{state.frame=frame.every((n,i)=>Math.abs(n-initial[i])<.001)?null:frame.slice();const url=writeAdoptedState(new URL(location.href),state);if(url.href!==location.href)history.pushState(null,'',url);render();};
 function choosePlace(id:string,code:string){state.industry=id;state.state=code;save();}
 function formatCell(value:number|null,status:string,unit:string){return value===null?adoptedStatusText[status as keyof typeof adoptedStatusText]??'未取得':formatAdoptedValue(value,unit);}
 function labels(){
  const matrix=svg.getScreenCTM?.();if(!matrix)return;
  const bounds=stage.getBoundingClientRect(),width=bounds.width,height=bounds.height;if(width<1||height<1)return;
  const screen=(code:string)=>{const [x,y]=point(code);return [matrix.a*x+matrix.c*y+matrix.e-bounds.x,matrix.b*x+matrix.d*y+matrix.f-bounds.y];};
  const inside=(p:number[])=>p[0]>=4&&p[0]<=width-4&&p[1]>=4&&p[1]<=height-4;
  const points=mexicoSectorPoints(state.sector).map(p=>({...p,point:screen(p.state)})).filter(p=>inside(p.point));
  const clusters=mexicoSectorClusters(state.sector).map(c=>({...c,point:screen(c.anchor)})).filter(c=>inside(c.point));
  const boxes=placeMexicoSectorLabels(clusters,points.map(p=>p.point),width,height);
  const markerFocus=(document.activeElement as HTMLElement)?.dataset.maMarker;
  overlay.replaceChildren();const annotations=element('svg',{width:'100%',height:'100%','aria-label':'選択した分野の州案内点と短い地域ラベル'});annotations.classList.add('ma-annotations');overlay.append(annotations);
  for(const cluster of clusters){
   const active=!!state.industry&&cluster.industries.some(i=>i.id===state.industry),box=boxes.get(cluster.id);if(!box)continue;
   const label=element('g',{'data-ma-cluster':cluster.id,'data-ma-sector-label':state.sector,'data-ma-x':box[0],'data-ma-y':box[1],'data-ma-width':mexicoSectorLabelSize.width,'data-ma-height':mexicoSectorLabelSize.height});label.classList.add('ma-region-label');
   const visible=!state.only||active;label.setAttribute('visibility',visible?'visible':'hidden');if(!visible)label.dataset.maHidden='true';
   if(state.industry&&!active)label.classList.add('is-context');if(active)label.classList.add('is-selected');
   const title=element('title',{});title.textContent=`${cluster.name}：${cluster.states.map(name).join('、')}。${cluster.industries.map(i=>i.label).join('、')}`;label.append(title);
   const region=element('text',{x:box[0],y:box[1]+11}),examples=element('text',{x:box[0],y:box[1]+26});region.classList.add('ma-region-name');examples.classList.add('ma-region-industries');region.textContent=cluster.name;examples.textContent=active?mexicoClusterIndustryName(cluster,item()!):cluster.examples;label.append(region,examples);annotations.append(label);
  }
  for(const p of points){
   const active=!!state.industry&&p.industries.some(i=>i.id===state.industry);if(state.only&&!active)continue;
   const entries=state.only?p.industries.filter(i=>i.id===state.industry):p.industries;
   const [x,y]=p.point,marker=element('g',{'data-ma-marker':`${state.sector}:${p.state}`,'data-state':p.state,'data-ma-point-industries':entries.map(i=>i.id).join(','),role:'button',tabindex:'0','aria-pressed':String(p.state===state.state),'aria-label':`${name(p.state)}：${entries.map(i=>i.label).join('、')}`});
   const title=element('title',{});title.textContent=entries.map(i=>`${i.label}：${i.map.regions.find(r=>r.state===p.state)!.stage}`).join('、');marker.append(title);
   marker.append(element('circle',{cx:x,cy:y,r:9,fill:'#fff','fill-opacity':0}));marker.append(element('circle',{cx:x,cy:y,r:3.5,fill:active?'#345d4c':'#657c6b',stroke:'#fffefa','stroke-width':1}));
   if(p.state===state.state)marker.append(element('circle',{cx:x,cy:y,r:7,fill:'none',stroke:'#a95c32','stroke-width':2}));
   if(state.industry&&!active)marker.setAttribute('opacity','.4');
   const choose=()=>{state.state=p.state;save();};marker.addEventListener('click',choose);marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});annotations.append(marker);
  }
  if(markerFocus)overlay.querySelector<SVGElement>(`[data-ma-marker="${markerFocus}"]`)?.focus({preventScroll:true});
  root.dataset.maLabelsComplete='true';root.dataset.maAnnotationCount=String(boxes.size);root.dataset.maOmittedAnnotations=String(clusters.length-boxes.size);
  const omitted=clusters.length-boxes.size,note=q('[data-ma-label-note]');note.hidden=omitted===0;note.textContent=omitted?`表示幅に合わせて地域ラベル${omitted}件を省略。すべての州・品目・工程は右の地域一覧で確認できます。`:'';
 }

 function camera(){svg.setAttribute('viewBox',frame.join(' '));labels();(root as any).mexicoAdoptedView={...state,frame:frame.slice()};}
 function scheduleCamera(){if(drawFrame)return;drawFrame=requestAnimationFrame(()=>{drawFrame=0;camera();});}
 function map(){
  const selected=item(),hasValues=!!selected&&selected.map.kind!=='guide'&&selected.map.values.length>0,maximum=selected?Math.max(0,...selected.map.values.filter(v=>v.status==='available'&&v.value!==null).map(v=>v.value!)):0;
  for(const shape of svg.querySelectorAll<SVGPathElement>('[data-ma-state]')){
   const code=shape.dataset.maState!,cell=selected?.map.values.find(v=>v.state===code)??{value:null,status:'unretrieved' as const};
   shape.setAttribute('fill',hasValues?adoptedMapColor(cell.value,cell.status,selected?.map.nationalTotal,maximum).replace('url(#ma-','url(#ma-'+state.sector+'-'):'#e6e9dc');shape.setAttribute('aria-pressed',String(code===state.state));shape.classList.toggle('is-selected',code===state.state);shape.dataset.maStatus=hasValues?cell.status:'guide';
   const label=`${name(code)}${hasValues?'・'+formatCell(cell.value,cell.status,selected!.map.unit):'・地域案内'}`;shape.setAttribute('aria-label',label);shape.querySelector('title')!.textContent=label;
  }
  copy('[data-ma-map-title]',`メキシコの${selected?.label??adoptedSectors.find(s=>s.id===state.sector)!.label}の集積`);
  copy('[data-ma-map-caption]',hasValues?`${selected!.label}｜${selected!.map.year}年・${selected!.map.unit}。州の色は${selected!.map.kind==='employment'?'就業者':'公表値'}の集積。点の大きさは数量を表しません。`:'短い地域ラベルは近接州の産業例（規模の順位ではない）、点はこの分野で確認した州の案内位置です。品目は地図の外で選びます。');
  copy('[data-ma-map-definition]',(selected?.map.definition??'')+' 地域ラベルは表示のための集約で、統計の集計区域ではありません。点は州の案内位置で、個別施設の敷地・取引・輸送経路を表しません。');
  copy('[data-ma-map-description]',`${q('[data-ma-map-caption]').textContent} ${q('[data-ma-map-definition]').textContent}`);
  const mapSources=q('[data-ma-map-sources]');mapSources.replaceChildren();links(mapSources,selected?.map.sourceIds??[]);
  const legend=q('[data-ma-legend]');legend.hidden=!hasValues;legend.replaceChildren();
  if(hasValues){const heading=document.createElement('strong');heading.textContent=selected!.map.nationalTotal?'州の値／同年・同分類の全国値':'公開州の最大値を100とする相対階級（全国シェアではない）';legend.append(heading);
   const labels=selected!.map.nationalTotal?['0超–1%未満','1–5%未満','5–10%未満','10–20%未満','20–40%未満','40%以上']:['0超–10未満','10–25未満','25–50未満','50–70未満','70–90未満','90以上'];
   labels.forEach((label,n)=>{const span=document.createElement('span'),icon=document.createElement('i');icon.style.background=adoptedMapColors[n];span.append(icon,label);legend.append(span);});
   for(const [status,label,background]of [['zero','公表された0','#fff'],['confidential','秘匿','repeating-linear-gradient(135deg,#e3e5df 0 3px,#7b877c 3px 4px)'],['unknown','未把握','radial-gradient(#839487 1px,transparent 1px) 0 0/5px 5px'],['unretrieved','未取得','repeating-linear-gradient(45deg,#eee9dd 0 3px,#9b9279 3px 4px)']]){const span=document.createElement('span'),icon=document.createElement('i');icon.style.background=background;span.dataset.maLegendStatus=status;span.append(icon,label);legend.append(span);}
  }
 }
 function indicators(target:Element,values:AdoptedIndicator[]){
  target.replaceChildren();
  for(const value of values){const dl=document.createElement('dl');dl.className='ma-indicator';const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=`${value.label}｜${value.year}${typeof value.year==='number'?'年':''}`;dd.textContent=formatAdoptedValue(value.value,value.unit,value.status);dd.classList.toggle('is-missing',value.value===null);dl.append(dt,dd);
   const ratio=adoptedShare(value);if(ratio!==null){const p=document.createElement('p');p.className='ma-share';p.textContent=`分母比 ${ratio.toLocaleString('ja-JP',{maximumFractionDigits:2})}%`;dl.append(p);}
   const scope=document.createElement('small');scope.textContent=value.definition+(value.note?' '+value.note:'');dl.append(scope);
   if(value.denominator){const p=document.createElement('p');p.textContent=`分母：${value.denominator.label} ${formatAdoptedValue(value.denominator.value,value.denominator.unit)}`;dl.append(p);}
   const references=document.createElement('div');links(references,value.sourceIds);dl.append(references);target.append(dl);
  }
 }
 function statistics(){
  const selected=item()??adoptedGroups(state.sector)[0].industries[0];
  copy('[data-ma-statistics-title]',`${selected.label}の国内規模・世界供給・販路`);
  copy('[data-ma-statistics-scope]',`${state.industry?'選択した産業':'全体表示の代表品目'}。年・分類・単位は指標ごとに異なります。統計を三分野の合計へ足し合わせません。`);
  for(const section of ['domestic','world','trade']as const)indicators(q(`[data-ma-indicators="${section}"]`),selected.statistics[section]);
  const stateValue=q('[data-ma-state-value]');stateValue.replaceChildren();if(state.state&&item()){const cell=selected.map.values.find(v=>v.state===state.state);const p=document.createElement('p');p.className='ma-state-value';p.textContent=`選択地域：${name(state.state)}｜${selected.map.year}年｜${cell?formatCell(cell.value,cell.status,selected.map.unit):'対応する州別値は未取得'}`;stateValue.append(p);}
  const ranking=q('[data-ma-ranking]'),tableWrap=q('[data-ma-state-table]');ranking.replaceChildren();tableWrap.replaceChildren();q('[data-ma-ranking-wrap]').hidden=!state.industry||!selected.map.values.length;
  if(!state.industry||!selected.map.values.length)return;
  copy('[data-ma-ranking-title]',`${selected.map.year}年の州別公開値・${selected.map.unit}`);
  const ranked=selected.map.values.filter(v=>v.status==='available'&&v.value!==null).sort((a,b)=>b.value!-a.value!),maximum=ranked[0]?.value??0;
  for(const row of ranked.slice(0,5)){const li=document.createElement('li'),button=document.createElement('button'),value=document.createElement('b'),track=document.createElement('i'),bar=document.createElement('span');button.textContent=name(row.state);button.addEventListener('click',()=>choosePlace(selected.id,row.state));value.textContent=formatAdoptedValue(row.value,selected.map.unit);bar.style.width=(maximum>0?row.value!/maximum*100:0)+'%';track.append(bar);li.append(button,value,track);if(selected.map.nationalTotal){const share=document.createElement('small');share.textContent=`同系列全国比 ${(row.value!/selected.map.nationalTotal*100).toFixed(2)}%`;li.append(share);}ranking.append(li);}
  const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=selected.map.definition+(selected.map.nationalTotal?` 全国分母 ${formatAdoptedValue(selected.map.nationalTotal,selected.map.unit)}。`:' 全国分母を保持していないため、公開州の合計を全国値としません。');table.append(caption);
  const thead=document.createElement('thead'),header=document.createElement('tr');for(const label of ['州',`${selected.map.year}年・${selected.map.unit}`,'公表状態']){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th);}thead.append(header);table.append(thead);const body=document.createElement('tbody');
  for(const region of config.states){const row=selected.map.values.find(v=>v.state===region.id)??{value:null,status:'unretrieved' as const},tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td'),status=document.createElement('td');tr.dataset.maTableState=region.id;th.scope='row';th.textContent=region.name;td.textContent=row.value===null?'—':formatAdoptedValue(row.value,selected.map.unit);status.textContent=adoptedStatusText[row.status];tr.append(th,td,status);body.append(tr);}table.append(body);tableWrap.append(table);
 }
 function render(){
  bindMap();
  const sector=adoptedSectors.find(s=>s.id===state.sector)!,selected=item();root.dataset.maSector=state.sector;root.dataset.maIndustry=state.industry??'all';q('#ma-panel').setAttribute('aria-labelledby',`ma-sector-${state.sector}`);
  for(const button of root.querySelectorAll<HTMLElement>('[data-ma-sector]')){const active=button.dataset.maSector===state.sector;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
  for(const row of root.querySelectorAll<HTMLElement>('[data-ma-choices]'))row.hidden=row.dataset.maChoices!==state.sector;
  for(const select of root.querySelectorAll<HTMLSelectElement>('[data-ma-industry-select]'))select.value=select.dataset.maIndustrySelect===state.sector?state.industry??'':'';
  copy('[data-ma-breadcrumb]',sector.lead);copy('[data-ma-title]',selected?.label??sector.label);copy('[data-ma-lead]',sector.lead);copy('[data-ma-overview-copy]',selected?.overview??sector.overview);copy('[data-ma-why]',selected?.why??sector.why);copy('[data-ma-process]',selected?.process??'');q('[data-ma-process-wrap]').hidden=!selected;
  copy('[data-ma-boundary]',selected?.boundary??'工程の重複掲載があります。各表示の統計を三分野の合計へ足し合わせません。資料のない場所を産業の不在とは判断しません。');
  q('[data-ma-clear]').hidden=!selected;q('[data-ma-only-wrap]').hidden=!selected;q<HTMLInputElement>('[data-ma-only]').checked=state.only;
  const other=selected?.sectors.find(s=>s!==state.sector),overlap=q('[data-ma-overlap]');overlap.hidden=!other;if(other)overlap.textContent=`同じ工程を${adoptedSectors.find(s=>s.id===other)!.label}で読む`;
  const list=q('[data-ma-place-list]');list.replaceChildren();for(const current of selected?[selected]:config.industries.filter(i=>i.sectors.includes(state.sector)))for(const region of current.map.regions){const b=document.createElement('button');b.type='button';b.textContent=`${current.label}｜${name(region.state)}｜${region.stage}`;b.setAttribute('aria-pressed',String(current.id===state.industry&&region.state===state.state));b.addEventListener('click',()=>choosePlace(current.id,region.state));list.append(b);}
  q('[data-ma-place-reading]').hidden=!state.state;if(state.state){
   copy('[data-ma-place-title]',`${name(state.state)}｜${selected?.label??sector.label}`);
   const cases=(selected?[selected]:config.industries.filter(i=>i.sectors.includes(state.sector))).flatMap(i=>i.map.regions.filter(r=>r.state===state.state).map(region=>({i,region})));
   copy('[data-ma-place-note]',cases.length?cases.map(({i,region})=>`${selected?'':i.label+'：'}${region.stage}。${region.note}`).join(' '):'この州を同じ産業分類で比較します。個別施設や、その州だけの取引関係を示す選択ではありません。');
   const references=q('[data-ma-place-sources]');references.replaceChildren();links(references,cases.length?cases.flatMap(c=>c.region.sourceIds):selected?.map.sourceIds??[]);
  }

  map();statistics();camera();root.dataset.maReady='true';scheduleCamera();
 }
 for(const b of root.querySelectorAll<HTMLElement>('[data-ma-sector]'))b.addEventListener('click',()=>{state={...state,sector:b.dataset.maSector as AdoptedSector,industry:null,state:null,only:false};save();});
 for(const select of root.querySelectorAll<HTMLSelectElement>('[data-ma-industry-select]'))select.addEventListener('change',()=>{state.industry=select.value||null;state.only=false;save();});
 q('[data-ma-clear]').addEventListener('click',()=>{state.industry=null;state.state=null;state.only=false;save();});q<HTMLInputElement>('[data-ma-only]').addEventListener('change',e=>{state.only=(e.target as HTMLInputElement).checked;save();});
 q('[data-ma-overlap]').addEventListener('click',()=>{state.sector=item()!.sectors.find(s=>s!==state.sector)!;state.only=false;save();});
 for(const shape of root.querySelectorAll<SVGPathElement>('[data-ma-state]')){const choose=()=>{state.state=shape.dataset.maState!;save();};shape.addEventListener('click',()=>{if(!drag?.moved)choose();});shape.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});}
 const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-ma-sector]')];q('[role=tablist]').addEventListener('keydown',event=>{const e=event as KeyboardEvent,index=tabs.indexOf(document.activeElement as HTMLButtonElement);if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.industry){state.industry=null;state.state=null;state.only=false;save();}});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ma-camera]'))b.addEventListener('click',()=>{const action=b.dataset.maCamera;if(action==='fit')frame=initial.slice();else{const ratio=frame[2]/frame[3],width=Math.max(180,Math.min(1800,frame[2]*(action==='in'?.8:1.25))),height=width/ratio;frame=[frame[0]+(frame[2]-width)/2,frame[1]+(frame[3]-height)/2,width,height];}save();});
 for(const mapNode of root.querySelectorAll<SVGSVGElement>('[data-ma-map]')){
 mapNode.addEventListener('keydown',e=>{if(e.target!==svg)return;const delta:Record<string,number[]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(delta[e.key]){e.preventDefault();frame[0]+=delta[e.key][0]*frame[2]*.08;frame[1]+=delta[e.key][1]*frame[3]*.08;save();}});
 mapNode.addEventListener('pointerdown',e=>{if(e.button===0&&e.pointerType!=='touch')drag={x:e.clientX,y:e.clientY,frame:frame.slice(),moved:false,pointerId:e.pointerId};});
 mapNode.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;svg.setPointerCapture(e.pointerId);const matrix=svg.getScreenCTM();if(!matrix)return;frame=[drag.frame[0]-dx/matrix.a,drag.frame[1]-dy/matrix.d,drag.frame[2],drag.frame[3]];scheduleCamera();});
 mapNode.addEventListener('pointerup',()=>{if(drag?.moved){save();setTimeout(()=>{drag=null;},0);}else drag=null;});mapNode.addEventListener('pointercancel',()=>{drag=null;});
 }
 window.addEventListener('popstate',()=>{state=readAdoptedState(new URL(location.href));frame=state.frame??initial.slice();render();});window.addEventListener('resize',scheduleCamera);const observer=new ResizeObserver(scheduleCamera);for(const frame of root.querySelectorAll('[data-ma-frame]'))observer.observe(frame);document.fonts?.ready.then(scheduleCamera);
 render();
}
