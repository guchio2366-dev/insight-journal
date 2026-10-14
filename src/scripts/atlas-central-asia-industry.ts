import {centralIndustries,centralIndustrySectors,centralIndustrySites,centralIndustryCountries,centralIndustrySources,centralIndustryMetric,formatCentralMetric,type CentralIndustryId,type CentralIndustrySector,type CentralSite} from '../data/atlas/central-asia-industry';
import {readCentralIndustryState,writeCentralIndustryState,projectCentralIndustry,fitCentralIndustryFrame,zoomCentralIndustryFrame,groupCentralIndustryLabels,placeCentralIndustryLabel,type CentralIndustryState} from '../lib/atlas-central-asia-industry';
const ns='http://www.w3.org/2000/svg';
const rounded=(frame:number[])=>frame.map(n=>Number(n.toFixed(3)));
const svgElement=(tag:string,attrs:Record<string,string|number>={})=>{const node=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;};

export function initCentralAsiaIndustry(root:HTMLElement){
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const config=JSON.parse(q('[data-central-config]').textContent!);
 const svg=q<SVGSVGElement>('[data-central-map]'),stage=q<HTMLElement>('[data-central-map-frame]'),overlay=q<HTMLElement>('[data-central-labels]');
 let state=readCentralIndustryState(new URL(location.href)),initialFrame=rounded(fitCentralIndustryFrame(config.bounds,(stage.clientWidth||950)/(stage.clientHeight||575))),frame=state.frame??initialFrame.slice(),geometryKey='';
 let drag:{id:number;x:number;y:number;frame:number[];moved:boolean}|null=null;
 let pinch:{distance:number;frame:number[]}|null=null;
 let suppressMapClickUntil=0;
 const pointers=new Map<number,{x:number;y:number}>();
 const selectedSite=()=>centralIndustrySites.find(site=>site.id===state.site);
 const industry=()=>centralIndustries.find(item=>item.id===state.industry);
 const sector=()=>centralIndustrySectors.find(item=>item.id===state.sector)!;

 function save(){state.frame=frame.slice();const url=writeCentralIndustryState(new URL(location.href),state);if(url.href!==location.href)history.pushState(null,'',url);render();}
 function chooseIndustry(id:CentralIndustryId){state={...state,industry:state.industry===id?null:id,site:null,only:false};save();}
 function chooseSite(site:CentralSite){state={...state,industry:site.industry,site:site.id};save();}
 function chooseSector(id:CentralIndustrySector){state={...state,sector:id,industry:null,site:null,only:false};save();}
 function publish(){
  (root as any).centralIndustryView={...state,frame:frame.slice(),initialFrame:initialFrame.slice(),visibleSites:centralIndustrySites.filter(site=>site.sectors.includes(state.sector)&&(!state.only||site.industry===state.industry)).map(site=>site.id)};
  root.dataset.centralReady='true';root.closest<HTMLElement>('[data-asia-atlas]')!.dataset.mapReady='true';
 }
 function sources(container:HTMLElement,ids:string[]){container.replaceChildren();for(const id of ids){const source=centralIndustrySources[id],link=document.createElement('a');link.href=source.url;link.textContent=source.publisher+' · '+source.title;container.append(link);}}
 function updateReading(){
  const item=industry(),currentSector=sector(),site=selectedSite();
  root.dataset.industrySector=state.sector;root.dataset.industrySubsector=state.industry??'all';
  q('#central-industry-panel').setAttribute('aria-labelledby','central-sector-'+state.sector);
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-central-sector]')){const active=button.dataset.centralSector===state.sector;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
  for(const row of root.querySelectorAll<HTMLElement>('[data-central-choices]'))row.hidden=row.dataset.centralChoices!==state.sector;
  for(const button of root.querySelectorAll('[data-central-choice]'))button.setAttribute('aria-pressed',String((button as HTMLElement).dataset.centralChoice===state.industry));
  for(const button of root.querySelectorAll('[data-central-overview]'))button.setAttribute('aria-pressed',String(!state.industry));
  q('[data-central-title]').textContent=item?.label??currentSector.label;
  q('[data-central-insight]').textContent=currentSector.insight;
  q('[data-central-reading]').textContent=item?.overview??currentSector.overview;
  q('[data-central-why]').textContent=item?.why??currentSector.why;
  q('[data-central-process]').hidden=!item;
  if(item){q('[data-central-process-copy]').textContent=item.process;q('[data-central-limits]').textContent=item.limits;}
  q('[data-central-site-reading]').hidden=!site;
  if(site){q('[data-central-site-title]').textContent=site.place+'｜'+site.stage;q('[data-central-site-note]').textContent=site.note;q('[data-central-site-status]').textContent=site.status+' · '+site.position;sources(q('[data-central-site-sources]'),site.sources);}
  q('[data-central-clear]').hidden=!item;q('[data-central-only-wrap]').hidden=!item;q<HTMLInputElement>('[data-central-only]').checked=state.only;
  const other=site?.sectors.find(id=>id!==state.sector),overlap=q<HTMLButtonElement>('[data-central-overlap]');overlap.hidden=!other;if(other)overlap.textContent='同じ加工拠点を'+centralIndustrySectors.find(s=>s.id===other)!.label+'で読む';
  q<HTMLSelectElement>('[data-country-select]').value=state.country??'';
  q('[data-current-place]').textContent=state.country?centralIndustryCountries.find(country=>country.code===state.country)!.name+'を強調':'中央アジア全体';
  q('[data-central-map-caption]').textContent=currentSector.label+(state.only?' · 選択産業のみ':' · 分布全体')+' · 確認した集積・操業地域';
 }
 function statistics(){
  const item=industry(),ids=item?null:new Set(sector().metricIds);
  q('[data-central-stat-context]').textContent=(item?item.label:sector().label+'の代表指標')+'。各行の年・地域・製品段階を確認し、異なる範囲を合算しません。';
  for(const record of root.querySelectorAll<HTMLElement>('[data-central-metric]'))record.hidden=item?record.dataset.centralMetricIndustry!==item.id:!ids!.has(record.dataset.centralMetric!);
 }
 function list(){
  const target=q('[data-central-site-list]');target.replaceChildren();
  for(const item of centralIndustries.filter(i=>i.sectors.includes(state.sector))){
   const group=document.createElement('section');group.className='central-site-list-group';const heading=document.createElement('h3');heading.textContent=item.label;group.append(heading);
   for(const site of centralIndustrySites.filter(s=>s.industry===item.id&&s.sectors.includes(state.sector))){const button=document.createElement('button');button.type='button';button.dataset.centralSiteChoice=site.id;button.setAttribute('aria-pressed',String(site.id===state.site));button.textContent=site.place+'｜'+site.stage;button.addEventListener('click',()=>chooseSite(site));group.append(button);}
   target.append(group);
  }
 }
 function numericLabel(group:{site:CentralSite}[]):string{
  if(group.length===1&&group[0].site.localMetric){const metric=centralIndustryMetric(group[0].site.localMetric)!;return formatCentralMetric(metric)+' · '+metric.year+(metric.industry==='tourism'?'・'+metric.scope:group[0].site.kind==='regional'?'・州等全体':'');}
  const ids=group.map(point=>point.site.id).sort();
  if(ids.length===3&&ids.includes('sc-fergana-cotton')&&ids.includes('central-andijan-textiles')&&ids.includes('central-namangan-textiles'))return '3州計19.5兆スム · 2026年1–7月／繊維';
  const metrics=group.map(point=>point.site.localMetric?centralIndustryMetric(point.site.localMetric):null);
  if(metrics.every(m=>m&&typeof m.value==='number'&&m.unit===metrics[0]!.unit&&m.year===metrics[0]!.year&&m.sources.join(',')===metrics[0]!.sources.join(','))&&['textiles','tourism'].includes(group[0].site.industry)){
   const total=metrics.reduce((sum,m)=>sum+(m!.value as number),0),first=metrics[0]!;return group.length+'州等計'+total.toLocaleString('ja-JP',{maximumFractionDigits:2})+' '+first.unit+' · '+first.year+(first.industry==='tourism'?'／代理店':'／繊維');
  }
  return '';
 }
 function drawGeometry(){
  svg.setAttribute('viewBox',frame.join(' '));
  const key=[state.sector,stage.clientWidth,stage.clientHeight,...frame].join(':');if(key===geometryKey)return;geometryKey=key;
  const matrix=svg.getScreenCTM();if(!matrix){geometryKey='';return;}
  const stageRect=stage.getBoundingClientRect(),width=stageRect.width,height=stageRect.height;
  const screen=(coordinates:number[])=>{const [x,y]=projectCentralIndustry(coordinates);return [matrix.a*x+matrix.c*y+matrix.e-stageRect.x,matrix.b*x+matrix.d*y+matrix.f-stageRect.y];};
  for(const label of root.querySelectorAll<SVGTextElement>('[data-central-country-name]'))label.style.fontSize=((width<600?9:11)/Math.abs(matrix.a))+'px';
  const occupied:number[][]=[[width-130,0,width,48]];
  for(const label of root.querySelectorAll<SVGTextElement>('[data-central-country-name]')){const box=label.getBoundingClientRect();occupied.push([box.left-stageRect.left-2,box.top-stageRect.top-2,box.right-stageRect.left+2,box.bottom-stageRect.top+2]);}
  const points=centralIndustrySites.filter(site=>site.sectors.includes(state.sector)).map(site=>({site,point:screen(site.coordinates)})).filter(({point:[x,y]})=>x>=0&&x<=width&&y>=0&&y<=height);
  overlay.replaceChildren();delete root.dataset.labelsIncomplete;
  const lines=svgElement('svg',{'aria-label':'地理座標と産業名の対応'});lines.classList.add('central-label-connectors');overlay.append(lines);
  for(const {site,point:[x,y]}of points){
   const item=centralIndustries.find(i=>i.id===site.industry)!,mark=svgElement('g',{'data-central-marker':site.id,'data-industry-site':site.id,'data-industry':site.industry,'data-country':site.country,'data-coordinate':site.coordinates.join(','),role:'button',tabindex:'0','aria-pressed':'false','aria-label':item.label+' · '+site.place+' · '+site.stage});
   const hit=svgElement('circle',{cx:x,cy:y,r:width<600?12:9,fill:'transparent'});mark.append(hit);
   const attrs={fill:site.kind==='regional'?'#fffdf3':item.color,stroke:site.kind==='regional'?item.color:'#fffef4','stroke-width':1.5};
   mark.append(site.kind==='processing'||site.kind==='regional'?svgElement('rect',{...attrs,x:x-4,y:y-4,width:8,height:8}):svgElement('circle',{...attrs,cx:x,cy:y,r:4.5}));
   if(site.status==='一部稼働・建設中')mark.append(svgElement('circle',{cx:x,cy:y,r:7,fill:'none',stroke:item.color,'stroke-width':1.3,'stroke-dasharray':'2 2'}));
   const halo=svgElement('circle',{cx:x,cy:y,r:8,fill:'none',stroke:item.color,'stroke-width':2,'data-central-halo':'','pointer-events':'none'});halo.setAttribute('visibility','hidden');mark.append(halo);
   mark.addEventListener('click',event=>{event.stopPropagation();chooseSite(site);});mark.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();chooseSite(site);}});lines.append(mark);
   occupied.push([x-6,y-6,x+6,y+6]);
  }
  for(const group of groupCentralIndustryLabels(points,width<600?68:70)){
   const item=centralIndustries.find(i=>i.id===group[0].site.industry)!,card=document.createElement('button');card.type='button';card.className='central-map-label';card.dataset.centralLabelIndustry=item.id;card.dataset.centralLabelSites=group.map(point=>point.site.id).join(',');card.style.setProperty('--industry-color',item.color);card.setAttribute('aria-pressed','false');
   const heading=document.createElement('strong'),icon=document.createElement('i');icon.setAttribute('aria-hidden','true');heading.append(icon,document.createTextNode(item.shortLabel));card.append(heading);
   const subtitle=document.createElement('small');subtitle.textContent=group.length<=2?group.map(point=>point.site.place).join('・'):group.map(point=>point.site.place).slice(0,2).join('・')+'ほか';card.append(subtitle);
   const local=numericLabel(group);if(local){const value=document.createElement('span');value.className='central-local-value';value.textContent=local;card.append(value);}
   card.setAttribute('aria-label',item.label+'：'+group.map(point=>point.site.place).join('、')+'を強調');card.addEventListener('click',()=>chooseIndustry(item.id));overlay.append(card);
   const box=placeCentralIndustryLabel(group.map(point=>point.point),[card.offsetWidth,card.offsetHeight],[width,height],occupied,width<600?180:150);
   if(!box){card.remove();root.dataset.labelsIncomplete='true';continue;}
   occupied.push(box);card.style.left=box[0]+'px';card.style.top=box[1]+'px';
   for(const {site,point:[x,y]}of group){const endX=Math.max(box[0],Math.min(box[2],x)),endY=Math.max(box[1],Math.min(box[3],y)),line=svgElement('line',{x1:x,y1:y,x2:endX,y2:endY,stroke:item.color,'stroke-width':.9,'data-central-correspondence':site.id,'data-industry':item.id,'data-country':site.country});lines.insertBefore(line,lines.firstChild);}
  }
 }
 function emphasize(){
  for(const marker of root.querySelectorAll<SVGElement>('[data-central-marker]')){const selected=marker.dataset.centralMarker===state.site,peer=!state.industry||marker.dataset.industry===state.industry,inCountry=!state.country||marker.dataset.country===state.country;marker.setAttribute('aria-pressed',String(selected));marker.style.opacity=peer?(inCountry?'1':'.45'):'.4';marker.style.display=state.only&&!peer?'none':'';marker.querySelector('[data-central-halo]')?.setAttribute('visibility',selected?'visible':'hidden');}
  for(const card of root.querySelectorAll<HTMLElement>('[data-central-label-industry]')){const peer=card.dataset.centralLabelIndustry===state.industry,siteIds=card.dataset.centralLabelSites!.split(','),inCountry=!state.country||siteIds.some(id=>centralIndustrySites.find(site=>site.id===id)?.country===state.country);card.hidden=state.only&&!peer;card.classList.toggle('is-highlighted',peer);card.classList.toggle('is-context',!!state.industry&&!peer);card.classList.toggle('is-country-context',!inCountry);card.setAttribute('aria-pressed',String(peer));}
  for(const line of root.querySelectorAll<SVGElement>('[data-central-correspondence]')){line.style.display=state.only&&line.dataset.industry!==state.industry?'none':'';line.style.opacity=state.industry&&line.dataset.industry!==state.industry?'.35':'1';}
  for(const shape of root.querySelectorAll('[data-central-country]'))shape.classList.toggle('is-emphasized',(shape as HTMLElement).dataset.centralCountry===state.country);
  q('[data-central-label-note]').hidden=!root.dataset.labelsIncomplete;
 }
 function render(){const focus=(document.activeElement as HTMLElement)?.dataset?.centralMarker;updateReading();statistics();list();drawGeometry();emphasize();publish();if(focus)root.querySelector<SVGElement>(`[data-central-marker="${focus}"]`)?.focus({preventScroll:true});}
 for(const button of root.querySelectorAll<HTMLElement>('[data-central-sector]'))button.addEventListener('click',()=>chooseSector(button.dataset.centralSector as CentralIndustrySector));
 for(const button of root.querySelectorAll<HTMLElement>('[data-central-choice]'))button.addEventListener('click',()=>chooseIndustry(button.dataset.centralChoice as CentralIndustryId));
 for(const button of root.querySelectorAll<HTMLElement>('[data-central-overview]'))button.addEventListener('click',()=>{state={...state,industry:null,site:null,only:false};save();});
 root.querySelector('[role=tablist]')!.addEventListener('keydown',event=>{const e=event as KeyboardEvent;if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...root.querySelectorAll<HTMLButtonElement>('[data-central-sector]')],focused=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-central-sector]'),current=buttons.indexOf(focused??buttons.find(button=>button.dataset.centralSector===state.sector)!),index=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;chooseSector(buttons[index].dataset.centralSector as CentralIndustrySector);buttons[index].focus();});
 q('[data-central-clear]').addEventListener('click',()=>{state={...state,industry:null,site:null,only:false};save();});
 q<HTMLInputElement>('[data-central-only]').addEventListener('change',event=>{state.only=(event.target as HTMLInputElement).checked;save();});
 q('[data-central-overlap]').addEventListener('click',()=>{const site=selectedSite(),other=site?.sectors.find(id=>id!==state.sector);if(other){state.sector=other;state.only=false;save();}});
 q<HTMLSelectElement>('[data-country-select]').addEventListener('change',event=>{state.country=(event.target as HTMLSelectElement).value as CentralIndustryState['country']||null;if(state.site&&selectedSite()?.country!==state.country)state.site=null;save();});
 q('[data-reset]').addEventListener('click',()=>{state={...state,industry:null,site:null,only:false,country:null};frame=initialFrame.slice();save();});
 q('[data-central-fit]').addEventListener('click',()=>{frame=initialFrame.slice();save();});
 q('[data-central-zoom-in]').addEventListener('click',()=>{frame=rounded(zoomCentralIndustryFrame(frame,.8));save();});
 q('[data-central-zoom-out]').addEventListener('click',()=>{frame=rounded(zoomCentralIndustryFrame(frame,1.25));save();});
 svg.addEventListener('keydown',event=>{if((event.target as Element).closest('[data-central-marker]'))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();frame=rounded([frame[0]+(event.key==='ArrowLeft'?-.07:event.key==='ArrowRight'?.07:0)*frame[2],frame[1]+(event.key==='ArrowUp'?-.07:event.key==='ArrowDown'?.07:0)*frame[3],frame[2],frame[3]]);save();}else if(event.key==='+'||event.key==='-'){event.preventDefault();frame=rounded(zoomCentralIndustryFrame(frame,event.key==='+'?.8:1.25));save();}});
 stage.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();frame=rounded(zoomCentralIndustryFrame(frame,event.deltaY>0?1.12:.89));save();},{passive:false});
 stage.addEventListener('pointerdown',event=>{if(event.button!==0||(event.target as Element).closest('.central-map-tools'))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(event.pointerType==='touch'&&pointers.size===1)return;if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),frame:frame.slice()};for(const id of pointers.keys())stage.setPointerCapture(id);}drag={id:event.pointerId,x:event.clientX,y:event.clientY,frame:frame.slice(),moved:false};});
 stage.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pinch&&pointers.size===2){event.preventDefault();const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>0){frame=rounded(zoomCentralIndustryFrame(pinch.frame,pinch.distance/distance));drawGeometry();emphasize();publish();}return;}if(!drag||event.pointerType==='touch')return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)<4&&!drag.moved)return;event.preventDefault();if(!drag.moved)stage.setPointerCapture(event.pointerId);drag.moved=true;svg.classList.add('is-dragging');frame=rounded([drag.frame[0]-dx/stage.clientWidth*drag.frame[2],drag.frame[1]-dy/stage.clientHeight*drag.frame[3],drag.frame[2],drag.frame[3]]);drawGeometry();emphasize();publish();});
 const finish=(event:PointerEvent)=>{const changed=drag?.moved||!!pinch;pointers.delete(event.pointerId);if(pointers.size<2)pinch=null;drag=null;svg.classList.remove('is-dragging');if(changed){suppressMapClickUntil=performance.now()+350;save();}};stage.addEventListener('pointerup',finish);stage.addEventListener('pointercancel',finish);
 stage.addEventListener('click',event=>{if(performance.now()<suppressMapClickUntil&&!(event.target as Element).closest('.central-map-tools')){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
 window.addEventListener('popstate',()=>{state=readCentralIndustryState(new URL(location.href));frame=state.frame??initialFrame.slice();render();});
 new ResizeObserver(()=>{const next=rounded(fitCentralIndustryFrame(config.bounds,stage.clientWidth/stage.clientHeight));const wasFull=frame.every((n,index)=>Math.abs(n-initialFrame[index])<.002);initialFrame=next;if(wasFull)frame=next.slice();geometryKey='';drawGeometry();emphasize();publish();}).observe(stage);
 render();document.fonts.ready.then(()=>{geometryKey='';drawGeometry();emphasize();publish();});
}
