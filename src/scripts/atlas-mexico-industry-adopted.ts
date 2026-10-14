import {adoptedGroups,adoptedSectors,adoptedFamilyColors,readAdoptedState,writeAdoptedState,formatAdoptedValue,adoptedShare,adoptedMapColor,adoptedMapColors,adoptedStatusText,placeAdoptedLabels,type AdoptedIndustry,type AdoptedIndicator,type AdoptedSector,type AdoptedState,type AdoptedSource} from '../lib/atlas-mexico-industry-adopted';
type Config={industries:AdoptedIndustry[];sources:Record<string,AdoptedSource>;states:{id:string;name:string}[];geometry:{id:string;point:number[]}[]};
const ns='http://www.w3.org/2000/svg',initial=[0,0,900,580];
export function initMexicoIndustryAdopted(root:HTMLElement){
 if(root.dataset.maReady)return;
 const config:Config=JSON.parse(root.querySelector('[data-ma-config]')!.textContent!),q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const svg=q<SVGSVGElement>('[data-ma-map]'),stage=q('[data-ma-frame]'),overlay=q('[data-ma-labels]');
 let state=readAdoptedState(new URL(location.href)),frame=state.frame??initial.slice(),drag:{x:number;y:number;frame:number[];moved:boolean;pointerId:number}|null=null,drawFrame=0;
 const item=()=>config.industries.find(i=>i.id===state.industry)??null;
 const name=(code:string)=>config.states.find(s=>s.id===code)?.name??code;
 const point=(code:string)=>config.geometry.find(g=>g.id===code)!.point;
 const element=(tag:string,attrs:Record<string,string|number>)=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,String(value));return n;};
 const copy=(selector:string,value:string)=>{q(selector).textContent=value;};
 const links=(target:Element,ids:string[])=>{for(const id of [...new Set(ids)]){const source=config.sources[id];if(!source)continue;const a=document.createElement('a');a.href=source.url;a.textContent=source.title;target.append(a);}};
 const save=()=>{state.frame=frame.every((n,i)=>Math.abs(n-initial[i])<.001)?null:frame.slice();const url=writeAdoptedState(new URL(location.href),state);if(url.href!==location.href)history.pushState(null,'',url);render();};
 function chooseIndustry(id:string){state.industry=state.industry===id?null:id;state.only=false;save();}
 function choosePlace(id:string,code:string){state.industry=id;state.state=code;save();}
 function formatCell(value:number|null,status:string,unit:string){return value===null?adoptedStatusText[status as keyof typeof adoptedStatusText]??'未取得':formatAdoptedValue(value,unit);}
 function labels(){
  const matrix=svg.getScreenCTM?.();if(!matrix)return;
  const bounds=stage.getBoundingClientRect(),width=bounds.width,height=bounds.height;if(width<1||height<1)return;
  const screen=(code:string)=>{const [x,y]=point(code);return [matrix.a*x+matrix.c*y+matrix.e-bounds.x,matrix.b*x+matrix.d*y+matrix.f-bounds.y];};
  const groups=adoptedGroups(state.sector),peers=groups.map(group=>({group,regions:[...new Set(group.industries.flatMap(i=>i.map.regions.map(r=>r.state)))].map(code=>({code,point:screen(code)})).filter(r=>r.point[0]>=0&&r.point[0]<=width&&r.point[1]>=0&&r.point[1]<=height)})).filter(g=>g.regions.length);
  // Allocation uses all groups, fixed card sizes, and their source-backed regions.
  // Industry/state selection does not change these inputs or the camera.
  const labelWidth=innerWidth<=600?94:innerWidth<=1199?108:118,labelHeight=innerWidth<=600?39:innerWidth<=1199?44:46;
  const boxes=placeAdoptedLabels(peers.map(({group,regions})=>({id:group.id,points:regions.map(r=>r.point)})),width,height,labelWidth,labelHeight);
  const focused=document.activeElement as HTMLElement,focus=focused?.dataset.maGroup,markerFocus=focused?.dataset.maMarker,selectedMarkers:Element[]=[];
  overlay.replaceChildren();const lines=element('svg',{width:'100%',height:'100%','aria-label':'集積地域と産業名の位置対応'});lines.classList.add('ma-connectors');overlay.append(lines);
  for(const {group,regions}of peers){
   const selected=group.industries.find(i=>i.id===state.industry),active=!!selected,box=boxes.get(group.id);if(!box)continue;
   const button=document.createElement('button');button.type='button';button.className='ma-map-label';button.dataset.maGroup=group.id;button.style.setProperty('--ma-color',group.color);button.style.left=box[0]+'px';button.style.top=box[1]+'px';button.classList.toggle('is-selected',active);button.classList.toggle('is-context',!!state.industry&&!active);button.hidden=state.only&&!active;
   const title=document.createElement('strong'),icon=document.createElement('i');title.textContent=selected?.label??group.label;title.prepend(icon);const place=document.createElement('small');place.textContent=regions.slice(0,2).map(r=>name(r.code)).join('・')+(regions.length>2?'等':'');button.append(title,place);button.title=`${selected?.label??group.label}：${regions.map(r=>name(r.code)).join('、')}`;button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',button.title);button.addEventListener('click',()=>chooseIndustry(selected?.id??group.industries[0].id));overlay.append(button);
   if(button.hidden)continue;
   for(const region of regions){
    const matching=(selected?[selected]:group.industries).filter(i=>i.map.regions.some(r=>r.state===region.code));if(!matching.length)continue;
    const current=matching[0],definition=current.map.regions.find(r=>r.state===region.code)!,[x,y]=region.point;
    const endX=Math.max(box[0],Math.min(box[2],x)),endY=Math.max(box[1],Math.min(box[3],y));
    lines.append(element('line',{x1:x,y1:y,x2:endX,y2:endY,stroke:group.color,'stroke-width':.75,opacity:state.industry&&!active ? .4 : .65,'data-ma-correspondence':`${group.id}:${region.code}`}));
    const marker=element('g',{'data-ma-marker':`${current.id}:${region.code}`,'data-state':region.code,role:'button',tabindex:'0','aria-pressed':String(active&&region.code===state.state),'aria-label':`${current.label}・${name(region.code)}・${definition.stage}`});
    const color=adoptedFamilyColors[current.family]??group.color;
    marker.append(element('circle',{cx:x,cy:y,r:11,fill:'transparent'}));
    marker.append(state.sector==='services'?element('path',{d:`M${x},${y-5}L${x+5},${y}L${x},${y+5}L${x-5},${y}Z`,fill:color,stroke:'#fff','stroke-width':1}):/精|製|加工|組立|処理/.test(definition.stage)?element('rect',{x:x-4,y:y-4,width:8,height:8,fill:color,stroke:'#fff','stroke-width':1}):element('circle',{cx:x,cy:y,r:4.5,fill:color,stroke:'#fff','stroke-width':1}));
    if(active&&region.code===state.state)marker.append(element('circle',{cx:x,cy:y,r:8,fill:'none',stroke:'#a95c32','stroke-width':2}));
    if(state.industry&&!active)marker.setAttribute('opacity','.5');
    marker.addEventListener('click',()=>choosePlace(current.id,region.code));marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choosePlace(current.id,region.code);}});
    // Source-backed activities can share a state's guide point. Keep the
    // selected industry's hit targets above its contextual peers.
    if(active)selectedMarkers.push(marker);else lines.append(marker);
   }
  }
  lines.append(...selectedMarkers);
  if(focus)overlay.querySelector<HTMLButtonElement>(`[data-ma-group="${focus}"]`)?.focus({preventScroll:true});
  if(markerFocus)overlay.querySelector<SVGElement>(`[data-ma-marker="${markerFocus}"]`)?.focus({preventScroll:true});
  root.dataset.maLabelsComplete=String(boxes.size===peers.length);
 }
 function camera(){svg.setAttribute('viewBox',frame.join(' '));labels();(root as any).mexicoAdoptedView={...state,frame:frame.slice()};}
 function scheduleCamera(){if(drawFrame)return;drawFrame=requestAnimationFrame(()=>{drawFrame=0;camera();});}
 function map(){
  const selected=item(),hasValues=!!selected&&selected.map.kind!=='guide'&&selected.map.values.length>0,maximum=selected?Math.max(0,...selected.map.values.filter(v=>v.status==='available'&&v.value!==null).map(v=>v.value!)):0;
  for(const shape of root.querySelectorAll<SVGPathElement>('[data-ma-state]')){
   const code=shape.dataset.maState!,cell=selected?.map.values.find(v=>v.state===code)??{value:null,status:'unretrieved' as const};
   shape.setAttribute('fill',hasValues?adoptedMapColor(cell.value,cell.status,selected?.map.nationalTotal,maximum):'#e6e9dc');shape.setAttribute('aria-pressed',String(code===state.state));shape.classList.toggle('is-selected',code===state.state);shape.dataset.maStatus=hasValues?cell.status:'guide';
   const label=`${name(code)}${hasValues?'・'+formatCell(cell.value,cell.status,selected!.map.unit):'・地域案内'}`;shape.setAttribute('aria-label',label);shape.querySelector('title')!.textContent=label;
  }
  copy('[data-ma-map-title]',`メキシコの${selected?.label??adoptedSectors.find(s=>s.id===state.sector)!.label}の集積`);
  copy('[data-ma-map-caption]',hasValues?`${selected!.label}｜${selected!.map.year}年・${selected!.map.unit}。州の色は${selected!.map.kind==='employment'?'就業者':'公表値'}の集積。点の大きさは数量を表しません。`:'産業名と、資料で確認した集積地域の案内。点の大きさは数量を表しません。');
  copy('[data-ma-map-definition]',(selected?.map.definition??'')+' 州の案内点と産業名を結ぶ細線は位置対応です。個別施設の敷地・取引・輸送経路を表しません。');
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
  const sector=adoptedSectors.find(s=>s.id===state.sector)!,selected=item();root.dataset.maSector=state.sector;root.dataset.maIndustry=state.industry??'all';q('#ma-panel').setAttribute('aria-labelledby',`ma-sector-${state.sector}`);
  for(const button of root.querySelectorAll<HTMLElement>('[data-ma-sector]')){const active=button.dataset.maSector===state.sector;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
  for(const row of root.querySelectorAll<HTMLElement>('[data-ma-choices]'))row.hidden=row.dataset.maChoices!==state.sector;
  for(const button of root.querySelectorAll<HTMLElement>('[data-ma-industry]'))button.setAttribute('aria-pressed',String(button.dataset.maIndustry===state.industry&&button.dataset.maOwner===state.sector));
  for(const button of root.querySelectorAll<HTMLElement>('[data-ma-overview]'))button.setAttribute('aria-pressed',String(!state.industry));
  copy('[data-ma-breadcrumb]',sector.lead);copy('[data-ma-title]',selected?.label??sector.label);copy('[data-ma-lead]',sector.lead);copy('[data-ma-overview-copy]',selected?.overview??sector.overview);copy('[data-ma-why]',selected?.why??sector.why);copy('[data-ma-process]',selected?.process??'');q('[data-ma-process-wrap]').hidden=!selected;
  copy('[data-ma-boundary]',selected?.boundary??'工程の重複掲載があります。各表示の統計を三分野の合計へ足し合わせません。資料のない場所を産業の不在とは判断しません。');
  q('[data-ma-clear]').hidden=!selected;q('[data-ma-only-wrap]').hidden=!selected;q<HTMLInputElement>('[data-ma-only]').checked=state.only;
  const other=selected?.sectors.find(s=>s!==state.sector),overlap=q('[data-ma-overlap]');overlap.hidden=!other;if(other)overlap.textContent=`同じ工程を${adoptedSectors.find(s=>s.id===other)!.label}で読む`;
  const list=q('[data-ma-place-list]');list.replaceChildren();for(const current of selected?[selected]:config.industries.filter(i=>i.sectors.includes(state.sector)))for(const region of current.map.regions){const b=document.createElement('button');b.type='button';b.textContent=`${current.label}｜${name(region.state)}｜${region.stage}`;b.setAttribute('aria-pressed',String(current.id===state.industry&&region.state===state.state));b.addEventListener('click',()=>choosePlace(current.id,region.state));list.append(b);}
  q('[data-ma-place-reading]').hidden=!selected||!state.state;if(selected&&state.state){copy('[data-ma-place-title]',`${name(state.state)}｜${selected.label}`);const region=selected.map.regions.find(r=>r.state===state.state);copy('[data-ma-place-note]',region?.note??'この州を同じ産業分類で比較します。個別施設の所在地や、その州だけの取引関係を示す選択ではありません。');const references=q('[data-ma-place-sources]');references.replaceChildren();links(references,region?.sourceIds??selected.map.sourceIds);}
  map();statistics();camera();root.dataset.maReady='true';scheduleCamera();
 }
 for(const b of root.querySelectorAll<HTMLElement>('[data-ma-sector]'))b.addEventListener('click',()=>{state={...state,sector:b.dataset.maSector as AdoptedSector,industry:null,state:null,only:false};save();});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ma-industry]'))b.addEventListener('click',()=>chooseIndustry(b.dataset.maIndustry!));
 for(const b of root.querySelectorAll<HTMLElement>('[data-ma-overview]'))b.addEventListener('click',()=>{state.industry=null;state.state=null;state.only=false;save();});
 q('[data-ma-clear]').addEventListener('click',()=>{state.industry=null;state.state=null;state.only=false;save();});q<HTMLInputElement>('[data-ma-only]').addEventListener('change',e=>{state.only=(e.target as HTMLInputElement).checked;save();});
 q('[data-ma-overlap]').addEventListener('click',()=>{state.sector=item()!.sectors.find(s=>s!==state.sector)!;state.only=false;save();});
 for(const shape of root.querySelectorAll<SVGPathElement>('[data-ma-state]')){const choose=()=>{state.state=shape.dataset.maState!;save();};shape.addEventListener('click',()=>{if(!drag?.moved)choose();});shape.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});}
 const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-ma-sector]')];q('[role=tablist]').addEventListener('keydown',event=>{const e=event as KeyboardEvent,index=tabs.indexOf(document.activeElement as HTMLButtonElement);if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.industry){state.industry=null;state.state=null;state.only=false;save();}});
 for(const b of root.querySelectorAll<HTMLElement>('[data-ma-camera]'))b.addEventListener('click',()=>{const action=b.dataset.maCamera;if(action==='fit')frame=initial.slice();else{const ratio=frame[2]/frame[3],width=Math.max(180,Math.min(1800,frame[2]*(action==='in'?.8:1.25))),height=width/ratio;frame=[frame[0]+(frame[2]-width)/2,frame[1]+(frame[3]-height)/2,width,height];}save();});
 svg.addEventListener('keydown',e=>{if(e.target!==svg)return;const delta:Record<string,number[]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(delta[e.key]){e.preventDefault();frame[0]+=delta[e.key][0]*frame[2]*.08;frame[1]+=delta[e.key][1]*frame[3]*.08;save();}});
 svg.addEventListener('pointerdown',e=>{if(e.button===0&&e.pointerType!=='touch')drag={x:e.clientX,y:e.clientY,frame:frame.slice(),moved:false,pointerId:e.pointerId};});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;svg.setPointerCapture(e.pointerId);const matrix=svg.getScreenCTM();if(!matrix)return;frame=[drag.frame[0]-dx/matrix.a,drag.frame[1]-dy/matrix.d,drag.frame[2],drag.frame[3]];scheduleCamera();});
 svg.addEventListener('pointerup',()=>{if(drag?.moved){save();setTimeout(()=>{drag=null;},0);}else drag=null;});svg.addEventListener('pointercancel',()=>{drag=null;});
 window.addEventListener('popstate',()=>{state=readAdoptedState(new URL(location.href));frame=state.frame??initial.slice();render();});window.addEventListener('resize',scheduleCamera);new ResizeObserver(scheduleCamera).observe(stage);document.fonts?.ready.then(scheduleCamera);
 render();
}
