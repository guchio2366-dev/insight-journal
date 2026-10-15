import raw from '../data/atlas/latin-america/industry-sectors.json';
import {latinCountries,latinViewBox,projectLatin,latinPath,type LatinGeometry} from './atlas-latin-america-geometry';
import {escapeLatinIndustryText as esc} from './atlas-latin-industry-evidence';
import {industrySiteViews,industryIdsInSector,industryReferenceSites,industryMapCaptions,industryClusterName,industryNameInSector} from './atlas-latin-industry-layers';
export type IndustrySector='resources'|'manufacturing'|'services';
export type IndustrySectorState={sector:IndustrySector;industry:string|null;site:string|null;single:boolean;scope:'all'|'central'|'south';place:string;contextScope?:'country'};
export type LatinIndustrySite={id:string;industry:string;place:string;country:string;coordinates:number[];stage:string;stageKind:string;sectors:string[];sources:string[];note:string;coordinateMeaning:string;regionIds?:string[];locationKind?:string;coordinateSource:{type:string}};
export type LatinSectorIndustry={id:string;label:string;mapLabel?:string;color:string;sectors:string[];labels:Record<string,string>;overview:string;why:string;sources:string[]};
export const latinIndustrySectors=raw as typeof raw&{sites:LatinIndustrySite[];industries:LatinSectorIndustry[]};
export const sectorIndustries=(sector:string):LatinSectorIndustry[]=>{const ids=industryIdsInSector(sector);return raw.industries.filter(i=>ids.has(i.id));};
export const sectorSites=(sector:string):LatinIndustrySite[]=>industrySiteViews(sector);
const southernCountries=new Set(['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Guyana','Paraguay','Peru','Suriname','Uruguay','Venezuela','French Guiana']);
export const sectorSitesForScope=(sector:string,scope:string)=>sectorSites(sector).filter(s=>scope==='all'||(scope==='south'?southernCountries.has(s.country):!southernCountries.has(s.country)));
export const industryById=(id:string|null):LatinSectorIndustry|undefined=>raw.industries.find(i=>i.id===id);
// Keep the category hue while giving small text sufficient contrast on the map.
export const industryLabelColor=(color:string)=>'#'+[1,3,5].map(start=>Math.round(parseInt(color.slice(start,start+2),16)*.75).toString(16).padStart(2,'0')).join('');
export function readIndustrySectorState(url:URL):IndustrySectorState{
 const p=url.searchParams;let sector=(['resources','manufacturing','services'].includes(p.get('sector')??'')?p.get('sector'):'resources') as IndustrySector;
 // Retain old resource-chain URLs while moving processing-only sites to their map.
 if(sector==='resources'){
  const old=raw.sites.find(s=>s.id===p.get('site')&&s.sectors.includes('resources'));
  const id=old?.industry??p.get('industry');
  if(id&&!industryIdsInSector('resources').has(id)&&industryIdsInSector('manufacturing').has(id))sector='manufacturing';
  else if(old&&!sectorSites('resources').some(s=>s.id===old.id)&&sectorSites('manufacturing').some(s=>s.id===old.id))sector='manufacturing';
 }
 const site=[...sectorSites(sector),...industryReferenceSites(sector)].find(s=>s.id===p.get('site'));
 const industry=site?.industry??sectorIndustries(sector).find(i=>i.id===p.get('industry'))?.id??null;
 const place=latinCountries.some(c=>c.code===p.get('place'))?p.get('place')!:'all';
 return{sector,industry,site:site?.id??null,single:!!industry&&p.get('single')==='1',scope:p.get('scope')==='central'?'central':p.get('scope')==='south'?'south':'all',place,...(place!=='all'&&p.get('scope')==='country'?{contextScope:'country' as const}:{})};
}
export function writeIndustrySectorState(url:URL,state:IndustrySectorState):URL{
 const next=new URL(url);for(const key of ['layer','case','section','from','sourceLayer','sourcePlace','sourceScope','sourceOnly','sourceFallback'])next.searchParams.delete(key);
 for(const[key,value]of Object.entries({sector:state.sector,industry:state.industry,site:state.site,single:state.single?'1':null,scope:state.contextScope??state.scope,place:state.place==='all'?null:state.place}))value?next.searchParams.set(key,value):next.searchParams.delete(key);
 return next;
}
type Label={id:string;industry:string;sites:string[];text:string;annotation:string|null;x:number;y:number;anchorX:number;anchorY:number;width:number;height:number;fontSize:number};
type PointSite=LatinIndustrySite&{point:number[];displayPoint:number[]};
export type IndustryMapCluster={id:string;industry:string;members:PointSite[];point:number[];displayPoint:number[];stageKind:string};
type Scene={frame:number[];k:number;visible:PointSite[];clusters:IndustryMapCluster[];labels:Label[];overviewLabels:Label[];width:number;height:number};
const sceneCache=new Map<string,Scene>();
const overlaps=(a:number[],b:number[],gap=3)=>a[0]<b[2]+gap&&a[2]>b[0]-gap&&a[1]<b[3]+gap&&a[3]>b[1]-gap;
const textWidth=(s:string,size:number)=>[...s].reduce((sum,c)=>sum+(/[\u0000-\u007f]/.test(c)?size*.59:size),0);
const distance=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const medoid=(sites:PointSite[])=>[...sites].sort((a,b)=>sites.reduce((sum,s)=>sum+distance(a.point,s.point),0)-sites.reduce((sum,s)=>sum+distance(b.point,s.point),0))[0];

