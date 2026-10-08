import {combineCanadaAgricultureSources} from '../lib/atlas-canada-agriculture-supplement';
import {projectCanadaMap} from '../lib/atlas-canada-map-presentation';
import {canadaCensusRings,type CanadaCensusGeometry,type CanadaCensusCell} from '../lib/atlas-canada-census-map';
import {canadaAgricultureProducts as products,canadaAgricultureSymbolOffset,type CanadaAgricultureIndicatorId} from '../lib/atlas-canada-agriculture-products';

/** The broad view uses official province values; detail retains every source CCS cell. */
export async function initCanadaAgricultureDistribution(root:HTMLElement){
 if(root.dataset.initialized)return;root.dataset.initialized='true';
 try{
const began = performance.now();
const config=JSON.parse(root.querySelector('[data-canada-agri-overview-config]')!.textContent!);
const [census,geometry,supplement]=await Promise.all([config.dataUrl,config.geometryUrl,config.supplementUrl].map(async url=>{const response=await fetch(url);if(!response.ok)throw new Error('Canada agriculture data '+response.status);return response.json();}));
const dataset=combineCanadaAgricultureSources(census,supplement);
const model={...config,dataset,geometry};
const $=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>('#canada-agri-'+id)!;
const { anchors, ids, provinceNames } = model, canvas = $<HTMLCanvasElement>("map"), frame = $("map-frame");
const context2d=canvas.getContext("2d");if(!context2d)throw new Error("Canvas2D is unavailable");const ctx=context2d;
const colors = Object.fromEntries(ids.map(id=>[id,products[id].color]));
const names = Object.fromEntries(ids.map(id=>[id,products[id].name]));
const ccsIds=ids.filter(id=>dataset.products[id].resolution==='ccs'),provinceOnlyIds=ids.filter(id=>dataset.products[id].resolution==='province');
const fieldCropIds=['canola','wheat','soybeans','corn','lentils','potatoes'];
const ccsMax=Object.fromEntries(ccsIds.map(id=>[id,Math.max(...Object.values(dataset.records).map((record:any)=>record.cells[id].value??0))]));
const symbolRows=Math.ceil(ids.length/(ids.length<=5?ids.length:4));
const markerHalfWidth=ids.length<=5?(ids.length-1)*5.5+6:22;
const markerHalfHeight=(symbolRows-1)*5.5+6;
const abbreviations = { 10: "NL", 11: "PE", 12: "NS", 13: "NB", 24: "QC", 35: "ON", 46: "MB", 47: "SK", 48: "AB", 59: "BC", 60: "YT", 61: "NT", 62: "NU" };
const allIds = Object.keys(dataset.records).sort((a, b) => dataset.records[a].provinceCode.localeCompare(dataset.records[b].provinceCode) || dataset.records[a].name.localeCompare(dataset.records[b].name));
const esc = (v: unknown) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (v: number) => v.toLocaleString("ja-JP");
const project = projectCanadaMap;
const southCamera = [450, 390, 1];
function pathOf(g: CanadaCensusGeometry) {
  return new Path2D(canadaCensusRings(g).map((r) => r.map((p, i) => (i ? "L" : "M") + project(p).join(",")).join("") + "Z").join(""));
}
const contextPaths = model.context.features.map((f) => pathOf(f.geometry));
const features = geometry.features.map((f) => {
  const id = String(f.properties.DGUID);
  return { id, geometry: f.geometry, path: pathOf(f.geometry), point: project(anchors[id].point), bounds: anchors[id].bounds };
});
const featureById = new Map(features.map((f) => [f.id, f]));
const allProjected = [...geometry.features,...model.context.features.filter(f=>f.properties.code==='CAN')].flatMap(f => (f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat()).flat().map(project));
const nationalBox=allProjected.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
const wholeCamera = [(nationalBox[0]+nationalBox[2])/2,(nationalBox[1]+nationalBox[3])/2,.95*Math.min(900/(nationalBox[2]-nationalBox[0]),580/(nationalBox[3]-nationalBox[1]))];

function readState() {
  const q = new URL(location.href).searchParams, metric = q.get("agriFocus"), ccs = q.get("agriCcs"), parts = (q.get("agriCamera") ?? "").split(","), c = parts.map(Number);
  return { metric: ids.includes(metric) ? metric : null, ccs: featureById.has(ccs) ? ccs : null, camera: parts.length === 3 && parts.every((p) => p.trim() !== "") && c.every(Number.isFinite) && c[0] >= -300 && c[0] <= 1200 && c[1] >= -2000 && c[1] <= 2000 && c[2] >= .2 && c[2] <= 40 ? c : southCamera.slice() };
}
let state = readState(), size = { width: 0, height: 0, dpr: 1, scale: 1 }, raf = 0, lastStats = {}, pageIndex = 0, filter = "";
// Official province values provide the broad view. CCS remains an independent
// source geography; random tabular adjustment means these totals are not replaced
// by sums of the CCS publication values.
const provinceMax=Object.fromEntries(ids.map(id=>[id,Math.max(...dataset.provinces.map(p=>p.cells[id].value??0))]));
const provincePoints=model.labels.map(label=>({label,point:project(label.labelAnchor),record:dataset.provinces.find(p=>p.code===label.id)}));
const storyNodes=model.summaries.map(story=>{
 const element=document.createElement('div');element.className='map-story map-story-'+story.id;
 const labels=story.id==='east'?['corn','dairy']:story.products;
 element.innerHTML='<strong>'+esc(story.id==='prairie'?'プレーリー':story.id==='west'?'西部 AB・SK':'東部 ON・QC')+'</strong>'+labels.map(id=>'<span style="color:'+colors[id]+'"><i class="shape '+products[id].shape+'" style="--color:'+colors[id]+'" aria-hidden="true"></i>'+esc(id==='hay'?'干草':id==='beef'?'肉用母牛':id==='dairy'?'乳牛':names[id])+' <b>'+story.values[id].nationalShare.toFixed(1)+'%</b></span>').join('');
 $('map-stories').append(element);
 const label=model.labels.find(l=>l.id===story.anchorProvince);
 return {story,element,point:project(label.labelAnchor)};
});
const cropLabelSpecs=[{point:[-111,52.3],text:'小麦・カノーラ'},{point:[-106,49.8],text:'レンズ豆'},{point:[-82,44],text:'大豆・とうもろこし'},{point:[-68,45.5],text:'ばれいしょ'}];
const cropLabels=cropLabelSpecs.map(spec=>{const element=document.createElement('span');element.className='map-crop-label';element.textContent=spec.text;$('crop-labels').append(element);return {...spec,element,projected:project(spec.point)};});
let displayTargets=[],provinceLayout=new Map();
function drawAgricultureSurface(){
 const focus=state.metric,ccsFocus=focus&&ccsIds.includes(focus),selected=state.ccs;
 ctx.save();ctx.translate(size.width/2,size.height/2);ctx.scale(size.scale*state.camera[2],size.scale*state.camera[2]);ctx.translate(-state.camera[0],-state.camera[1]);
 ctx.lineWidth=.38/(size.scale*state.camera[2]);ctx.strokeStyle='#c4cfca';
 let colored=0;
 for(const feature of features){
  const record=dataset.records[feature.id],crop=fieldCropIds.map(id=>({id,value:record.cells[id].status==='published'?record.cells[id].value:0})).sort((a,b)=>b.value-a.value)[0];
  ctx.globalAlpha=1;ctx.fillStyle='#f2f1e8';ctx.fill(feature.path,'evenodd');
  if(crop.value>=1000){ctx.globalAlpha=(.18+.58*Math.sqrt(crop.value/ccsMax[crop.id]))*(focus?.48:1);ctx.fillStyle=colors[crop.id];ctx.fill(feature.path,'evenodd');colored++;}
  if(ccsFocus){const cell=record.cells[focus];if(cell.status==='published'&&cell.value>0){ctx.globalAlpha=.15+.8*Math.sqrt(cell.value/ccsMax[focus]);ctx.fillStyle=colors[focus];ctx.fill(feature.path,'evenodd');}}
  ctx.globalAlpha=1;ctx.stroke(feature.path);
 }
 if(selected){const feature=featureById.get(selected);ctx.strokeStyle='#183e58';ctx.lineWidth=2.8/(size.scale*state.camera[2]);ctx.stroke(feature.path);}
 ctx.restore();
 let specialtyDots=0;
 for(const [id,minimum]of [['lentils',10000],['potatoes',1000]])for(const feature of features){const cell=dataset.records[feature.id].cells[id];if(cell.status!=='published'||cell.value<minimum)continue;const p=screen(feature.point);if(!screenContains(p))continue;ctx.globalAlpha=focus?0.25:1;ctx.fillStyle=colors[id];ctx.strokeStyle='#fffefa';ctx.lineWidth=.7;ctx.beginPath();if(id==='lentils')ctx.arc(p[0],p[1],2.5,0,Math.PI*2);else ctx.rect(p[0]-2.5,p[1]-2.5,5,5);ctx.fill();ctx.stroke();specialtyDots++;}ctx.globalAlpha=1;
 const badgeIds=focus&&provinceOnlyIds.includes(focus)?['beef','dairy',focus]:['beef','dairy'];
 let badgeCount=0;
 for(const id of badgeIds){
  if(provinceOnlyIds.includes(id)){
   for(const province of dataset.provinces.filter((p:any)=>p.cells[id].status==='published'&&p.cells[id].value>0)){
    const marker=provincePoints.find(item=>item.label.id===province.code);if(!marker)continue;const p=screen(marker.point);if(!screenContains(p))continue;
    drawLivestockBadge(p,id,province.cells[id].value,province.code,true);badgeCount++;
   }
  }else{
   const ranked=features.filter(feature=>dataset.records[feature.id].cells[id].status==='published'&&dataset.records[feature.id].cells[id].value>0).sort((a,b)=>dataset.records[b.id].cells[id].value-dataset.records[a.id].cells[id].value);
   const shown:number[][]=[];for(const feature of ranked){const p=screen(feature.point);if(!screenContains(p)||shown.some(other=>Math.hypot(p[0]-other[0],p[1]-other[1])<72))continue;drawLivestockBadge(p,id,dataset.records[feature.id].cells[id].value,feature.id,false);shown.push(p);badgeCount++;if(shown.length===(focus===id?5:2))break;}
  }
 }
 displayTargets=features.map(feature=>({point:screen(feature.point),members:[feature.id]}));provinceLayout=new Map();
 return {granularity:focus&&provinceOnlyIds.includes(focus)?'official-province-symbols':'ccs-crop-surface',coloredCcs:colored,specialtyDots,livestockBadges:badgeCount,visibleSymbols:badgeCount+specialtyDots,retainedCcs:features.length,provinceOnlyIndicators:focus&&provinceOnlyIds.includes(focus)?{[focus]:dataset.provinces.filter((p:any)=>p.cells[focus].status==='published').map((p:any)=>p.code)}:{}};
}
function drawLivestockBadge(p:number[],id:string,value:number,source:string,province:boolean){
 const label=id==='beef'?'肉牛':id==='dairy'?'乳牛':id==='pork'?'豚':'鶏肉',glyph=id==='beef'?'牛':id==='dairy'?'乳':id==='pork'?'豚':'鶏';
 ctx.save();ctx.globalAlpha=state.metric&&state.metric!==id?0.38:1;ctx.fillStyle='#fffef8';ctx.strokeStyle=colors[id];ctx.lineWidth=1.4;ctx.beginPath();ctx.roundRect(p[0]-13,p[1]-13,26,26,9);ctx.fill();ctx.stroke();ctx.fillStyle=colors[id];ctx.font='700 15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,p[0],p[1]+1);ctx.font='700 12px sans-serif';ctx.textAlign='left';ctx.strokeStyle='#fffef8';ctx.lineWidth=3;ctx.strokeText(label,p[0]+16,p[1]+4);ctx.fillText(label,p[0]+16,p[1]+4);ctx.restore();
}
function placeCropLabels(){const active=state.camera[2]<3.5,tool=root.querySelector('.map-tools')!.getBoundingClientRect(),map=frame.getBoundingClientRect();for(const label of cropLabels){const p=screen(label.projected);if(label.text==='ばれいしょ'&&size.width<600)p[1]-=23;label.element.hidden=!active||!screenContains(p);if(!label.element.hidden){const width=label.element.offsetWidth,height=label.element.offsetHeight,toolLeft=tool.left-map.left;if(p[1]+height/2>tool.top-map.top&&p[1]-height/2<tool.bottom-map.top&&p[0]+width/2>toolLeft-6)p[0]=toolLeft-width/2-6;label.element.style.opacity=state.metric?'.65':'1';label.element.style.left=p[0]+'px';label.element.style.top=p[1]+'px';}}}
function drawPresence(id: CanadaAgricultureIndicatorId,cell: CanadaCensusCell,x: number,y: number,{strength=1,mixed=false}={}){
 ctx.globalAlpha=opacity(id);const r=3.5;
 if(cell.status==='published'&&cell.value>0){symbol(id,x,y,r);ctx.fillStyle=colors[id];ctx.globalAlpha*=strength;ctx.fill();ctx.globalAlpha=opacity(id);ctx.strokeStyle=colors[id];ctx.lineWidth=.5;ctx.stroke();}
 else if(cell.status==='published'){symbol(id,x,y,r);ctx.strokeStyle=colors[id];ctx.lineWidth=.8;ctx.stroke();}
 else{ctx.strokeStyle='#718389';ctx.lineWidth=1;ctx.beginPath();if(cell.status==='quality-f'){ctx.moveTo(x-2.5,y-2.5);ctx.lineTo(x+2.5,y+2.5);ctx.moveTo(x-2.5,y+2.5);ctx.lineTo(x+2.5,y-2.5);}else{ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);}ctx.stroke();}
 if(mixed){ctx.globalAlpha=opacity(id);ctx.fillStyle='#718389';ctx.fillRect(x+4,y-4,1.5,1.5);}
}
function drawProvinceOverview(renderIds=ids,keepDetail=false){
 const counts={},boxes=[...storyBoxes,...controlBoxes()];if(!keepDetail){displayTargets=[];provinceLayout=new Map();}
 for(const {label,point,record} of provincePoints){const anchor=screen(point);if(!screenContains(anchor))continue;let p=anchor;
  const offsets=[[0,0],[0,30],[0,-30],[58,0],[-58,0],[0,60],[0,-60],[58,30],[-58,-30]];for(let r=90;r<=210;r+=30)for(const [dx,dy] of [[0,r],[0,-r],[r,0],[-r,0],[r,r],[-r,-r],[r,-r],[-r,r]])offsets.push([dx,dy]);
  // Province symbols reserve their entire grid before labels; search the remaining
  // frame when nearby positions are occupied by the three geographic readings.
  const remaining=[];for(let y=markerHalfHeight+20;y<=size.height-markerHalfHeight-12;y+=10)for(let x=markerHalfWidth+4;x<=size.width-markerHalfWidth-4;x+=10)remaining.push([x-anchor[0],y-anchor[1]]);
  remaining.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));offsets.push(...remaining);
  for(const [dx,dy] of offsets){const candidate=[Math.max(markerHalfWidth+4,Math.min(size.width-markerHalfWidth-4,anchor[0]+dx)),Math.max(markerHalfHeight+20,Math.min(size.height-markerHalfHeight-12,anchor[1]+dy))],box=[candidate[0]-markerHalfWidth,candidate[1]-markerHalfHeight-16,candidate[0]+markerHalfWidth,candidate[1]+markerHalfHeight+10];if(!boxes.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])){p=candidate;boxes.push(box);break;}}
  provinceLayout.set(label.id,p);ctx.globalAlpha=.6;ctx.strokeStyle='#769097';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(...anchor);ctx.lineTo(...p);ctx.stroke();counts[label.id]=renderIds.slice();
  for(const [index,id] of renderIds.entries()){const cell=record.cells[id];const [dx,dy]=canadaAgricultureSymbolOffset(index,renderIds.length);drawPresence(id,cell,p[0]+dx,p[1]+8+dy,{strength:cell.value>0?.22+.78*cell.value/provinceMax[id]:1});}
  displayTargets.push({point:p,province:label.id,members:features.filter(f=>dataset.records[f.id].provinceCode===label.id).map(f=>f.id)});
 }
 return {granularity:'official-province',provinceIndicators:counts,visibleSymbols:Object.keys(counts).length*renderIds.length,retainedCcs:features.length};
}
function makeDetailGroups(){
 const cells=new Map(),columns=Math.max(1,Math.floor(size.width/56)),rows=Math.max(1,Math.floor(size.height/56)),cw=size.width/columns,ch=size.height/rows;
 for(const feature of features){const p=screen(feature.point);if(!screenContains(p))continue;const x=Math.min(columns-1,Math.floor(p[0]/cw)),y=Math.min(rows-1,Math.floor(p[1]/ch)),key=x+','+y;if(!cells.has(key))cells.set(key,{members:[],points:[],point:[(x+.5)*cw,(y+.5)*ch]});const cell=cells.get(key);cell.members.push(feature.id);cell.points.push(p);}
 return [...cells.values()];
}
function drawCcsDetails(){
 const groups=makeDetailGroups();displayTargets=groups;provinceLayout=new Map();
 for(const group of groups){
  const {point:p,members}=group;
  if(members.length===1){ctx.globalAlpha=.7;ctx.strokeStyle='#769097';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(...group.points[0]);ctx.lineTo(...p);ctx.stroke();ctx.beginPath();ctx.arc(...group.points[0],1.5,0,Math.PI*2);ctx.fillStyle='#4b6d77';ctx.fill();}
  for(const [index,id] of ccsIds.entries()){
   const cells=members.map(ccs=>dataset.records[ccs].cells[id]),positive=cells.find(c=>c.status==='published'&&c.value>0),allZero=cells.every(c=>c.status==='published'&&c.value===0);
   const representative=positive??(allZero?cells[0]:cells.find(c=>c.status==='quality-f')??cells.find(c=>c.status==='not-covered')??cells[0]);
   const [dx,dy]=canadaAgricultureSymbolOffset(index,ccsIds.length);drawPresence(id,representative,p[0]+dx,p[1]+dy,{mixed:!!positive&&cells.some(c=>c.status!=='published')});
  }
  if(members.length>1){ctx.globalAlpha=1;ctx.font='14px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#fffef5';ctx.lineWidth=3;ctx.strokeText(members.length+' CCS',p[0],p[1]+markerHalfHeight+16);ctx.fillStyle='#385564';ctx.fillText(members.length+' CCS',p[0],p[1]+markerHalfHeight+16);}
 }
 return {granularity:'ccs-display-cells',cellPixels:56,groups:groups.map(g=>({members:g.members,point:g.point})),visibleSymbols:groups.length*ccsIds.length,visibleCcs:groups.reduce((n,g)=>n+g.members.length,0),retainedCcs:features.length};
}
let storyBoxes:number[][]=[];
function overlaps(a:number[],b:number[]){return a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];}
function controlBoxes(){
 const origin=frame.getBoundingClientRect();
 return [...root.querySelectorAll('.map-tools,.map-year'),...root.closest('[data-canada-agriculture]')!.querySelectorAll('.country-topic-tabs')].map(node=>{const b=node.getBoundingClientRect();return [b.left-origin.left-4,b.top-origin.top-4,b.right-origin.left+4,b.bottom-origin.top+4];});
}
function placeStories(overview: boolean){
 storyBoxes=[];
 const inline=size.width<560,container=$('map-stories'),parent=inline?$('story-dock'):frame;
 if(container.parentElement!==parent)parent.append(container);
 container.classList.toggle('is-inline',inline);
 if(inline){for(const {element}of storyNodes){element.hidden=!overview;element.style.removeProperty('width');element.style.removeProperty('left');element.style.removeProperty('top');}return;}

 const obstacles=controlBoxes();
 const points=provincePoints.filter(p=>Number(p.label.id)<60).map(p=>screen(p.point)).filter(screenContains).map(p=>[p[0]-markerHalfWidth,p[1]-markerHalfHeight-16,p[0]+markerHalfWidth,p[1]+markerHalfHeight+10]);
 for(const {story,element,point} of [...storyNodes].sort((a,b)=>['west','prairie','east'].indexOf(a.story.id)-['west','prairie','east'].indexOf(b.story.id))){
  const p=screen(point);element.hidden=!overview||!screenContains(p);if(element.hidden)continue;
  const width=Math.min(190,Math.max(170,size.width*.28));element.style.width=width+'px';
  const height=element.getBoundingClientRect().height;
  const preferred=story.id==='west'?[8,64]:story.id==='prairie'?[Math.max(width+16,size.width*.36),64]:[size.width-width-76,size.height*.32];
  const candidates=[preferred];
  if(story.id==='east')candidates.push([size.width-width-76,5]);
  for(let y=58;y+height<size.height-32;y+=20)for(let x=8;x+width<size.width-8;x+=20)candidates.push([x,y]);
  const candidate=candidates.find(([x,y])=>x>=4&&y>=4&&x+width<=size.width-4&&y+height<=size.height-4&&![...obstacles,...storyBoxes].some(box=>overlaps([x-3,y-3,x+width+3,y+height+3],box)));
  if(!candidate){element.hidden=true;continue;}
  const [x,y]=candidate;storyBoxes.push([x-3,y-3,x+width+3,y+height+3]);element.style.left=x+'px';element.style.top=y+'px';
  ctx.globalAlpha=.85;ctx.strokeStyle=colors[story.products[0]];ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+width/2,y+height);ctx.lineTo(...p);ctx.stroke();ctx.beginPath();ctx.arc(...p,2,0,Math.PI*2);ctx.fillStyle=colors[story.products[0]];ctx.fill();
 }
 ctx.globalAlpha=1;
}
function fitMembers(members: string[]){
 const boxes=members.map(id=>anchors[id].bounds),west=Math.min(...boxes.map(b=>b[0])),south=Math.min(...boxes.map(b=>b[1])),east=Math.max(...boxes.map(b=>b[2])),north=Math.max(...boxes.map(b=>b[3]));
 const a=project([west,north]),b=project([east,south]),z=Math.min(size.width*.76/Math.max(1,(b[0]-a[0])*size.scale),size.height*.76/Math.max(1,(b[1]-a[1])*size.scale));
 camera((a[0]+b[0])/2,(a[1]+b[1])/2,Math.max(state.camera[2]*1.45,z));
}

