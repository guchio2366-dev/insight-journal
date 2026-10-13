import type {Map,MapMouseEvent} from 'maplibre-gl';
import type {JapanState} from '../lib/atlas-japan-state';
import {japanInsetBounds} from '../data/atlas/japan-areas';
import {japanBaseStyle} from '../lib/atlas-japan-map-style';
import {mountJapanAgricultureLayers} from './atlas-japan-agriculture-layers';
import {japanFarmRegionalSeriesById} from '../data/atlas/japan-farm-regional-statistics';
import {mountJapanNatureLayers,type JapanNatureLayers} from './atlas-japan-nature-layers';
export type InsetLabel={id:string;title:string;subtitle:string;point:[number,number];color:string;select:()=>void;selected:boolean;muted?:boolean;reference?:boolean};
export async function mountJapanInset(root:HTMLElement,lib:typeof import('maplibre-gl'),geography:any,prefectures:any,population:any,assetBase:string,natureBase:string,onClick:(event:MapMouseEvent,map:Map,nature:JapanNatureLayers|null,farm:ReturnType<typeof mountJapanAgricultureLayers>|null)=>void){
 const holder=root.querySelector<HTMLElement>('[data-japan-inset]')!,surface=holder.querySelector<HTMLElement>('[data-japan-inset-surface]')!,overlay=holder.querySelector<HTMLElement>('[data-japan-inset-labels]')!;
 root.dataset.insetError='false';root.dataset.insetReady='false';const insetStatus=holder.querySelector<HTMLElement>('[data-japan-inset-status]')!;insetStatus.hidden=false;insetStatus.textContent='挿入図を読み込んでいます';
 const map=new lib.Map({container:surface,attributionControl:false,interactive:false,renderWorldCopies:false,dragRotate:false,touchPitch:false,maxPitch:0,minZoom:1,maxZoom:10,trackResize:false,pixelRatio:Math.min(devicePixelRatio,2),style:japanBaseStyle(geography,prefectures,population,assetBase) as any});
 map.addControl(new lib.ScaleControl({maxWidth:70,unit:'metric'}),'bottom-right');
 let nature:JapanNatureLayers|null=null,farm:ReturnType<typeof mountJapanAgricultureLayers>|null=null,loaded=false,lastState:JapanState|null=null,lastLabels:InsetLabel[]=[];
 const markers:import('maplibre-gl').Marker[]=[];
 const fit=()=>{map.resize();map.fitBounds([[japanInsetBounds[0],japanInsetBounds[1]],[japanInsetBounds[2],japanInsetBounds[3]]],{padding:8,duration:0});root.dataset.insetCamera=JSON.stringify({lng:map.getCenter().lng,lat:map.getCenter().lat,zoom:map.getZoom()});root.dataset.insetExtent=JSON.stringify(map.getBounds().toArray());};
 function render(state:JapanState,labels:InsetLabel[]){
  lastState=state;lastLabels=labels;holder.hidden=state.area!=='japan';if(!loaded||holder.hidden)return;
  fit();map.setLayoutProperty('japan-population','visibility',state.field==='population'?'visible':'none');map.setLayoutProperty('japan-prefecture-fill','visibility',state.field==='industry'&&state.topic.startsWith('jp-')?'visible':'none');map.setFilter('japan-prefecture-selected',['==',['get','id'],state.prefecture??'']);farm?.show(state.field,state.topic,state);nature?.show(state.field==='natural'?state.topic:'',state.feature);
  markers.splice(0).forEach(m=>m.remove());overlay.replaceChildren();
  for(const label of labels.filter(l=>l.point[0]>=japanInsetBounds[0]&&l.point[0]<=japanInsetBounds[2]&&l.point[1]>=japanInsetBounds[1]&&l.point[1]<=japanInsetBounds[3])){
   const dot=document.createElement(label.reference?'span':'button');if(dot instanceof HTMLButtonElement)dot.type='button';dot.className='japan-point';dot.classList.toggle('is-muted',!!label.muted);dot.style.setProperty('--point-color',label.color);const series=japanFarmRegionalSeriesById(state.farmData),row=series?.rows.find(r=>'farm-'+r.id===label.id);if(row&&series){const max=Math.max(...series.rows.map(r=>r.value));dot.classList.add('farm-quantity');dot.classList.toggle('is-rounded-zero',row.status==='rounded-zero');dot.style.setProperty('--farm-marker-diameter',Math.max(7,Math.round(30*Math.sqrt(row.value/max)))+'px');}dot.setAttribute('aria-label',label.title+'（'+label.subtitle+'・挿入図）');if(!label.reference){dot.setAttribute('aria-pressed',String(label.selected));dot.addEventListener('click',label.select);}markers.push(new lib.Marker({element:dot}).setLngLat(label.point).addTo(map));
   const button=document.createElement(label.reference?'span':'button');if(button instanceof HTMLButtonElement){button.type='button';button.addEventListener('click',label.select);button.setAttribute('aria-pressed',String(label.selected));}else button.className='japan-reference-label';button.dataset.japanInsetLabel=label.id;button.textContent=label.title;button.style.setProperty('--point-color',label.color);const p=map.project(label.point);button.style.left=Math.max(2,Math.min(surface.clientWidth-75,p.x+8))+'px';button.style.top=Math.max(2,p.y-15)+'px';overlay.append(button);
  }
  root.dataset.insetTopic=state.field+':'+state.topic;map.triggerRepaint();
 }
 map.on('click',event=>onClick(event,map,nature,farm));
 map.on('error',()=>{root.dataset.insetError='true';insetStatus.hidden=false;insetStatus.textContent='挿入図の一部を取得できませんでした';});
 await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{map.remove();reject(new Error('Japan inset load timeout'));},20000);map.once('load',()=>{clearTimeout(timer);resolve();});});
 loaded=true;farm=mountJapanAgricultureLayers(map,assetBase.replace('japan-v1/','japan-agriculture-v3/'));try{nature=await mountJapanNatureLayers(map,natureBase);}catch{root.dataset.insetError='true';insetStatus.textContent='挿入図の自然環境を取得できませんでした';}
 root.dataset.insetReady='true';insetStatus.hidden=root.dataset.insetError!=='true';if(lastState)render(lastState,lastLabels);
 return {render,setQuantityPaint(expression:any){map.setPaintProperty('japan-prefecture-fill','fill-color',expression);},resize(){if(lastState)render(lastState,lastLabels);},remove(){markers.forEach(m=>m.remove());map.remove();}};
}
