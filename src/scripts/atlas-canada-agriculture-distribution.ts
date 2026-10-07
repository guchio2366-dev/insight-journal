import {projectCanadaMap} from '../lib/atlas-canada-map-presentation';
import {canadaCensusRings,type CanadaCensusGeometry,type CanadaCensusCell,type CanadaCensusProductId} from '../lib/atlas-canada-census-map';

/** The broad view uses official province values; detail retains every source CCS cell. */
export async function initCanadaAgricultureDistribution(root:HTMLElement){
 if(root.dataset.initialized)return;root.dataset.initialized='true';
 try{
const began = performance.now();
const config=JSON.parse(root.querySelector('[data-canada-agri-overview-config]')!.textContent!);
const [dataset,geometry]=await Promise.all([config.dataUrl,config.geometryUrl].map(async url=>{const response=await fetch(url);if(!response.ok)throw new Error('Canada agriculture data '+response.status);return response.json();}));
const model={...config,dataset,geometry};
const $=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>('#canada-agri-'+id)!;
const { anchors, ids, provinceNames } = model, canvas = $<HTMLCanvasElement>("map"), frame = $("map-frame");
const context2d=canvas.getContext("2d");if(!context2d)throw new Error("Canvas2D is unavailable");const ctx=context2d;
const colors = { canola: "#b38c16", wheat: "#287ba0", hay: "#387c5b", beef: "#b35354", pasture: "#79643d" };
const names = { canola: "カノーラ", wheat: "小麦", hay: "干草・栽培牧草（アルファルファ＋その他）", beef: "肉用母牛", pasture: "放牧地" };
const abbreviations = { 10: "NL", 11: "PE", 12: "NS", 13: "NB", 24: "QC", 35: "ON", 46: "MB", 47: "SK", 48: "AB", 59: "BC", 60: "YT", 61: "NT", 62: "NU" };
const allIds = Object.keys(dataset.records).sort((a, b) => dataset.records[a].provinceCode.localeCompare(dataset.records[b].provinceCode) || dataset.records[a].name.localeCompare(dataset.records[b].name));
const esc = (v: unknown) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (v: number) => v.toLocaleString("ja-JP");
const project = projectCanadaMap;
const southCamera = [450, 290, 1];
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
 const labels=story.id==='east'?['hay']:story.products;
 element.innerHTML='<strong>'+esc(story.id==='prairie'?'プレーリー':story.id==='west'?'西部 AB・SK':'東部 ON・QC')+'</strong>'+labels.map(id=>'<span style="color:'+colors[id]+'"><i class="shape '+id+'" style="--color:'+colors[id]+'" aria-hidden="true"></i>'+esc(id==='hay'?'干草':names[id])+' <b>'+story.values[id].nationalShare.toFixed(1)+'%</b></span>').join('');
 $('map-stories').append(element);
 const label=model.labels.find(l=>l.id===story.anchorProvince);
 return {story,element,point:project(label.labelAnchor)};
});
let displayTargets=[],provinceLayout=new Map();
function drawPresence(id: CanadaCensusProductId,cell: CanadaCensusCell,x: number,y: number,{strength=1,mixed=false}={}){
 ctx.globalAlpha=opacity(id);const r=3.5;
 if(cell.status==='published'&&cell.value>0){symbol(id,x,y,r);ctx.fillStyle=colors[id];ctx.globalAlpha*=strength;ctx.fill();ctx.globalAlpha=opacity(id);ctx.strokeStyle=colors[id];ctx.lineWidth=.5;ctx.stroke();}
 else if(cell.status==='published'){symbol(id,x,y,r);ctx.strokeStyle=colors[id];ctx.lineWidth=.8;ctx.stroke();}
 else{ctx.strokeStyle='#718389';ctx.lineWidth=1;ctx.beginPath();if(cell.status==='quality-f'){ctx.moveTo(x-2.5,y-2.5);ctx.lineTo(x+2.5,y+2.5);ctx.moveTo(x-2.5,y+2.5);ctx.lineTo(x+2.5,y-2.5);}else{ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);}ctx.stroke();}
 if(mixed){ctx.globalAlpha=opacity(id);ctx.fillStyle='#718389';ctx.fillRect(x+4,y-4,1.5,1.5);}
}
function drawProvinceOverview(){
 const counts={},boxes=[...storyBoxes,...controlBoxes()];displayTargets=[];provinceLayout=new Map();
 for(const {label,point,record} of provincePoints){const anchor=screen(point);if(!screenContains(anchor))continue;let p=anchor;
  const offsets=[[0,0],[0,30],[0,-30],[58,0],[-58,0],[0,60],[0,-60],[58,30],[-58,-30]];for(let r=90;r<=210;r+=30)for(const [dx,dy] of [[0,r],[0,-r],[r,0],[-r,0],[r,r],[-r,-r],[r,-r],[-r,r]])offsets.push([dx,dy]);
  for(const [dx,dy] of offsets){const candidate=[Math.max(29,Math.min(size.width-29,anchor[0]+dx)),Math.max(20,Math.min(size.height-16,anchor[1]+dy))],box=[candidate[0]-28,candidate[1]+3,candidate[0]+28,candidate[1]+14];if(!boxes.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])){p=candidate;boxes.push(box);break;}}
  provinceLayout.set(label.id,p);ctx.globalAlpha=.6;ctx.strokeStyle='#769097';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(...anchor);ctx.lineTo(...p);ctx.stroke();counts[label.id]=ids.slice();
  for(const [index,id] of ids.entries()){const cell=record.cells[id];drawPresence(id,cell,p[0]+(index-2)*10,p[1]+8,{strength:cell.value>0?.22+.78*cell.value/provinceMax[id]:1});}
  displayTargets.push({point:p,province:label.id,members:features.filter(f=>dataset.records[f.id].provinceCode===label.id).map(f=>f.id)});
 }
 return {granularity:'official-province',provinceIndicators:counts,visibleSymbols:Object.keys(counts).length*5,retainedCcs:features.length};
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
  for(const [index,id] of ids.entries()){
   const cells=members.map(ccs=>dataset.records[ccs].cells[id]),positive=cells.find(c=>c.status==='published'&&c.value>0),allZero=cells.every(c=>c.status==='published'&&c.value===0);
   const representative=positive??(allZero?cells[0]:cells.find(c=>c.status==='quality-f')??cells.find(c=>c.status==='not-covered')??cells[0]);
   drawPresence(id,representative,p[0]+(index-2)*9,p[1],{mixed:!!positive&&cells.some(c=>c.status!=='published')});
  }
  if(members.length>1){ctx.globalAlpha=1;ctx.font='14px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#fffef5';ctx.lineWidth=3;ctx.strokeText(members.length+' CCS',p[0],p[1]+19);ctx.fillStyle='#385564';ctx.fillText(members.length+' CCS',p[0],p[1]+19);}
 }
 return {granularity:'ccs-display-cells',cellPixels:56,groups:groups.map(g=>({members:g.members,point:g.point})),visibleSymbols:groups.length*5,visibleCcs:groups.reduce((n,g)=>n+g.members.length,0),retainedCcs:features.length};
}
let storyBoxes:number[][]=[];
function overlaps(a:number[],b:number[]){return a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];}
function controlBoxes(){
 const origin=frame.getBoundingClientRect();
 return [...root.querySelectorAll('.map-tools,.map-year'),...root.closest('[data-canada-agriculture]')!.querySelectorAll('.country-topic-tabs')].map(node=>{const b=node.getBoundingClientRect();return [b.left-origin.left-4,b.top-origin.top-4,b.right-origin.left+4,b.bottom-origin.top+4];});
}
function placeStories(overview: boolean){
 storyBoxes=[];
 const obstacles=controlBoxes();
 const points=provincePoints.filter(p=>Number(p.label.id)<60).map(p=>screen(p.point)).filter(screenContains).map(p=>[p[0]-29,p[1]+2,p[0]+29,p[1]+15]);
 for(const {story,element,point} of [...storyNodes].sort((a,b)=>['west','prairie','east'].indexOf(a.story.id)-['west','prairie','east'].indexOf(b.story.id))){
  const p=screen(point);element.hidden=!overview||!screenContains(p);if(element.hidden)continue;
  const width=Math.min(190,Math.max(128,size.width*.28));element.style.width=width+'px';
  const height=element.getBoundingClientRect().height;
  const preferred=story.id==='west'?[8,64]:story.id==='prairie'?[Math.max(width+16,size.width*.36),64]:[size.width-width-76,size.height*.32];
  const candidates=[preferred];
  if(story.id==='east')candidates.push([size.width-width-76,5]);
  for(let y=58;y+height<size.height-32;y+=20)for(let x=8;x+width<size.width-8;x+=20)candidates.push([x,y]);
  const candidate=candidates.find(([x,y])=>x>=4&&y>=4&&x+width<=size.width-4&&y+height<=size.height-4&&![...obstacles,...storyBoxes,...points].some(box=>overlaps([x-3,y-3,x+width+3,y+height+3],box)));
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
  if (state.camera.some((v, i) => Math.abs(v - [450, 290, 1][i]) > 1e-5)) u.searchParams.set("agriCamera", state.camera.map((v) => Number(v.toFixed(4))).join(","));
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
const opacity = (id) => state.metric && state.metric !== id ? id === "beef" && ["canola", "wheat", "hay"].includes(state.metric) ? 0.14 : 0.58 : 1;
function symbol(id: CanadaCensusProductId, x: number, y: number, r: number) {
  ctx.beginPath();
  if (id === "canola") ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (id === "wheat") ctx.rect(x - r, y - r, r * 2, r * 2);
  else {
    const n = id === "hay" ? 3 : id === "beef" ? 4 : 5;
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
 canvas.setAttribute('aria-label',overview?'2021年、州・準州公表値による5指標の概観地図':'2021年、農場本拠地域CCSの5指標を同時表示する地図');
 ctx.fillStyle='#f4f2e8';ctx.strokeStyle=overview?'#c6d0ca':'#a5b9b6';ctx.lineWidth=(overview?.17:.5)/(scale*state.camera[2]);for(const f of features){ctx.fill(f.path,'evenodd');ctx.stroke(f.path);}ctx.restore();
 placeStories(overview);
 const detail=overview?drawProvinceOverview():drawCcsDetails();
 if(state.ccs){const f=featureById.get(state.ccs);ctx.save();ctx.translate(w/2,h/2);ctx.scale(scale*state.camera[2],scale*state.camera[2]);ctx.translate(-state.camera[0],-state.camera[1]);ctx.strokeStyle='#234d68';ctx.lineWidth=3/(scale*state.camera[2]);ctx.stroke(f.path);ctx.restore();}
 placeLabels();ctx.globalAlpha=1;
 $('display-meaning').textContent=overview?'州・準州の公式公表値。記号の大きさは共通、濃淡は同品目の最大州との比較。注記の％は各指標の全国公表値に対する割合。':'約56pxの表示セルでCCS記号を束ねています。色は公表正値がある指標、数字はCCS地域数。値・品質は下の一覧で保持。';
 lastStats={...detail,metrics:ids.slice(),opacities:Object.fromEntries(ids.map(id=>[id,opacity(id)])),retainedValues:features.length*ids.length,drawMs:performance.now()-started,backingStore:{width:canvas.width,height:canvas.height,dpr},selected:state.ccs,view:Math.abs(state.camera[2]-wholeCamera[2])<.001?'whole-canada':'south-or-detail'};
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
  return fmt(cell.value) + " " + unit;
}
function qualityText(cell: CanadaCensusCell) {
  if (cell.status === "not-covered") return "ゼロではありません";
  if (cell.quality) return "品質 " + cell.quality + (cell.quality === "E" ? "・注意して利用" : "");
  const grades = cell.components.map((c) => c.quality ?? "未収録");
  return "成分の品質 " + grades.join("・") + (grades.includes("E") ? "・注意して利用" : "");
}
function renderReading() {
  $('reading-eyebrow').textContent='2021年・州別公表値';
  $('reading-title').textContent='プレーリーと東部を読む';
  const prairie=model.summaries.find(s=>s.id==='prairie'),west=model.summaries.find(s=>s.id==='west'),east=model.summaries.find(s=>s.id==='east'),percent=(s,p)=>s.values[p].nationalShare.toFixed(1)+'％';
  $('distribution-overview').innerHTML='<section class="distribution-section"><h3>プレーリーの穀物・カノーラ</h3><p>アルバータ・サスカチュワン・マニトバに、カノーラ面積の<strong>'+percent(prairie,'canola')+'</strong>、小麦面積の<strong>'+percent(prairie,'wheat')+'</strong>が集まります。</p></section><section class="distribution-section"><h3>西部の母牛・放牧地</h3><p>アルバータ・サスカチュワンで、肉用母牛頭数の<strong>'+percent(west,'beef')+'</strong>、放牧地面積の<strong>'+percent(west,'pasture')+'</strong>を占めます。</p></section><section class="distribution-section"><h3>東部にも干草が広がる</h3><p>オンタリオ・ケベックには、干草・栽培牧草面積の<strong>'+percent(east,'hay')+'</strong>、小麦面積の<strong>'+percent(east,'wheat')+'</strong>があります。干草は東部だけの指標ではなく、西部にも広く分布します。</p></section>';
  const selectedRecord=state.ccs?dataset.records[state.ccs]:null,selection=$('selection-reading');selection.hidden=!selectedRecord;
  if(selectedRecord){selection.innerHTML='<strong>選択CCS：'+esc(selectedRecord.name)+'</strong><br>'+esc(provinceNames[selectedRecord.provinceCode])+'／農場本拠地域の申告値。<a href="#canada-agri-statistics">下の5指標・品質を見る</a>';$<HTMLDetailsElement>('statistics-detail').open=true;}

  const record = state.ccs ? dataset.records[state.ccs] : null, cells = record?.cells ?? Object.fromEntries(ids.map((id) => [id, dataset.products[id].national]));
  $<HTMLSelectElement>("region").value = state.ccs ?? "";
  $<HTMLButtonElement>("focus-region").disabled = !state.ccs;
  $("table-caption").textContent = record ? "CCS " + record.uid + "／地域別申告値" : "全国の公表値（準州を含まない）";
  $("values").innerHTML = ids.map((id) => '<tr data-value="' + id + '"><th scope="row"><span class="metric-name"><i class="shape ' + id + '" style="--color:' + colors[id] + '" aria-hidden="true"></i>' + esc(names[id]) + "</span></th><td>" + esc(valueText(cells[id], dataset.products[id].unit)) + "<small>" + esc(qualityText(cells[id])) + "</small></td></tr>").join("");
  $("quality-note").textContent = record ? "公表0・非公表F・対象外/未収録を区別しています。合算指標は成分の品質を保持し、合算値に新たな品質等級を付けません。" : "全国値は原表の公表値です。地域値を足して全国値に置き換えません。";
  $("components").innerHTML = ids.map((id) => "<h3>" + esc(names[id]) + "</h3>" + cells[id].components.map((c) => '<p class="component">' + esc(c.variable) + "：" + (c.value === null ? c.quality==='F'?"非公表 F":"未収録" : fmt(c.value) + " " + dataset.products[id].unit) + "／品質 " + esc(c.quality ?? "未収録") + "</p>").join("")).join("");
  for (const button of root.querySelectorAll("[data-metric]")) button.setAttribute("aria-pressed", String((button.dataset.metric || null) === state.metric));
  const focused = state.metric ? names[state.metric] + "を強調、他の分布も表示" : "5指標を同時表示";
  $("map-status").textContent = focused + "。1,757 CCSを保持。" + (record ? record.name + "を選択中。" : "地域未選択。") + " 地図はドラッグ・矢印で移動、＋−で拡大縮小できます。";
}
function renderList() {
  const matches = allIds.filter((id) => !filter || (dataset.records[id].name + " " + dataset.records[id].uid + " " + provinceNames[dataset.records[id].provinceCode]).toLowerCase().includes(filter));
  pageIndex = Math.max(0, Math.min(pageIndex, Math.max(0, Math.ceil(matches.length / 12) - 1)));
  const visible = matches.slice(pageIndex * 12, pageIndex * 12 + 12);
  $("rows").innerHTML = visible.map((id) => {
    const r = dataset.records[id];
    return "<tr" + (state.ccs === id ? ' style="background:#e5ede5"' : "") + '><td><button data-list-ccs="' + id + '">' + esc(r.name) + "</button><br>" + esc(provinceNames[r.provinceCode]) + " \xB7 " + esc(r.uid) + "</td>" + ids.map((p) => "<td>" + esc(r.cells[p].status === "published" ? fmt(r.cells[p].value) : r.cells[p].status === "quality-f" ? "非公表 F" : "未収録") + "</td>").join("") + "</tr>";
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
$("scales").innerHTML=ids.map(id=>{const c=model.counts[id];return '<p class="scale-row"><strong>'+esc(names[id])+'</strong>：公表 '+fmt(c.published)+'・F '+fmt(c['quality-f'])+'・未収録 '+c['not-covered']+'地域</p>';}).join('');
$("definitions").innerHTML = ids.map((id) => {
  const p = dataset.products[id];
  return "<section><h3>" + esc(p.label) + '</h3><p class="definition">' + esc(p.definition) + " " + esc(p.notes) + '</p><p class="source-note"><a href="' + esc(p.sourceTableUrl) + '" target="_blank" rel="noopener">StatCan ' + esc(p.sourceTableId) + " 原表</a></p></section>";
}).join("");
$("sources").innerHTML = '<p class="source-note">' + esc(dataset.source.geographicMeaning) + " " + esc(dataset.source.randomTabularAdjustment) + " " + esc(dataset.source.nationalCoverage) + '</p><p class="source-note">境界は2021年の公式CCS。原資料で5km一般化された1,757地域をDGUIDで結合しています。表示用の基点は各CCS内で確認し、重なりを避けた記号は基点と線で結びます。農場の実位置として解釈しません。</p><p class="source-note"><a href="' + esc(dataset.source.geographicRuleUrl) + '" target="_blank" rel="noopener">地域集計の定義</a> ／ <a href="' + esc(dataset.source.qualityUrl) + '" target="_blank" rel="noopener">品質等級</a> ／ <a href="' + esc(dataset.geometry.sourceUrl) + '" target="_blank" rel="noopener">境界の出典</a></p><p class="source-note">州・準州の略号：' + Object.entries(abbreviations).map(([id, code]) => code + "＝" + esc(provinceNames[id])).join("、") + '</p><p class="source-note" lang="en">' + esc(dataset.attribution) + " " + esc(dataset.geometry.attribution) + '</p><p class="source-note"><a href="' + esc(dataset.licence.url) + '" target="_blank" rel="noopener">Statistics Canada Open Licence</a> ／ <a href="' + esc(dataset.geometry.licence.url) + '" target="_blank" rel="noopener">Open Government Licence – Canada</a></p>';
$("page-source").innerHTML = '出典：<a href="' + esc(dataset.source.url) + '" target="_blank" rel="noopener">Statistics Canada, Census of Agriculture, 2021</a>。統計参照日 ' + esc(dataset.source.referenceDate) + "、公表日 " + esc(dataset.source.releasedAt) + "、取得日 " + esc(dataset.source.accessedAt) + "。面積はha、肉用母牛は頭数。";
root.querySelectorAll("[data-metric]").forEach((b) => b.addEventListener("click", () => update({ metric: b.dataset.metric || null })));
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
    const b=canvas.getBoundingClientRect(),p=[e.clientX-b.x,e.clientY-b.y],nearest=displayTargets.map(target=>({target,d:Math.hypot(...target.point.map((v,i)=>v-p[i]))})).sort((a,b)=>a.d-b.d)[0];
    if(nearest?.d<27){if(nearest.target.members.length===1)update({ccs:nearest.target.members[0]});else fitMembers(nearest.target.members);}
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
