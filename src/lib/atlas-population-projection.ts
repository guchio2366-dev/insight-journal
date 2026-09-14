import {containedMapBox,type Box} from './atlas-nature-labels.ts';
export const populationMercator=(lat:number)=>180/Math.PI*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
export function populationFallbackExtent(bounds:number[][]=[[-125,24],[-66,50]],padding=.1){
 return [bounds[0][0]-padding,populationMercator(bounds[0][1])-padding,bounds[1][0]+padding,populationMercator(bounds[1][1])+padding];
}
/** The raster and SVG builders letterbox a Mercator plot inside a 1200×720 image. */
export function populationFallbackBox(image:Box,extent:number[]){
 const inner=containedMapBox(image,1200,720);
 return containedMapBox(inner,extent[2]-extent[0],extent[3]-extent[1]);
}
export function projectPopulationFallback(coordinate:readonly number[],box:Box,extent:number[]){
 return {x:box.left+(coordinate[0]-extent[0])/(extent[2]-extent[0])*(box.right-box.left),y:box.top+(extent[3]-populationMercator(coordinate[1]))/(extent[3]-extent[1])*(box.bottom-box.top)};
}