/** Sector captions keep the same slots and industry-first text during selection. */
export function industrySectorScene(state:IndustrySectorState,width=960,height=770):Scene{
 const cacheKey=[state.sector,state.scope,width,height].join('|'),cached=sceneCache.get(cacheKey);if(cached)return cached;
 const original=latinViewBox(state.scope,'all'),k=Math.min(width/original[2],height/original[3]);
 const frame=[original[0]+original[2]/2-width/k/2,original[1]+original[3]/2-height/k/2,width/k,height/k];
 const point=(coordinates:number[])=>{const p=projectLatin(coordinates);return[(p[0]-frame[0])*k,(p[1]-frame[1])*k];};
 const compact=width<620;
 const visible=sectorSitesForScope(state.sector,state.scope).map(s=>({...s,point:point(s.coordinates),displayPoint:point(s.coordinates)}))
  .filter(s=>s.point[0]>7&&s.point[0]<width-7&&s.point[1]>7&&s.point[1]<height-7);
 const groups:PointSite[][]=[];
 // Display aggregation only: same product, country and phase; no quantity is summed.
 for(const site of visible){
  const group=groups.find(g=>g[0].industry===site.industry&&g[0].country===site.country&&g[0].stageKind===site.stageKind&&g.every(s=>distance(s.point,site.point)<=(compact?32:28)));
  if(group)group.push(site);else groups.push([site]);
 }
 const placed:number[][]=[],offsets:number[][]=[[0,0]];
 for(const radius of [8,16,24])for(let angle=0;angle<16;angle++)offsets.push([Math.cos(angle*Math.PI/8)*radius,Math.sin(angle*Math.PI/8)*radius]);
 const clusters=groups.map(members=>{
  const anchor=medoid(members),displayPoint=offsets.map(([dx,dy])=>[anchor.point[0]+dx,anchor.point[1]+dy]).find(p=>p[0]>8&&p[0]<width-8&&p[1]>8&&p[1]<height-8&&placed.every(q=>distance(p,q)>=12))??anchor.point;
  placed.push(displayPoint);return{id:members.map(s=>s.id).sort().join('+'),industry:anchor.industry,members,point:anchor.point,displayPoint,stageKind:anchor.stageKind};
 });
 const placeLabels=(entries:{id:string;industry:string;sites:PointSite[];text:string;annotation:string|null}[],limit:number)=>{
  const labels:Label[]=[],occupied:number[][]=[];
  for(const entry of entries){
   if(labels.length>=limit||!entry.sites.length)continue;
   const sourceAnchor=medoid(entry.sites),anchorPoint=clusters.find(c=>c.members.some(s=>s.id===sourceAnchor.id))?.displayPoint??sourceAnchor.point,[anchorX,anchorY]=anchorPoint,fontSize=compact?12:13;
   const w=Math.ceil(Math.max(textWidth(entry.text,fontSize),entry.annotation?textWidth(entry.annotation,11):0)+8),h=entry.annotation?32:21;
   if(w>width-16)continue;
   const candidates:number[][]=[];
   for(const gap of [7,15,23,31])for(const side of ['right','left','above','below','north-east','north-west','south-east','south-west']){
    const x=side==='left'||side.endsWith('west')?anchorX-gap-w:side==='right'||side.endsWith('east')?anchorX+gap:anchorX-w/2;
    const y=side==='above'||side.startsWith('north')?anchorY-gap:side==='below'||side.startsWith('south')?anchorY+gap+h:anchorY+h/2;
    candidates.push([Math.max(8,Math.min(width-w-8,x)),Math.max(h+8,Math.min(height-8,y))]);
   }
   const fits=(x:number,y:number)=>{
    const nx=Math.max(x,Math.min(anchorX,x+w)),ny=Math.max(y-h,Math.min(anchorY,y));
    return distance([nx,ny],anchorPoint)<=36&&occupied.every(b=>!overlaps([x,y-h,x+w,y],b))&&clusters.every(c=>!overlaps([x,y-h,x+w,y],[c.displayPoint[0]-6,c.displayPoint[1]-6,c.displayPoint[0]+6,c.displayPoint[1]+6],1));
   };
   const position=candidates.find(([x,y])=>fits(x,y));if(!position)continue;
   const [x,y]=position;occupied.push([x,y-h,x+w,y]);labels.push({id:entry.id,industry:entry.industry,sites:entry.sites.map(s=>s.id),text:entry.text,annotation:entry.annotation,x,y,anchorX,anchorY,width:w,height:h,fontSize});
  }
  return labels;
 };
 const captions=industryMapCaptions.filter(c=>c.sector===state.sector).map(c=>({id:c.id,industry:'',sites:visible.filter(s=>c.sites.includes(s.id)),text:c.text,annotation:c.place}));
 const overviewLabels=placeLabels(captions,compact?4:8);
 const labels=sectorIndustries(state.sector).flatMap(i=>placeLabels(clusters.filter(c=>c.industry===i.id).map(c=>({id:c.id,industry:i.id,sites:c.members,text:industryClusterName(c.members),annotation:null})),compact?3:5));
 const scene={frame,k,visible,clusters,labels,overviewLabels,width,height};if(sceneCache.size>=24)sceneCache.delete(sceneCache.keys().next().value!);sceneCache.set(cacheKey,scene);return scene;
}

