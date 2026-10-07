export type LocalityFrame = [number,number,number,number];
export type LocalityPoint = [number,number,number,string,string,string];
export type LocalityCluster = [number,number,number,number,string,string,number,number,number,number];
export interface LocalityChunk {file:string;stateCode:string;localities:number;population:number;bounds:number[]}
export interface LocalityManifest {assets:string;localities:number;population:number;overview:{file:string;points:number};chunks:LocalityChunk[]}
export const localityNationalFrame:LocalityFrame=[0,0,900,580];

export function readLocalityFrame(url:URL):LocalityFrame {
 const values=url.searchParams.get('localityFrame')?.split(',').map(Number);
 return values?.length===4&&values.every(Number.isFinite)&&values[0]>=0&&values[1]>=0&&values[2]>=6&&values[2]<=900&&values[3]>=6*580/900&&values[3]<=580&&Math.abs(values[3]-values[2]*580/900)<=.01&&values[0]+values[2]<=900.01&&values[1]+values[3]<=580.01
  ?values as LocalityFrame:[...localityNationalFrame];
}
export function localityZoom(frame:LocalityFrame,factor:number,anchor:[number,number]=[frame[0]+frame[2]/2,frame[1]+frame[3]/2]):LocalityFrame {
 const width=Math.min(900,Math.max(6,frame[2]*factor)),height=width*580/900;
 const x=Math.max(0,Math.min(900-width,anchor[0]-(anchor[0]-frame[0])*width/frame[2]));
 const y=Math.max(0,Math.min(580-height,anchor[1]-(anchor[1]-frame[1])*height/frame[3]));
 return [x,y,width,height].map(v=>Math.round(v*100000)/100000) as LocalityFrame;
}
export function localityFrameIntersects(frame:LocalityFrame,bounds:number[]):boolean {
 return bounds[0]<=frame[0]+frame[2]&&bounds[2]>=frame[0]&&bounds[1]<=frame[1]+frame[3]&&bounds[3]>=frame[1];
}
export function localityInFrame(x:number,y:number,frame:LocalityFrame):boolean {
 return x>=frame[0]&&x<=frame[0]+frame[2]&&y>=frame[1]&&y<=frame[1]+frame[3];
}
export function localitySymbolScale(maximumCount:number,zoom:number):number {
 // One common area scale per displayed map; the legend changes with that scale.
 return Math.min(.000035*zoom,14*14/Math.max(1,maximumCount));
}
export function localitySymbolRadius(count:number,areaScale:number):number {
 return Number.isFinite(count)&&count>=0?Math.sqrt(count*areaScale):0;
}
