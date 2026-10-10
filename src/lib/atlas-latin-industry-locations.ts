import {latinCountries,latinViewBox,projectLatin} from './atlas-latin-america-geometry.ts';
import {latinIndustryLocations,latinIndustryLocationGroups,latinIndustryLocationOverview} from '../data/atlas/latin-america-industry-locations.ts';
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type State={place:string;scope:string;only:boolean;case?:string};
export function renderLatinIndustryLocations(state:State,prefix:string,screen={width:640,height:460}){
 const raw=latinViewBox(state.scope,state.place),frame=[raw[0]-100,raw[1],raw[2]+200,raw[3]],scale=Math.max(frame[2]/screen.width,frame[3]/screen.height),font=screen.width<480?12:14;
 const points=latinIndustryLocations.filter(row=>!state.only||state.place==='all'||row.countries.includes(state.place));
 const visible=points.filter(row=>{const [x,y]=projectLatin(row.location);return x>=frame[0]&&x<=frame[0]+frame[2]&&y>=frame[1]&&y<=frame[1]+frame[3];});
 type Box={x:number;y:number;w:number;h:number};const occupied:Box[]=[];
 const locate=(label:string,x:number,y:number)=>{
  const w=(label.length*font+8)*scale,h=20*scale,pad=7*scale;
  const candidates=[[12,-10],[-w/scale-12,-10],[12,25],[-w/scale-12,25],[12,-45],[-w/scale-12,-45],[12,60],[-w/scale-12,60],[12,-75],[-w/scale-12,-75],[12,85],[-w/scale-12,85]].map(([dx,dy])=>({x:Math.max(frame[0]+pad,Math.min(frame[0]+frame[2]-w-pad,x+dx*scale)),y:Math.max(frame[1]+h+pad,Math.min(frame[1]+frame[3]-pad,y+dy*scale)),w,h}));
  const fits=(b:Box)=>!occupied.some(o=>b.x<o.x+o.w+5*scale&&b.x+b.w+5*scale>o.x&&b.y-b.h<o.y+5*scale&&b.y+5*scale>o.y-o.h)&&!visible.some(row=>{const [px,py]=projectLatin(row.location);return px>b.x-8*scale&&px<b.x+b.w+8*scale&&py>b.y-b.h-8*scale&&py<b.y+8*scale;});
  const box=candidates.find(fits)??candidates[0];occupied.push(box);return box;
 };
 const countries=latinCountries.map(country=>`<path d="${country.path}" fill="#f4f2e9" stroke="${country.code===state.place?'#193c3f':'#819594'}" stroke-width="${country.code===state.place?2:.7}" vector-effect="non-scaling-stroke" data-industry-country="${country.code}" tabindex="0" role="button" aria-label="${esc(country.name)}の全国統計を読む" aria-pressed="${country.code===state.place}"><title>${esc(country.name)}</title></path>`).join('');
 const marks=visible.map(row=>{
  const [x,y]=projectLatin(row.location),b=locate(row.label,x,y),color=latinIndustryLocationGroups.find(group=>group.id===row.kind)!.color,active=row.id===state.case,nearest=Math.min(...visible.filter(other=>other.id!==row.id).map(other=>{const [ox,oy]=projectLatin(other.location);return Math.hypot(ox-x,oy-y);})),radius=Math.min(20*scale,nearest*.45),lx=Math.max(b.x,Math.min(x,b.x+b.w)),ly=Math.max(b.y-b.h,Math.min(y,b.y));
  return `<g data-industry-location="${row.id}" tabindex="0" role="button" aria-label="${esc(row.title)}を読む" aria-pressed="${active}" class="latin-industry-location"><title>${esc(row.placeLabel)}</title><path d="M${x} ${y}L${lx} ${ly}" stroke="${color}" stroke-width=".8" vector-effect="non-scaling-stroke" pointer-events="none"/><circle cx="${x}" cy="${y}" r="${radius}" fill="transparent" pointer-events="all"/><rect x="${b.x-3*scale}" y="${b.y-b.h}" width="${b.w+6*scale}" height="${b.h+5*scale}" fill="transparent" pointer-events="all"/><circle cx="${x}" cy="${y}" r="${Math.min((active?8:6)*scale,nearest*.35)}" fill="${color}" stroke="${active?'#193c3f':'#fff'}" stroke-width="${active?2.5:1.5}" vector-effect="non-scaling-stroke"/><text x="${b.x}" y="${b.y}" font-size="${font*scale}" style="fill:${color};pointer-events:all;font-weight:500">${esc(row.label)}</text></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${frame.join(' ')}" class="latin-industry-map latin-industry-location-map" data-latin-industry-map role="group" aria-labelledby="${prefix}-title"><title id="${prefix}-title">中南米の主要産業：資料に基づく代表位置</title><desc>${esc(latinIndustryLocationOverview.scope)}</desc><g data-industry-context>${countries}</g><g>${marks}</g></svg>`;
}
export function renderLatinIndustryLocationsLegend(){return `<div class="latin-industry-key">${latinIndustryLocationGroups.map(group=>`<span><i style="background:${group.color}"></i>${group.label}</span>`).join('')}</div>`;}
