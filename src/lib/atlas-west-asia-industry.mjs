import data from '../data/atlas/west-asia.json' with {type:'json'};
import {westIndustryCatalog,westIndustryAliases,westIndustrySectors} from '../data/atlas/west-asia-industry-catalog.mjs';
import {westIndustryMapNotes,westIndustryLocationInSector} from '../data/atlas/west-asia-industry-map.mjs';

export const westIndustryFrame=[0,0,data.width,data.height];
export function projectWestIndustry([lng,lat]){
 const span=data.bounds3857[2]-data.bounds3857[0];
 return [(lng*Math.PI/180*6378137-data.bounds3857[0])/span*data.width,(data.bounds3857[3]-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*6378137)/span*data.width];
}
export function westIndustryPath(geometry){
 const line=ring=>ring.map((p,i)=>{const v=projectWestIndustry(p);return `${i?'L':'M'}${v[0].toFixed(2)},${v[1].toFixed(2)}`;}).join('')+'Z';
 if(geometry.type==='Polygon')return geometry.coordinates.map(line).join('');
 if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap(poly=>poly.map(line)).join('');
 return '';
}
export function readWestIndustryState(search){
 const p=new URLSearchParams(search),alias=westIndustryAliases[p.get('topic')];
 let industry=westIndustryCatalog.find(i=>i.id===p.get('industry'))?.id??westIndustryCatalog.find(i=>i.id===alias)?.id??null;
 let sector=westIndustrySectors.find(s=>s.id===p.get('sector'))?.id??westIndustrySectors.find(s=>s.id===alias)?.id??westIndustryCatalog.find(i=>i.id===industry)?.sectors[0]??'resources';
 if(industry&&!westIndustryCatalog.find(i=>i.id===industry).sectors.includes(sector))industry=null;
 let place=Number(p.get('place')),item=westIndustryCatalog.find(i=>i.id===industry);
 if(!p.has('place')||!item||!Number.isInteger(place)||place<0||place>=item.locations.length)place=null;
 if(place!==null&&!westIndustryLocationInSector(item,item.locations[place],sector))place=null;
 const country=data.countries.some(c=>c.code===p.get('country'))?p.get('country'):null;
 let view=westIndustryFrame.slice(),candidate=(p.get('map')??'').split(',').map(Number);
 if(candidate.length===4&&candidate.every(Number.isFinite)&&candidate[2]>=200&&candidate[2]<=4000&&candidate[3]>=190&&candidate[3]<=4000)view=candidate;
 return {sector,industry,place,country,only:!!industry&&p.get('only')==='1',view};
}
export function westIndustrySearch(state){
 const p=new URLSearchParams();p.set('sector',state.sector);
 if(state.industry)p.set('industry',state.industry);
 if(state.place!==null&&state.industry)p.set('place',String(state.place));
 if(state.country)p.set('country',state.country);
 if(state.only&&state.industry)p.set('only','1');
 if(state.view.some((n,i)=>n!==westIndustryFrame[i]))p.set('map',state.view.map(n=>Number(n.toFixed(3))).join(','));
 return '?'+p.toString();
}
export function comparableWestIndustryRows(item){
 // Only the first explicitly compatible group is the map's national shading.
 // Company, city, capacity, different-year and different-stage rows stay in tables.
 const group=item?.metrics.find(m=>m.group)?.group;
 return group?item.metrics.filter(m=>m.group===group):[];
}
export function comparableWestIndustryMapRows(item,sector){
 if(item?.id==='aluminium'&&sector==='resources')return [];
 if(item?.id==='phosphate'&&sector==='manufacturing')return item.metrics.filter(row=>row.measure==='DAP生産');
 if(item?.id==='steel')return item.metrics.filter(row=>row.measure==='DRI生産');
 return comparableWestIndustryRows(item);
}
export function westIndustryValue(row){return row.value===null?'未取得':row.value.toLocaleString('ja-JP',{maximumFractionDigits:6});}
export function westIndustryShade(value,max){return value===null?'#f0efe3':`hsl(157 24% ${90-38*value/max}%)`;}

