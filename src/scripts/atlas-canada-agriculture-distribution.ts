import {combineCanadaAgricultureSources} from '../lib/atlas-canada-agriculture-supplement';
import {projectCanadaMap} from '../lib/atlas-canada-map-presentation';
import {canadaCensusRings,type CanadaCensusGeometry,type CanadaCensusCell} from '../lib/atlas-canada-census-map';
import {canadaAgricultureProducts as products,type CanadaAgricultureIndicatorId} from '../lib/atlas-canada-agriculture-products';
import {canadaAgricultureBeltPath,canadaAgricultureProductLayer,canadaAgricultureSouthCamera,canadaAgricultureVisibleBelts,type CanadaAgricultureLayer} from '../lib/atlas-canada-agriculture-belts';

/** Editorial production belts and untouched source statistics have separate purposes. */
export async function initCanadaAgricultureDistribution(root:HTMLElement){
 if(root.dataset.initialized)return;root.dataset.initialized='true';
 try{
 const began=performance.now(),config=JSON.parse(root.querySelector('[data-canada-agri-overview-config]')!.textContent!);
 const [census,geometry,supplement]=await Promise.all([config.dataUrl,config.geometryUrl,config.supplementUrl].map(async(url:string)=>{const response=await fetch(url);if(!response.ok)throw new Error('Canada agriculture data '+response.status);return response.json();}));
 const dataset=combineCanadaAgricultureSources(census,supplement),model={...config,dataset,geometry};
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>('#canada-agri-'+id)!;
 const {anchors,ids,provinceNames}=model,canvas=$<HTMLCanvasElement>('map'),frame=$('map-frame'),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Canvas2D is unavailable');
 const colors=Object.fromEntries(ids.map((id:CanadaAgricultureIndicatorId)=>[id,products[id].color]));
 const names=Object.fromEntries(ids.map((id:CanadaAgricultureIndicatorId)=>[id,id==='chicken'?'養鶏（肉・卵）':products[id].name]));
 const ccsIds=ids.filter((id:string)=>dataset.products[id].resolution==='ccs'),provinceOnlyIds=ids.filter((id:string)=>dataset.products[id].resolution==='province');
 const allIds=Object.keys(dataset.records).sort((a,b)=>dataset.records[a].provinceCode.localeCompare(dataset.records[b].provinceCode)||dataset.records[a].name.localeCompare(dataset.records[b].name));
 const esc=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
 const fmt=(v:number)=>v.toLocaleString('ja-JP'),project=projectCanadaMap;
 function pathOf(g:CanadaCensusGeometry){return new Path2D(canadaCensusRings(g).map(r=>r.map((p,i)=>(i?'L':'M')+project(p).join(',')).join('')+'Z').join(''));}
 const contextPaths=model.context.features.map((f:any)=>pathOf(f.geometry));
 const canadaPath=pathOf(model.context.features.find((f:any)=>f.properties.code==='CAN').geometry);
 const features=geometry.features.map((f:any)=>({id:String(f.properties.DGUID),geometry:f.geometry,path:pathOf(f.geometry),point:project(anchors[String(f.properties.DGUID)].point)}));
 const featureById=new Map<string,any>(features.map((f:any)=>[f.id,f]));
 let southCamera=canadaAgricultureSouthCamera(),size={width:0,height:0,dpr:1,scale:1},raf=0,lastStats:any={},pageIndex=0,filter='';
 function readState(){
  const q=new URL(location.href).searchParams,metric=q.get('agriFocus'),ccs=q.get('agriCcs'),parts=(q.get('agriCamera')??'').split(','),c=parts.map(Number);
  const layers:CanadaAgricultureLayer[]=q.get('agriLayers')==='none'?[]:q.get('agriLayers')==='crop'?['crop']:q.get('agriLayers')==='livestock'?['livestock']:['crop','livestock'];
  return {metric:ids.includes(metric)&&layers.includes(canadaAgricultureProductLayer(metric as CanadaAgricultureIndicatorId))?metric:null,ccs:featureById.has(ccs??'')?ccs:null,layers,camera:parts.length===3&&parts.every(p=>p.trim()!=='')&&c.every(Number.isFinite)&&c[0]>=-300&&c[0]<=1200&&c[1]>=-2000&&c[1]<=2000&&c[2]>=.2&&c[2]<=40?c:southCamera.slice()};
 }
 let state=readState();if(new URL(location.href).searchParams.has('agriFocus')&&!state.metric){const normalized=new URL(location.href);normalized.searchParams.delete('agriFocus');history.replaceState(null,'',normalized);}
 function persist(replace=false){
  const u=new URL(location.href);u.searchParams.set('item','overview');for(const key of ['agriFocus','agriCcs','agriCamera','agriLayers'])u.searchParams.delete(key);
  if(state.metric)u.searchParams.set('agriFocus',state.metric);if(state.ccs)u.searchParams.set('agriCcs',state.ccs);
  if(state.layers.length!==2)u.searchParams.set('agriLayers',state.layers.length?state.layers[0]:'none');
  if(state.camera.some((v,i)=>Math.abs(v-southCamera[i])>1e-5))u.searchParams.set('agriCamera',state.camera.map(v=>Number(v.toFixed(4))).join(','));
  if(u.href!==location.href)history[replace?'replaceState':'pushState']({},'',u);
 }
 function screen(p:readonly number[]):[number,number]{return [size.width/2+(p[0]-state.camera[0])*size.scale*state.camera[2],size.height/2+(p[1]-state.camera[1])*size.scale*state.camera[2]];}
 function world(p:readonly number[]):[number,number]{return [state.camera[0]+(p[0]-size.width/2)/(size.scale*state.camera[2]),state.camera[1]+(p[1]-size.height/2)/(size.scale*state.camera[2])];}
 const opacity=(id:CanadaAgricultureIndicatorId)=>!state.layers.includes(canadaAgricultureProductLayer(id))?0:state.metric&&state.metric!==id?.45:1;
 const beltItems=config.belts.belts.map((belt:any)=>{
  const element=document.createElement('button');element.type='button';element.className='map-crop-label';element.textContent=belt.label;element.style.setProperty('--belt-color',colors[belt.product]);
  element.setAttribute('aria-label',belt.name+'の説明を読む');element.title=belt.name;element.addEventListener('click',()=>selectMetric(belt.product));$('crop-labels').append(element);
  return {...belt,element,path:new Path2D(canadaAgricultureBeltPath(belt.outline)),point:project(belt.labelAnchor)};
 });
 const overlaps=(a:number[],b:number[])=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
 function placeLabels(visible:any[]){
  const boxes:number[][]=[],placements:any[]=[],first=new Set<string>();
  const ordered=[...visible];
  const representatives=ordered.filter(belt=>{if(first.has(belt.product))return false;first.add(belt.product);return true;});
  for(const item of beltItems)item.element.hidden=true;
  const chosen=[...representatives];for(const item of ordered.filter(belt=>!representatives.includes(belt))){if(chosen.filter(b=>b.product===item.product).length<2&&chosen.filter(b=>b.product===item.product).every(b=>Math.hypot(screen(b.point)[0]-screen(item.point)[0],screen(b.point)[1]-screen(item.point)[1])>200))chosen.push(item);}
  for(const item of chosen){
   const p=screen(item.point),el=item.element;if(p[0]<4||p[0]>size.width-4||p[1]<4||p[1]>size.height-4)continue;
   el.hidden=false;el.setAttribute('aria-pressed',String(item.product===state.metric));el.style.opacity=String(opacity(item.product));
   const w=el.offsetWidth,h=el.offsetHeight;
   const offsets=[[0,0],[0,-h-4],[0,h+4],[-w*.55,-h*.55],[w*.55,h*.55],[-w*.55,h*.55],[w*.55,-h*.55],[0,-2*h-7],[0,2*h+7],[0,-3*h-10],[0,3*h+10],[-w,0],[w,0]];
   const found=offsets.map(([dx,dy])=>[Math.max(5,Math.min(size.width-w-5,p[0]+dx-w/2)),Math.max(5,Math.min(size.height-h-32,p[1]+dy-h/2))]).find(([x,y])=>!boxes.some(b=>overlaps([x-3,y-2,x+w+3,y+h+2],b)));
   if(!found){el.hidden=true;continue;}const [x,y]=found;el.style.left=x+'px';el.style.top=y+'px';boxes.push([x,y,x+w,y+h]);placements.push({id:item.id,product:item.product,box:[x,y,x+w,y+h],point:p});
  }
  return placements;
 }
 function placeReferenceLabels(productLabels:any[]){
  ctx!.font='500 13px sans-serif';ctx!.textAlign='center';
  const occupied=productLabels.map(p=>p.box),references:any[]=[];
  for(const [name,coord]of [['プレーリー',[-107,56.6]],['オンタリオ南部',[-81.8,41.7]]] as [string,number[]][]){
   const point=screen(project(coord));if(point[0]<0||point[0]>size.width||point[1]<0||point[1]>size.height)continue;
   const metrics=ctx!.measureText?.(name),w=metrics?.width??name.length*13,left=metrics?.actualBoundingBoxLeft??w/2,right=metrics?.actualBoundingBoxRight??w/2,ascent=metrics?.actualBoundingBoxAscent??12,descent=metrics?.actualBoundingBoxDescent??3;
   const candidates=[];for(const dy of [0,-28,28,-56,56])for(const dx of [0,-90,90,-150,150])candidates.push([point[0]+dx,point[1]+dy]);
   const placed=candidates.map(([x,y])=>({x,y,box:[x-left-3,y-ascent-3,x+right+3,y+descent+3]})).find(p=>p.box[0]>=5&&p.box[2]<=size.width-5&&p.box[1]>=5&&p.box[3]<=size.height-35&&!occupied.some((b:number[])=>overlaps([p.box[0]-5,p.box[1]-5,p.box[2]+5,p.box[3]+5],b)));
   if(!placed)continue;occupied.push(placed.box);references.push({name,point,box:placed.box,x:placed.x,y:placed.y});
  }
  return references;
 }
 function draw(){
  const started=performance.now(),{width:w,height:h,dpr,scale}=size;ctx!.setTransform(dpr,0,0,dpr,0,0);ctx!.clearRect(0,0,w,h);ctx!.fillStyle='#e4eff0';ctx!.fillRect(0,0,w,h);
  ctx!.save();ctx!.translate(w/2,h/2);ctx!.scale(scale*state.camera[2],scale*state.camera[2]);ctx!.translate(-state.camera[0],-state.camera[1]);
  ctx!.fillStyle='#efeee5';ctx!.strokeStyle='#94aaaa';ctx!.lineWidth=.65/(scale*state.camera[2]);for(const path of contextPaths){ctx!.fill(path,'evenodd');ctx!.stroke(path);}
  const visibleIds=new Set(canadaAgricultureVisibleBelts(state.metric,state.layers).map(belt=>belt.id)),visible=beltItems.filter((belt:any)=>visibleIds.has(belt.id));
  ctx!.save();ctx!.clip(canadaPath,'evenodd');
  const ordered=[...visible].sort((a,b)=>Number(a.product===state.metric)-Number(b.product===state.metric));
  for(const belt of ordered){
   const livestock=canadaAgricultureProductLayer(belt.product)==='livestock',selected=belt.product===state.metric;
   ctx!.fillStyle=colors[belt.product];ctx!.globalAlpha=(selected?.24:livestock?.025:.09)*opacity(belt.product);ctx!.fill(belt.path,'evenodd');
   ctx!.globalAlpha=selected?1:state.metric?.58:.85;ctx!.strokeStyle=colors[belt.product];ctx!.lineWidth=(selected?2.7:livestock?1.6:1)/(scale*state.camera[2]);ctx!.setLineDash(livestock?[5/(scale*state.camera[2]),3/(scale*state.camera[2])]:[]);ctx!.stroke(belt.path);
  }
  ctx!.restore();ctx!.globalAlpha=1;ctx!.setLineDash([]);
  if(state.ccs){const feature=featureById.get(state.ccs);ctx!.strokeStyle='#fffef5';ctx!.lineWidth=4/(scale*state.camera[2]);ctx!.stroke(feature.path);ctx!.strokeStyle='#183e58';ctx!.lineWidth=1.8/(scale*state.camera[2]);ctx!.stroke(feature.path);}
  ctx!.restore();const placements=placeLabels(visible);
  for(const placement of placements){const [x,y]=placement.point,box=placement.box;ctx!.strokeStyle=colors[placement.product];ctx!.lineWidth=.8;ctx!.globalAlpha=.8;ctx!.beginPath();ctx!.moveTo(x,y);ctx!.lineTo(Math.max(box[0],Math.min(box[2],x)),Math.max(box[1],Math.min(box[3],y)));ctx!.stroke();}
  ctx!.globalAlpha=1;const referenceLabels=placeReferenceLabels(placements);ctx!.fillStyle='#4d6264';for(const label of referenceLabels)ctx!.fillText(label.name,label.x,label.y);
  $('display-meaning').textContent='色面＝作物、破線＝畜産の主要生産帯（2021年の公式分布を汎化）。色の濃さや帯の面積は数量を表しません。養鶏は肉用・採卵用を含みます。';
  canvas.setAttribute('aria-label',state.metric?names[state.metric]+'を強調し、他の生産帯を保持した地図':'作物と畜産の特徴的な生産帯を重ねた地図');
  lastStats={granularity:'editorial-production-belts',productionBelts:visible.map((belt:any)=>({id:belt.id,product:belt.product,sourceIds:belt.sourceIds})),labels:placements,referenceLabels,visibleLayers:state.layers.slice(),visibleSymbols:0,coloredCcs:0,specialtyDots:0,livestockBadges:0,retainedCcs:features.length,retainedValues:features.length*ids.length,sourceCcsCells:features.length*ccsIds.length,provinceOnlyMetrics:provinceOnlyIds.slice(),metrics:ids.slice(),opacities:Object.fromEntries(ids.map((id:CanadaAgricultureIndicatorId)=>[id,opacity(id)])),selected:state.ccs,view:'south-or-detail',drawMs:performance.now()-started,backingStore:{width:canvas.width,height:canvas.height,dpr}};
  canvas.dataset.ready='true';root.querySelector<HTMLElement>('[data-overview-fallback]')!.hidden=true;
 }
 function schedule(){if(size.width>0&&!raf)raf=requestAnimationFrame(()=>{raf=0;draw();});}
 function resize(){
  const b=frame.getBoundingClientRect();if(b.width<2||b.height<2)return;
  const defaultView=state.camera.every((v,i)=>Math.abs(v-southCamera[i])<1e-5),dpr=Math.min(2,devicePixelRatio||1);
  size={width:b.width-2,height:b.height-2,dpr,scale:Math.min((b.width-2)/900,(b.height-2)/580)};
  southCamera=canadaAgricultureSouthCamera(size.width,size.height);if(defaultView)state.camera=southCamera.slice();
  canvas.width=Math.round(size.width*dpr);canvas.height=Math.round(size.height*dpr);schedule();
 }
function valueText(cell: CanadaCensusCell, unit: string) {
  if (cell.status === "not-covered") return "対象外・未収録";
  if (cell.status === "quality-f") return "非公表 F";
  return fmt(cell.value) + " " + (cell.unit??unit);
}
function qualityText(cell: CanadaCensusCell) {
  if (cell.status === "not-covered") return "ゼロではありません";
  if (cell.quality) return "品質 " + cell.quality + (cell.quality === "E" ? "・注意して利用" : "");
  if(cell.qualityNote)return cell.qualityNote;
  const grades = cell.components.map((c) => c.quality ?? "未収録");
  return "成分の品質 " + grades.join("・") + (grades.includes("E") ? "・注意して利用" : "");
}
const nationalReading=$('distribution-overview').innerHTML,nationalTitle=$('reading-title').textContent,nationalIntro=$('reading-intro').textContent;
function renderReading() {
  const profile=state.metric?config.readings.products[state.metric]:null;
  $('reading-eyebrow').textContent=state.metric?(dataset.products[state.metric].referenceLabel??'2021年・農業センサス'):'主要品目の産地と用途';
  $('reading-title').textContent=profile?state.metric==='chicken'?'養鶏の集積と鶏肉生産者':profile.label:nationalTitle;
  if(profile){
    const references=profile.sourceIds.map((id,index)=>({id,index:index+1,...config.readings.sources[id]}));
    const links=ids=>ids.map(id=>{const source=references.find(s=>s.id===id);return '<a href="'+esc(source.url)+'" title="'+esc(source.title)+'">資料'+source.index+'</a>';}).join('・');
    const paragraphs=profile.paragraphs.map((paragraph,index)=>'<section class="distribution-section"><h3>'+esc(profile.headings[index])+'</h3><p>'+esc(paragraph)+'<span class="reading-source-links">'+links(profile.paragraphSourceIds[index])+'</span></p></section>').join('');
    const focus='<div class="reading-actions">'+(profile.focusCcs??[]).map(place=>'<button data-agri-ccs-focus="'+place.id+'">'+esc(place.label)+'の地域値</button>').join('')+'</div>';
    const related='<div class="reading-actions">'+profile.relatedProducts.map(id=>'<button data-agri-reading-product="'+id+'">'+esc(names[id])+'を読む</button>').join('')+'</div>';
    const legacy=profile.legacy?'<p><a '+(profile.legacy==='canola'?'data-canola-select-item="canola" ':'')+'href="'+esc(config.legacyUrls[profile.legacy])+'">原図・年次比較と詳しい解説</a></p>':'';
    const geographyNote=state.metric==='chicken'?'<p class="source-note">地図は肉用・採卵用を合わせた養鶏の2021年集積です。鶏肉生産者数・鶏肉の現金収入は下の別指標で確認します。<a href="'+esc(config.belts.sources.chicken.url)+'">2021年の公式養鶏分布図</a></p>':'';
    $('distribution-overview').innerHTML=geographyNote+'<p class="key-sentence"><strong>'+esc(profile.keySentence)+'</strong></p>'+focus+paragraphs+related+legacy+'<details><summary>出典・年・単位</summary><p>'+esc(profile.metricNote)+'</p>'+references.map(source=>'<p><a href="'+esc(source.url)+'">資料'+source.index+'：'+esc(source.title)+'</a></p>').join('')+'</details>';
    $('reading-intro').textContent=state.metric==='chicken'?'地図：2021年の肉用・採卵用の養鶏。統計：'+profile.metricNote:profile.metricNote;
  }else{
    $('distribution-overview').innerHTML=nationalReading;
    $('reading-intro').textContent=nationalIntro;
  }
  const selectedRecord=state.ccs?dataset.records[state.ccs]:null,selection=$('selection-reading');selection.hidden=!selectedRecord;
  if(selectedRecord){selection.innerHTML='<strong>選択CCS：'+esc(selectedRecord.name)+'</strong><br>'+esc(provinceNames[selectedRecord.provinceCode])+'／農場本拠地域の申告値。<a href="#canada-agri-statistics">下の指標・品質を見る</a>';$<HTMLDetailsElement>('statistics-detail').open=true;}

  const record = state.ccs ? dataset.records[state.ccs] : null, cells = record?.cells ?? Object.fromEntries(ids.map((id) => [id, dataset.products[id].national]));
  $<HTMLSelectElement>("region").value = state.ccs ?? "";
  $("table-caption").textContent = record ? "CCS " + record.uid + "／地域別申告値" : "全国の公表値（各指標の年・対象範囲は定義欄）";
  $("values").innerHTML = ids.map((id) => '<tr data-value="' + id + '"><th scope="row"><span class="metric-name"><i class="shape ' + products[id].shape + '" style="--color:' + colors[id] + '" aria-hidden="true"></i>' + esc(id==='beef'?'肉用母牛':id==='dairy'?'乳牛':id==='chicken'?'鶏肉生産者':names[id]) + "</span></th><td>" + esc(valueText(cells[id], dataset.products[id].unit)) + "<small>" + esc(qualityText(cells[id])) + "</small></td></tr>").join("");
  $("quality-note").textContent = record ? "公表0・非公表F・対象外/未収録を区別しています。合算指標は成分の品質を保持し、合算値に新たな品質等級を付けません。" : "全国値は原表の公表値です。地域値を足して全国値に置き換えません。";
  $("components").innerHTML = ids.map((id) => "<h3>" + esc(names[id]) + "</h3>" + cells[id].components.map((c) => '<p class="component">' + esc(c.variable) + "：" + (c.value === null ? c.quality==='F'?"非公表 F":"未収録" : fmt(c.value) + " " + dataset.products[id].unit) + "／品質 " + esc(c.quality ?? "未収録") + "</p>").join("")).join("");
  for (const button of root.querySelectorAll("[data-metric]")) button.setAttribute("aria-pressed", String((button.dataset.metric || null) === state.metric));
  const focused = state.metric ? names[state.metric] + "の公表値を表示" : "作物と畜産の特徴的な生産帯を表示";
  $("map-status").textContent = focused + "。1,757 CCSを保持。" + (record ? record.name + "を選択中。" : "地域未選択。") + "";
}
function renderList() {
  const matches = allIds.filter((id) => !filter || (dataset.records[id].name + " " + dataset.records[id].uid + " " + provinceNames[dataset.records[id].provinceCode]).toLowerCase().includes(filter));
  pageIndex = Math.max(0, Math.min(pageIndex, Math.max(0, Math.ceil(matches.length / 12) - 1)));
  const visible = matches.slice(pageIndex * 12, pageIndex * 12 + 12);
  $("rows").innerHTML = visible.map((id) => {
    const r = dataset.records[id];
    return "<tr" + (state.ccs === id ? ' style="background:#e5ede5"' : "") + '><td><button data-list-ccs="' + id + '">' + esc(r.name) + "</button><br>" + esc(provinceNames[r.provinceCode]) + " \xB7 " + esc(r.uid) + "</td>" + ids.filter(p=>dataset.products[p].resolution==='ccs').map((p) => "<td>" + esc(r.cells[p].status === "published" ? fmt(r.cells[p].value) : r.cells[p].status === "quality-f" ? "非公表 F" : "未収録") + "</td>").join("") + "</tr>";
  }).join("");
  $("page-status").textContent = (visible.length ? pageIndex * 12 + 1 : 0) + "–" + (pageIndex * 12 + visible.length) + " / " + matches.length + "地域（全1,757）";
  $<HTMLButtonElement>("previous").disabled = pageIndex === 0;
  $<HTMLButtonElement>("next").disabled = (pageIndex + 1) * 12 >= matches.length;
}
function update(patch:any,{replace=false,cameraOnly=false}={}){
 state={...state,...patch};if(state.metric&&!state.layers.includes(canadaAgricultureProductLayer(state.metric as CanadaAgricultureIndicatorId)))state.metric=null;persist(replace);if(!cameraOnly){renderReading();renderList();for(const input of root.querySelectorAll<HTMLInputElement>('[data-agri-layer]'))input.checked=state.layers.includes(input.dataset.agriLayer as CanadaAgricultureLayer);}schedule();
}
function selectMetric(metric:string|null){
 const layer=metric?canadaAgricultureProductLayer(metric as CanadaAgricultureIndicatorId):null;
 update({metric,layers:layer&&!state.layers.includes(layer)?[...state.layers,layer]:state.layers});
}
function camera(x:number,y:number,z:number){update({camera:[Math.max(-300,Math.min(1200,x)),Math.max(-2000,Math.min(2000,y)),Math.max(.2,Math.min(40,z))]},{replace:true,cameraOnly:true});}
function zoom(factor:number,point=[size.width/2,size.height/2]){const before=world(point),z=Math.max(.2,Math.min(40,state.camera[2]*factor));camera(before[0]-(point[0]-size.width/2)/(size.scale*z),before[1]-(point[1]-size.height/2)/(size.scale*z),z);}

for(const [code,name] of Object.entries(provinceNames)){
 const group=document.createElement('optgroup');group.label=String(name);
 for(const id of allIds.filter(id=>dataset.records[id].provinceCode===code)){
  const option=document.createElement('option');option.value=id;option.textContent=dataset.records[id].name+'（'+dataset.records[id].uid+'）';group.append(option);
 }
 $('region').append(group);
}
$('scales').innerHTML=ids.map(id=>{
 const count=model.counts[id];
 if(dataset.products[id].resolution==='province')return '<p class="scale-row"><strong>'+esc(names[id])+'</strong>：州別公表 '+dataset.provinces.filter(province=>province.cells[id].status==='published').length+'州。CCS値は未収録です。</p>';
 return '<p class="scale-row"><strong>'+esc(names[id])+'</strong>：CCSの公表 '+fmt(count.published)+'・F '+fmt(count['quality-f'])+'・未収録 '+count['not-covered']+'地域</p>';
}).join('');
$('definitions').innerHTML=ids.map(id=>{
 const product=dataset.products[id];
 return '<section><h3>'+esc(product.label)+'</h3><p class="definition">'+esc(product.definition)+' '+esc(product.notes)+'</p><p class="source-note">'+esc(product.referenceLabel)+'／統計：'+esc(product.unitLabel)+'</p><p class="source-note"><a href="'+esc(product.sourceTableUrl)+'">'+esc(product.sourceName)+' '+esc(product.sourceTableId)+' 原表</a></p></section>';
}).join('');
$('sources').innerHTML='<p class="source-note">'+esc(dataset.source.geographicMeaning)+' '+esc(dataset.source.randomTabularAdjustment)+' '+esc(dataset.source.nationalCoverage)+'</p><p class="source-note">補助統計の境界は2021年の公式CCS。原資料で5km一般化された1,757地域をDGUIDで結合しています。生産帯とは別の地域単位で、帯の量に再集計しません。</p><p class="source-note"><a href="'+esc(dataset.source.geographicRuleUrl)+'">地域集計の定義</a> ／ <a href="'+esc(dataset.source.qualityUrl)+'">品質等級</a> ／ <a href="'+esc(dataset.geometry.sourceUrl)+'">境界の出典</a></p><p class="source-note" lang="en">'+esc(dataset.attribution)+' '+esc(dataset.geometry.attribution)+'</p><p class="source-note">豚・鶏の統計出典：'+esc(dataset.supplement.source)+'。各指標の年・定義・公表精度を保持し、州値をCCSへ配分しません。<a href="'+esc(dataset.supplement.licence.url)+'">利用条件</a></p><p class="source-note"><a href="'+esc(dataset.licence.url)+'">Statistics Canada Open Licence</a> ／ <a href="'+esc(dataset.geometry.licence.url)+'">Open Government Licence – Canada</a></p>';
$('page-source').innerHTML='出典：<a href="'+esc(dataset.source.url)+'">Statistics Canada, Census of Agriculture, 2021</a>。統計参照日 '+esc(dataset.source.referenceDate)+'、公表日 '+esc(dataset.source.releasedAt)+'、取得日 '+esc(dataset.source.accessedAt)+'。豚の3州の全国比（2025年版）・鶏肉の州別生産者数（2021年）は独立AAFC資料。生産帯は2021年の品目別公式分布を汎化しています。';

root.querySelectorAll<HTMLElement>('[data-metric]').forEach(button=>button.addEventListener('click',()=>selectMetric(button.dataset.metric||null)));
for(const input of root.querySelectorAll<HTMLInputElement>('[data-agri-layer]'))input.addEventListener('change',()=>{const layers=[...root.querySelectorAll<HTMLInputElement>('[data-agri-layer]')].filter(input=>input.checked).map(input=>input.dataset.agriLayer as CanadaAgricultureLayer);update({layers});});
root.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target.closest('[data-agri-reading-product],[data-agri-ccs-focus]'):null;if(!target)return;
 if(target.hasAttribute('data-agri-reading-product')){selectMetric(target.getAttribute('data-agri-reading-product'));return;}
 const ccs=target.getAttribute('data-agri-ccs-focus');if(ccs&&featureById.has(ccs))update({ccs});
});
$('region').addEventListener('change',event=>update({ccs:(event.target as HTMLSelectElement).value||null}));
$('clear-region').addEventListener('click',()=>update({ccs:null}));
$('rows').addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest<HTMLElement>('[data-list-ccs]'):null;if(button)update({ccs:button.dataset.listCcs});});
$('search').addEventListener('input',event=>{filter=(event.target as HTMLInputElement).value.trim().toLowerCase();pageIndex=0;renderList();});
$('previous').addEventListener('click',()=>{pageIndex--;renderList();});$('next').addEventListener('click',()=>{pageIndex++;renderList();});
let drag:{pointer:number;x:number;y:number;camera:number[];moved:boolean}|null=null;
canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,camera:state.camera.slice(),moved:false};});
canvas.addEventListener('pointermove',event=>{if(!drag||drag.pointer!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>3)drag.moved=true;if(drag.moved)camera(drag.camera[0]-dx/(size.scale*drag.camera[2]),drag.camera[1]-dy/(size.scale*drag.camera[2]),drag.camera[2]);});
canvas.addEventListener('pointerup',event=>{if(!drag||drag.pointer!==event.pointerId)return;const clicked=!drag.moved;drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(!clicked)return;const box=canvas.getBoundingClientRect(),point=world([event.clientX-box.left,event.clientY-box.top]);const visible=new Set(canadaAgricultureVisibleBelts(state.metric,state.layers).map(b=>b.id));ctx!.save();ctx!.setTransform(1,0,0,1,0,0);const hitOrder=beltItems.filter(b=>visible.has(b.id)).sort((a,b)=>Number(a.product===state.metric)-Number(b.product===state.metric)).reverse();const belt=hitOrder.find(b=>ctx!.isPointInPath(b.path,point[0],point[1],'evenodd'));ctx!.restore();if(belt)selectMetric(belt.product);});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
canvas.addEventListener('wheel',event=>{event.preventDefault();const box=canvas.getBoundingClientRect();zoom(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*4e-3),[event.clientX-box.left,event.clientY-box.top]);},{passive:false});
canvas.addEventListener('focus',()=>$('map-focus').hidden=false);canvas.addEventListener('blur',()=>$('map-focus').hidden=true);
canvas.addEventListener('keydown',event=>{const pan=({ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]} as Record<string,number[]>)[event.key];if(pan){event.preventDefault();camera(state.camera[0]+pan[0]*30/(size.scale*state.camera[2]),state.camera[1]+pan[1]*30/(size.scale*state.camera[2]),state.camera[2]);}else if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(event.key==='-'?1/1.5:1.5);}else if(event.key==='Escape'){event.preventDefault();update({metric:null,ccs:null});}});
window.addEventListener('popstate',()=>{state=readState();renderReading();renderList();for(const input of root.querySelectorAll<HTMLInputElement>('[data-agri-layer]'))input.checked=state.layers.includes(input.dataset.agriLayer as CanadaAgricultureLayer);schedule();});
new ResizeObserver(resize).observe(frame);renderReading();renderList();resize();for(const input of root.querySelectorAll<HTMLInputElement>('[data-agri-layer]'))input.checked=state.layers.includes(input.dataset.agriLayer as CanadaAgricultureLayer);
(root as any).canadaAgriculture={evidence:model.evidence,counts:model.counts,getState:()=>structuredClone(state),getRenderStats:()=>structuredClone(lastStats),getCcsScreenPoint:(id:string)=>screen(featureById.get(id).point),getDisplayTargets:()=>[],getWholeCamera:()=>southCamera.slice(),summaries:model.summaries,getCell:(ccs:string,id:string)=>structuredClone(dataset.records[ccs].cells[id]),initializationMs:performance.now()-began};
 }catch(error){root.querySelector('[data-overview-fallback]')?.removeAttribute('hidden');const status=root.querySelector('#canada-agri-map-status');if(status)status.textContent='操作地図を読み込めませんでした。生産帯の案内図と全国値、品目別の原図は表示しています。';root.dataset.loadError=String(error);}
}
