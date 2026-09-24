import {populationInsights,vegasPhoto,type PopulationInsight} from '../data/atlas/population-insights';
import {populationInsightUrl,populationComparisonUrl,readPopulationInsight} from '../lib/atlas-population-insight-state';
import {containedMapBox,projectNatureFallback} from '../lib/atlas-nature-labels';
import {populationFallbackBox,populationFallbackExtent,projectPopulationFallback} from '../lib/atlas-population-projection';
import {populationVoteStates} from '../data/atlas/population-focus';
import type {PopulationState} from '../lib/atlas-population-state';

type Point={x:number;y:number};
type Hooks={field:()=>string;population:()=>PopulationState;load:(name:string)=>Promise<any>;map:()=>any;project:()=>((p:readonly number[])=>Point)|null;markers:()=>void;canFocus:()=>boolean;fit:(bounds:readonly number[])=>void};
const ns='http://www.w3.org/2000/svg';
function path(g:any,project:(p:readonly number[])=>Point):string{
 const line=(r:number[][],close=false)=>r.map((p,i)=>{const q=project(p);return(i?'L':'M')+q.x.toFixed(1)+','+q.y.toFixed(1);}).join('')+(close?'Z':'');
 if(g.type==='Polygon')return g.coordinates.map((r:number[][])=>line(r,true)).join('');
 if(g.type==='MultiPolygon')return g.coordinates.map((coordinates:any)=>path({type:'Polygon',coordinates},project)).join('');
 if(g.type==='LineString')return line(g.coordinates);
 if(g.type==='MultiLineString')return g.coordinates.map((r:number[][])=>line(r)).join('');
 return '';
}
export function createPopulationInsights(root:HTMLElement,config:any,hooks:Hooks){
 const q=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const index=q('[data-pop-story-index]'),frame=q('[data-map-frame]');
 const panel=document.createElement('section');panel.className='population-story-context';panel.hidden=true;panel.setAttribute('aria-labelledby','population-story-heading');
 q('[data-field-national="population"]').prepend(panel);
 const svg=document.createElementNS(ns,'svg');svg.classList.add('population-story-overlay');svg.setAttribute('aria-hidden','true');svg.style.display='none';frame.append(svg);
 const key=document.createElement('p');key.className='population-story-map-key';key.hidden=true;frame.after(key);
 let activeId='',loadedKey='',generation=0,raf=0,shapes:any[]=[],pendingFocus:string|null=readPopulationInsight(new URL(location.href),config.base)?.item.id??null;
 let loadFailed=false;
 const returns=new Map<string,{x:number;y:number;scroll:number}>();
 const assetBase=config.base.replace(/atlas\/north-america\/$/,'assets/atlas/population-stories/');
 function photo(){
  const figure=document.createElement('figure');figure.className='population-story-photo';
  const img=document.createElement('img');img.src=assetBase+vegasPhoto.src;img.alt=vegasPhoto.alt;img.width=vegasPhoto.width;img.height=vegasPhoto.height;img.loading='lazy';
  const caption=document.createElement('figcaption');caption.append(vegasPhoto.caption+' ／ ');
  const credit=document.createElement('a');credit.href=vegasPhoto.url;credit.textContent=vegasPhoto.author;
  const license=document.createElement('a');license.href=vegasPhoto.licenseUrl;license.textContent=vegasPhoto.license;
  caption.append(credit,' · ',license,'（縮小・WebP変換）');figure.append(img,caption);return figure;
 }
 function anchor(label:string,href:string,attribute:string){const a=document.createElement('a');a.textContent=label;a.href=href;a.setAttribute(attribute,'');return a;}
 function explain(item:PopulationInsight){
  panel.replaceChildren();
  const back=anchor('← 元の解説へ戻る','#','data-pop-story-back');back.className='population-story-back';
  const place=document.createElement('p');place.className='population-story-location';place.textContent=item.destination;
  const title=document.createElement('h2');title.id='population-story-heading';title.tabIndex=-1;title.textContent=item.title;
  panel.append(back,place,title);
  if(item.compare){
   const controls=document.createElement('nav');controls.className='population-story-switch';controls.setAttribute('aria-label','同じ範囲で地図を比較');
   const a=anchor(item.compare.label,'#','data-pop-story-compare');a.dataset.popStoryCompare='origin';
   const b=anchor('2024年の選挙結果','#','data-pop-story-compare');b.dataset.popStoryCompare='vote';controls.append(a,b);panel.append(controls);
  }
  if(item.id==='vegas-water')panel.append(photo());
  for(const text of item.paragraphs){const p=document.createElement('p');p.textContent=text;panel.append(p);}
  if(item.id==='lds-vote'){
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='同じ宗教が最多なのに、なぜ２郡の結果は違う？';details.dataset.popStoryCounties='';details.append(summary);
   const table=document.createElement('table');table.innerHTML='<thead><tr><th scope="col">比較する郡</th><th scope="col">末日聖徒の所属者割合<br>2020年</th><th scope="col">最多得票<br>2024年</th></tr></thead><tbody><tr><th scope="row">ソルトレイク郡</th><td>約51％</td><td>民主党</td></tr><tr><th scope="row">ユタ郡</th><td>約83％</td><td>共和党</td></tr></tbody>';
   const p=document.createElement('p');p.textContent='「最多の宗教」が同じでも、住民構成は違います。選挙結果には、ほかの宗教の人や無宗教の人の票も含まれています。';
   const note=document.createElement('p');note.textContent='所属者割合はUSRC 2020の教会報告に基づく、子どもを含む全人口比です。投票者の割合とは異なり、この比較から信徒個人の投票先は分かりません。';
   details.append(table,p,note);panel.append(details);
  }
  const evidence=document.createElement('details'),summary=document.createElement('summary');summary.textContent='地図の読み方・出典';evidence.append(summary);
  const note=document.createElement('p');note.textContent=item.note;evidence.append(note);
  for(const source of item.sources)evidence.append(anchor(source.label,source.url,'data-pop-story-source'));
  if(item.page==='population'){
   const data=document.createElement('p');data.textContent='地図：人口構成 ACS 2020–2024 ／ 宗教 USRC 2020 ／ 選挙 MIT Election Data and Science Lab 2024。人口・宗教・投票の母集団は異なります。';evidence.append(data);
  }
  panel.append(evidence);
  const error=document.createElement('p');error.className='population-story-map-error';error.dataset.popStoryError='';error.setAttribute('role','status');error.hidden=true;panel.append(error);
 }
 function projection(item:PopulationInsight){
  const live=hooks.project();if(live)return live;
  const img=q('[data-fallback-image]'),oldTransform=img.style.transform;img.style.transform='';
  const parent=frame.getBoundingClientRect(),image=img.getBoundingClientRect();
  const box={left:image.left-parent.left,top:image.top-parent.top,right:image.right-parent.left,bottom:image.bottom-parent.top};
  let baseProject:(p:readonly number[])=>Point;
  if(hooks.field()==='population'){
   const s=hooks.population(),bounds=s.view==='vote'?populationVoteStates.find(v=>v.id===s.voteState)?.bounds:undefined;
   const extent=populationFallbackExtent(bounds?.map(b=>[...b]),s.view==='religion'?.1:0),inner=populationFallbackBox(box,extent);
   baseProject=p=>projectPopulationFallback(p,inner,extent);
  }else baseProject=p=>projectNatureFallback(p,containedMapBox(box,1800,1084));
  if(image.width<=0||image.height<=0)return baseProject;
  const a=baseProject([item.bounds[0],item.bounds[3]]),b=baseProject([item.bounds[2],item.bounds[1]]);
  const scale=Math.max(1,Math.min((image.width-70)/Math.abs(b.x-a.x),(image.height-70)/Math.abs(b.y-a.y)));
  const tx=(box.left+box.right)/2-scale*(a.x+b.x)/2,ty=(box.top+box.bottom)/2-scale*(a.y+b.y)/2;
  img.style.transformOrigin='0 0';img.style.transform=`translate(${tx+(scale-1)*box.left}px,${ty+(scale-1)*box.top}px) scale(${scale})`;
  if(oldTransform!==img.style.transform)hooks.markers();
  return p=>{const point=baseProject(p);return {x:scale*point.x+tx,y:scale*point.y+ty};};
 }
 function paint(){
  raf=0;const ctx=readPopulationInsight(new URL(location.href),config.base);svg.replaceChildren();
  if(!ctx){svg.style.display='none';const img=q('[data-fallback-image]');if(img.style.transform){img.style.transform='';hooks.markers();}return;}
  svg.style.display='block';svg.setAttribute('viewBox',`0 0 ${Math.max(1,frame.clientWidth)} ${Math.max(1,frame.clientHeight)}`);
  const project=projection(ctx.item);
  for(const f of shapes){
   const d=path(f.geometry,project);
   for(const cls of ['population-story-halo',ctx.item.id==='vegas-water'?'population-story-river':'population-story-outline']){
    const p=document.createElementNS(ns,'path');p.setAttribute('class',cls);p.setAttribute('d',d);svg.append(p);
   }
  }
  for(const a of ctx.item.anchors){
   const p=project(a.coordinate);if(p.x<0||p.y<0||p.x>frame.clientWidth||p.y>frame.clientHeight)continue;
   const dot=document.createElementNS(ns,'circle');dot.setAttribute('class','population-story-point');dot.setAttribute('cx',String(p.x));dot.setAttribute('cy',String(p.y));dot.setAttribute('r','5');svg.append(dot);
   const text=document.createElementNS(ns,'text');text.setAttribute('class','population-story-label');text.textContent=a.label;
   const dx=a.dx??12,w=a.label.length*12;
   let x=p.x+dx;let align=dx<0?'end':'start';
   if(align==='end'&&x-w<6){x=6;align='start';}else if(align==='start'&&x+w>frame.clientWidth-6){x=frame.clientWidth-6;align='end';}
   text.setAttribute('x',String(x));text.setAttribute('y',String(Math.max(20,Math.min(frame.clientHeight-15,p.y+(a.dy??-14)))));text.setAttribute('text-anchor',align);svg.append(text);
  }
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(paint);};
 async function load(item:PopulationInsight,origin:boolean){
  const ticket=++generation;shapes=[];loadFailed=false;schedule();
  try{
   if(item.id==='vegas-water'){
    const response=await fetch(config.assetBase+'base.geojson');if(!response.ok)throw new Error('River geometry unavailable');
    const data=await response.json();
    const points=(c:any):number[][]=>typeof c[0]==='number'?[c]:c.flatMap(points);
    const found=data.features.filter((f:any)=>f.properties.name==='Colorado'&&points(f.geometry.coordinates).some(p=>p[0]<-110));
    if(!found.length)throw new Error('Colorado River unavailable');if(ticket===generation)shapes=found;
   }else{
    const data=await hooks.load(origin&&item.id==='lds-vote'?'religion-counties-2020.geo':'counties.geo');
    const found=data.features.filter((f:any)=>item.counties.includes(f.properties.id));
    if(found.length!==item.counties.length)throw new Error('County boundary unavailable');if(ticket===generation)shapes=found;
   }
  }catch(error){if(ticket!==generation)return;loadFailed=true;console.error('Population story map',error);}
  if(ticket!==generation)return;
  const error=panel.querySelector<HTMLElement>('[data-pop-story-error]');if(error){error.hidden=!loadFailed;error.textContent='一部の輪郭・流路を表示できません。地名と解説は引き続き確認できます。';}
  schedule();
 }
 function sync(){
  const url=new URL(location.href),ctx=readPopulationInsight(url,config.base),s=hooks.population();
  index.hidden=hooks.field()!=='population'||!!ctx;
  for(const link of index.querySelectorAll<HTMLAnchorElement>('[data-pop-story-link]')){
   const item=populationInsights.find(i=>i.id===link.dataset.popStoryLink)!;
   link.hidden=!item.views.includes(s.view)&&!(item.id==='detroit-migration'&&s.city==='detroit'&&s.view==='distribution');
   const target=populationInsightUrl(url,config.base,item.id);link.href=target.pathname+target.search;
  }
  panel.hidden=!ctx;key.hidden=!ctx;
  if(!ctx){
   delete root.dataset.popStoryActive;
   if(activeId){activeId='';loadedKey='';generation++;shapes=[];hooks.map()?.getLayer('rivers')&&hooks.map().setPaintProperty('rivers','line-opacity',.86);}
   schedule();return;
  }
  root.dataset.popStoryActive=ctx.item.id;
  const host=q('[data-field-national="'+hooks.field()+'"]');if(panel.parentElement!==host)host.prepend(panel);
  if(activeId!==ctx.item.id){activeId=ctx.item.id;explain(ctx.item);}
  key.textContent=ctx.item.legend;
  const back=panel.querySelector<HTMLAnchorElement>('[data-pop-story-back]')!;back.href=ctx.back.pathname+ctx.back.search;
  panel.querySelectorAll<HTMLAnchorElement>('[data-pop-story-compare]').forEach(link=>{
   const origin=link.dataset.popStoryCompare==='origin',target=populationComparisonUrl(url,config.base,origin);link.href=target.pathname+target.search;link.setAttribute('aria-current',String(ctx.origin===origin));
  });
  const nextKey=ctx.item.id+':'+ctx.origin;
  if(loadedKey!==nextKey){loadedKey=nextKey;void load(ctx.item,ctx.origin);}
  const map=hooks.map();if(map&&hooks.canFocus()&&pendingFocus===ctx.item.id){pendingFocus=null;if(!url.searchParams.has('z'))hooks.fit(ctx.item.bounds);}
  if(map?.getLayer('rivers'))map.setPaintProperty('rivers','line-opacity',ctx.item.id==='vegas-water'?.22:.86);
  schedule();
 }
 function prepareNavigation(url:URL,link:HTMLAnchorElement){
  if(link.hasAttribute('data-pop-story-link')){
   returns.set(url.searchParams.get('popStoryReturn')??'',{x:window.scrollX,y:window.scrollY,scroll:q('[data-field-national="population"]').scrollTop});
   pendingFocus=readPopulationInsight(url,config.base)?.item.id??null;
  }else pendingFocus=null;
 }
 function afterNavigation(link:HTMLAnchorElement,previous:URL){
  sync();
  if(link.hasAttribute('data-pop-story-back')){
   const ctx=readPopulationInsight(previous,config.base),saved=returns.get(previous.searchParams.get('popStoryReturn')??'');
   requestAnimationFrame(()=>{
    index.querySelector<HTMLAnchorElement>(`[data-pop-story-link="${ctx?.item.id}"]`)?.focus({preventScroll:true});
    if(saved){q('[data-field-national="population"]').scrollTop=saved.scroll;window.scrollTo(saved.x,saved.y);}
   });
  }else{
   panel.querySelector<HTMLElement>('#population-story-heading')?.focus({preventScroll:true});
   if(innerWidth<900&&link.hasAttribute('data-pop-story-link'))panel.scrollIntoView({block:'start',behavior:'instant'});
  }
 }
 q<HTMLImageElement>('[data-fallback-image]').addEventListener('load',schedule);
 window.addEventListener('resize',schedule);
 sync();
 return {sync,schedule,prepareNavigation,afterNavigation};
}
