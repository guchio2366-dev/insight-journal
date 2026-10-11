import {projectCanadaMap} from '../lib/atlas-canada-map-presentation';

/** PNG and query use the same pinned, original-derived Float32 distribution. */
export async function loadCanadaPopulationGrid(root:HTMLElement,config:any,choose:(id:string)=>void,render:()=>void){
 try{
  const base=config.populationGridBase,manifestResponse=await fetch(base+'/manifest.json');
  if(!manifestResponse.ok)throw Error('Population grid manifest unavailable');
  const manifest=await manifestResponse.json();
  if(manifest.populationYear!==2020||manifest.crs!=='EPSG:3857'||manifest.width*manifest.height>2000000||manifest.lookup.encoding!=='float32-le-gzip')throw Error('Population grid source contract mismatch');
  const response=await fetch(base+'/'+manifest.grid);if(!response.ok)throw Error('Population grid unavailable');
  const bytes=new Uint8Array(await response.arrayBuffer()),buffer=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():bytes.buffer;
  if(buffer.byteLength!==manifest.width*manifest.height*4)throw Error('Incomplete population grid');
  const view=new DataView(buffer),values=new Float32Array(manifest.width*manifest.height);
  for(let i=0;i<values.length;i++){const n=view.getFloat32(i*4,true);if(!Number.isFinite(n)||n<0&&n!==manifest.noData)throw Error('Invalid original-derived density');values[i]=n;}
  const decoded=new Image();decoded.src=base+'/'+manifest.image;await decoded.decode();
  if(decoded.naturalWidth!==manifest.width||decoded.naturalHeight!==manifest.height)throw Error('Population image/grid dimensions differ');
  if(!root.isConnected)return;
  const [west,south,east,north]=manifest.bounds4326,origin=projectCanadaMap([west,north]),edge=projectCanadaMap([east,south]),size=[edge[0]-origin[0],edge[1]-origin[1]],ns='http://www.w3.org/2000/svg';
  const group=root.querySelector('[data-population-grid]')!,image=document.createElementNS(ns,'image');
  for(const [name,value]of Object.entries({x:origin[0],y:origin[1],width:size[0],height:size[1],href:decoded.src,preserveAspectRatio:'none'}))image.setAttribute(name,String(value));
  image.dataset.populationGridImage='';image.style.imageRendering='pixelated';
  const cell=(id:string|null)=>{if(!id||!/^\d+,\d+$/.test(id))return null;const [col,row]=id.split(',').map(Number);if(col>=manifest.width||row>=manifest.height)return null;const value=values[row*manifest.width+col];return {id,col,row,density:value===manifest.noData?null:value,x:origin[0]+col/manifest.width*size[0],y:origin[1]+row/manifest.height*size[1],width:size[0]/manifest.width,height:size[1]/manifest.height};};
  const map=root.querySelector<SVGSVGElement>('[data-population-map]')!,selectAt=(x:number,y:number)=>{const col=Math.floor((x-origin[0])/size[0]*manifest.width),row=Math.floor((y-origin[1])/size[1]*manifest.height),id=col+','+row;if(cell(id))choose(id);};
  image.addEventListener('click',event=>{const matrix=map.getScreenCTM();if(!matrix)return;const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());selectAt(point.x,point.y);});
  map.addEventListener('keydown',event=>{if(event.target!==map||event.key!=='Enter'||(group as SVGElement).style.display==='none')return;event.preventDefault();const [x,y,w,h]=map.getAttribute('viewBox')!.split(' ').map(Number);selectAt(x+w/2,y+h/2);});
  image.setAttribute('role','img');image.setAttribute('aria-label','2020年の公表人口推計グリッド。地点のクリック、または地図のEnterキーで表示中央の密度を読みます。');
  group.replaceChildren(image);config.populationGrid={manifest,values,cell};(root as any).canadaPopulationGrid=config.populationGrid;root.dataset.populationGridReady='true';render();
 }catch(error){if(root.isConnected){root.dataset.populationGridError='true';render();}}
}

export function renderCanadaPopulationGrid(root:HTMLElement,config:any,visible:boolean){
 const group=root.querySelector<SVGElement>('[data-population-grid]');if(!group)return;
 group.style.display=visible?'':'none';group.querySelector('[data-population-grid-selected]')?.remove();
 const selected=visible?config.populationGrid?.cell(new URL(location.href).searchParams.get('grid')):null;
 if(!selected)return;
 const rectangle=document.createElementNS('http://www.w3.org/2000/svg','rect');rectangle.dataset.populationGridSelected=selected.id;
 for(const name of ['x','y','width','height'])rectangle.setAttribute(name,String(selected[name]));
 rectangle.setAttribute('fill','none');rectangle.setAttribute('stroke','#b54d23');rectangle.setAttribute('stroke-width','2');rectangle.setAttribute('vector-effect','non-scaling-stroke');rectangle.style.pointerEvents='none';group.append(rectangle);
}
