import {precipitationBands,riverBasins,waterViewNames,type WaterView} from '../data/atlas/water-resources';
import {readWaterState,writeWaterState,waterContains} from '../lib/atlas-water-state';
import {createNatureLoader} from '../lib/atlas-nature-loader';
import {createNatureLabels} from './atlas-nature-labels';
import {unprojectNatureFallback,projectNatureFallback} from '../lib/atlas-nature-labels';
import {cityAgricultureUrl} from '../lib/atlas-city-agriculture-link';

type Callbacks={active:()=>boolean;dragged:()=>boolean;map:()=>any;project:()=>((p:[number,number])=>{x:number;y:number})|null;changed:()=>void;viewChanged:()=>void};
export function createWaterController(root:HTMLElement,base:string,callbacks:Callbacks){
 const q=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const assetBase=base.replace(/atlas\/north-america\/$/,'assets/atlas/water-v1/');
 let lineLabels:{node:HTMLElement;coordinate:[number,number]}[]=[];
 let state=readWaterState(new URL(location.href)),data:any=null,generation=0,applied='';
 const loader=createNatureLoader(assetBase),holder=q('[data-water-labels]');
 const ns='http://www.w3.org/2000/svg',highlight=document.createElementNS(ns,'svg'),highlightPath=document.createElementNS(ns,'path');highlight.classList.add('atlas-water-highlight');highlight.setAttribute('aria-hidden','true');highlight.append(highlightPath);q('[data-map-frame]').append(highlight);
 const entries=[...precipitationBands.map(x=>({id:x.id,name:x.title,coordinate:[...x.anchor] as [number,number],mode:'precipitation' as const})),...riverBasins.map(x=>({id:x.id,name:x.title,coordinate:[...x.anchor] as [number,number],mode:'basins' as const}))];
 const labels=createNatureLabels(root,entries,{active:()=>active(),mode:()=>state.waterView,project:callbacks.project,select:(entry,trigger)=>select(entry.id,trigger),placed:()=>paint(),holder,attribute:'data-water-label',controls:'water-reading-title'});
 const active=()=>callbacks.active()&&state.waterView!=='rivers';
 const current=()=>state.waterView==='precipitation'?state.precipBand:state.basin;
 const choices=()=>state.waterView==='precipitation'?precipitationBands:riverBasins;
 const ids=['water-fill','water-outline','water-isohyets','water-hit','water-selected'];
 function render(){
  const show=active(),map=callbacks.map();root.dataset.waterView=state.waterView;
  q('[data-water-tabs]').hidden=!callbacks.active();q('[data-water-reading]').hidden=!show;q('[data-water-key]').hidden=!show;
  root.querySelectorAll<HTMLButtonElement>('[data-water-view]').forEach(b=>{const yes=b.dataset.waterView===state.waterView;b.setAttribute('aria-selected',String(yes));b.tabIndex=yes?0:-1;});
  if(map){for(const id of ids)map.setLayoutProperty(id,'visibility',show?'visible':'none');if(show){for(const id of ['aquifers-fill','aquifers-pattern','aquifers-outline','reservoir-points','current-lines','upwelling-line','crop-context-line'])map.setLayoutProperty(id,'visibility','none');map.setLayoutProperty('relief','visibility','none');map.setFilter('water-selected',['all',['==',['get','id'],current()??'__none'],['==',['get','kind'],state.waterView==='basins'?'outline':'band']]);}}
  schedule();labels.sync(current());
  if(!show)return;
  q('[data-fallback-livestock]').hidden=true;
  q('[data-nature-detail]').hidden=true;root.querySelectorAll<HTMLElement>('[data-nature-summary-panel="water"]').forEach(n=>n.hidden=true);
  q('[data-nature-key-panel="water"]').hidden=true;
  q('[data-layer-caption]').textContent=state.waterView==='precipitation'?'年平均降水量 · 1991–2020 · mm/年':'主要河川の流域 · 米国内の概略';
  q('[data-nature-guide]').textContent=state.waterView==='precipitation'?'色分けされた地域や降水量帯の表示をタップすると、解説を表示します。':'流域の色や川の名前をタップすると、水の集まる範囲と解説を表示します。';
  q<HTMLImageElement>('[data-fallback-image]').src=assetBase+state.waterView+'-fallback.webp';q<HTMLImageElement>('[data-fallback-image]').alt=q('[data-layer-caption]').textContent!;q<HTMLAnchorElement>('[data-fallback-full]').href=assetBase+state.waterView+'-fallback.webp';
  const item:any=choices().find(x=>x.id===current());
  q('[data-water-title]').textContent=item?.title??(state.waterView==='precipitation'?'年平均降水量':'河川の流域');
  q('[data-water-body]').textContent=item?.body??(state.waterView==='precipitation'?'色と等雨量線で、雨や雪がどこに多く降るかを読みます。1,000mm・1,500mmの線を少し太く表示しています。地域を選ぶと、その降水量帯の読み方を表示します。':'流域は、降った水が地表を流れて同じ川へ集まる範囲です。川の線と流域の面を合わせると、上流と下流のつながりを読めます。川の名前や色をタップしてください。');
  q('[data-water-note]').textContent=item?.note??'';q('[data-water-note]').hidden=!item?.note;q('[data-water-parent]').hidden=!item?.parent;
  const credit=q('[data-water-credit]');credit.replaceChildren();if(state.waterView==='precipitation'){const a=document.createElement('a');a.href='https://prism.oregonstate.edu/';a.textContent='PRISM Group, Oregon State University';credit.append(a,' · 2026年9月15日取得');}else credit.textContent='USGS WBD · 主要7対象／その他は灰色';
  const product=q<HTMLAnchorElement>('[data-water-product]');product.hidden=!item?.product;if(item?.product){const names:Record<string,string>={corn:'とうもろこし',wheat:'小麦',rice:'稲作',specialty:'果樹・野菜'};product.textContent=names[item.product]+'の解説へ';product.href=cityAgricultureUrl(writeWaterState(new URL(location.href),state),base,new URL(location.href).searchParams.get('city')??'',item.product).href;}
  const key=q('[data-water-key]');key.replaceChildren();for(const x of choices()){const span=document.createElement('span'),i=document.createElement('i');i.style.backgroundColor=x.color;span.append(i,x.title);key.append(span);}if(state.waterView==='basins')key.append('灰色：その他・未収録');
 }
 function select(id:string,trigger?:HTMLElement){
  if(!choices().some(x=>x.id===id))return;
  if(state.waterView==='precipitation')state.precipBand=id;else state.basin=id;
  render();callbacks.changed();q('[data-atlas-live]').textContent=q('[data-water-title]').textContent+'の解説を表示しました。';
  if(trigger&&window.innerWidth<960){q('[data-water-title]').focus({preventScroll:true});q('[data-water-title]').scrollIntoView?.({block:'start',behavior:'instant'});}
 }
 function schedule(){labels.schedule();paint();}
 function paint(){
  const project=callbacks.project();
  highlight.style.display=active()&&!project&&data?'block':'none';
  if(active()&&!project&&data){const box=labels.fallbackBox();const path=(g:any):string=>{const c=g.coordinates,points=(r:number[][])=>r.map(p=>{const t=projectNatureFallback(p,box);return t.x.toFixed(1)+','+t.y.toFixed(1);}).join('L');if(g.type==='Polygon')return c.map((r:number[][])=>'M'+points(r)+'Z').join('');if(g.type==='LineString')return c.length?'M'+points(c):'';if(g.type==='MultiPolygon')return c.map((x:any)=>path({type:'Polygon',coordinates:x})).join('');if(g.type==='MultiLineString')return c.map((x:any)=>path({type:'LineString',coordinates:x})).join('');return g.type==='GeometryCollection'?g.geometries.map(path).join(''):'';};const f=data.features.find((f:any)=>f.properties.id===current()&&f.properties.kind===(state.waterView==='basins'?'outline':'band'));highlightPath.setAttribute('d',f?path(f.geometry):'');}
for(const {node,coordinate} of lineLabels){node.hidden=!active()||state.waterView!=='precipitation'||!project;if(!node.hidden){const p=project!(coordinate);node.style.left=p.x+'px';node.style.top=p.y+'px';node.hidden=p.x<15||p.y<15||p.x>q('[data-map-frame]').clientWidth-15||p.y>q('[data-map-frame]').clientHeight-40;}}
 }
 function makeLineLabels(collection:any){
  lineLabels.forEach(x=>x.node.remove());lineLabels=[];
  const lines=(g:any):number[][][]=>g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:g.type==='GeometryCollection'?g.geometries.flatMap(lines):[];
  for(const f of collection.features){if(f.properties.kind!=='isohyet')continue;const longest=lines(f.geometry).sort((a,b)=>b.length-a.length)[0];if(!longest?.length)continue;const node=document.createElement('span');node.className='atlas-water-isohyet';node.textContent=f.properties.value.toLocaleString('ja-JP');node.setAttribute('aria-hidden','true');holder.append(node);lineLabels.push({node,coordinate:longest[Math.floor(longest.length/2)] as [number,number]});}
 }
 async function ensure(){
  if(!active())return;const view=state.waterView,token=++generation;
  try{const next=await loader.json(view+'.geojson.gz');if(token!==generation||!active()||view!==state.waterView)return;
   data=next;makeLineLabels(next);const map=callbacks.map();if(map){map.getSource('water-data').setData(next);applied=view;}render();
  }catch(error){if(token===generation&&active()){q('[data-water-note]').hidden=false;q('[data-water-note]').textContent='地図データを取得できませんでした。再試行してください。';throw error;}}
 }
 function setView(view:WaterView){if(!['rivers','precipitation','basins'].includes(view))return;state.waterView=view;generation++;data=null;applied='';callbacks.viewChanged();render();if(!callbacks.map()&&active())void ensure().catch(()=>{});}
 root.querySelectorAll<HTMLButtonElement>('[data-water-view]').forEach(b=>{b.addEventListener('click',()=>setView(b.dataset.waterView as WaterView));b.addEventListener('keydown',e=>{const order=['rivers','precipitation','basins'];let i=order.indexOf(b.dataset.waterView!);if(e.key==='ArrowRight')i=(i+1)%3;else if(e.key==='ArrowLeft')i=(i+2)%3;else if(e.key==='Home')i=0;else if(e.key==='End')i=2;else return;e.preventDefault();q<HTMLButtonElement>(`[data-water-view="${order[i]}"]`).focus();setView(order[i] as WaterView);});});
 q('[data-water-parent]').addEventListener('click',()=>select('mississippi',q('[data-water-parent]')));
 const fallback=q('.atlas-fallback-map');fallback.addEventListener('click',e=>{if(!active()||!data||q('[data-fallback]').hidden||callbacks.dragged())return;const frame=q('[data-map-frame]').getBoundingClientRect();const p=unprojectNatureFallback({x:e.clientX-frame.left,y:e.clientY-frame.top},labels.fallbackBox());if(!p)return;const hit=data.features.find((f:any)=>['band','basin'].includes(f.properties.kind)&&waterContains(f.geometry,p));if(hit)select(hit.properties.id,fallback);});
 return {active,view:()=>state.waterView,render,ensure,select,schedule,assetBase,write:(u:URL)=>writeWaterState(u,state),restore:()=>{state=readWaterState(new URL(location.href));generation++;data=null;applied='';},click:(point:any)=>{if(!active())return false;const map=callbacks.map();if(applied!==state.waterView)return true;const hits=state.waterView==='precipitation'?map.queryRenderedFeatures([[point.x-5,point.y-5],[point.x+5,point.y+5]],{layers:['water-hit']}):[];if(!hits.length)hits.push(...map.queryRenderedFeatures(point,{layers:['water-fill']}));if(hits[0])select(hits[0].properties.id,q('[data-map-surface]'));return true;}};
}
