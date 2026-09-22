import {waterGeometryLoader} from '../lib/atlas-water-geometry';
import {loadAgricultureGeometry} from '../lib/atlas-agriculture-geometry';

import {productNames,productSources,insightLead,insightTakeaway,targetLabel} from '../data/atlas/agriculture-insights';
import {agricultureInsightUrl,readInsightContext} from '../lib/atlas-agriculture-insight-state';
import {isProduct} from '../lib/atlas-agriculture-detail-state';
import {projectNatureFallback} from '../lib/atlas-nature-labels';
import {livestockKinds,livestockRegions} from '../data/atlas/livestock';
import {cornReading,cornStories} from '../data/atlas/corn-reading';

type Point={x:number;y:number};
type Callbacks={
 state:()=>{field:string;mode:string;waterView:string;feature:string|null;product:string|null;layers:Set<string>;ready:boolean;failed:boolean};
 map:()=>any;
 project:()=>((p:readonly number[])=>Point)|null;
 box:()=>any;
 features:()=>{crops:any[];land:any[];base:any[];overlays:any[]};
 fit:(bounds:readonly number[])=>void;
};
const ns='http://www.w3.org/2000/svg';
const cache=new Map<string,Promise<any>>();
function json(url:string){if(!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error('Map data unavailable');return r.json();}).catch(e=>{cache.delete(url);throw e;}));return cache.get(url)!;}
function shape(g:any,project:(p:readonly number[])=>Point):string{
 if(!g)return '';
 const line=(points:number[][],closed=false)=>points.map((p,i)=>{const q=project(p);return (i?'L':'M')+q.x.toFixed(1)+','+q.y.toFixed(1);}).join('')+(closed?'Z':'');
 if(g.type==='Polygon')return g.coordinates.map((r:any)=>line(r,true)).join('');
 if(g.type==='MultiPolygon')return g.coordinates.map((c:any)=>shape({type:'Polygon',coordinates:c},project)).join('');
 if(g.type==='LineString')return line(g.coordinates);
 if(g.type==='MultiLineString')return g.coordinates.map((r:any)=>line(r)).join('');
 if(g.type==='GeometryCollection')return g.geometries.map((v:any)=>shape(v,project)).join('');
 return '';
}
const climateMasks=new Map<string,Promise<{url:string;coordinates:number[][]}>>();
/** Class IDs use the red channel, matching build-climate-code-labels.py.
 * Nearest-neighbour sampling preserves categories; this is display-only.
 * Existing 248 KB grid; no external data or new runtime dependencies.
 */
