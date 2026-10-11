import {canadaMapPath} from '../lib/atlas-canada-map-presentation';
import {densityColor} from './atlas-canada-population-overview';

/** Each density remains attached to its original 2021 CSD; no area allocation. */
export async function loadCanadaPopulationSubdivisions(root:HTMLElement,config:any,select:(id:string)=>void,render:()=>void){
 try{
  const responses=await Promise.all([fetch(config.subdivisionsUrl),fetch(config.subdivisionGeometryUrl)]);
  if(responses.some(r=>!r.ok))throw Error('Subdivision source unavailable');
  const [data,geo]=await Promise.all(responses.map(r=>r.json())),records=new Map<string,any>(data.records.map((r:any)=>[r.id,r]));
  if(data.year!==2021||records.size!==5161||geo.features?.length!==5161||geo.features.some((f:any)=>!records.has(f.id)))throw Error('Incomplete original CSD join');
  if(!root.isConnected)return;
  const group=root.querySelector('[data-population-subdivisions]')!,fragment=document.createDocumentFragment();
  for(const f of geo.features){
   const record=records.get(f.id),path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.dataset.populationSubdivision=f.id;path.setAttribute('d',canadaMapPath(f.geometry));path.setAttribute('fill-rule','evenodd');path.setAttribute('fill',densityColor(record.density.value));path.setAttribute('role','button');path.setAttribute('tabindex','0');path.setAttribute('aria-label',`${record.name}・CSD：2021年 ${record.density.value===null?'未公表':record.density.value+'人/km²'}。人口・密度を読む`);
   path.addEventListener('click',()=>select(f.id));path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(f.id);}});fragment.append(path);
  }
  group.replaceChildren(fragment);config.subdivisions=data.records;root.dataset.subdivisionsReady='true';render();
 }catch(error){if(root.isConnected){root.dataset.subdivisionsError='true';render();}}
}
