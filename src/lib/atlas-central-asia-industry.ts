import {centralIndustries,centralIndustrySites,centralIndustryCountries,centralIndustryMetric,type CentralIndustryId,type CentralIndustrySector,type CentralCountry,type CentralSite} from '../data/atlas/central-asia-industry.ts';

export type CentralIndustryState={sector:CentralIndustrySector;industry:CentralIndustryId|null;site:string|null;only:boolean;country:CentralCountry|null;frame:number[]|null};
// Local equirectangular projection with a 44°N standard parallel, shared by
// all boundaries, guide coordinates and saved camera frames. Not an area scale.
export function projectCentralIndustry([lng,lat]:readonly number[]):[number,number]{return [(lng-45)*20*Math.cos(44*Math.PI/180),(56-lat)*20];}
export function centralIndustryGeometryPath(geometry:any):string{
 const rings=geometry.type==='MultiPolygon'?geometry.coordinates.flat():geometry.type==='Polygon'?geometry.coordinates:geometry.type==='MultiLineString'?geometry.coordinates:[geometry.coordinates];
 return rings.map((ring:number[][])=>ring.map((point,i)=>{const [x,y]=projectCentralIndustry(point);return `${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;}).join('')+(geometry.type.includes('Polygon')?'Z':'')).join('');
}
const legacyIndustries:Record<string,CentralIndustryId>={'sc-oilgas':'oil','sc-minerals':'uranium','sc-cotton':'textiles','sc-hydro':'hydro'};
export function readCentralIndustryState(url:URL):CentralIndustryState{
 const p=url.searchParams,topic=p.get('topic')??'',siteCandidate=p.get('detail')??p.get('site'),rawIndustry=p.get('subsector')??legacyIndustries[topic]??topic.replace(/^central-/,''),item=centralIndustries.find(i=>i.id===rawIndustry),rawSector=p.get('sector');
 const sector:CentralIndustrySector=['resources','manufacturing','services'].includes(rawSector??'')?rawSector as CentralIndustrySector:item?.sectors[0]??'resources';
 const legacySet=topic==='sc-oilgas'?['oil','gas']:topic==='sc-minerals'?['uranium','copper','gold','chromium']:[];
 const legacySite=!p.has('subsector')?centralIndustrySites.find(s=>s.id===siteCandidate&&s.sectors.includes(sector)&&legacySet.includes(s.industry)):undefined;
 const industry=legacySite?.industry??(item?.sectors.includes(sector)?item.id:null);
 const site=centralIndustrySites.find(s=>s.id===siteCandidate&&s.sectors.includes(sector)&&(!industry||s.industry===industry));
 const parts=p.get('industryFrame')?.split(',')??[],values=parts.map(Number);
 const frame=parts.length===4&&parts.every(v=>v.trim()!=='')&&values.every(Number.isFinite)&&Math.abs(values[0])<=4000&&Math.abs(values[1])<=4000&&values[2]>=140&&values[2]<=3000&&values[3]>=100&&values[3]<=3000?values:null;
 const country=centralIndustryCountries.find(c=>c.code===p.get('place'))?.code??null;
 return {sector,industry:industry??site?.industry??null,site:site?.id??null,only:!!(industry??site)&&p.get('only')==='1',country,frame};
}
export function writeCentralIndustryState(url:URL,state:CentralIndustryState):URL{
 const next=new URL(url);
 for(const key of ['metric','year','compare','zoom','topic','detail','site','industryview','lng','lat','z','city'])next.searchParams.delete(key);
 const values={sector:state.sector,subsector:state.industry,detail:state.site,only:state.only&&state.industry?'1':null,place:state.country,industryFrame:state.frame?.map(n=>Number(n.toFixed(3))).join(',')};
 for(const [key,value]of Object.entries(values)){if(value)next.searchParams.set(key,value);else next.searchParams.delete(key);}
 return next;
}
export function centralIndustryVisibleSites(state:CentralIndustryState):CentralSite[]{return centralIndustrySites.filter(site=>site.sectors.includes(state.sector)&&(!state.only||site.industry===state.industry));}
/** Fits the entire five-country geometry, independent of selection or sector. */
export function fitCentralIndustryFrame(bounds:number[],ratio:number):number[]{
 const nw=projectCentralIndustry([bounds[0],bounds[3]]),se=projectCentralIndustry([bounds[2],bounds[1]]),width=Math.max(se[0]-nw[0]+32,(se[1]-nw[1]+40)*ratio),height=width/ratio;
 return [(nw[0]+se[0]-width)/2,(nw[1]+se[1]-height)/2,width,height];
}
export function zoomCentralIndustryFrame(frame:number[],factor:number):number[]{
 const ratio=frame[2]/frame[3],width=Math.max(Math.max(140,100*ratio),Math.min(Math.min(3000,3000*ratio),frame[2]*factor)),height=width/ratio;
 return [frame[0]+(frame[2]-width)/2,frame[1]+(frame[3]-height)/2,width,height];
}
export type CentralLabelPoint={site:CentralSite;point:number[]};
/** Geographic proximity only groups the same industry, never unrelated city functions. */
export function groupCentralIndustryLabels(points:CentralLabelPoint[],diameter=86):CentralLabelPoint[][]{
 const groups:CentralLabelPoint[][]=[];
 const key=(site:CentralSite)=>{const metric=site.localMetric?centralIndustryMetric(site.localMetric):null;return site.industry+(site.kind==='regional'?'|'+(metric?metric.unit+'|'+metric.year:'without-quantity'):'');};
 for(const point of [...points].sort((a,b)=>a.site.id.localeCompare(b.site.id))){
  const group=groups.find(g=>key(g[0].site)===key(point.site)&&g.every(p=>Math.hypot(p.point[0]-point.point[0],p.point[1]-point.point[1])<=diameter));
  if(group)group.push(point);else groups.push([point]);
 }
 return groups.sort((a,b)=>b.length-a.length||a[0].site.id.localeCompare(b[0].site.id));
}
/** Deterministic allocation: no selected state, color or current-only filter is an input. */
export function placeCentralIndustryLabel(points:number[][],size:number[],viewport:number[],occupied:number[][],maximumLeader=120):number[]|null{
 const [width,height]=size,[mapWidth,mapHeight]=viewport,x=points.reduce((n,p)=>n+p[0],0)/points.length,y=points.reduce((n,p)=>n+p[1],0)/points.length;
 if(width>mapWidth-12||height>mapHeight-12)return null;
 const offsets:number[][]=[];
 for(let dy=-210;dy<=210;dy+=6)for(let dx=-210;dx<=210;dx+=6)offsets.push([dx,dy]);
 offsets.sort((a,b)=>a[0]**2+a[1]**2-b[0]**2-b[1]**2||a[1]-b[1]||a[0]-b[0]);
 for(const [dx,dy]of offsets){
  const left=Math.max(6,Math.min(mapWidth-width-6,x+dx-width/2)),top=Math.max(6,Math.min(mapHeight-height-6,y+dy-height/2)),box=[left,top,left+width,top+height];
  if(occupied.some(b=>box[0]<b[2]+5&&box[2]>b[0]-5&&box[1]<b[3]+5&&box[3]>b[1]-5))continue;
  if(points.some(p=>Math.hypot(p[0]-Math.max(box[0],Math.min(box[2],p[0])),p[1]-Math.max(box[1],Math.min(box[3],p[1])))>maximumLeader))continue;
  return box;
 }
 return null;
}