// All layout inputs are sector/camera/viewport. Selection is deliberately absent.
export function westIndustryMapLocations(industry,sector){
 return industry.locations.map((location,index)=>({...location,index})).filter(location=>westIndustryLocationInSector(industry,location,sector));
}
export function clusterWestIndustryLocations(items,sector,width,view){
 const groups=[],radius=width<500?15:18;
 for(const industry of items){
  const locations=westIndustryMapLocations(industry,sector),pending=new Set(locations.map(l=>l.index));
  for(const anchor of locations){
   if(!pending.delete(anchor.index))continue;
   const p=projectWestIndustry(anchor.coordinates),members=[anchor.index];
   for(const candidate of locations){
    if(!pending.has(candidate.index)||candidate.country!==anchor.country||(candidate.stage==='企業本社')!==(anchor.stage==='企業本社'))continue;
    const q=projectWestIndustry(candidate.coordinates);
    if(Math.hypot(q[0]-p[0],q[1]-p[1])/view[2]*width<=radius){members.push(candidate.index);pending.delete(candidate.index);}
   }
   groups.push({id:industry.id+'-'+anchor.index,industry:industry.id,country:anchor.country,anchor:anchor.index,coordinates:anchor.coordinates,stage:anchor.stage,members});
  }
 }
 return groups;
}
export function layoutWestIndustryAnnotations(sector,width,height,view){
 const result=[],font=width<500?9:10,line=width<500?12:14;
 const overlaps=(a,b)=>a.x<b.x+b.width+4&&b.x<a.x+a.width+4&&a.y<b.y+b.height+4&&b.y<a.y+a.height+4;
 const reserved=[{x:width-160,y:0,width:160,height:42},{x:0,y:height-64,width,height:64}];
 for(const country of data.countries.filter(c=>['TUR','IRN','SAU','IRQ','OMN','EGY','YEM'].includes(c.code))){
  const p=projectWestIndustry(country.center),size=width<500?11:13,w=[...country.name].length*size;
  reserved.push({x:(p[0]-view[0])/view[2]*width-w/2,y:(p[1]-view[1])/view[3]*height-size,width:w,height:size+3});
 }
 for(const note of westIndustryMapNotes[sector]??[]){
  const industry=westIndustryCatalog.find(i=>i.id===note.anchor[0]),location=industry.locations[note.anchor[1]],p=projectWestIndustry(location.coordinates);
  const point=[(p[0]-view[0])/view[2]*width,(p[1]-view[1])/view[3]*height];
  if(point[0]<0||point[0]>width||point[1]<0||point[1]>height-58)continue;
  const boxWidth=Math.max([...note.title].length*(font+2),[...note.place].length*font)+4,boxHeight=line*2;
  const preferred=[note.offset[0]<0?-boxWidth-6:8,note.offset[1]<0?-boxHeight-6:8];
  const offsets=[preferred,[8,8],[-boxWidth-6,8],[8,-boxHeight-6],[-boxWidth-6,-boxHeight-6],[-boxWidth/2,-boxHeight-10],[-boxWidth/2,12]];
  const position=offsets.map(([x,y])=>({x:point[0]+x,y:point[1]+y,width:boxWidth,height:boxHeight})).find(r=>r.x>=4&&r.y>=4&&r.x+r.width<=width-4&&r.y+r.height<=height-58&&[...reserved,...result].every(other=>!overlaps(r,other)));
  // Never move a caption across the region to force it into the map. Omitted
  // captions remain covered by the complete industry legend outside the map.
  if(position)result.push({...note,...position,anchor:point});
 }
 return result;
}

export function layoutWestIndustryPointSymbols(groups,width,height,view){
 const result=[];
 for(const group of groups){
  const source=projectWestIndustry(group.coordinates),anchor=[(source[0]-view[0])/view[2]*width,(source[1]-view[1])/view[3]*height],radius=group.members.length>1?7:5;
  const candidates=[[0,0]];
  for(const distance of [12,20])for(let step=0;step<8;step++)candidates.push([Math.cos(step*Math.PI/4)*distance,Math.sin(step*Math.PI/4)*distance]);
  const offset=candidates.find(([dx,dy])=>result.every(r=>Math.hypot(anchor[0]+dx-r.x,anchor[1]+dy-r.y)>=radius+r.radius+2))??[0,0];
  result.push({...group,x:anchor[0]+offset[0],y:anchor[1]+offset[1],radius,source,offset,anchorScreen:anchor});
 }
 return result;
}
