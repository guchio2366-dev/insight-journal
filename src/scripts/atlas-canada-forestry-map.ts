import {canadaLegacyPath,canadaLegacyPoint,canadaMapPath,projectCanadaMap} from '../lib/atlas-canada-map-presentation';
import {unprojectCanadaLandform} from '../lib/atlas-canada-landform-map';
import type {CanadaForestryState} from '../lib/atlas-canada-forestry';

/** Render held 2020 class pixels in the common Canada projection. No area is inferred. */
export function initCanadaForestryMap(root:HTMLElement,config:any,onSelect:(id:string|null)=>void,onCamera:(camera:number[],replace:boolean)=>void){
 const canvas=root.querySelector<HTMLCanvasElement>('[data-forestry-canvas]')!;
 let context:CanvasRenderingContext2D|null=null;
 try{context=canvas.getContext('2d');}catch{return;}
 if(!context||typeof Path2D==='undefined')return;
 const ctx=context,frame=root.querySelector<HTMLElement>('[data-forestry-stage]')!,labels=root.querySelector<HTMLElement>('[data-forestry-labels]')!,fallback=root.querySelector<SVGElement>('[data-forestry-fallback]')!;
 const southCamera=[450,290,1],project=projectCanadaMap;
 const contexts=config.context.map((f:any)=>({id:f.properties.code,path:new Path2D(canadaMapPath(f.geometry))}));
 const provinces=config.provinceGeometry.map((f:any)=>({id:f.id,path:new Path2D(canadaLegacyPath(f.path)),bounds:[canadaLegacyPoint(f.bounds.slice(0,2)),canadaLegacyPoint(f.bounds.slice(2,4))]}));
 const allPoints=config.context.filter((f:any)=>f.properties.code==='CAN').flatMap((f:any)=>(f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()).flat().map(project));
 const bounds=allPoints.reduce((b:number[],p:number[])=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
 const fit=(b:number[],padding=.92)=>[(b[0]+b[2])/2,(b[1]+b[3])/2,Math.min(12,padding*Math.min(900/(b[2]-b[0]),580/(b[3]-b[1])))];
 const wholeCamera=fit(bounds);
 const rivers=config.rivers.map((f:any)=>({path:new Path2D(canadaMapPath(f.geometry)),feature:f}));
 const images=new Map<string,HTMLImageElement>();
 let ready=false,state:CanadaForestryState, camera=southCamera.slice(),width=0,height=0,scale=1,raf=0;
 const items:any[]=[];
 function addLabel(text:string,point:number[],kind:string,id?:string){
  const element=document.createElement(id?'button':'span');element.className='forestry-map-label '+kind;element.textContent=text;element.hidden=true;
  if(id){element.setAttribute('type','button');element.dataset.forestRegion=id;element.setAttribute('aria-label',config.regions.find((r:any)=>r.id===id).name+'の説明を読む');element.addEventListener('click',()=>onSelect(id));}
  labels.append(element);items.push({text,point,kind,id,element});
 }
 for(const r of config.regions)addLabel(r.id==='bc'?'BC':r.name,canadaLegacyPoint(r.point),'region',r.id);
 for(const p of config.places)addLabel(p.id==='ottawa'?'Ottawa（首都）':'Vancouver',project(p.coordinates),'city');
 for(const r of config.rivers){const lines=r.geometry.type==='LineString'?[r.geometry.coordinates]:r.geometry.coordinates,line=lines.reduce((a:number[][],b:number[][])=>a.length>b.length?a:b);addLabel(r.properties.name==='Fraser'?'Fraser川':'セントローレンス川',project(line[Math.floor(line.length*.55)]),'river');}
 for(const [name,point] of [['太平洋',[-135,48]],['大西洋',[-57,48]],['ハドソン湾',[-85,59]]] as const)addLabel(name,project(point),'ocean');
 const screen=([x,y]:number[])=>[(x-camera[0])*scale+width/2,(y-camera[1])*scale+height/2];
 const world=([x,y]:number[])=>[(x-width/2)/scale+camera[0],(y-height/2)/scale+camera[1]];
 const overlaps=(a:number[],b:number[])=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
 const visible=([x,y]:number[])=>x>=4&&x<=width-4&&y>=4&&y<=height-4;
 function drawLabels(){
  const origin=frame.getBoundingClientRect(),boxes=[...root.querySelectorAll('.forestry-map-tools,.forestry-map-year,.country-topic-tabs')].map(e=>{const b=e.getBoundingClientRect();return [b.left-origin.left-5,b.top-origin.top-5,b.right-origin.left+5,b.bottom-origin.top+5];});
  const placements=[];
  for(const item of items){const p=screen(item.point),el=item.element;el.hidden=!visible(p);if(el.hidden)continue;
   if(item.id)el.setAttribute('aria-pressed',String(state.region===item.id));
   const box=el.getBoundingClientRect(),w=box.width,h=box.height;
   const candidates=[[p[0]+8,p[1]-h/2],[p[0]-w-8,p[1]-h/2],[p[0]-w/2,p[1]-h-10],[p[0]-w/2,p[1]+10]];
   for(let radius=30;radius<=150;radius+=20)for(const [dx,dy] of [[0,-radius],[0,radius],[-radius,0],[radius,0],[-radius,-radius],[radius,radius],[-radius,radius],[radius,-radius]])candidates.push([p[0]+dx-w/2,p[1]+dy-h/2]);
   // Ocean names stay at their actual anchor, or are omitted when crowded.
   const choices=item.kind==='ocean'?[[p[0]-w/2,p[1]-h/2]]:candidates.map(([x,y])=>[Math.max(5,Math.min(width-w-5,x)),Math.max(5,Math.min(height-h-5,y))]);
   const selected=choices.find(([x,y])=>x>=5&&y>=5&&x+w<=width-5&&y+h<=height-5&&!boxes.some(b=>overlaps([x-3,y-3,x+w+3,y+h+3],b)));
   if(!selected){el.hidden=true;continue;}
   const [x,y]=selected;el.style.left=x+'px';el.style.top=y+'px';boxes.push([x-2,y-2,x+w+2,y+h+2]);
   if(item.kind!=='ocean'){ctx.strokeStyle=item.kind==='river'?'#467e9e':'#617b71';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(...p as [number,number]);ctx.lineTo(Math.max(x,Math.min(x+w,p[0])),Math.max(y,Math.min(y+h,p[1])));ctx.stroke();ctx.beginPath();ctx.arc(p[0],p[1],item.kind==='region'?3.5:2.5,0,Math.PI*2);ctx.fillStyle=item.kind==='city'?'#254c68':'#fffef5';ctx.fill();ctx.stroke();}
   placements.push({id:item.id??item.text,box:[x,y,x+w,y+h],point:p});
  }
  return placements;
 }
 function drawForest(id:string,alpha:number){
  const image=images.get(id)!;ctx.save();ctx.globalAlpha=alpha;
  const [west,south,east,north]=config.forestBounds,dpr=canvas.height/height;
  const x=screen(project([west,north]))[0],w=screen(project([east,north]))[0]-x;
  ctx.setTransform(canvas.width/width,0,0,dpr,0,0);
  // Inverse-map each display pixel row. Forward-drawing subpixel source rows
  // drops narrow rows in Chromium at small PC widths; nearest source rows keep
  // discrete class colors without interpolating or inventing forest cover.
  for(let row=0;row<canvas.height;row++){
   const latitude=unprojectCanadaLandform(world([0,(row+.5)/dpr]))[1];
   const sourceRow=Math.floor((north-latitude)/(north-south)*image.naturalHeight);
   if(sourceRow<0||sourceRow>=image.naturalHeight)continue;
   ctx.drawImage(image,0,sourceRow,image.naturalWidth,1,x,row/dpr,w,1/dpr);
  }
  ctx.restore();
 }
 function renderNow(){
  raf=0;if(!ready||!state)return;
  const box=frame.getBoundingClientRect();width=box.width;height=box.height;if(!width||!height)return;
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  camera=state.camera?.slice()??southCamera.slice();
  const region=config.regions.find((r:any)=>r.id===state.region),province=provinces.find((p:any)=>p.id===region?.province);
  if(state.zoom&&province)camera=fit([...province.bounds[0],...province.bounds[1]],.8);
  scale=Math.min(width/900,height/580)*camera[2];ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#e4eff0';ctx.fillRect(0,0,width,height);
  ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-camera[0],-camera[1]);ctx.imageSmoothingEnabled=false;
  for(const c of contexts){ctx.fillStyle=c.id==='CAN'?'#eeeade':'#deded9';ctx.fill(c.path,'evenodd');ctx.strokeStyle='#aab8ae';ctx.lineWidth=.8/scale;ctx.stroke(c.path);}
  drawForest('all',state.cover==='all'?1:.3);if(state.cover!=='all')drawForest(state.cover,1);
  ctx.strokeStyle='#829c90';ctx.lineWidth=.55/scale;for(const p of provinces)ctx.stroke(p.path);
  ctx.strokeStyle='#36749c';ctx.lineWidth=1.2/scale;for(const r of rivers)ctx.stroke(r.path);
  if(province){ctx.strokeStyle='#fffef5';ctx.lineWidth=5/scale;ctx.stroke(province.path);ctx.strokeStyle='#ac482b';ctx.lineWidth=2.5/scale;ctx.stroke(province.path);}
  ctx.restore();const placements=drawLabels();
  const cover=state.cover==='all'?'森林4分類すべて':config.classes.find((c:any)=>c.id===state.cover).name+'を強調（他分類も保持）';
  root.querySelector<HTMLElement>('[data-forestry-map-status]')!.textContent='2020年固定：'+cover+'。'+(region?region.name+'を選択':'地域未選択')+'。';
  (root as any).canadaForestryMap={ready:true,camera:camera.slice(),wholeCamera:wholeCamera.slice(),sourceYear:2020,sourceClasses:config.classes.map((c:any)=>c.id),visibleLayers:state.cover==='all'?['all']:['all',state.cover],selectedProvince:province?.id??null,labels:placements,sourceSize:[images.get('all')!.naturalWidth,images.get('all')!.naturalHeight],screen:(p:number[])=>screen(p),project};
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(renderNow);};
 function move(next:number[],replace=false){onCamera([Math.max(-500,Math.min(1500,next[0])),Math.max(-2000,Math.min(2000,next[1])),Math.max(.2,Math.min(12,next[2]))],replace);}
 function zoom(factor:number){move([camera[0],camera[1],camera[2]*factor]);}
 for(const button of root.querySelectorAll<HTMLElement>('[data-forestry-zoom]'))button.addEventListener('click',()=>zoom(button.dataset.forestryZoom==='in'?1.4:1/1.4));
 let drag:{x:number;y:number;camera:number[];moved:boolean}|null=null;
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,camera:camera.slice(),moved:false};});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;const replace=drag.moved;drag.moved=true;move([drag.camera[0]-dx/scale,drag.camera[1]-dy/scale,drag.camera[2]],replace);});
 canvas.addEventListener('pointerup',e=>{if(!drag)return;const clicked=!drag.moved;drag=null;canvas.releasePointerCapture(e.pointerId);if(!clicked)return;const b=canvas.getBoundingClientRect(),p=world([e.clientX-b.left,e.clientY-b.top]);ctx.save();ctx.setTransform(1,0,0,1,0,0);const selected=config.regions.find((r:any)=>ctx.isPointInPath(provinces.find((p:any)=>p.id===r.province).path,p[0],p[1],'evenodd'));ctx.restore();if(selected)onSelect(selected.id);});
 canvas.addEventListener('pointercancel',()=>{drag=null;});
 canvas.addEventListener('keydown',e=>{if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(['+','='].includes(e.key))zoom(1.4);else if(e.key==='-')zoom(1/1.4);else move([camera[0]+(e.key==='ArrowLeft'?-50:e.key==='ArrowRight'?50:0)/scale,camera[1]+(e.key==='ArrowUp'?-50:e.key==='ArrowDown'?50:0)/scale,camera[2]]);}});
 const observer=new ResizeObserver(schedule);observer.observe(frame);
 Promise.all(Object.entries(config.forestAssets).map(([id,url])=>new Promise<void>((resolve,reject)=>{const image=new Image();image.onload=()=>{images.set(id,image);resolve();};image.onerror=reject;image.src=String(url);}))).then(()=>{ready=true;fallback.setAttribute('hidden','');fallback.setAttribute('aria-hidden','true');canvas.hidden=false;labels.hidden=false;schedule();}).catch(()=>{root.dataset.forestryMapFallback='true';root.querySelector<HTMLElement>('[data-forestry-map-status]')!.textContent='森林画像を操作地図へ読み込めませんでした。元の等緯度経度図と地域一覧で確認できます。';});
 return {wholeCamera,render(next:CanadaForestryState){state=next;schedule();}};
}
