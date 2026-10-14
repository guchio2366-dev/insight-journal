import data from '../data/atlas/west-asia.json' with {type:'json'};
import {westIndustryCatalog,westIndustryAliases,westIndustrySectors} from '../data/atlas/west-asia-industry-catalog.mjs';

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
export function westIndustryValue(row){return row.value===null?'未取得':row.value.toLocaleString('ja-JP',{maximumFractionDigits:6});}
export function westIndustryShade(value,max){return value===null?'#f0efe3':`hsl(157 24% ${90-38*value/max}%)`;}

// Screen-space placement is a pure function of sector, viewport and camera.
// Selection never participates: highlighting cannot relocate a label.
export function layoutWestIndustryLabels(items,width,height,view){
 const boxWidth=width<320?80:width<500?97:126,boxHeight=width<500?37:42,pad=6,reservedBottom=62;
 const rects=[{x:width-160,y:0,width:160,height:40}],result=[];
 for(const item of items){
  const points=item.locations.map(l=>projectWestIndustry(l.coordinates)).map(([x,y])=>[(x-view[0])/view[2]*width,(y-view[1])/view[3]*height]);
  const target=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
  const candidates=[];
  // A complete deterministic grid provides a fallback without hiding a label.
  for(let y=pad;y+boxHeight<height-reservedBottom;y+=boxHeight+5)for(let x=pad;x+boxWidth<=width-pad;x+=boxWidth+6)candidates.push([x,y]);
  candidates.sort((a,b)=>Math.hypot(a[0]+boxWidth/2-target[0],a[1]+boxHeight/2-target[1])-Math.hypot(b[0]+boxWidth/2-target[0],b[1]+boxHeight/2-target[1]));
  const position=candidates.find(([x,y])=>rects.every(q=>x+boxWidth+5<=q.x||q.x+q.width+5<=x||y+boxHeight+5<=q.y||q.y+q.height+5<=y))??[pad,pad+result.length*(boxHeight+5)];
  const rect={id:item.id,x:position[0],y:position[1],width:boxWidth,height:boxHeight,anchor:target};rects.push(rect);result.push(rect);
 }
 return result;
}
