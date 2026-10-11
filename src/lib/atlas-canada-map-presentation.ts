import {projectCanadaLandform} from './atlas-canada-landform-map.ts';
/** Legacy URLs and archived affine geometry keep their original coordinate contract. */
export const projectCanadaMap=projectCanadaLandform;
/** Camera extent only: source projections and thematic coordinates stay unchanged. */
export const canadaSouthernBounds:[[number,number],[number,number]]=[[-134,40.7],[-50,65.5]];
export function canadaSouthernFrame(ratio=1.85):number[]{
 const northwest=projectCanadaMap([canadaSouthernBounds[0][0],canadaSouthernBounds[1][1]]),southeast=projectCanadaMap([canadaSouthernBounds[1][0],canadaSouthernBounds[0][1]]);
 const width=Math.max(southeast[0]-northwest[0]+20,(southeast[1]-northwest[1]+20)*ratio),height=width/ratio;
 return [(northwest[0]+southeast[0]-width)/2,(northwest[1]+southeast[1]-height)/2,width,height];
}
export function canadaLegacyPoint([x,y]:readonly number[]){return projectCanadaMap([x/900*95-145,85-y/580*45]);}
export function canadaLegacyFrame(frame:readonly number[]|null):number[]{
 if(!frame || Math.abs(frame[0])<.01&&Math.abs(frame[1]-180.444444)<.01&&Math.abs(frame[2]-900)<.01)return [0,0,900,580];
 const a=canadaLegacyPoint(frame),b=canadaLegacyPoint([frame[0]+frame[2],frame[1]+frame[3]]);
 return [a[0],a[1],b[0]-a[0],b[1]-a[1]];
}
/** Archived province paths contain only absolute M/L coordinates and Z closures. */
export function canadaLegacyPath(path:string){return path.replace(/([ML])(-?[\d.]+),(-?[\d.]+)/g,(_,c,x,y)=>{const p=canadaLegacyPoint([Number(x),Number(y)]);return `${c}${p[0].toFixed(3)},${p[1].toFixed(3)}`;});}
export function canadaMapPath(g:any):string{
 const parts=g.type==='MultiPolygon'?g.coordinates.flat():g.type==='LineString'?[g.coordinates]:g.coordinates;
 return parts.map((r:number[][])=>r.map((p,i)=>{const [x,y]=projectCanadaMap(p);return `${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;}).join('')+(g.type.includes('Polygon')?'Z':'')).join('');
}
/** Called only on freshly rebuilt legacy comparison groups; the source stays unchanged. */
export function projectCanadaComparison(group:SVGElement){
 const key=group.querySelector('[data-canada-population-context-scale]');if(key){const t=key.getAttribute('transform')??'';key.setAttribute('transform',t.replace(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/,(_,x,y)=>'translate('+canadaLegacyPoint([Number(x),Number(y)]).join(' ')+')'));}
 for(const p of group.querySelectorAll('path[d]'))p.setAttribute('d',canadaLegacyPath(p.getAttribute('d')!));
 for(const el of group.querySelectorAll('circle,text')){if(el.closest('[data-canada-population-context-scale]'))continue;const a=el.tagName==='circle'?'cx':'x',b=el.tagName==='circle'?'cy':'y';if(!el.hasAttribute(a)||!el.hasAttribute(b))continue;const [x,y]=canadaLegacyPoint([Number(el.getAttribute(a)),Number(el.getAttribute(b))]);el.setAttribute(a,String(x));el.setAttribute(b,String(y));}
}
