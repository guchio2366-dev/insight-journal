import {waterViews,precipitationBands,riverBasins,type WaterView} from '../data/atlas/water-resources.ts';
export type WaterState={waterView:WaterView;precipBand:string|null;basin:string|null};
export function readWaterState(url:URL):WaterState{
 const v=url.searchParams.get('waterView');return {waterView:waterViews.includes(v as WaterView)?v as WaterView:'rivers',precipBand:precipitationBands.some(x=>x.id===url.searchParams.get('precipBand'))?url.searchParams.get('precipBand'):null,basin:riverBasins.some(x=>x.id===url.searchParams.get('basin'))?url.searchParams.get('basin'):null};
}
export function writeWaterState(url:URL,state:WaterState){
 const next=new URL(url);for(const [k,v] of Object.entries(state)){if(v&&!(k==='waterView'&&v==='rivers'))next.searchParams.set(k,v);else next.searchParams.delete(k);}return next;
}
export function waterTargetUrl(source:URL,base:string,view:WaterView,id?:string){
 const url=new URL(source);url.pathname=base+'nature/';url.searchParams.set('env','water');url.searchParams.delete('field');url.searchParams.delete('natureFeature');url.hash='';
 return writeWaterState(url,readWaterState(writeWaterState(url,{waterView:view,precipBand:view==='precipitation'?id??null:null,basin:view==='basins'?id??null:null})));
}
// Even-odd polygon test supports holes and MultiPolygons in fallback mode.
export function waterContains(g:any,p:readonly number[]):boolean{
 const ring=(r:number[][])=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 if(g.type==='Polygon')return ring(g.coordinates[0])&&!g.coordinates.slice(1).some(ring);
 return g.type==='MultiPolygon'&&g.coordinates.some((c:any)=>waterContains({type:'Polygon',coordinates:c},p));
}
