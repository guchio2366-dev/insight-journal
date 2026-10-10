import {regionalClimateCities} from '../data/atlas/oceania-russia-climate-reading';
const offsets:Record<string,[number,number]>={darwin:[10,-12],'alice-springs':[-58,36],brisbane:[-92,-14],perth:[8,24],hokitika:[12,24],rotuma:[12,-12],moscow:[8,28],verkhoyansk:[12,-12],vladivostok:[-120,-18],'malye-karmakuly':[12,-12]};
const major=new Set(['darwin','brisbane','perth','moscow','vladivostok']);
// Scale glyphs to screen pixels. Observation coordinates stay fixed; only labels move.
export function renderRegionalClimateCities(region:string,project:(p:number[])=>number[],frame:number[],scale:number,existingLabels=''):string{
 const obstacles=[...existingLabels.matchAll(/<text\b([^>]*)>([^<]+)<\/text>/g)].map(([,attrs,label])=>{
  const n=(key:string)=>Number(attrs.match(new RegExp(`\\b${key}="([^"]+)"`))?.[1]);
  const font=n('font-size'),width=label.length*font,x=n('x'),y=n('y');
  return [attrs.includes('text-anchor="middle"')?x-width/2:x,y-font,width,font*1.5];
 });
 return regionalClimateCities.filter(c=>c.region===region).map(c=>{
  const [x,y]=project(c.coordinates);if(x<frame[0]||x>frame[0]+frame[2]||y<frame[1]||y>frame[1]+frame[3])return '';
  const big=major.has(c.id),font=big?15:12,[dx,dy]=offsets[c.id],width=(c.name.length*font+8)*scale;
  const clampX=(v:number)=>Math.max(frame[0]+4*scale,Math.min(v,frame[0]+frame[2]-width-4*scale));
  const clampY=(v:number)=>Math.max(frame[1]+22*scale,Math.min(v,frame[1]+frame[3]-10*scale));
  let lx=clampX(x+dx*scale);
  let ly=Math.max(frame[1]+22*scale,Math.min(y+dy*scale,frame[1]+frame[3]-10*scale));
  const preferred=[lx,ly];
  const height=(font+10)*scale;
  const overlaps=(cx:number,cy:number)=>obstacles.some(([bx,by,bw,bh])=>cx-3*scale<bx+bw+3*scale&&cx+width>bx-3*scale&&cy-(font+5)*scale<by+bh+3*scale&&cy+5*scale>by-3*scale);
  for(let attempt=0;attempt<24;attempt++){
   if(!overlaps(lx,ly))break;
   const next=ly+height+5*scale;
   if(next<=frame[1]+frame[3]-10*scale){ly=next;continue;}
   // A crowded lower edge must not send the name to the top of the map.
   // Search beside/above the observation point and choose the shortest local leader.
   const candidates:number[][]=[];
   for(const cx of [preferred[0],x+8*scale,x-width-8*scale,frame[0]+4*scale,x+width+18*scale])for(const offset of [dy,...Array.from({length:25},(_,i)=>-72+i*6)]){
    const px=clampX(cx),py=clampY(y+offset*scale),distance=Math.hypot(px-x,py-4*scale-y);
    const coversPoint=px-3*scale<x+6*scale&&px+width>x-6*scale&&py-(font+5)*scale<y+6*scale&&py+5*scale>y-6*scale;
    if(distance<=80*scale&&!coversPoint&&!overlaps(px,py))candidates.push([px,py,distance]);
   }
   candidates.sort((a,b)=>a[2]-b[2]);
   [lx,ly]=candidates[0]??preferred;
   break;
  }
  obstacles.push([lx-3*scale,ly-(font+5)*scale,width,height]);
  return `<g data-regional-climate-city="${c.id}" role="button" tabindex="0" aria-pressed="false" aria-label="${c.name}の雨温図を開く" class="regional-climate-city${big?' regional-climate-city--major':''}"><title>${c.name}：${c.stationName}・観測所 ${c.stationId}</title><circle cx="${x}" cy="${y}" r="${5*scale}" fill="#fffaf0" stroke="#263f47" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="M${x} ${y}L${lx} ${ly-4*scale}" stroke="#536973" stroke-width=".7" vector-effect="non-scaling-stroke"/><rect x="${lx-3*scale}" y="${ly-(font+5)*scale}" width="${width}" height="${(font+10)*scale}" rx="${3*scale}" fill="#fffef7" fill-opacity=".92"/><text x="${lx}" y="${ly}" font-size="${font*scale}" font-weight="${big?700:400}" fill="#263f47">${c.name}</text></g>`;
 }).join('');
}
