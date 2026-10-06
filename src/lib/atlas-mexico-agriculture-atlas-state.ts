import {mexicoAgricultureIds} from '../data/atlas/mexico/agriculture-catalog';
export interface MexicoAgricultureAtlasState {
 item:string|null; state:string|null; region:string|null; crops:boolean; livestock:boolean; onlyItem:boolean;
 zoom:number; x:number; y:number;
}
const finite=(value:string|null,fallback:number,min:number,max:number)=>{
 const n=value===null?NaN:Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
};
export function normalizeMexicoAgricultureCamera(camera:Pick<MexicoAgricultureAtlasState,'x'|'y'|'zoom'>){
 const zoom=Math.round(Math.max(1,Math.min(5,camera.zoom))*100)/100,halfWidth=450/zoom,halfHeight=290/zoom;
 return {zoom,x:Math.max(halfWidth,Math.min(900-halfWidth,camera.x)),y:Math.max(halfHeight,Math.min(580-halfHeight,camera.y))};
}
export function readMexicoAgricultureAtlasState(url:URL):MexicoAgricultureAtlasState {
 const query=url.searchParams;
 const hash=url.hash.match(/^#(?:crop|livestock)-([a-z]+)$/)?.[1]??(url.hash==='#forestry-timber'?'pine':null);
 const legacy=({maize:'corn',pine:'pine',irrigation:'irrigation',cattle:'cattle'} as Record<string,string>)[query.get('metric')??''];
 const requested=hash??query.get('agriItem')??(query.get('reading')!=='overview'?legacy:null);
 let item=query.get('reading')==='overview'?null:requested&&mexicoAgricultureIds.includes(requested)?requested:null;
 const rawState=query.get('state');
 const state=rawState&&/^(0?[1-9]|[12][0-9]|3[0-2])$/.test(rawState)?rawState.padStart(2,'0'):null;
 if(!item&&state&&query.get('reading')!=='overview')item='corn';
 const result={item,state,region:query.get('region'),
  crops:query.get('crops')!=='0',livestock:query.get('livestock')!=='0',onlyItem:query.get('onlyItem')==='1',
  zoom:finite(query.get('az'),1,1,5),x:finite(query.get('ax'),450,0,900),y:finite(query.get('ay'),290,0,580)};
 return {...result,...normalizeMexicoAgricultureCamera(result)};
}
export function writeMexicoAgricultureAtlasState(url:URL,state:MexicoAgricultureAtlasState):URL {
 state={...state,...normalizeMexicoAgricultureCamera(state)};
 const result=new URL(url);result.hash='';const query=result.searchParams;
 for(const key of ['agriItem','metric','state','region','crops','livestock','onlyItem','ax','ay','az','only','fallback'])query.delete(key);
 query.set('reading',state.item?'item':'overview');
 if(state.item){query.set('agriItem',state.item);const metric=({corn:'maize',pine:'pine',irrigation:'irrigation',cattle:'cattle'} as Record<string,string>)[state.item];if(metric)query.set('metric',metric);}
 if(state.state)query.set('state',state.state);
 if(state.region)query.set('region',state.region);
 if(!state.crops)query.set('crops','0');if(!state.livestock)query.set('livestock','0');if(state.onlyItem)query.set('onlyItem','1');
 if(state.zoom!==1){query.set('az',state.zoom.toFixed(2));query.set('ax',state.x.toFixed(2));query.set('ay',state.y.toFixed(2));}
 return result;
}
export function agricultureCameraViewBox(state:Pick<MexicoAgricultureAtlasState,'x'|'y'|'zoom'>):[number,number,number,number] {
 const width=900/state.zoom,height=580/state.zoom;
 return [Math.max(0,Math.min(900-width,state.x-width/2)),Math.max(0,Math.min(580-height,state.y-height/2)),width,height];
}
