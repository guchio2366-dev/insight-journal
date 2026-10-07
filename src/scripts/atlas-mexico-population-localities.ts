import {
 localityNationalFrame,readLocalityFrame,localityZoom,localityFrameIntersects,localityInFrame,
 localitySymbolScale,localitySymbolRadius,
 type LocalityFrame,type LocalityPoint,type LocalityCluster,type LocalityManifest,
} from '../lib/atlas-mexico-population-localities';
import population from '../data/atlas/mexico/population.json';

type Mark={x:number;y:number;population:number;localities:number;name:string;code:string;municipality:string;bounds:number[];aggregate:boolean};
type Pick=Mark&{screenX:number;screenY:number;radius:number};
const number=(value:number)=>value.toLocaleString('ja-JP');

export function initMexicoLocalityPopulation(root:HTMLElement) {
 const holder=root.querySelector<HTMLElement>('[data-locality-frame]');
 const canvas=root.querySelector<HTMLCanvasElement>('[data-locality-canvas]');
 const configuration=root.querySelector('[data-locality-config]')?.textContent;
 if(!holder||!canvas||!configuration)return null;
 let context:CanvasRenderingContext2D|null=null;
 try{context=canvas.getContext('2d');}catch{return null;}
 // The retained state table and SVG remain available without Canvas support.
 if(!context)return null;
 const config=JSON.parse(configuration) as LocalityManifest;
 const map=root.querySelector<SVGSVGElement>('[data-locality-map]')!;
 const labels=root.querySelector<SVGSVGElement>('[data-locality-labels]')!;
 const loading=root.querySelector<HTMLElement>('[data-locality-loading]')!;
 const query=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector);
 const text=(selector:string,value:string)=>{const target=query(selector);if(target)target.textContent=value;};
 const cache=new Map<string,Promise<any>>();
 let active=false,onlyState='',readingState='',frame=readLocalityFrame(new URL(location.href)),generation=0;
 let marks:Mark[]=[],picks:Pick[]=[],selected:Mark|null=null,drawFrame=0,mode:'cluster'|'locality'='cluster',listing='';
 async function load(file:string){
  if(!cache.has(file))cache.set(file,(async()=>{
   const response=await fetch(config.assets+file);
   if(!response.ok||!response.body)throw new Error(`Population asset ${response.status}`);
   return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  })());
  return cache.get(file)!;
 }
 function renderSelection(){
  query<HTMLElement>('[data-locality-selection]')!.hidden=!selected;
  if(!selected)return;
  text('[data-locality-selected-name]',selected.localities>1?`${selected.name}周辺の近接集落`:selected.name);
  text('[data-locality-selected-population]',number(selected.population));
  text('[data-locality-selected-description]',selected.aggregate
   ?`${number(selected.localities)}集落の人口合計です。位置は人口で重み付けした平均。拡大すると公式の集落代表位置に分かれます。`
   :`2020年の${selected.municipality}に属する集落。コード${selected.code}。住宅位置や集落全域の密度を示す点ではありません。`);
  const zoom=query<HTMLButtonElement>('[data-locality-selection-zoom]');if(zoom)zoom.hidden=!selected.aggregate;
 }
 function select(mark:Mark){selected=mark;renderSelection();scheduleDraw();}
 function commit(){
  const url=new URL(location.href);
  if(frame[2]===900)url.searchParams.delete('localityFrame');else url.searchParams.set('localityFrame',frame.join(','));
  url.searchParams.set('populationDetail','locality');
  history.replaceState(history.state,'',url);
 }
 function setFrame(next:LocalityFrame){frame=next;commit();void refresh();}
 function zoomSelected(){
  if(!selected)return;
  const [x0,y0,x1,y1]=selected.bounds;
  const width=Math.max(6,Math.min(90,Math.max((x1-x0)*1.6,(y1-y0)*1.6*900/580)));
  const height=width*580/900;
  setFrame([Math.max(0,Math.min(900-width,(x0+x1-width)/2)),Math.max(0,Math.min(580-height,(y0+y1-height)/2)),width,height]);
 }
 function scheduleDraw(){if(!active||drawFrame)return;drawFrame=requestAnimationFrame(()=>{drawFrame=0;draw();});}
 function draw(){
  if(!active||!context||root.dataset.localityPopulationReady==='error')return;
  const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
  const ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);
  context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,box.width,box.height);
  map.setAttribute('viewBox',frame.join(' '));
  const visible=marks.filter(mark=>localityInFrame(mark.x,mark.y,frame));
  const maximum=Math.max(1,...visible.map(mark=>mark.population));
  const areaScale=localitySymbolScale(maximum,900/frame[2]);
  picks=[];
  for(const mark of [...visible].sort((a,b)=>b.population-a.population)){
   const x=(mark.x-frame[0])/frame[2]*box.width,y=(mark.y-frame[1])/frame[3]*box.height;
   const radius=localitySymbolRadius(mark.population,areaScale);
   picks.push({...mark,screenX:x,screenY:y,radius});
   // A gray anchor is a position locator. Its size never represents a count.
   context.fillStyle='#718577';context.beginPath();context.arc(x,y,.65,0,Math.PI*2);context.fill();
   context.fillStyle=selected===mark?'#9d4022':'#b97831';context.globalAlpha=.74;
   context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fill();context.globalAlpha=1;
   if(radius>=2){context.strokeStyle='#89551f';context.lineWidth=.55;context.stroke();}
  }
  labels.replaceChildren();
  const labelBoxes:number[][]=[];
  for(const pick of [...picks].sort((a,b)=>b.population-a.population)){
   if(labelBoxes.length>=7)break;
   if(mode==='cluster'&&pick.population<150000)continue;
   const label=pick.localities>1?`${pick.name}周辺`:pick.name;
   const width=Math.min(160,label.length*8),height=19;
   const x=Math.min(box.width-width-8,Math.max(8,pick.screenX+pick.radius+5));
   const y=Math.max(20,pick.screenY-pick.radius-4);
   if(labelBoxes.some(b=>x<b[0]+b[2]+6&&x+width>b[0]-6&&y-height<b[1]+5&&y>b[1]-height-5))continue;
   labelBoxes.push([x,y,width,height]);
   const node=document.createElementNS('http://www.w3.org/2000/svg','text');
   node.setAttribute('x',String(x/box.width*900));node.setAttribute('y',String(y/box.height*580));
   node.setAttribute('font-size',String(13*900/box.width));node.textContent=label;labels.append(node);
  }
  const legend=query<SVGSVGElement>('[data-locality-count-key]');
  if(legend){
   legend.replaceChildren();
   const reference=Math.max(100,10**Math.floor(Math.log10(maximum)));
   const values=[reference/100,reference/10,reference].filter(value=>value<=Math.max(100,maximum));
   for(const [i,value]of values.entries()){
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',String(40+i*100));circle.setAttribute('cy','22');circle.setAttribute('r',String(localitySymbolRadius(value,areaScale)*300/(legend.getBoundingClientRect().width||300)));
    const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('x',String(40+i*100));label.setAttribute('y','55');label.setAttribute('text-anchor','middle');label.textContent=`${number(value)}人`;
    legend.append(circle,label);
   }
  }
  const visiblePopulation=visible.reduce((sum,mark)=>sum+mark.population,0);
  const visibleLocalities=visible.reduce((sum,mark)=>sum+mark.localities,0);
  text('[data-locality-mode]',mode==='cluster'?'近接集落を集約した人数円':'公式の集落代表位置ごとの人数円');
  text('[data-locality-visible-count]',`${number(visibleLocalities)}集落・${number(visiblePopulation)}人`);
  const scope=readingState?population.states.find(s=>s.stateCode===readingState):null;
  text('[data-locality-total-label]',scope?`${scope.nameJa}の人口`:'メキシコ全国の人口');
  text('[data-locality-total]',number(scope?.population??config.population));
  text('[data-locality-total-localities]',number(scope?config.chunks.find(c=>c.stateCode===readingState)!.localities:config.localities));
  text('[data-locality-scope-note]',scope?(onlyState?'選んだ州の集落を表示しています。':'選択州の総計です。地図は全国の集落を表示しています。'):'州を選ばず全国で表示します。');
  const list=query('[data-locality-list]');const ranked=[...visible].sort((a,b)=>b.population-a.population).slice(0,10);
  const signature=ranked.map(mark=>[mark.code,mark.x,mark.y,mark.population,mark.localities].join(':')).join('|');
  if(list&&signature!==listing){listing=signature;list.replaceChildren();for(const mark of ranked){
   const li=document.createElement('li'),button=document.createElement('button');button.type='button';
   button.textContent=`${mark.name}${mark.localities>1?'周辺':''}　${number(mark.population)}人${mark.localities>1?`・${number(mark.localities)}集落`:''}`;
   button.addEventListener('click',()=>select(mark));li.append(button);list.append(li);
  }}
  root.dataset.localityVisiblePopulation=String(visiblePopulation);root.dataset.localityVisibleCount=String(visibleLocalities);
  root.dataset.localityMarkCount=String(visible.length);root.dataset.localityMode=mode;if(loading.hidden)root.dataset.localityPopulationReady='true';
  query<HTMLButtonElement>('[data-locality-action="out"]')!.disabled=frame[2]>=900;
  query<HTMLButtonElement>('[data-locality-action="in"]')!.disabled=frame[2]<=6;
 }
 async function refresh(){
  if(!active)return;
  const ticket=++generation;loading.hidden=false;loading.textContent='集落人口を読み込み中…';
  root.dataset.localityPopulationReady='loading';
  try{
   if(frame[2]>90){
    const rows=await load(config.overview.file) as LocalityCluster[];
    if(rows.length!==config.overview.points||rows.reduce((s,r)=>s+r[2],0)!==config.population||rows.reduce((s,r)=>s+r[3],0)!==config.localities)throw new Error('Overview totals disagree with source manifest');
    if(ticket!==generation||!active)return;
    marks=rows.filter(r=>!onlyState||r[4]===onlyState).map(r=>({x:r[0],y:r[1],population:r[2],localities:r[3],code:r[4],name:r[5],municipality:'',bounds:r.slice(6,10),aggregate:true}));mode='cluster';
   }else{
    const chunks=config.chunks.filter(c=>(!onlyState||c.stateCode===onlyState)&&localityFrameIntersects(frame,c.bounds));
    const arrays=await Promise.all(chunks.map(async chunk=>{
     const rows=await load(chunk.file) as LocalityPoint[];
     if(rows.length!==chunk.localities||rows.reduce((s,r)=>s+r[2],0)!==chunk.population||rows.some(r=>!Number.isFinite(r[0])||!Number.isFinite(r[1])||!Number.isSafeInteger(r[2])||r[2]<0||!/^\d{9}$/.test(r[3])))throw new Error('Locality source totals or keys disagree');
     return rows;
    }));
    if(ticket!==generation||!active)return;
    marks=arrays.flat().map(r=>({x:r[0],y:r[1],population:r[2],localities:1,code:r[3],name:r[4],municipality:r[5],bounds:[r[0],r[1],r[0],r[1]],aggregate:false}));mode='locality';
   }
   loading.hidden=true;scheduleDraw();
  }catch(error){
   if(ticket!==generation||!active)return;
   marks=[];picks=[];selected=null;listing='';renderSelection();
   context?.clearRect(0,0,canvas.width,canvas.height);labels.replaceChildren();query('[data-locality-list]')?.replaceChildren();
   text('[data-locality-visible-count]','取得できません');
   delete root.dataset.localityVisiblePopulation;delete root.dataset.localityVisibleCount;root.dataset.localityMarkCount='0';
   loading.textContent='集落人口を読み込めませんでした。州別の人口と密度は下の表で確認できます。';
   root.dataset.localityPopulationReady='error';text('[data-locality-mode]','集落人口の読み込みに失敗');
  }
 }
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-locality-action]'))button.addEventListener('click',()=>{
  selected=null;renderSelection();
  setFrame(button.dataset.localityAction==='fit'?[...localityNationalFrame]:localityZoom(frame,button.dataset.localityAction==='in'?.5:2));
  if(button.dataset.localityAction==='fit')root.dispatchEvent(new CustomEvent('locality-population-fit'));
 });
 query<HTMLButtonElement>('[data-locality-selection-zoom]')?.addEventListener('click',zoomSelected);
 let drag:{x:number;y:number;frame:LocalityFrame;moved:boolean}|null=null,skipClick=false;
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0||!active)return;drag={x:event.clientX,y:event.clientY,frame:[...frame],moved:false};canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointermove',event=>{
  if(!drag)return;const box=canvas.getBoundingClientRect();const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(Math.hypot(dx,dy)<4&&!drag.moved)return;drag.moved=true;
  frame=[Math.max(0,Math.min(900-drag.frame[2],drag.frame[0]-dx/box.width*drag.frame[2])),Math.max(0,Math.min(580-drag.frame[3],drag.frame[1]-dy/box.height*drag.frame[3])),drag.frame[2],drag.frame[3]];
  scheduleDraw();
 });
 canvas.addEventListener('pointerup',()=>{if(drag?.moved){skipClick=true;commit();void refresh();}drag=null;});
 canvas.addEventListener('pointercancel',()=>{if(drag?.moved){frame=drag.frame;scheduleDraw();}drag=null;});canvas.addEventListener('lostpointercapture',()=>{if(drag?.moved){frame=drag.frame;scheduleDraw();}drag=null;});
 canvas.addEventListener('click',event=>{
  if(skipClick){skipClick=false;return;}const box=canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top;
  const hit=picks.map(p=>({p,d:Math.hypot(p.screenX-x,p.screenY-y)})).filter(v=>v.d<=Math.max(6,v.p.radius)).sort((a,b)=>a.d-b.d)[0];
  if(hit)select(marks.find(m=>m.code===hit.p.code&&m.x===hit.p.x&&m.y===hit.p.y)!);
 });
 canvas.addEventListener('wheel',event=>{if(!active)return;event.preventDefault();const box=canvas.getBoundingClientRect();setFrame(localityZoom(frame,event.deltaY<0?.8:1.25,[frame[0]+(event.clientX-box.left)/box.width*frame[2],frame[1]+(event.clientY-box.top)/box.height*frame[3]]));},{passive:false});
 canvas.addEventListener('keydown',event=>{
  if(['+','=','-'].includes(event.key)){event.preventDefault();setFrame(localityZoom(frame,event.key==='-'?2:.5));}
  else if(event.key==='Escape'){selected=null;renderSelection();scheduleDraw();}
  else if(event.key.startsWith('Arrow')){event.preventDefault();const dx=event.key==='ArrowRight'?.12:event.key==='ArrowLeft'?-.12:0,dy=event.key==='ArrowDown'?.12:event.key==='ArrowUp'?-.12:0;
   setFrame([Math.max(0,Math.min(900-frame[2],frame[0]+frame[2]*dx)),Math.max(0,Math.min(580-frame[3],frame[1]+frame[3]*dy)),frame[2],frame[3]]);
  }
 });
 new ResizeObserver(scheduleDraw).observe(holder);
 window.addEventListener('popstate',()=>{frame=readLocalityFrame(new URL(location.href));if(active)void refresh();});
 return {setActive(enabled:boolean,stateCode:string,only:boolean){
  const newScope=only?stateCode:'';const changed=enabled!==active||newScope!==onlyState;
  active=enabled;onlyState=newScope;readingState=stateCode;holder.hidden=!active;root.dataset.localityPopulationActive=String(active);
  for(const node of root.querySelectorAll<HTMLElement>('[data-locality-legend],[data-locality-reading]'))node.hidden=!active;
  if(changed&&active){selected=null;renderSelection();void refresh();}else scheduleDraw();
  if(!active)generation++;
  return active;
 }};
}