export function renderIndustrySectorMap(state:IndustrySectorState,width=960,height=770){
 const scene=industrySectorScene(state,width,height),ids=industryIdsInSector(state.sector);
 const shape=latinCountries.map(c=>`<path d="${c.path}" fill="#f2f1e8" stroke="#a6b2ab" stroke-width=".65" fill-rule="evenodd" vector-effect="non-scaling-stroke"/>`).join('');
 const regions=raw.regions.filter(r=>r.industries.some(id=>ids.has(id))).map(r=>{
  const active=!!state.industry&&r.industries.includes(state.industry),color=industryById(state.industry)?.color??'#84958c';
  return `<path data-lis-region="${r.id}" d="${latinPath(r.geometry as LatinGeometry)}" fill="${active?color:'none'}" fill-opacity=".08" stroke="${active?color:'#c6cec6'}" stroke-width="${active?1.1:.35}" stroke-dasharray="${active?'3 2':'none'}" fill-rule="evenodd" vector-effect="non-scaling-stroke"><title>${esc(r.label+'：'+r.meaning)}</title></path>`;
 }).join('');
 const marks=scene.clusters.filter(c=>!state.single||c.industry===state.industry).sort((a,b)=>Number(a.industry===state.industry)-Number(b.industry===state.industry)).map(c=>{
  const[x,y]=c.displayPoint,i=industryById(c.industry)!,selected=c.industry===state.industry,active=c.members.some(s=>s.id===state.site),regional=c.members.every(s=>s.coordinateSource.type==='admin-region-guide'),one=c.members.length===1;
  const radius=one?3.8:5.2,symbol=c.stageKind==='extraction'?`<circle cx="${x}" cy="${y}" r="${radius}"/>`:c.stageKind==='processing'?`<rect x="${x-radius}" y="${y-radius}" width="${radius*2}" height="${radius*2}"/>`:`<path d="M${x} ${y-radius-0.4}l${radius+.4} ${radius+.4}-${radius+.4} ${radius+.4}-${radius+.4}-${radius+.4}Z"/>`;
  const names=c.members.map(s=>s.place+'：'+s.stage).join('／'),caption=industryNameInSector(c.industry,state.sector)+'：'+(one?names:`掲載例${c.members.length}件（${names}）`);
  return `<g data-lis-cluster="${c.id}" data-lis-industry="${c.industry}" ${one?`data-lis-site="${c.members[0].id}"`:''} data-industry="${c.industry}" data-lis-members="${c.members.map(s=>s.id).join(' ')}" data-source-count="${c.members.length}" data-source-coordinate="${medoid(c.members).coordinates.join(',')}" data-source-coordinates="${esc(JSON.stringify(c.members.map(s=>s.coordinates)))}" data-screen-point="${x.toFixed(3)},${y.toFixed(3)}" tabindex="0" role="button" aria-label="${esc(caption)}" aria-pressed="${selected}" opacity="${state.industry&&!selected?'.30':'1'}"><title>${esc(caption)}</title><circle data-lis-hit cx="${x}" cy="${y}" r="8" fill="transparent" pointer-events="all"/><g fill="${regional||!one?'#fffefa':i.color}" stroke="${regional||!one?i.color:'#fffefa'}" stroke-width="1.2">${symbol}</g>${c.members.length>1?`<text x="${x}" y="${y+2.8}" text-anchor="middle" fill="${industryLabelColor(i.color)}" font-family="sans-serif" font-size="8" pointer-events="none">${c.members.length}</text>`:''}${selected?`<circle cx="${x}" cy="${y}" r="${active?7:5.7}" fill="none" stroke="${i.color}" stroke-width="${active?2:1.3}" pointer-events="none"/>`:''}</g>`;
 }).join('');
 const visibleLabels=scene.overviewLabels.filter(label=>!state.single||label.sites.some(id=>scene.visible.some(site=>site.id===id&&site.industry===state.industry)));
 const labels=visibleLabels.map(l=>{
  const color=l.industry?industryLabelColor(industryById(l.industry)!.color):'#425e50',nearX=Math.max(l.x,Math.min(l.anchorX,l.x+l.width)),nearY=Math.max(l.y-l.height,Math.min(l.anchorY,l.y));
  const connector=distance([nearX,nearY],[l.anchorX,l.anchorY])>7?`<path data-lis-leader d="M${l.anchorX} ${l.anchorY}L${nearX} ${nearY}" stroke="#8b9b8d" stroke-width=".6"/>`:'';
  return `<g data-lis-label="${l.id}" data-lis-label-kind="${l.industry?'selected-place':'overview'}" aria-label="${esc(l.text+(l.annotation?' · '+l.annotation:''))}">${connector}<text x="${l.x+4}" y="${l.y-l.height+l.fontSize+3}" font-size="${l.fontSize}" font-family="sans-serif" font-weight="600" fill="${color}" stroke="#fffefa" stroke-width="2.5" paint-order="stroke" stroke-linejoin="round">${esc(l.text)}${l.annotation?`<tspan x="${l.x+4}" y="${l.y-3}" font-size="11" font-weight="400">${esc(l.annotation)}</tspan>`:''}</text></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="latin-sector-map" data-lis-svg data-lis-map-sector="${state.sector}" role="group" aria-label="中南米の${esc(raw.sectors.find(s=>s.id===state.sector)!.label)}、この分野の工程と立地例"><g transform="matrix(${scene.k} 0 0 ${scene.k} ${-scene.frame[0]*scene.k} ${-scene.frame[1]*scene.k})" aria-hidden="true">${shape}<g data-lis-regions>${regions}</g></g><g data-lis-marks>${marks}</g><g data-lis-labels pointer-events="none">${labels}</g></svg>`;
}