function climateMask(base:string,code:string){
 const key=base+code;if(climateMasks.has(key))return climateMasks.get(key)!;
 const result=(async()=>{
  const [legend,manifest,img]=await Promise.all([json(base+'climate-legend.json'),json(base+'manifest.json'),new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Climate grid unavailable'));i.src=base+'climate-classes.png';})]);
  const id=legend.find((x:any)=>x.code===code)?.id;if(!id)throw new Error('Climate class unavailable');
  const c=document.createElement('canvas'),w=c.width=Math.min(1600,img.naturalWidth),h=c.height=Math.round(img.naturalHeight*w/img.naturalWidth);
  const cx=c.getContext('2d',{willReadFrequently:true});if(!cx)throw new Error('Climate canvas unavailable');
  cx.imageSmoothingEnabled=false;cx.drawImage(img,0,0,w,h);
  const data=cx.getImageData(0,0,w,h).data,inside=new Uint8Array(w*h);
  for(let i=0;i<inside.length;i++)inside[i]=Number(data[i*4]===id&&data[i*4+3]>0);
  const out=cx.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!inside[i])continue;const edge=x===0||x===w-1||y===0||y===h-1||!inside[i-1]||!inside[i+1]||!inside[i-w]||!inside[i+w];out.data.set(edge?[24,60,74,255]:[24,60,74,32],i*4);}
  cx.putImageData(out,0,0);return {url:c.toDataURL('image/png'),coordinates:manifest.imageCoordinates};
 })().catch(e=>{climateMasks.delete(key);throw e;});
 climateMasks.set(key,result);return result;
}
export function createAgricultureInsights(root:HTMLElement,config:any,cb:Callbacks){
 const q=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const frame=q('[data-map-frame]');
 const waterLoader=waterGeometryLoader(config.base.replace(/atlas\/north-america\/$/,'assets/atlas/water-v1/'));
 const svg=document.createElementNS(ns,'svg');svg.classList.add('agri-insight-overlay');svg.setAttribute('aria-hidden','true');
 const make=(name:string,cls:string)=>{const e=document.createElementNS(ns,name);e.setAttribute('class',cls);svg.append(e);return e;};
 const defs=make('defs','agri-overlay-defs'),clip=document.createElementNS(ns,'clipPath'),clipRect=document.createElementNS(ns,'rect');
 clip.id='agri-rain-focus-clip';clip.append(clipRect);defs.append(clip);
 const mask=make('image','agri-climate-mask');
 const targetHalo=make('path','agri-target-halo'),targetLine=make('path','agri-target-line'),targetPoints=make('g','agri-target-points');
 const riverLabel=make('text','agri-corn-river-label');
 const cropHalo=make('path','agri-product-halo'),cropLine=make('path','agri-product-line'),animals=make('g','agri-product-animals');
 frame.append(svg);
 const legend=document.createElement('p');legend.className='agri-comparison-key';legend.hidden=true;frame.after(legend);
 const note=document.createElement('section');note.className='agri-insight-context';note.hidden=true;note.setAttribute('aria-labelledby','agri-insight-heading');
 const title=document.createElement('h2');title.id='agri-insight-heading';
 const takeaway=document.createElement('p');takeaway.className='agri-insight-takeaway';
 const photo=document.createElement('figure');photo.className='agri-insight-photo';photo.hidden=true;
 const sourceLinks=document.createElement('p');sourceLinks.className='agri-insight-sources';
 const lead=document.createElement('p'),targets=document.createElement('ul'),back=document.createElement('a'),error=document.createElement('p'),retry=document.createElement('button');
 const explanation=document.createElement('div');explanation.className='corn-story-explanation';
 const evidence=document.createElement('details'),evidenceSummary=document.createElement('summary');evidence.className='corn-story-evidence';evidenceSummary.textContent='地図の読み方・出典';
 evidence.append(evidenceSummary,targets,sourceLinks);
 targets.className='agri-insight-targets';back.className='agri-insight-back';error.setAttribute('role','status');error.className='agri-insight-error';retry.type='button';retry.textContent='強調を再読み込み';retry.hidden=true;
 note.append(back,title,takeaway,photo,explanation,lead,evidence,error,retry);
 let signature='',copySignature='',generation=0,raf=0,crops:any[]=[],selectedTargets:any[]=[],selectedAnimal:string|null=null,maskData:any=null,selectionError='';
 const firstURL=new URL(location.href),firstContext=readInsightContext(firstURL,config.base);
 let preset=firstContext?.insight&&!firstURL.searchParams.has('lng')?firstContext.insight:null;
 function targetKeys(){
  const s=cb.state(),ctx=(s.field==='natural'||s.field==='industry')?readInsightContext(new URL(location.href),config.base):null;
  if(s.field==='agriculture'&&s.product==='corn')return ['water:Mississippi'];
  if(ctx?.insight?.target.isohyets)return [...(ctx.insight.target.features??[]),...ctx.insight.target.isohyets.map(value=>'isohyet:'+value)];
  if(ctx?.insight?.target.features)return [...ctx.insight.target.features];
  if(s.field!=='natural'||(s.mode==='water'&&s.waterView!=='rivers'))return [];
  return s.feature?.startsWith(s.mode+':')?[s.feature]:[];
 }
 function selectedProduct(){
  const s=cb.state();
  if(s.field==='agriculture')return readInsightContext(new URL(location.href),config.base)?.insight?.target.page==='agriculture'?'corn':isProduct(s.product)?s.product:null;
  if(s.field==='natural'||s.field==='industry')return readInsightContext(new URL(location.href),config.base)?.product??null;
  return null;
 }
 function point(parent:Element,p:Point,label:string,r=7){
  if(p.x<0||p.y<0||p.x>frame.clientWidth||p.y>frame.clientHeight)return;
  const c=document.createElementNS(ns,'circle');c.setAttribute('cx',String(p.x));c.setAttribute('cy',String(p.y));c.setAttribute('r',String(r));parent.append(c);
  if(label){const t=document.createElementNS(ns,'text');t.setAttribute('x',String(p.x+11));t.setAttribute('y',String(p.y+4));t.textContent=label;parent.append(t);}
 }
 function paint(){
  raf=0;if(!root.isConnected)return;
  const s=cb.state(),product=selectedProduct(),ctx=readInsightContext(new URL(location.href),config.base),enabled=s.field==='agriculture'?(selectedAnimal?s.layers.has('livestock'):s.layers.has('crops')):true;
  svg.setAttribute('viewBox','0 0 '+frame.clientWidth+' '+frame.clientHeight);
  const live=cb.project(),project=live??((p:readonly number[])=>projectNatureFallback(p,cb.box()));
  const d=enabled?crops.map(f=>shape(f.geometry,project)).join(''):'';
  const cornRiver=s.field==='agriculture'&&product==='corn'&&ctx?.insight?.id!=='corn-hogs';
  svg.classList.toggle('is-corn-river',cornRiver);
  riverLabel.textContent='';
  if(cornRiver){
   const points:number[][]=[];
   for(const f of selectedTargets){if(f.geometry.type==='LineString')points.push(...f.geometry.coordinates);else if(f.geometry.type==='MultiLineString')for(const line of f.geometry.coordinates)points.push(...line);}
   const anchor=points.reduce<number[]|null>((best,p)=>!best||Math.hypot(p[0]+91.2,p[1]-33.5)<Math.hypot(best[0]+91.2,best[1]-33.5)?p:best,null);
   if(anchor){const p=project(anchor);if(p.x>0&&p.y>0&&p.x<frame.clientWidth-95&&p.y<frame.clientHeight){riverLabel.setAttribute('x',String(p.x+8));riverLabel.setAttribute('y',String(p.y-6));riverLabel.textContent='ミシシッピ川';}}
  }
  svg.classList.toggle('is-river-focus',ctx?.insight?.id==='grain-rivers');
  const rainFocus=Boolean(ctx?.insight?.target.isohyets);
  svg.classList.toggle('is-rain-focus',rainFocus);
  if(rainFocus&&ctx?.insight){
   const [west,south,east,north]=ctx.insight.bounds,a=project([west,north]),b=project([east,south]);
   clipRect.setAttribute('x',String(a.x));clipRect.setAttribute('y',String(a.y));clipRect.setAttribute('width',String(Math.max(0,b.x-a.x)));clipRect.setAttribute('height',String(Math.max(0,b.y-a.y)));
   targetHalo.setAttribute('clip-path','url(#agri-rain-focus-clip)');targetLine.setAttribute('clip-path','url(#agri-rain-focus-clip)');
  }else{targetHalo.removeAttribute('clip-path');targetLine.removeAttribute('clip-path');}
  cropHalo.setAttribute('d',d);cropLine.setAttribute('d',d);cropLine.classList.toggle('is-comparison',s.field!=='agriculture');
  const t=selectedTargets.map(f=>shape(f.geometry,project)).join('');targetHalo.setAttribute('d',t);targetLine.setAttribute('d',t);
  targetPoints.replaceChildren();for(const f of selectedTargets){if(f.geometry.type==='Point')point(targetPoints,project(f.geometry.coordinates),'');}
  if(ctx?.product==='corn'&&ctx.insight?.id==='grain-rivers')point(targetPoints,project([-90.1,29.95]),'ニューオーリンズ周辺の輸出港',5);
  animals.replaceChildren();
  if(enabled&&selectedAnimal&&(!live||s.field!=='agriculture'))for(const region of livestockRegions.filter(r=>r.kindId===selectedAnimal)){
   const kind=livestockKinds.find(k=>k.id===selectedAnimal)!;point(animals,project(region.anchor),kind.symbol+' '+region.label,7);
  }
  if(maskData&&s.field==='natural'&&s.mode==='climate'){
   const a=project(maskData.coordinates[0]),b=project(maskData.coordinates[2]);
   mask.setAttribute('href',maskData.url);mask.setAttribute('x',String(a.x));mask.setAttribute('y',String(a.y));mask.setAttribute('width',String(b.x-a.x));mask.setAttribute('height',String(b.y-a.y));mask.setAttribute('preserveAspectRatio','none');
  }else mask.removeAttribute('href');
  svg.style.display=d||t||selectedAnimal||maskData?'block':'none';
  legend.hidden=!product&&!selectionError;
  if(product)legend.textContent=(s.field==='agriculture'?productNames[product]+'を強調中'+(cornRiver?' · 青い線：ミシシッピ川':''):(selectedAnimal?'輪付き記号：':'破線：')+productNames[product]+'の分布／'+(ctx?.insight?.target.isohyets?'太い実線：比較地域の年降水量'+ctx.insight.target.isohyets.join('・')+'mm':ctx?.insight?.id==='grain-rivers'?'青い太線：ミシシッピ川・オハイオ川':'実線：確認する自然条件'))+(enabled?'':'（レイヤー非表示）')+(selectionError?' · '+selectionError:'');
  else legend.textContent=selectionError;
  if(ctx?.insight?.id==='corn-hogs')legend.textContent='輪郭：とうもろこし産地／強調した豚の記号：関連する養豚地域'+(selectionError?' · '+selectionError:'');
  if(ctx?.insight?.id==='corn-pivot-water')legend.textContent='破線：とうもろこし産地／実線：帯水層・年降水量500mm線'+(selectionError?' · '+selectionError:'');
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(paint);}
 async function loadSelection(key:string,product:string|null,keys:string[]){
  const g=++generation,s=cb.state();crops=[];selectedTargets=[];maskData=null;selectedAnimal=livestockKinds.some(k=>k.id===product)?product:null;selectionError='';schedule();
  const source=cb.features();let failures=0;
  const jobs:Promise<void>[]=[];
  if(product&&!selectedAnimal)jobs.push((async()=>{const all=source.crops.length?source.crops:(await loadAgricultureGeometry(config.assetBase)).features;const ids=product==='corn'||product==='soybean'?[product,'corn-soybean']:[product];if(g===generation)crops=all.filter((f:any)=>ids.includes(f.properties.id));})());
  for(const key of keys){
   const [kind,id]=key.split(':');
   if(kind==='isohyet')jobs.push(waterLoader.json('precipitation.geojson.gz').then(data=>{const found=data.features.filter((f:any)=>f.properties.kind==='isohyet'&&f.properties.value===Number(id));if(!found.length)throw new Error('Isohyet unavailable');if(g===generation)selectedTargets.push(...found);}));
   else if(kind==='climate')jobs.push(climateMask(config.natureAssetBase,id).then(m=>{if(g===generation)maskData=m;}));
   else jobs.push((async()=>{
    let pool:any[]=[];
    if(kind==='landform')pool=source.land.length?source.land:(await json(config.assetBase+'land.geojson')).features;
    else if(kind==='water'){
     if(id.includes('Aquifer'))pool=(await json(config.natureAssetBase+'aquifers.geojson')).features;
     else if(id==='shasta-lake'||id.startsWith('lake-'))pool=source.overlays.length?source.overlays:(await json(config.natureAssetBase+'overlays.geojson')).features;
     else pool=source.base.length?source.base:(await json(config.assetBase+'base.geojson')).features;
    }
    const found=pool.filter(f=>f.properties.name===id||f.properties.AQ_NAME===id||f.properties.id===id);
    if(!found.length)throw new Error('Highlight unavailable: '+key);
    if(g===generation)selectedTargets.push(...found);
   })());
  }
  await Promise.all(jobs.map(p=>p.catch(()=>{failures++;}).finally(()=>{if(g===generation)schedule();})));
  if(g!==generation||key!==signature)return;
  selectionError=failures?'一部の強調を表示できません':'';
  error.textContent=selectionError;retry.hidden=!failures;
  if(preset&&cb.map()&&readInsightContext(new URL(location.href),config.base)?.insight?.id===preset.id){const b=preset.bounds;preset=null;cb.fit(b);}
  schedule();
 }
 function sync(){
  const s=cb.state(),url=new URL(location.href),candidate=readInsightContext(url,config.base),ctx=(s.field==='natural'||s.field==='industry'||candidate?.insight?.target.page==='agriculture')?candidate:null;
  const story=ctx?.product==='corn'?cornStories.find(item=>item.id===ctx.insight?.id):undefined;
  root.dataset.cornStory=story?.id??'';
  root.toggleAttribute('data-corn-index',s.field==='agriculture'&&s.product==='corn'&&!ctx);
  const product=selectedProduct(),keys=targetKeys();
  root.dataset.selectedProduct=product??'';
  for(const link of root.querySelectorAll<HTMLAnchorElement>('[data-agri-insight-link]')){
   const p=link.dataset.agriLinkProduct;
   if(s.field==='agriculture'&&p===product&&isProduct(p)){const u=agricultureInsightUrl(url,config.base,p,link.dataset.agriInsightLink!);link.href=u.pathname+u.search;}
  }
  note.hidden=!ctx;
  if(ctx){
   const host=q('[data-field-national="'+s.field+'"]');if(note.parentElement!==host)host.prepend(note);
   back.href=ctx.back.pathname+ctx.back.search;back.textContent=story?'← トウモロコシの4項目に戻る':productNames[ctx.product]+'の解説に戻る';
   const copyKey=ctx.product+':'+(ctx.insight?.id??'explore');
   if(copyKey!==copySignature){
    copySignature=copyKey;title.textContent=productNames[ctx.product]+(ctx.insight?'から'+targetLabel(ctx.insight.target).replace(' › ','・')+'を確認中':'の分布を重ねて表示中');
    if(story)title.textContent=story.key;
    takeaway.textContent=ctx.insight?insightTakeaway(ctx.insight,ctx.product):'';takeaway.hidden=!takeaway.textContent;
    if(story){takeaway.textContent=story.summary;takeaway.hidden=false;}
    explanation.replaceChildren();explanation.hidden=!story;
    if(story){
     const section=cornReading.sections[story.section];
     if(section.body){const p=document.createElement('p');p.textContent=section.body;explanation.append(p);}
     for(const part of section.paragraphs??[]){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=part.label;p.append(strong,document.createTextNode(part.text));explanation.append(p);}
    }
    photo.replaceChildren();photo.hidden=ctx.insight?.photo!=='pivot';
    if(!photo.hidden){
     const image=document.createElement('img');image.src=config.base.replace(/atlas\/north-america\/$/,'assets/atlas/agriculture-insights/center-pivot-aerial-nasa.jpg');image.alt='上空から見たカンザス州の円形の畑。センターピボット式灌漑による散水範囲が円になっている';image.width=540;image.height=540;image.loading='lazy';image.decoding='async';
     const caption=document.createElement('figcaption'),credit=document.createElement('a');credit.href='https://science.nasa.gov/earth/earth-observatory/crop-circles-in-kansas-5772/';credit.textContent='衛星画像：NASA/GSFC/METI/ERSDAC/JAROS, and U.S./Japan ASTER Science Team（2001年6月24日）';
     const full=document.createElement('a');full.href='https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/5000/5772/kansas_AST_2001175_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=2481&w=2589';full.target='_blank';full.rel='noopener';full.setAttribute('aria-label','センターピボットの上空画像を拡大（新しいタブ）');full.append(image);
     caption.append('なぜ円形？ 中心の井戸を支点に長い散水管が回るため、水の届く範囲が円になります。カンザス州の例で、とうもろこし・小麦・ソルガムなどが栽培される地域です。タップで拡大。',document.createElement('br'),credit);photo.append(full,caption);
    }
    if(story?.id==='central-lowland'){
     photo.hidden=false;const image=document.createElement('img');image.src=config.base.replace(/atlas\/north-america\/$/,'assets/atlas/agriculture-insights/corn-harvest-usda.jpg');image.alt='ミズーリ州のトウモロコシ畑で収穫する大型コンバイン';image.width=640;image.height=426;image.loading='lazy';image.decoding='async';
     const caption=document.createElement('figcaption'),credit=document.createElement('a');credit.href='https://www.ars.usda.gov/oc/images/photos/k4912-11';credit.textContent='写真：USDA ARS / Bruce Fritz（ミズーリ州コロンビア、撮影年不詳）';caption.append('広い畑を大型コンバインで収穫する。',document.createElement('br'),credit);photo.append(image,caption);
    }
    const sources=story?productSources.corn.concat(ctx.insight?.sources??[]):ctx.insight?.sources??[];
    sourceLinks.replaceChildren();sourceLinks.hidden=!sources.length;
    for(const [label,url] of [...new Map(sources.map(source=>[source[1],source])).values()]){const a=document.createElement('a');a.href=url;a.textContent=label;sourceLinks.append(a,' ');}
    lead.textContent=ctx.insight?insightLead(ctx.insight,ctx.product):'別の自然条件・産業地域も選べます。元の品目の説明と統計へは、下のリンクで戻れます。';
    if(story){evidence.insertBefore(lead,targets);evidence.open=false;}else{note.insertBefore(lead,evidence);evidence.open=true;}
    targets.replaceChildren();
    for(const value of ctx.insight?.target.isohyets??[]){const li=document.createElement('li');li.textContent='年降水量 '+value.toLocaleString('ja-JP')+'mm線（PRISM・1991–2020年）';targets.append(li);}
    for(const id of ctx.insight?.target.features??[]){const li=document.createElement('li');const copy=config.natureFeatureCopy[id];li.textContent=copy?.title??(id==='climate:Cfa'?'Cfa・温暖湿潤気候':id==='climate:BSk'?'BSk・ステップ気候（低温）':id.split(':')[1]);targets.append(li);}
   }
  }else copySignature='';
  const next=JSON.stringify([s.field,s.mode,s.waterView,product,keys,s.ready,s.failed]);
  if(signature!==next){signature=next;void loadSelection(next,product,keys);}
  schedule();
 }
 retry.addEventListener('click',()=>{signature='';sync();});
 root.querySelector<HTMLButtonElement>('[data-retry-nature]')?.addEventListener('click',()=>{signature='';sync();});
 q<HTMLImageElement>('[data-fallback-image]').addEventListener('load',schedule);
 new ResizeObserver(schedule).observe(frame);
 window.addEventListener('pageshow',sync);
 return {sync,schedule,prepareNavigation:(url:URL)=>{const ctx=readInsightContext(url,config.base);preset=ctx?.insight&&!url.searchParams.has('lng')?ctx.insight:null;}};
}
