import raw from '../data/atlas/latin-america/industry-sectors.json';
import {latinCountries,latinViewBox,projectLatin} from './atlas-latin-america-geometry';
export type IndustrySector='resources'|'manufacturing'|'services';
export type IndustrySectorState={sector:IndustrySector;industry:string|null;site:string|null;single:boolean;scope:'all'|'central'|'south';place:string;contextScope?:'country'};
export const latinIndustrySectors=raw;
export const sectorIndustries=(sector:string)=>raw.industries.filter(i=>i.sectors.includes(sector));
export const sectorSites=(sector:string)=>raw.sites.filter(s=>s.sectors.includes(sector));
const southernCountries=new Set(['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Guyana','Paraguay','Peru','Suriname','Uruguay','Venezuela','French Guiana']);
export const sectorSitesForScope=(sector:string,scope:string)=>sectorSites(sector).filter(s=>scope==='all'||(scope==='south'?southernCountries.has(s.country):!southernCountries.has(s.country)));
export const industryById=(id:string|null)=>raw.industries.find(i=>i.id===id);
export function readIndustrySectorState(url:URL):IndustrySectorState {
 const p=url.searchParams,sector=(['resources','manufacturing','services'].includes(p.get('sector')??'')?p.get('sector'):'resources') as IndustrySector;
 const site=sectorSites(sector).find(s=>s.id===p.get('site'));
 const industry=site?.industry??sectorIndustries(sector).find(i=>i.id===p.get('industry'))?.id??null;
 const place=latinCountries.some(c=>c.code===p.get('place'))?p.get('place')!:'all';
 return {sector,industry,site:site?.id??null,single:!!industry&&p.get('single')==='1',scope:p.get('scope')==='central'?'central':p.get('scope')==='south'?'south':'all',place,...(place!=='all'&&p.get('scope')==='country'?{contextScope:'country' as const}:{})};
}
export function writeIndustrySectorState(url:URL,state:IndustrySectorState):URL {
 const next=new URL(url);for(const key of ['layer','case','section','from','sourceLayer','sourcePlace','sourceScope','sourceOnly','sourceFallback'])next.searchParams.delete(key);
 for(const [key,value] of Object.entries({sector:state.sector,industry:state.industry,site:state.site,single:state.single?'1':null,scope:state.contextScope??state.scope,place:state.place==='all'?null:state.place}))value?next.searchParams.set(key,value):next.searchParams.delete(key);
 return next;
}
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Label={industry:string;sites:string[];text:string;x:number;y:number;anchorX:number;anchorY:number;width:number;height:number};
/** Layout depends only on sector, scope and measured size; selection never enters it. */
export function industrySectorScene(state:IndustrySectorState,width=960,height=770){
 const original=latinViewBox(state.scope,'all'),k=Math.min(width/original[2],height/original[3]);
 const frame=[original[0]+original[2]/2-width/k/2,original[1]+original[3]/2-height/k/2,width/k,height/k];
 const point=(coords:number[])=>{const p=projectLatin(coords);return [(p[0]-frame[0])*k,(p[1]-frame[1])*k];};
 const placed:number[][]=[];
 const visible=sectorSitesForScope(state.sector,state.scope).map(s=>({...s,point:point(s.coordinates)})).filter(s=>s.point[0]>10&&s.point[0]<width-10&&s.point[1]>10&&s.point[1]<height-10).map(s=>{
  const offsets=[[0,0],[18,0],[-18,0],[0,-18],[0,18],[18,-18],[-18,-18],[18,18],[-18,18],[36,0],[-36,0]];
  const displayPoint=offsets.map(([dx,dy])=>[s.point[0]+dx,s.point[1]+dy]).find(p=>p[0]>7&&p[0]<width-7&&p[1]>7&&p[1]<height-7&&placed.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>=16))??s.point;
  placed.push(displayPoint);return {...s,displayPoint};
 });
 const labels:Label[]=[],occupied:number[][]=[];
 for(const industry of sectorIndustries(state.sector)){
  const peers=visible.filter(s=>s.industry===industry.id),groups:typeof peers[]=[];
  for(const site of peers){const near=groups.find(g=>Math.hypot(g[0].point[0]-site.point[0],g[0].point[1]-site.point[1])<95);if(near)near.push(site);else groups.push([site]);}
  for(const group of groups){
   const [x,y]=group[0].point,text=industry.labels[state.sector as keyof typeof industry.labels]??industry.label,w=[...text].length*15.5+8,h=22;
   const offsets=[[10,-17],[10,23],[-w-10,-17],[-w-10,23],[10,-41],[-w-10,-41],[10,47],[-w-10,47],[10,-65],[-w-10,-65],[10,71],[-w-10,71]];
   const candidates=offsets.map(([dx,dy])=>({x:Math.max(8,Math.min(width-w-8,x+dx)),y:Math.max(23,Math.min(height-12,y+dy))}));
   const fits=(b:{x:number;y:number})=>!occupied.some(o=>b.x<o[2]+5&&b.x+w>o[0]-5&&b.y-h<o[3]+4&&b.y>o[1]-4)&&!visible.some(s=>s.displayPoint[0]>b.x-9&&s.displayPoint[0]<b.x+w+9&&s.displayPoint[1]>b.y-h-7&&s.displayPoint[1]<b.y+7);
   const b=candidates.find(fits);if(!b)continue;
   occupied.push([b.x,b.y-h,b.x+w,b.y]);labels.push({industry:industry.id,sites:group.map(s=>s.id),text,x:b.x,y:b.y,anchorX:x,anchorY:y,width:w,height:h});
  }
 }
 return {frame,k,visible,labels,width,height};
}
export function renderIndustrySectorMap(state:IndustrySectorState,width=960,height=770){
 const scene=industrySectorScene(state,width,height),point=(c:number[])=>{const p=projectLatin(c);return [(p[0]-scene.frame[0])*scene.k,(p[1]-scene.frame[1])*scene.k];};
 const shape=latinCountries.map(c=>`<path d="${c.path}" fill="#f2f1e8" stroke="#9caaa4" stroke-width=".7" vector-effect="non-scaling-stroke"/>`).join('');
 const marks=scene.visible.filter(s=>!state.single||s.industry===state.industry).map(s=>{
  const [anchorX,anchorY]=s.point,[x,y]=s.displayPoint,offset=x!==anchorX||y!==anchorY,i=industryById(s.industry)!,selected=s.industry===state.industry,active=s.id===state.site;
  const symbol=s.stageKind==='extraction'?`<circle cx="${x}" cy="${y}" r="4.5"/>`:s.stageKind==='processing'?`<rect x="${x-4.5}" y="${y-4.5}" width="9" height="9"/>`:`<path d="M${x} ${y-5}l5 5-5 5-5-5Z"/>`;
  return `<g data-lis-site="${s.id}" data-industry="${s.industry}" data-source-coordinate="${s.coordinates.join(',')}" data-screen-point="${x.toFixed(3)},${y.toFixed(3)}" tabindex="0" role="button" aria-label="${esc(i.label+'：'+s.place+'、'+s.stage)}" aria-pressed="${active}" opacity="${state.industry&&!selected?'.52':'1'}"><title>${esc(s.place+'：'+s.stage)}</title>${offset?`<path d="M${anchorX} ${anchorY}L${x} ${y}" stroke="${i.color}" stroke-width=".8"/><circle cx="${anchorX}" cy="${anchorY}" r="1.5" fill="#52625d"/>`:''}<circle data-lis-hit cx="${x}" cy="${y}" r="9" fill="transparent" pointer-events="all"/><g fill="${i.color}" stroke="#fffefa" stroke-width="1.2">${symbol}</g>${selected?`<circle cx="${x}" cy="${y}" r="${active?8:6.5}" fill="none" stroke="${i.color}" stroke-width="${active?2.6:1.5}" pointer-events="none"/>`:''}</g>`;
 }).join('');
 const labels=scene.labels.filter(l=>!state.single||l.industry===state.industry).map(l=>{const i=industryById(l.industry)!,active=l.industry===state.industry,nearX=Math.max(l.x,Math.min(l.anchorX,l.x+l.width)),nearY=Math.max(l.y-l.height+5,Math.min(l.anchorY,l.y-4));return `<g data-lis-label="${i.id}:${l.sites[0]}" data-lis-industry="${i.id}" tabindex="0" role="button" aria-pressed="${active}" aria-label="${esc(l.text+'の分布と拠点を読む')}"><rect x="${l.x-4}" y="${l.y-l.height+2}" width="${l.width}" height="${l.height+5}" fill="transparent" pointer-events="all"/><path d="M${l.anchorX} ${l.anchorY}L${nearX} ${nearY}" stroke="${i.color}" stroke-width=".8" opacity=".65"/><text x="${l.x}" y="${l.y}" font-size="15.5" font-family="sans-serif" font-weight="600" fill="${i.color}" stroke="#fffefa" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">${esc(l.text)}</text>${active?`<path d="M${l.x} ${l.y+3}h${l.width-8}" stroke="${i.color}" stroke-width="2"/>`:''}</g>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="latin-sector-map" data-lis-svg role="group" aria-label="中南米の${esc(raw.sectors.find(s=>s.id===state.sector)!.label)}、資料に基づく主要な立地例"><g transform="matrix(${scene.k} 0 0 ${scene.k} ${-scene.frame[0]*scene.k} ${-scene.frame[1]*scene.k})" aria-hidden="true">${shape}</g><g data-lis-marks>${marks}</g><g data-lis-labels>${labels}</g></svg>`;
}
