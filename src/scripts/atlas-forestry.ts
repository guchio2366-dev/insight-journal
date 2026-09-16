import {forestRegion} from '../data/atlas/forestry';
import {forestComparison,forestComparisonUrl,forestReturn} from '../lib/atlas-forestry-state';
import {containedMapBox,projectNatureFallback,layoutNatureLabels} from '../lib/atlas-nature-labels';

type Callbacks={field:()=>string;selected:()=>boolean;project:()=>((p:readonly number[])=>{x:number;y:number})|null;changed:()=>void};
const ns='http://www.w3.org/2000/svg';
export function createForestry(root:HTMLElement,base:string,cb:Callbacks){
 const frame=root.querySelector<HTMLElement>('[data-map-frame]')!,asset=base.replace(/atlas\/north-america\/$/,'assets/atlas/forestry/v1/');
 const svg=document.createElementNS(ns,'svg');svg.classList.add('forest-overlay');svg.setAttribute('aria-hidden','true');svg.style.display='none';
 const cover=document.createElementNS(ns,'image'),outline=document.createElementNS(ns,'path'),names=document.createElementNS(ns,'g');
 cover.setAttribute('preserveAspectRatio','none');outline.classList.add('forest-region-outline');svg.append(cover,outline,names);frame.insertBefore(svg,root.querySelector('[data-map-labels]'));
 const key=document.createElement('div');key.className='forest-map-key';key.hidden=true;
 const legend=document.createElement('span');legend.textContent='緑：森林3分類（NLCD 2021）／輪郭：解説対象の州。木材生産量の地図ではありません。';
 const error=document.createElement('span');error.setAttribute('role','status');const retry=document.createElement('button');retry.type='button';retry.textContent='森林を再読み込み';retry.hidden=true;key.append(legend,error,retry);frame.after(key);
 const note=document.createElement('section');note.className='forest-comparison';note.hidden=true;
 const heading=document.createElement('h2');heading.id='forest-comparison-heading';heading.tabIndex=-1;
 const back=document.createElement('a');back.dataset.forestBack='';back.className='forest-link';back.textContent='← 森林資源と木材生産に戻る';
 const intro=document.createElement('p');note.append(heading,back,intro);root.querySelector('[data-field-national="natural"]')!.prepend(note);
 let features:any[]=[],pending:Promise<void>|null=null,loaded=false,blobUrl='',failed=false,raf=0;
 const active=()=>cb.field()==='agriculture'?cb.selected():cb.field()==='natural'&&Boolean(forestComparison(new URL(location.href)));
 async function ensure(){
  if(loaded||pending)return pending;
  failed=false;retry.hidden=true;error.textContent='森林データを読み込み中…';
  pending=(async()=>{
   const [r,p]=await Promise.all([fetch(asset+'regions.geojson'),fetch(asset+'forest-cover.png')]);
   if(!r.ok||!p.ok)throw new Error('Forest data unavailable');
   const [regions,blob]=await Promise.all([r.json(),p.blob()]);
   if(!Array.isArray(regions.features)||regions.features.length!==6||!blob.size)throw new Error('Invalid forest data');
   features=regions.features;blobUrl=URL.createObjectURL(blob);cover.setAttribute('href',blobUrl);loaded=true;error.textContent='';
  })().catch(()=>{failed=true;error.textContent='森林分布を読み込めませんでした。地形の土台のみ表示しています。';retry.hidden=false;}).finally(()=>{pending=null;paint();});
  return pending;
 }
 cover.addEventListener('error',()=>{loaded=false;failed=true;cover.removeAttribute('href');if(blobUrl)URL.revokeObjectURL(blobUrl);error.textContent='森林画像を表示できませんでした。';retry.hidden=false;paint();});
 function project(){
  const live=cb.project();if(live)return live;
  const image=root.querySelector<HTMLImageElement>('[data-fallback-image]')!,a=image.getBoundingClientRect(),b=frame.getBoundingClientRect();
  const box=containedMapBox({left:a.left-b.left,top:a.top-b.top,right:a.right-b.left,bottom:a.bottom-b.top},image.naturalWidth||1800,image.naturalHeight||1084);
  return (p:readonly number[])=>projectNatureFallback(p,box);
 }
 function path(g:any,projector:ReturnType<typeof project>):string{
  if(g.type==='MultiPolygon')return g.coordinates.map((c:any)=>path({type:'Polygon',coordinates:c},projector)).join('');
  if(g.type!=='Polygon')return '';
  return g.coordinates.map((r:number[][])=>r.map((p,i)=>{const q=projector(p);return (i?'L':'M')+q.x.toFixed(1)+','+q.y.toFixed(1);}).join('')+'Z').join('');
 }
 function paint(){
  raf=0;svg.style.display=active()&&loaded?'block':'none';if(!active()||!loaded)return;
  const p=project(),a=p([-128,52]),b=p([-64,22]),region=forestRegion(new URL(location.href).searchParams.get('forestRegion'));
  svg.setAttribute('viewBox',`0 0 ${frame.clientWidth} ${frame.clientHeight}`);
  cover.setAttribute('x',String(a.x));cover.setAttribute('y',String(a.y));cover.setAttribute('width',String(b.x-a.x));cover.setAttribute('height',String(b.y-a.y));
  // Comparison keeps the measured forest pattern visible without hiding rainfall colors.
  cover.setAttribute('opacity',cb.field()==='natural'?'.45':'1');
  outline.setAttribute('d',region?features.filter(f=>(region.codes as readonly string[]).includes(f.properties.code)).map(f=>path(f.geometry,p)).join(''):'');
  names.replaceChildren();
  if(region){
   const anchors:Record<string,[number,number]>={NC:[-79.8,35.6],WA:[-120.8,47.4],OR:[-120.6,43.6],ME:[-69.0,46.1],NH:[-71.2,43.0],VT:[-72.7,44.0]};
   const selected=features.filter(f=>(region.codes as readonly string[]).includes(f.properties.code));
   const labels=selected.map(f=>({id:f.properties.code,anchor:p(anchors[f.properties.code]),width:f.properties.name.length*12+8,height:20}));
   const rect=frame.getBoundingClientRect();
   const obstacles=Array.from(root.querySelectorAll<HTMLElement>('[data-water-label],[data-nature-label]')).filter(n=>!n.hidden&&n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return {left:r.left-rect.left,top:r.top-rect.top,right:r.right-rect.left,bottom:r.bottom-rect.top};});
   const placements=layoutNatureLabels(labels,{left:6,top:24,right:frame.clientWidth-6,bottom:frame.clientHeight-26},obstacles);
   for(const label of placements){
    const f=selected.find(f=>f.properties.code===label.id),line=document.createElementNS(ns,'line'),text=document.createElementNS(ns,'text');
    line.setAttribute('x1',String(label.anchor.x));line.setAttribute('y1',String(label.anchor.y));line.setAttribute('x2',String(label.left+label.width/2));line.setAttribute('y2',String(label.top+10));line.setAttribute('stroke','#315a47');line.setAttribute('stroke-width','1');
    text.textContent=f.properties.name;text.setAttribute('x',String(label.left+label.width/2));text.setAttribute('y',String(label.top+15));text.setAttribute('text-anchor','middle');names.append(line,text);
   }
  }
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(paint);};
 function sync(){
  const enabled=active(),url=new URL(location.href),region=forestRegion(url.searchParams.get('forestRegion')),comparison=cb.field()==='natural'&&forestComparison(url);
  root.dataset.forestActive=String(cb.field()==='agriculture'&&cb.selected());key.hidden=!enabled;
  root.querySelectorAll<HTMLElement>('[data-forest-region-copy]').forEach(n=>n.hidden=n.dataset.forestRegionCopy!==region?.id);
  root.querySelectorAll<HTMLElement>('[data-forest-region]').forEach(n=>n.setAttribute('aria-pressed',String((n.dataset.forestRegion||null)===(region?.id??null))));
  root.querySelector<HTMLElement>('[data-forest-region-intro]')!.hidden=Boolean(region);
  for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-forest-compare]')){
   if(cb.field()==='agriculture'){const target=forestComparisonUrl(url,base,a.dataset.forestCompare as any);a.href=target.pathname+target.search;}
  }
  note.hidden=!comparison;
  if(comparison){
   heading.textContent='林業から比較中'+(region?'：'+region.places:'');
   intro.textContent='緑の斑点は2021年の森林分布、輪郭は選んだ州です。'+(comparison==='precipitation'?'雨の多い地域と森林の広がりを見比べてください。降水量は1991–2020年の平年値です。':'地形の起伏と森林の広がりを見比べてください。');
   const target=forestReturn(url,base);back.href=target.pathname+target.search;
  }
  if(cb.field()==='agriculture'&&cb.selected()){root.querySelector<HTMLElement>('[data-layer-caption]')!.textContent='森林3分類 · NLCD 2021';root.querySelector<HTMLAnchorElement>('[data-fallback-full]')!.href=asset+'forestry-fallback.webp';}
  if(enabled&&!loaded&&!failed)void ensure();schedule();
 }
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-forest-region]'))button.addEventListener('click',()=>{
  const url=new URL(location.href),region=forestRegion(button.dataset.forestRegion??null);
  if(region)url.searchParams.set('forestRegion',region.id);else url.searchParams.delete('forestRegion');
  history.pushState({},'',url);sync();cb.changed();
 });
 retry.addEventListener('click',()=>{void ensure();});
 new ResizeObserver(schedule).observe(frame);
 for(const holder of root.querySelectorAll('[data-water-labels],[data-nature-labels]'))new MutationObserver(schedule).observe(holder,{attributes:true,childList:true,subtree:true,attributeFilter:['style','hidden']});root.querySelector('[data-fallback-image]')!.addEventListener('load',schedule);
 return {sync,schedule};
}
