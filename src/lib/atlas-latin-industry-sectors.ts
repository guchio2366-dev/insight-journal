import raw from '../data/atlas/latin-america/industry-sectors.json';
import {latinCountries,latinViewBox,projectLatin,latinPath,type LatinGeometry} from './atlas-latin-america-geometry';
import {escapeLatinIndustryText as esc,latinIndustryMapAnnotation,latinIndustryMetrics} from './atlas-latin-industry-evidence';
export type IndustrySector='resources'|'manufacturing'|'services';
export type IndustrySectorState={sector:IndustrySector;industry:string|null;site:string|null;single:boolean;scope:'all'|'central'|'south';place:string;contextScope?:'country'};
export type LatinIndustrySite={id:string;industry:string;place:string;country:string;coordinates:number[];stage:string;stageKind:string;sectors:string[];sources:string[];note:string;coordinateMeaning:string;regionIds?:string[];locationKind?:string;coordinateSource:{type:string}};
export type LatinSectorIndustry={id:string;label:string;mapLabel?:string;color:string;sectors:string[];labels:Record<string,string>;overview:string;why:string;sources:string[]};
export const latinIndustrySectors=raw as typeof raw&{sites:LatinIndustrySite[];industries:LatinSectorIndustry[]};
export const sectorIndustries=(sector:string):LatinSectorIndustry[]=>raw.industries.filter(i=>i.sectors.includes(sector));
export const sectorSites=(sector:string):LatinIndustrySite[]=>raw.sites.filter(s=>s.sectors.includes(sector));
const southernCountries=new Set(['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Guyana','Paraguay','Peru','Suriname','Uruguay','Venezuela','French Guiana']);
export const sectorSitesForScope=(sector:string,scope:string)=>sectorSites(sector).filter(s=>scope==='all'||(scope==='south'?southernCountries.has(s.country):!southernCountries.has(s.country)));
export const industryById=(id:string|null):LatinSectorIndustry|undefined=>raw.industries.find(i=>i.id===id);
// Keep the category hue while giving small text sufficient contrast on the map.
export const industryLabelColor=(color:string)=>'#'+[1,3,5].map(start=>Math.round(parseInt(color.slice(start,start+2),16)*.75).toString(16).padStart(2,'0')).join('');
export function readIndustrySectorState(url:URL):IndustrySectorState{
 const p=url.searchParams,sector=(['resources','manufacturing','services'].includes(p.get('sector')??'')?p.get('sector'):'resources') as IndustrySector;
 const site=sectorSites(sector).find(s=>s.id===p.get('site'));
 const industry=site?.industry??sectorIndustries(sector).find(i=>i.id===p.get('industry'))?.id??null;
 const place=latinCountries.some(c=>c.code===p.get('place'))?p.get('place')!:'all';
 return{sector,industry,site:site?.id??null,single:!!industry&&p.get('single')==='1',scope:p.get('scope')==='central'?'central':p.get('scope')==='south'?'south':'all',place,...(place!=='all'&&p.get('scope')==='country'?{contextScope:'country' as const}:{})};
}
export function writeIndustrySectorState(url:URL,state:IndustrySectorState):URL{
 const next=new URL(url);for(const key of ['layer','case','section','from','sourceLayer','sourcePlace','sourceScope','sourceOnly','sourceFallback'])next.searchParams.delete(key);
 for(const[key,value]of Object.entries({sector:state.sector,industry:state.industry,site:state.site,single:state.single?'1':null,scope:state.contextScope??state.scope,place:state.place==='all'?null:state.place}))value?next.searchParams.set(key,value):next.searchParams.delete(key);
 return next;
}
type Label={industry:string;sites:string[];text:string;annotation:string|null;x:number;y:number;anchorX:number;anchorY:number;width:number;height:number;fontSize:number};
type Box=number[];
type Scene={frame:number[];k:number;visible:(LatinIndustrySite&{point:number[];displayPoint:number[]})[];labels:Label[];width:number;height:number;key:Box};
const sceneCache=new Map<string,Scene>();
const overlaps=(a:Box,b:Box,gap=4)=>a[0]<b[2]+gap&&a[2]>b[0]-gap&&a[1]<b[3]+gap&&a[3]>b[1]-gap;
const textWidth=(s:string,size:number)=>[...s].reduce((sum,c)=>sum+(/[\u0000-\u007f]/.test(c)?size*.59:size),0);
const countryNames:Record<string,string>={Brazil:'ブラジル',Argentina:'アルゼンチン',Chile:'チリ',Peru:'ペルー',Colombia:'コロンビア',Ecuador:'エクアドル',Guyana:'ガイアナ',Uruguay:'ウルグアイ',Panama:'パナマ','Costa Rica':'コスタリカ',Jamaica:'ジャマイカ','Dominican Republic':'ドミニカ共和国','The Bahamas':'バハマ'};
/** Only sector, scope and viewport determine geometry. Selection never enters placement. */
export function industrySectorScene(state:IndustrySectorState,width=960,height=770):Scene{
 const cacheKey=[state.sector,state.scope,width,height].join('|'),cached=sceneCache.get(cacheKey);if(cached)return cached;
 const original=latinViewBox(state.scope,'all'),k=Math.min(width/original[2],height/original[3]);
 const frame=[original[0]+original[2]/2-width/k/2,original[1]+original[3]/2-height/k/2,width/k,height/k];
 const point=(coordinates:number[])=>{const p=projectLatin(coordinates);return[(p[0]-frame[0])*k,(p[1]-frame[1])*k];};
 const compact=width<620,keyWidth=Math.min(330,width-20),keyHeight=compact?112:92,key:Box=[10,10,keyWidth+10,keyHeight];
 const placed:number[][]=[],offsets:number[][]=[[0,0]];
 for(let radius=18;radius<=72;radius+=18)for(let angle=0;angle<8;angle++)offsets.push([Math.cos(angle*Math.PI/4)*radius,Math.sin(angle*Math.PI/4)*radius]);
 const visible=sectorSitesForScope(state.sector,state.scope).map(s=>({...s,point:point(s.coordinates)}))
  .filter(s=>s.point[0]>7&&s.point[0]<width-7&&s.point[1]>7&&s.point[1]<height-7)
  .map(s=>{
   const displayPoint=offsets.map(([dx,dy])=>[s.point[0]+dx,s.point[1]+dy]).find(p=>p[0]>8&&p[0]<width-8&&p[1]>8&&p[1]<height-8
    &&!overlaps([p[0]-8,p[1]-8,p[0]+8,p[1]+8],key,0)&&placed.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>=16))??s.point;
   placed.push(displayPoint);return{...s,displayPoint};
  });
 const labels:Label[]=[],occupied:Box[]=[key],fontSize=compact?12:14;
 const entries:{industry:LatinSectorIndustry;group:typeof visible;primary:boolean}[]=[];
 for(const industry of sectorIndustries(state.sector)){
  const peers=visible.filter(s=>s.industry===industry.id),groups=new Map<string,typeof visible>();
  for(const site of peers){const specific=site.regionIds?.filter(r=>latinIndustryMetrics.some(m=>m.industry===industry.id&&m.mapRegionIds?.includes(r))),key=specific?.length?specific.join(','):site.country,group=groups.get(key)??[];group.push(site);groups.set(key,group);}
  [...groups.values()].forEach((group,index)=>entries.push({industry,group,primary:index===0}));
 }
 // Reserve a name for every industry before supplementary regional labels.
 entries.sort((a,b)=>Number(b.primary)-Number(a.primary));
 for(const{industry,group}of entries){
  const[anchorX,anchorY]=group[0].point,text=industry.mapLabel??industry.labels[state.sector]??industry.label;
  const quantity=latinIndustryMapAnnotation(industry.id,group,state.sector),regionIds=new Set(group.flatMap(s=>s.regionIds??[])),region=regionIds.size===1?raw.regions.find(r=>regionIds.has(r.id)):undefined;
  const scope=region?.label??countryNames[group[0].country]??group[0].country;
  let annotation=compact?null:quantity??scope,w=Math.ceil(Math.max(textWidth(text,fontSize),annotation?textWidth(annotation,11):0)+12),h=annotation?38:24;
  const fits=(x:number,y:number)=>x>=8&&x+w<=width-8&&y-h>=8&&y<=height-8
   &&Math.hypot(Math.max(x,Math.min(anchorX,x+w))-anchorX,Math.max(y-h+5,Math.min(anchorY,y-4))-anchorY)<=(compact?200:140)
   &&occupied.every(o=>!overlaps([x,y-h,x+w,y],o))
   &&visible.every(s=>!overlaps([x,y-h,x+w,y],[s.displayPoint[0]-8,s.displayPoint[1]-8,s.displayPoint[0]+8,s.displayPoint[1]+8],2));
  let position:{x:number;y:number}|undefined;
  const candidates:number[][]=[];
  for(let radius=12;radius<=220;radius+=20)for(const[dx,dy]of[[1,-1],[1,1],[-1,-1],[-1,1],[0,-1],[0,1]]){
   const x=dx<0?anchorX-radius-w:dx===0?anchorX-w/2:anchorX+radius;
   candidates.push([Math.max(8,Math.min(width-w-8,x)),Math.max(h+8,Math.min(height-8,anchorY+dy*radius))]);
  }
  for(const[x,y]of candidates)if(fits(x,y)){position={x,y};break;}
  if(!position){
   const slots:{x:number;y:number;distance:number}[]=[];
   for(let y=h+8;y<=height-8;y+=8)for(let x=8;x<=width-w-8;x+=10)if(fits(x,y))slots.push({x,y,distance:Math.hypot(x+w/2-anchorX,y-h/2-anchorY)});
   slots.sort((a,b)=>a.distance-b.distance);position=slots[0];
  }
  if(!position&&annotation){
   annotation=null;w=Math.ceil(textWidth(text,fontSize)+12);h=24;
   for(const[x,y]of candidates){const cx=Math.max(8,Math.min(width-w-8,x)),cy=Math.max(h+8,Math.min(height-8,y));if(fits(cx,cy)){position={x:cx,y:cy};break;}}
   if(!position)for(let y=h+8;y<=height-8&&!position;y+=8)for(let x=8;x<=width-w-8;x+=10)if(fits(x,y)){position={x,y};break;}
  }
  if(!position)continue;
  occupied.push([position.x,position.y-h,position.x+w,position.y]);
  labels.push({industry:industry.id,sites:group.map(s=>s.id),text,annotation,...position,anchorX,anchorY,width:w,height:h,fontSize});
 }
 const scene={frame,k,visible,labels,width,height,key};if(sceneCache.size>=24)sceneCache.delete(sceneCache.keys().next().value!);sceneCache.set(cacheKey,scene);return scene;
}
export function renderIndustrySectorMap(state:IndustrySectorState,width=960,height=770){
 const scene=industrySectorScene(state,width,height);
 const shape=latinCountries.map(c=>`<path d="${c.path}" fill="#f2f1e8" stroke="#9caaa4" stroke-width=".7" fill-rule="evenodd" vector-effect="non-scaling-stroke"/>`).join('');
 const regions=raw.regions.map(r=>{const active=!!state.industry&&r.industries.includes(state.industry),color=industryById(state.industry)?.color??'#84958c';return`<path data-lis-region="${r.id}" d="${latinPath(r.geometry as LatinGeometry)}" fill="${active?color:'none'}" fill-opacity=".10" stroke="${active?color:'#bec9c0'}" stroke-width="${active?1.4:.45}" stroke-dasharray="${active?'3 2':'none'}" fill-rule="evenodd" vector-effect="non-scaling-stroke"><title>${esc(r.label+'：'+r.meaning)}</title></path>`;}).join('');
 const marks=scene.visible.filter(s=>!state.single||s.industry===state.industry).map(s=>{
  const[anchorX,anchorY]=s.point,[x,y]=s.displayPoint,offset=Math.hypot(x-anchorX,y-anchorY)>.01,i=industryById(s.industry)!,selected=s.industry===state.industry,active=s.id===state.site,regional=s.coordinateSource.type==='admin-region-guide';
  const symbol=s.stageKind==='extraction'?`<circle cx="${x}" cy="${y}" r="4.5"/>`:s.stageKind==='processing'?`<rect x="${x-4.5}" y="${y-4.5}" width="9" height="9"/>`:`<path d="M${x} ${y-5}l5 5-5 5-5-5Z"/>`;
  return`<g data-lis-site="${s.id}" data-industry="${s.industry}" data-location-kind="${regional?'regional-guide':'locality-or-reference'}" data-source-coordinate="${s.coordinates.join(',')}" data-screen-point="${x.toFixed(3)},${y.toFixed(3)}" tabindex="0" role="button" aria-label="${esc(i.label+'：'+s.place+'、'+s.stage)}" aria-pressed="${active}" opacity="${state.industry&&!selected?'.52':'1'}"><title>${esc(s.place+'：'+s.stage)}</title>${offset?`<path d="M${anchorX} ${anchorY}L${x} ${y}" stroke="${i.color}" stroke-width=".8"/><circle cx="${anchorX}" cy="${anchorY}" r="1.5" fill="#52625d"/>`:''}<circle data-lis-hit cx="${x}" cy="${y}" r="9" fill="transparent" pointer-events="all"/><g fill="${regional?'#fffefa':i.color}" stroke="${regional?i.color:'#fffefa'}" stroke-width="1.3"${regional?' stroke-dasharray="2 1"':''}>${symbol}</g>${selected?`<circle cx="${x}" cy="${y}" r="${active?8:6.5}" fill="none" stroke="${i.color}" stroke-width="${active?2.6:1.5}" pointer-events="none"/>`:''}</g>`;
 }).join('');
 const labels=scene.labels.filter(l=>!state.single||l.industry===state.industry).map(l=>{
  const i=industryById(l.industry)!,active=l.industry===state.industry,nearX=Math.max(l.x,Math.min(l.anchorX,l.x+l.width)),nearY=Math.max(l.y-l.height+5,Math.min(l.anchorY,l.y-4));
  return`<g data-lis-label="${i.id}:${l.sites[0]}" data-lis-industry="${i.id}" tabindex="0" role="button" aria-pressed="${active}" aria-label="${esc(l.text+'、'+(l.annotation??''))}"><rect x="${l.x}" y="${l.y-l.height}" width="${l.width}" height="${l.height}" fill="transparent" pointer-events="all"/><path d="M${l.anchorX} ${l.anchorY}L${nearX} ${nearY}" stroke="${i.color}" stroke-width=".8" opacity=".65"/><text x="${l.x+5}" y="${l.y-l.height+l.fontSize+3}" font-size="${l.fontSize}" font-family="sans-serif" font-weight="600" fill="${industryLabelColor(i.color)}" stroke="#fffefa" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">${esc(l.text)}${l.annotation?`<tspan x="${l.x+5}" y="${l.y-4}" font-size="11" font-weight="400" data-lis-map-evidence>${esc(l.annotation)}</tspan>`:''}</text>${active?`<path d="M${l.x+5} ${l.y+2}h${l.width-10}" stroke="${i.color}" stroke-width="2"/>`:''}</g>`;
 }).join('');
 return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="latin-sector-map" data-lis-svg role="group" aria-label="中南米の${esc(raw.sectors.find(s=>s.id===state.sector)!.label)}、産業名と資料に基づく集積・立地"><g transform="matrix(${scene.k} 0 0 ${scene.k} ${-scene.frame[0]*scene.k} ${-scene.frame[1]*scene.k})" aria-hidden="true">${shape}<g data-lis-regions>${regions}</g></g><g data-lis-marks>${marks}</g><g data-lis-labels>${labels}</g></svg>`;
}
