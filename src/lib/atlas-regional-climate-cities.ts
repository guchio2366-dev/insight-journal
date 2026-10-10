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
  const lx=Math.max(frame[0]+4*scale,Math.min(x+dx*scale,frame[0]+frame[2]-width-4*scale));
  let ly=Math.max(frame[1]+22*scale,Math.min(y+dy*scale,frame[1]+frame[3]-10*scale));
  const height=(font+10)*scale;
  for(let attempt=0;attempt<24;attempt++){
   const top=ly-(font+5)*scale;
   if(!obstacles.some(([bx,by,bw,bh])=>lx-3*scale<bx+bw+3*scale&&lx+width>bx-3*scale&&top<by+bh+3*scale&&top+height>by-3*scale))break;
   ly+=height+5*scale;
   if(ly>frame[1]+frame[3]-10*scale)ly=frame[1]+22*scale;
  }
  obstacles.push([lx-3*scale,ly-(font+5)*scale,width,height]);
  return `<g data-regional-climate-city="${c.id}" role="button" tabindex="0" aria-pressed="false" aria-label="${c.name}の雨温図を開く" class="regional-climate-city${big?' regional-climate-city--major':''}"><title>${c.name}：${c.stationName}・観測所 ${c.stationId}</title><circle cx="${x}" cy="${y}" r="${5*scale}" fill="#fffaf0" stroke="#263f47" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="M${x} ${y}L${lx} ${ly-4*scale}" stroke="#536973" stroke-width=".7" vector-effect="non-scaling-stroke"/><rect x="${lx-3*scale}" y="${ly-(font+5)*scale}" width="${width}" height="${(font+10)*scale}" rx="${3*scale}" fill="#fffef7" fill-opacity=".92"/><text x="${lx}" y="${ly}" font-size="${font*scale}" font-weight="${big?700:400}" fill="#263f47">${c.name}</text></g>`;
 }).join('');
}
