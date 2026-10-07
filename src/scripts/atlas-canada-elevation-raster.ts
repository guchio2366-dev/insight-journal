import type { Map as LibreMap } from 'maplibre-gl';
import {projectCanadaLandform} from '../lib/atlas-canada-landform-map';
import {canadaNaturalPath, type CanadaNaturalCollection} from '../lib/atlas-canada-natural-layer';

export interface CanadaElevationRasterConfig {
 imageUrl:string;coordinates:[number,number][];width:number;height:number;palette:string[];
 groups:{id:string;outlineUrl:string;imageUrl:string;bounds:[[number,number],[number,number]]}[];
}
/** Discrete native-grid classes; imagery and selected outlines use the same pixels. */
export function createCanadaElevationRaster(root:HTMLElement,fallback:SVGSVGElement,config:CanadaElevationRasterConfig,signal:AbortSignal){
 const urls=new Map<string,Promise<string>>(),outlines=new Map<string,Promise<CanadaNaturalCollection>>(),outlineMetrics=new Map<string,{fetchMs:number;parseMs:number}>();
 const images=document.createElementNS('http://www.w3.org/2000/svg','g');images.dataset.canadaElevationRaster='';
 const raster=document.createElementNS(images.namespaceURI,'image'),outline=document.createElementNS(images.namespaceURI,'path');
 const [left,top]=projectCanadaLandform(config.coordinates[0]),[right,bottom]=projectCanadaLandform(config.coordinates[2]);
 for(const [key,value]of Object.entries({x:left,y:top,width:right-left,height:bottom-top,preserveAspectRatio:'none'}))raster.setAttribute(key,String(value));
 raster.setAttribute('style','image-rendering:pixelated');outline.setAttribute('fill','none');outline.setAttribute('stroke','#243f4c');outline.setAttribute('stroke-width','1');outline.setAttribute('stroke-opacity','.8');outline.setAttribute('vector-effect','non-scaling-stroke');
 images.append(raster,outline);fallback.querySelector('[data-canada-natural-definitions]')?.nextElementSibling?.after(images);
 let map:LibreMap|undefined,bitmap:ImageBitmap|undefined,canvas:HTMLCanvasElement|undefined,baseUrl='',lastImage='',selected:string|null=null,revision=0;
 async function imageUrl(path:string){
  let pending=urls.get(path);if(!pending){pending=(async()=>{const response=await fetch(path,{signal});if(!response.ok)throw Error(`標高画像 ${response.status}`);return URL.createObjectURL(await response.blob());})();urls.set(path,pending);pending.catch(()=>urls.delete(path));}return pending;
 }
 async function geometry(id:string){
  let pending=outlines.get(id);const cached=!!pending;if(!pending){pending=(async()=>{const started=performance.now(),response=await fetch(config.groups.find(g=>g.id===id)!.outlineUrl,{signal});if(!response.ok)throw Error(`標高輪郭 ${response.status}`);const body=await response.text(),received=performance.now(),data=JSON.parse(body);outlineMetrics.set(id,{fetchMs:received-started,parseMs:performance.now()-received});return data;})();outlines.set(id,pending);pending.catch(()=>outlines.delete(id));}const data=await pending;root.dataset.canadaElevationOutlineTiming=JSON.stringify({id,cached,...(cached?{fetchMs:0,parseMs:0}:outlineMetrics.get(id))});return data;
 }
 function hit(lon:number,lat:number){
  if(!bitmap)return null;
  const merc=(y:number)=>Math.log(Math.tan(Math.PI/4+y*Math.PI/360));
  const x=Math.floor((lon-config.coordinates[0][0])/(config.coordinates[1][0]-config.coordinates[0][0])*config.width),y=Math.floor((merc(config.coordinates[0][1])-merc(lat))/(merc(config.coordinates[0][1])-merc(config.coordinates[2][1]))*config.height);
  if(x<0||y<0||x>=config.width||y>=config.height)return null;
  if(!canvas){canvas=document.createElement('canvas');canvas.width=config.width;canvas.height=config.height;canvas.getContext('2d',{willReadFrequently:true})!.drawImage(bitmap,0,0);}
  const pixel=canvas.getContext('2d')!.getImageData(x,y,1,1).data;if(!pixel[3])return null;
  const color='#'+[...pixel.slice(0,3)].map(v=>v.toString(16).padStart(2,'0')).join(''),index=config.palette.indexOf(color);return index>0?config.groups[index-1].id:null;
 }
 return {
  async load(){baseUrl=await imageUrl(config.imageUrl);bitmap=await createImageBitmap(await (await fetch(baseUrl)).blob());raster.setAttribute('href',baseUrl);lastImage=config.imageUrl;},
  style(){return {sources:{'canada-elevation-image':{type:'image',url:baseUrl,coordinates:config.coordinates}},layers:[{id:'canada-elevation-image',type:'raster',source:'canada-elevation-image',paint:{'raster-resampling':'nearest','raster-fade-duration':0,'raster-opacity':1}}]};},
  attach(native:LibreMap){map=native;},hit,
  async render(id:string|null,only:boolean){
   selected=id;const version=++revision;root.dataset.canadaNaturalPaint='pending';
   root.dataset.canadaElevationOutlinePending=id?'true':'false';
   const notice=root.querySelector<HTMLElement>('[data-canada-natural-loading]'),noticeText=root.querySelector<HTMLElement>('[data-canada-natural-loading-text]');
   if(id&&notice&&noticeText){notice.hidden=false;noticeText.textContent='選択した区分の輪郭を読み込み中…色面全体は表示済みです。';}
   outline.setAttribute('d','');
   if(map)for(const g of config.groups){const layer=`canada-elevation-outline-${g.id}`;if(map.getLayer(layer))map.setLayoutProperty(layer,'visibility','none');}
   const finish=()=>{if(version===revision){root.dataset.canadaNaturalSelectionFrame=id??'none';root.dataset.canadaNaturalPaint='ready';root.dataset.canadaElevationOutlinePending='false';if(notice)notice.hidden=true;}};
   try{
    const group=config.groups.find(g=>g.id===id),path=only&&group?group.imageUrl:config.imageUrl;
    const [url,data]=await Promise.all([imageUrl(path),id?geometry(id):Promise.resolve(null)]);if(signal.aborted||version!==revision)return;
    if(path!==lastImage){raster.setAttribute('href',url);(map?.getSource('canada-elevation-image') as any)?.updateImage({url});lastImage=path;}
    if(map){
     for(const g of config.groups){const layer=`canada-elevation-outline-${g.id}`;if(map.getLayer(layer))map.setLayoutProperty(layer,'visibility',g.id===id?'visible':'none');}
     if(id&&data){const layer=`canada-elevation-outline-${id}`;if(!map.getSource(layer)){map.addSource(layer,{type:'geojson',data:data as any,tolerance:0});map.addLayer({id:layer,type:'line',source:layer,paint:{'line-color':'#243f4c','line-width':1,'line-opacity':.8}});}}
     map.once('idle',finish);map.triggerRepaint();
    }else{outline.setAttribute('d',data?data.features.map(f=>canadaNaturalPath(f.geometry)).join(''):'');finish();}
   }catch(error){if(signal.aborted||version!==revision)return;root.dataset.canadaNaturalPaint='error';root.dataset.canadaElevationOutlinePending='false';const message='色面は表示していますが、選択した輪郭を読み込めませんでした。もう一度区分を選んでください。';root.querySelector('[data-canada-natural-status]')!.textContent=message;if(notice&&noticeText){notice.hidden=false;noticeText.textContent=message;}console.warn(error);}
  },
  fallback(){map=undefined;if(baseUrl)void this.render(selected,false);},
  destroy(){bitmap?.close();canvas=undefined;for(const pending of urls.values())void pending.then(url=>URL.revokeObjectURL(url)).catch(()=>{});images.remove();},
 };
}
