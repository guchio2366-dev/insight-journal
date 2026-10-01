import geography from '../data/atlas/mexico/geometry.json';
import index from '../data/atlas/mexico/geometry-index.json';
import {lambertForward,lambertInverse,mexicoProjection} from './atlas-mexico-projection.mjs';
export {lambertForward,lambertInverse,mexicoProjection};
export const mapWidth=900,mapHeight=580,mapViewBox='0 0 900 580';
export const width=mapWidth,height=mapHeight;
export const stateFeatures=geography.features;
export const geometryMetadata=index.metadata;
const [minX,minY,maxX,maxY]=index.metadata.boundsNative;
const scale=Math.min((mapWidth-56)/(maxX-minX),(mapHeight-56)/(maxY-minY));
const left=(mapWidth-(maxX-minX)*scale)/2,top=(mapHeight-(maxY-minY)*scale)/2;
export function projectNative([x,y]:number[]):[number,number] {
 return [left+(x-minX)*scale,top+(maxY-y)*scale];
}
export function projectLonLat(coordinate:number[]):[number,number] {return projectNative(lambertForward(coordinate));}
export const project=projectLonLat;
export type MexicoGeometry={type:string;coordinates:any};
export function geometryPath(geometry:MexicoGeometry,projection:((coordinate:number[])=>number[])|'native'=projectLonLat):string {
 const transform=projection==='native'?projectNative:projection;
 const line=(points:number[][],closed:boolean)=>points.map((point,index)=>{const [x,y]=transform(point);return `${index?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join('')+(closed?'Z':'');
 if(geometry.type==='Polygon')return geometry.coordinates.map((ring:number[][])=>line(ring,true)).join('');
 if(geometry.type==='MultiPolygon')return geometry.coordinates.flat().map((ring:number[][])=>line(ring,true)).join('');
 if(geometry.type==='LineString')return line(geometry.coordinates,false);
 if(geometry.type==='MultiLineString')return geometry.coordinates.map((lineString:number[][])=>line(lineString,false)).join('');
 return '';
}
export function stateLabelPoint(code:string):[number,number] {
 const state=index.states.find(state=>state.code===code);
 return state?projectLonLat(state.label):[mapWidth/2,mapHeight/2];
}
export function stateName(code:string):string {return index.states.find(state=>state.code===code)?.nameJa??code;}
export function stateViewBox(code:string,padding=38):string {
 const state=index.states.find(state=>state.code===code);
 if(!state)return mapViewBox;
 const [nx0,ny0,nx1,ny1]=state.boundsNative;
 const [x0,y1]=projectNative([nx0,ny0]),[x1,y0]=projectNative([nx1,ny1]);
 let w=x1-x0+padding*2,h=y1-y0+padding*2;
 if(w/h<mapWidth/mapHeight)w=h*mapWidth/mapHeight;else h=w*mapHeight/mapWidth;
 return `${(x0+x1-w)/2} ${(y0+y1-h)/2} ${w} ${h}`;
}
