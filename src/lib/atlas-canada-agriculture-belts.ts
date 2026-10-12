import reading from '../data/atlas/canada/agriculture-production-belts.json';
import {canadaAgricultureProducts,type CanadaAgricultureIndicatorId} from './atlas-canada-agriculture-products';
import {projectCanadaMap} from './atlas-canada-map-presentation';

export const canadaAgricultureProductionBelts=reading;
export type CanadaAgricultureLayer='crop'|'livestock';
export function canadaAgricultureProductLayer(id:CanadaAgricultureIndicatorId):CanadaAgricultureLayer{
 return canadaAgricultureProducts[id].kind==='livestock'?'livestock':'crop';
}
/** These are deliberately approximate editorial outlines, never statistical regions. */
export function canadaAgricultureBeltPath(outline:readonly number[][]){
 if(outline.length<4)return outline.map((point,index)=>(index?'L':'M')+projectCanadaMap(point).map(v=>v.toFixed(3)).join(',')).join('')+'Z';
 const points=outline.slice(0,-1).map(projectCanadaMap),mix=(a:number[],b:number[])=>a.map((v,i)=>v*.82+b[i]*.18),fmt=(p:number[])=>p.map(v=>v.toFixed(3)).join(',');
 // Round corners of the existing evidence-reviewed generalization.
 // This does not add farms, quantitative density, or precision to the outline.
 return points.map((p,i)=>{const before=mix(p,points[(i+points.length-1)%points.length]),after=mix(p,points[(i+1)%points.length]);return (i?'L':'M')+fmt(before)+'Q'+fmt(p)+' '+fmt(after);}).join('')+'Z';
}
export function canadaAgricultureVisibleBelts(metric:string|null,layers:readonly CanadaAgricultureLayer[]){
 return reading.belts.filter(belt=>layers.includes(canadaAgricultureProductLayer(belt.product as CanadaAgricultureIndicatorId))&&(!(belt as any).auxiliary||metric===belt.product));
}
/** Fit the southern production geography to the actual frame, including every label anchor. */
export function canadaAgricultureSouthCamera(width=900,height=500){
 const points=reading.belts.filter(belt=>!(belt as any).auxiliary).flatMap(belt=>[...belt.outline,belt.labelAnchor]).map(projectCanadaMap);
 const b=points.reduce((bounds,point)=>[Math.min(bounds[0],point[0]),Math.min(bounds[1],point[1]),Math.max(bounds[2],point[0]),Math.max(bounds[3],point[1])],[Infinity,Infinity,-Infinity,-Infinity]);
 const scale=Math.min(width/900,height/580);
 return [(b[0]+b[2])/2,(b[1]+b[3])/2,.88*Math.min(width/((b[2]-b[0])*scale),height/((b[3]-b[1])*scale))];
}
