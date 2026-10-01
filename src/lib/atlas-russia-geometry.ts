export type RussiaPosition = number[];
export type RussiaGeometry = {type:string;coordinates:number[][][]|number[][][][]};
export const russiaBounds = [18,40,191,83] as const;
export const russiaWidth = 1200;
export const russiaHeight = Math.round(1200*43/(173*Math.cos(Math.PI/3)));

/** Keep the source rings continuous across 180° and choose the copy near 105°E. */
export function unwrapRussiaRing(ring:RussiaPosition[]):RussiaPosition[]{
 const output:RussiaPosition[]=[];
 for(const [longitude,latitude] of ring){let lon=longitude;const previous=output.at(-1)?.[0];if(previous!==undefined){while(lon-previous>180)lon-=360;while(lon-previous< -180)lon+=360;}output.push([lon,latitude]);}
 if(!output.length)return [];
 const mean=output.reduce((sum,p)=>sum+p[0],0)/output.length,shift=Math.round((105-mean)/360)*360;
 return output.map(([lon,lat])=>[lon+shift,lat]);
}
export function clipRussiaRing(ring:RussiaPosition[],bounds:readonly number[]=russiaBounds):RussiaPosition[]{
 let points=unwrapRussiaRing(ring);if(points.length>1&&points[0][0]===points.at(-1)![0]&&points[0][1]===points.at(-1)![1])points.pop();
 const [west,south,east,north]=bounds;
 for(const [axis,boundary,minimum] of [[0,west,true],[0,east,false],[1,south,true],[1,north,false]] as [number,number,boolean][]){
  const input=points;points=[];if(!input.length)break;let previous=input.at(-1)!;
  const inside=(p:RussiaPosition)=>minimum?p[axis]>=boundary:p[axis]<=boundary;
  for(const current of input){if(inside(current)!==inside(previous)){const t=(boundary-previous[axis])/(current[axis]-previous[axis]);points.push([previous[0]+t*(current[0]-previous[0]),previous[1]+t*(current[1]-previous[1])]);}if(inside(current))points.push(current);previous=current;}
 }
 return points.length>=3?[...points,points[0]]:[];
}
export function projectRussia([longitude,latitude]:RussiaPosition):RussiaPosition{
 const lon=longitude+Math.round((105-longitude)/360)*360;
 return [(lon-18)/173*russiaWidth,(83-latitude)/43*russiaHeight];
}
export function russiaRings(geometry:RussiaGeometry):RussiaPosition[][]{
 const polygons=geometry.type==='Polygon'?[geometry.coordinates as number[][][]]:geometry.coordinates as number[][][][];
 return polygons.flatMap(polygon=>{const outer=clipRussiaRing(polygon[0]);return outer.length?[outer,...polygon.slice(1).map(ring=>clipRussiaRing(ring)).filter(r=>r.length)]:[];});
}
export function russiaPath(geometry:RussiaGeometry):string{
 return russiaRings(geometry).map(ring=>ring.map((point,i)=>{const [x,y]=projectRussia(point);return `${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;}).join('')+'Z').join('');
}
/** Geographic learning windows retain their own aspect; both comparison scenes receive the same frame. */
export function russiaFrameForBounds(bounds:readonly number[]):number[]{
 const [x,y]=projectRussia([bounds[0],bounds[3]]),[x2,y2]=projectRussia([bounds[2],bounds[1]]);
 const width=(x2-x)*1.04,height=(y2-y)*1.04;
 return [(x+x2-width)/2,(y+y2-height)/2,width,height];
}