function persist(replace = false) {
  const u = new URL(location.href);
  u.searchParams.set("item","overview");
  for (const k of ["agriFocus", "agriCcs", "agriCamera"]) u.searchParams.delete(k);
  if (state.metric) u.searchParams.set("agriFocus", state.metric);
  if (state.ccs) u.searchParams.set("agriCcs", state.ccs);
  if (state.camera.some((v, i) => Math.abs(v - southCamera[i]) > 1e-5)) u.searchParams.set("agriCamera", state.camera.map((v) => Number(v.toFixed(4))).join(","));
  if (u.href !== location.href) try {
    history[replace ? "replaceState" : "pushState"]({}, "", u);
  } catch {
  }
}
function screen(p: readonly number[]): [number,number] {
  return [size.width / 2 + (p[0] - state.camera[0]) * size.scale * state.camera[2], size.height / 2 + (p[1] - state.camera[1]) * size.scale * state.camera[2]];
}
function world(p: readonly number[]): [number,number] {
  return [state.camera[0] + (p[0] - size.width / 2) / (size.scale * state.camera[2]), state.camera[1] + (p[1] - size.height / 2) / (size.scale * state.camera[2])];
}
function screenContains(p: readonly number[]) {
  return p[0] >= 0 && p[0] <= size.width && p[1] >= 0 && p[1] <= size.height;
}
const opacity = (id) => state.metric && state.metric !== id ? products[id].kind === 'livestock' && products[state.metric].kind === 'crop' ? 0.14 : 0.58 : 1;
function symbol(id: CanadaAgricultureIndicatorId, x: number, y: number, r: number) {
  ctx.beginPath();
  if (products[id].shape === 'circle') ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (products[id].shape === 'square') ctx.rect(x - r, y - r, r * 2, r * 2);
  else {
    const n = products[id].shape === 'triangle' ? 3 : products[id].shape === 'diamond' ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / n, px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
}
const labelNodes = model.labels.map((label) => {
  const el = document.createElement("span");
  el.className = "province-label";
  el.textContent = abbreviations[label.id];
  el.title = label.name;
  $("labels").append(el);
  return { label, el, point: project(label.labelAnchor) };
});
function placeLabels() {
  const placed = [...storyBoxes, ...controlBoxes()];
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#748f9680";
  ctx.lineWidth = 0.8;
  for (const { label, el, point } of labelNodes) {
    if(state.camera[2]<3.5&&!['59','48','47','46','35','24'].includes(label.id)){el.hidden=true;continue;}
    const p = provinceLayout.get(label.id) ?? screen(point);
    if (!screenContains(p)) {
      el.hidden = true;
      continue;
    }
    el.hidden = false;
    const w = el.offsetWidth, h = el.offsetHeight;
    let chosen;
    const offsets = [[0,-13],[0,-26],[22,-13],[-22,-13],[22,13],[-22,13],[0,13],[0,26],[0,-39],[0,39]];
    for(const dy of [-13,13,-26,26,-39,39,-52,52])for(const dx of [22,-22,44,-44,66,-66])offsets.push([dx,dy]);
    for (const [dx, dy] of offsets) {
      const x = Math.max(w / 2 + 3, Math.min(size.width - w / 2 - 3, p[0] + dx)), y = Math.max(h / 2 + 3, Math.min(size.height - h / 2 - 3, p[1] + dy)), box = [x - w / 2 - 2, y - h / 2 - 2, x + w / 2 + 2, y + h / 2 + 2];
      if (!placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) {
        chosen = { x, y, box };
        break;
      }
    }
    if(!chosen){el.hidden=true;continue;}
    placed.push(chosen.box);
    el.style.left = chosen.x + "px";
    el.style.top = chosen.y + "px";
    ctx.beginPath();
    ctx.moveTo(...p);
    ctx.lineTo(chosen.x, chosen.y);
    ctx.stroke();
  }
}
function draw() {
 const started=performance.now(),{width:w,height:h,dpr,scale}=size;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#e4eff0';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(w/2,h/2);ctx.scale(scale*state.camera[2],scale*state.camera[2]);ctx.translate(-state.camera[0],-state.camera[1]);
 ctx.fillStyle='#efeee5';ctx.strokeStyle='#94aaaa';ctx.lineWidth=.55/(scale*state.camera[2]);for(const p of contextPaths){ctx.fill(p,'evenodd');ctx.stroke(p);}
 const overview=state.camera[2]<3.5;
 canvas.setAttribute('aria-label',state.metric?names[state.metric]+'の公表値を読む地図':'2021年CCS別の主要作物分布と肉牛・乳牛の例を読む地図');
 ctx.restore();
 for(const node of storyNodes)node.element.hidden=true;storyBoxes=[];
 const detail=drawAgricultureSurface();placeCropLabels();
 placeLabels();ctx.globalAlpha=1;
 $('display-meaning').textContent=state.metric?provinceOnlyIds.includes(state.metric)?'この品目は州単位で公表。印は州集計の目印で、CCSや農場の位置ではありません。':names[state.metric]+'のCCS別公表値。最大CCS '+fmt(ccsMax[state.metric])+' '+dataset.products[state.metric].unit+'を基準に、値が大きいほど濃く表示。無色には公表0・非公表・未収録を含みます。':'色面はCCS内で面積最大の主要作物（1,000 ha以上）。同品目の最大CCS値に対して面積が大きいほど濃く表示。小点はレンズ豆1万ha以上・ばれいしょ1,000 ha以上のCCS。畑の輪郭ではありません。牛の印もCCSの目印です。';
 lastStats={...detail,metrics:ids.slice(),opacities:Object.fromEntries(ids.map(id=>[id,opacity(id)])),retainedValues:features.length*ids.length,sourceCcsCells:features.length*ccsIds.length,provinceOnlyMetrics:provinceOnlyIds.slice(),drawMs:performance.now()-started,backingStore:{width:canvas.width,height:canvas.height,dpr},selected:state.ccs,view:Math.abs(state.camera[2]-wholeCamera[2])<.001?'whole-canada':'south-or-detail'};
 canvas.dataset.ready='true';
 root.querySelector<HTMLElement>('[data-overview-fallback]')!.hidden=true;
}

function schedule() {
  if (size.width>0 && !raf) raf = requestAnimationFrame(() => {
    raf = 0;
    draw();
  });
}
function resize() {
  const b = frame.getBoundingClientRect(); if(b.width<2||b.height<2)return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  size = { width: b.width - 2, height: b.height - 2, dpr, scale: Math.min((b.width - 2) / 900, (b.height - 2) / 580) };
  canvas.width = Math.round(size.width * dpr);
  canvas.height = Math.round(size.height * dpr);
  schedule();
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
  $('reading-title').textContent=profile?profile.label:nationalTitle;
  if(profile){
    const references=profile.sourceIds.map((id,index)=>({id,index:index+1,...config.readings.sources[id]}));
    const links=ids=>ids.map(id=>{const source=references.find(s=>s.id===id);return '<a href="'+esc(source.url)+'" title="'+esc(source.title)+'">資料'+source.index+'</a>';}).join('・');
    const paragraphs=profile.paragraphs.map((paragraph,index)=>'<section class="distribution-section"><h3>'+esc(profile.headings[index])+'</h3><p>'+esc(paragraph)+'<span class="reading-source-links">'+links(profile.paragraphSourceIds[index])+'</span></p></section>').join('');
    const focus='<div class="reading-actions">'+profile.focusProvinces.map(code=>'<button data-agri-province-focus="'+esc(code)+'">'+esc(provinceNames[code])+'周辺へ</button>').join('')+(profile.focusCcs??[]).map(place=>'<button data-agri-ccs-focus="'+place.id+'">'+esc(place.label)+'へ</button>').join('')+'</div>';
    const related='<div class="reading-actions">'+profile.relatedProducts.map(id=>'<button data-agri-reading-product="'+id+'">'+esc(names[id])+'を読む</button>').join('')+'</div>';
    const legacy=profile.legacy?'<p><a '+(profile.legacy==='canola'?'data-canola-select-item="canola" ':'')+'href="'+esc(config.legacyUrls[profile.legacy])+'">原図・年次比較と詳しい解説</a></p>':'';
    $('distribution-overview').innerHTML='<p class="key-sentence"><strong>'+esc(profile.keySentence)+'</strong></p>'+focus+paragraphs+related+legacy+'<details><summary>出典・年・単位</summary><p>'+esc(profile.metricNote)+'</p>'+references.map(source=>'<p><a href="'+esc(source.url)+'">資料'+source.index+'：'+esc(source.title)+'</a></p>').join('')+'</details>';
    $('reading-intro').textContent=profile.metricNote;
  }else{
    $('distribution-overview').innerHTML=nationalReading;
    $('reading-intro').textContent=nationalIntro;
  }
  const selectedRecord=state.ccs?dataset.records[state.ccs]:null,selection=$('selection-reading');selection.hidden=!selectedRecord;
  if(selectedRecord){selection.innerHTML='<strong>選択CCS：'+esc(selectedRecord.name)+'</strong><br>'+esc(provinceNames[selectedRecord.provinceCode])+'／農場本拠地域の申告値。<a href="#canada-agri-statistics">下の指標・品質を見る</a>';$<HTMLDetailsElement>('statistics-detail').open=true;}

  const record = state.ccs ? dataset.records[state.ccs] : null, cells = record?.cells ?? Object.fromEntries(ids.map((id) => [id, dataset.products[id].national]));
  $<HTMLSelectElement>("region").value = state.ccs ?? "";
  $<HTMLButtonElement>("focus-region").disabled = !state.ccs;
  $("table-caption").textContent = record ? "CCS " + record.uid + "／地域別申告値" : "全国の公表値（各指標の年・対象範囲は定義欄）";
  $("values").innerHTML = ids.map((id) => '<tr data-value="' + id + '"><th scope="row"><span class="metric-name"><i class="shape ' + products[id].shape + '" style="--color:' + colors[id] + '" aria-hidden="true"></i>' + esc(id==='beef'?'肉用母牛':id==='dairy'?'乳牛':id==='chicken'?'鶏肉生産者':names[id]) + "</span></th><td>" + esc(valueText(cells[id], dataset.products[id].unit)) + "<small>" + esc(qualityText(cells[id])) + "</small></td></tr>").join("");
  $("quality-note").textContent = record ? "公表0・非公表F・対象外/未収録を区別しています。合算指標は成分の品質を保持し、合算値に新たな品質等級を付けません。" : "全国値は原表の公表値です。地域値を足して全国値に置き換えません。";
  $("components").innerHTML = ids.map((id) => "<h3>" + esc(names[id]) + "</h3>" + cells[id].components.map((c) => '<p class="component">' + esc(c.variable) + "：" + (c.value === null ? c.quality==='F'?"非公表 F":"未収録" : fmt(c.value) + " " + dataset.products[id].unit) + "／品質 " + esc(c.quality ?? "未収録") + "</p>").join("")).join("");
  for (const button of root.querySelectorAll("[data-metric]")) button.setAttribute("aria-pressed", String((button.dataset.metric || null) === state.metric));
  const focused = state.metric ? names[state.metric] + "の公表値を表示" : "CCS別の主要作物面積と牛の例を表示";
  $("map-status").textContent = focused + "。1,757 CCSを保持。" + (record ? record.name + "を選択中。" : "地域未選択。") + " 地図はドラッグ・矢印で移動、＋−で拡大縮小できます。";
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
function update(patch, { replace = false, cameraOnly = false } = {}) {
  state = { ...state, ...patch };
  persist(replace);
  if (!cameraOnly) {
    renderReading();
    renderList();
  }
  schedule();
}
function camera(centerX: number, centerY: number, zoom2: number) {
  update({ camera: [Math.max(-300, Math.min(1200, centerX)), Math.max(-2000, Math.min(2000, centerY)), Math.max(.2, Math.min(40, zoom2))] }, { replace: true, cameraOnly: true });
}
function zoom(factor: number, point = [size.width / 2, size.height / 2]) {
  const before = world(point), z = Math.max(.2, Math.min(40, state.camera[2] * factor));
  camera(before[0] - (point[0] - size.width / 2) / (size.scale * z), before[1] - (point[1] - size.height / 2) / (size.scale * z), z);
}
for (const [code, name] of Object.entries(provinceNames)) {
  const group = document.createElement("optgroup");
  group.label = name;
  for (const id of allIds.filter((id2) => dataset.records[id2].provinceCode === code)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = dataset.records[id].name + "（" + dataset.records[id].uid + "）";
    group.append(option);
  }
  $("region").append(group);
}
$("scales").innerHTML=ids.map(id=>{const c=model.counts[id];if(dataset.products[id].resolution==='province')return '<p class="scale-row"><strong>'+esc(names[id])+'</strong>：州別公表 '+dataset.provinces.filter(p=>p.cells[id].status==='published').length+'州。CCS値は未収録です。</p>';return '<p class="scale-row"><strong>'+esc(names[id])+'</strong>：CCSの公表 '+fmt(c.published)+'・F '+fmt(c['quality-f'])+'・未収録 '+c['not-covered']+'地域</p>';}).join('');
$("definitions").innerHTML = ids.map((id) => {
  const p = dataset.products[id];
  return "<section><h3>" + esc(p.label) + '</h3><p class="definition">' + esc(p.definition) + " " + esc(p.notes) + '</p><p class="source-note">' + esc(p.referenceLabel) + '／地図：' + esc(p.unitLabel) + '</p><p class="source-note"><a href="' + esc(p.sourceTableUrl) + '" target="_blank" rel="noopener">' + esc(p.sourceName) + ' ' + esc(p.sourceTableId) + " 原表</a></p></section>";
}).join("");
$("sources").innerHTML = '<p class="source-note">' + esc(dataset.source.geographicMeaning) + " " + esc(dataset.source.randomTabularAdjustment) + " " + esc(dataset.source.nationalCoverage) + '</p><p class="source-note">境界は2021年の公式CCS。原資料で5km一般化された1,757地域をDGUIDで結合しています。色面は各CCSの申告値で、実際の畑の輪郭ではありません。牛の印は頭数が大きいCCS内の表示用基点で、農場の実位置ではありません。</p><p class="source-note"><a href="' + esc(dataset.source.geographicRuleUrl) + '" target="_blank" rel="noopener">地域集計の定義</a> ／ <a href="' + esc(dataset.source.qualityUrl) + '" target="_blank" rel="noopener">品質等級</a> ／ <a href="' + esc(dataset.geometry.sourceUrl) + '" target="_blank" rel="noopener">境界の出典</a></p><p class="source-note">州・準州の略号：' + Object.entries(abbreviations).map(([id, code]) => code + "＝" + esc(provinceNames[id])).join("、") + '</p><p class="source-note" lang="en">' + esc(dataset.attribution) + " " + esc(dataset.geometry.attribution) + '</p><p class="source-note">豚・鶏の出典：' + esc(dataset.supplement.source) + '。各指標の年・定義・公表精度を保持し、州値をCCSへ配分しません。<a href="' + esc(dataset.supplement.licence.url) + '">利用条件</a></p><p class="source-note"><a href="' + esc(dataset.licence.url) + '" target="_blank" rel="noopener">Statistics Canada Open Licence</a> ／ <a href="' + esc(dataset.geometry.licence.url) + '" target="_blank" rel="noopener">Open Government Licence – Canada</a></p>';
$("page-source").innerHTML = '出典：<a href="' + esc(dataset.source.url) + '" target="_blank" rel="noopener">Statistics Canada, Census of Agriculture, 2021</a>。統計参照日 ' + esc(dataset.source.referenceDate) + "、公表日 " + esc(dataset.source.releasedAt) + "、取得日 " + esc(dataset.source.accessedAt) + "。作物面積はha、牛は頭数。豚の3州の全国比（2025年版）・鶏の州別生産者数（2021年）は独立AAFC資料。";
root.querySelectorAll("[data-metric]").forEach((b) => b.addEventListener("click", () => update({ metric: b.dataset.metric || null })));
root.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target.closest('[data-agri-reading-product],[data-agri-province-focus],[data-agri-ccs-focus]'):null;if(!target)return;
 if(target.hasAttribute('data-agri-reading-product')){update({metric:target.getAttribute('data-agri-reading-product')});return;}
 const selectedCcs=target.getAttribute('data-agri-ccs-focus');if(selectedCcs&&featureById.has(selectedCcs)){update({ccs:selectedCcs});fitMembers([selectedCcs]);return;}
 const code=target.getAttribute('data-agri-province-focus'),members=features.filter(f=>dataset.records[f.id].provinceCode===code).map(f=>f.id);
 if(members.length){update({ccs:null});fitMembers(members);}
});
$("region").addEventListener("change", (e) => update({ ccs: e.target.value || null }));
$("clear-region").addEventListener("click", () => update({ ccs: null }));
$("reset").addEventListener("click", () => update({ metric: null, ccs: null, camera: wholeCamera.slice() }));
$("south").addEventListener("click",()=>update({camera:southCamera.slice()}));
$("zoom-in").addEventListener("click", () => zoom(1.5));
$("zoom-out").addEventListener("click", () => zoom(1 / 1.5));
$("focus-region").addEventListener("click", () => {
  if (!state.ccs) return;
  const [west, south, east, north] = anchors[state.ccs].bounds, a = project([west, north]), b = project([east, south]), z = Math.min(size.width * 0.72 / Math.max(1, (b[0] - a[0]) * size.scale), size.height * 0.72 / Math.max(1, (b[1] - a[1]) * size.scale));
  camera((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
});
$("rows").addEventListener("click", (e) => {
  const b = e.target.closest("[data-list-ccs]");
  if (b) update({ ccs: b.dataset.listCcs });
});
$("search").addEventListener("input", (e) => {
  filter = e.target.value.trim().toLowerCase();
  pageIndex = 0;
  renderList();
});
$("previous").addEventListener("click", () => {
  pageIndex--;
  renderList();
});
$("next").addEventListener("click", () => {
  pageIndex++;
  renderList();
});
let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(e.pointerId);
  drag = { pointer: e.pointerId, x: e.clientX, y: e.clientY, camera: state.camera.slice(), moved: false };
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag || drag.pointer !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 3) drag.moved = true;
  if (drag.moved) camera(drag.camera[0] - dx / (size.scale * drag.camera[2]), drag.camera[1] - dy / (size.scale * drag.camera[2]), drag.camera[2]);
});
canvas.addEventListener("pointerup", (e) => {
  if (!drag || drag.pointer !== e.pointerId) return;
  const clicked = !drag.moved;
  drag = null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (clicked) {
    const b=canvas.getBoundingClientRect(),p=[e.clientX-b.x,e.clientY-b.y],point=world(p);
    const hit=features.find(feature=>ctx.isPointInPath(feature.path,point[0],point[1],'evenodd'));
    if(hit)update({ccs:hit.id});
  }

});
for (const event of ["pointercancel", "lostpointercapture"]) canvas.addEventListener(event, () => {
  drag = null;
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const b = canvas.getBoundingClientRect();
  zoom(Math.exp(-Math.max(-100, Math.min(100, e.deltaY)) * 4e-3), [e.clientX - b.x, e.clientY - b.y]);
}, { passive: false });
canvas.addEventListener("focus", () => $("map-focus").hidden = false);
canvas.addEventListener("blur", () => $("map-focus").hidden = true);
canvas.addEventListener("keydown", (e) => {
  const pan = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (pan) {
    e.preventDefault();
    camera(state.camera[0] + pan[0] * 30 / (size.scale * state.camera[2]), state.camera[1] + pan[1] * 30 / (size.scale * state.camera[2]), state.camera[2]);
  } else if (["+", "=", "-"].includes(e.key)) {
    e.preventDefault();
    zoom(e.key === "-" ? 1 / 1.5 : 1.5);
  } else if (e.key === "Escape") {
    e.preventDefault();
    $("reset").click();
  }
});
window.addEventListener("popstate", () => {
  state = readState();
  renderReading();
  renderList();
  schedule();
});
new ResizeObserver(resize).observe(frame);
renderReading();
renderList();
resize();
(root as any).canadaAgriculture = { evidence: model.evidence, counts: model.counts, getState: () => structuredClone(state), getRenderStats: () => structuredClone(lastStats), getCcsScreenPoint: (id) => screen(featureById.get(id).point), getDisplayTargets:()=>structuredClone(displayTargets), getWholeCamera:()=>wholeCamera.slice(), summaries:model.summaries, getCell: (ccs, id) => structuredClone(dataset.records[ccs].cells[id]), initializationMs: performance.now() - began };

 }catch(error){
  root.querySelector('[data-overview-fallback]')?.removeAttribute('hidden');
  const status=root.querySelector('#canada-agri-map-status');if(status)status.textContent='操作地図を読み込めませんでした。州別の概観と全国値、品目別の原図は表示しています。';
  root.dataset.loadError=String(error);
 }
}
