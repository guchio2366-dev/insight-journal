export type Position = number[];
export type Geometry = { type: string; coordinates: number[][][] | number[][][][] };
export const africaBounds = { west: -27, east: 64, south: -36, north: 39 };
export const africaWidth = 1100;
export const africaHeight = 907;
/** Plate carrée (standard parallel 0°), for location, not area measurement. */
export function projectAfrica([lon, lat]: Position): Position {
  return [(lon + 27) / 91 * africaWidth, (39 - lat) / 75 * africaHeight];
}
export function clipAfricaRing(ring: Position[]): Position[] {
  let points = ring.slice();
  if(points.length>1 && points[0][0]===points.at(-1)![0] && points[0][1]===points.at(-1)![1]) points.pop();
  for(const [axis, edge, min] of [[0,-27,true],[0,64,false],[1,-36,true],[1,39,false]] as [number,number,boolean][]) {
    const input=points; points=[];
    if(!input.length)break;
    let previous=input.at(-1)!;
    const inside=(p:Position)=>min?p[axis]>=edge:p[axis]<=edge;
    for(const current of input) {
      if(inside(current)!==inside(previous)) {
        const t=(edge-previous[axis])/(current[axis]-previous[axis]);
        points.push([previous[0]+t*(current[0]-previous[0]),previous[1]+t*(current[1]-previous[1])]);
      }
      if(inside(current))points.push(current);
      previous=current;
    }
  }
  return points.length>=3?[...points,points[0]]:[];
}
export function africaRings(geometry:Geometry):Position[][] {
  const rings=geometry.type==='Polygon'?geometry.coordinates as Position[][]:(geometry.coordinates as Position[][][]).flat();
  return rings.map(clipAfricaRing).filter(r=>r.length);
}
export function africaPath(geometry:Geometry):string {
  return africaRings(geometry).map(r=>r.map((p,i)=>{
    const [x,y]=projectAfrica(p); return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join('')+'Z').join('');
}
