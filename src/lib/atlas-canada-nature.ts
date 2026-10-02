export const canadaViews=['climate','landform','water','elevation'] as const;
export type CanadaView=typeof canadaViews[number];
export const canadaLandformIds=['cordillera','interior-plains','canadian-shield','great-lakes-st-lawrence-lowlands','appalachian-uplands','hudson-bay-lowland','arctic-lands'] as const;
export interface CanadaNatureState{city:string;compare:string|null;view:CanadaView;water:string|null;only:boolean;frame:number[]|null;landform:string|null;landformOnly:boolean;landformBounds:[number,number,number,number]|null}
export function readCanadaNatureState(url:URL,cities:readonly string[],waters:readonly string[]):CanadaNatureState{
 const q=url.searchParams,city=cities.includes(q.get('city')??'')?q.get('city')!:'ottawa';
 const compare=q.get('compare'),view=q.get('view');
 const frame=q.get('frame')?.split(',').map(Number);
 const validFrame=frame?.length===4&&frame.every(Number.isFinite)&&frame[0]>=-100&&frame[0]<=1000&&frame[1]>=-100&&frame[1]<=700&&frame[2]>=30&&frame[2]<=1000&&frame[3]>=20&&frame[3]<=700;
 const landform=q.get('landform');
 const selectedLandform=canadaLandformIds.includes(landform as typeof canadaLandformIds[number])?landform:null;
 const landformBounds=q.get('landformBounds')?.split(',').map(Number);
 const validLandformBounds=landformBounds?.length===4&&landformBounds.every(Number.isFinite)&&landformBounds[0]>=-180&&landformBounds[2]<=180&&landformBounds[1]>=-85.051&&landformBounds[3]<=85.051&&landformBounds[0]<landformBounds[2]&&landformBounds[1]<landformBounds[3];
 return {city,compare:compare&&compare!==city&&cities.includes(compare)?compare:null,view:canadaViews.includes(view as CanadaView)?view as CanadaView:'climate',water:waters.includes(q.get('water')??'')?q.get('water'):null,only:q.get('only')==='1',frame:validFrame?frame!:null,landform:selectedLandform,landformOnly:!!selectedLandform&&q.get('landformOnly')==='1',landformBounds:validLandformBounds?landformBounds as [number,number,number,number]:null};
}
export function writeCanadaNatureState(url:URL,state:CanadaNatureState):URL{
 const next=new URL(url);for(const key of ['city','compare','view','water','only','frame','landform','landformOnly','landformBounds'])next.searchParams.delete(key);
 next.searchParams.set('city',state.city);next.searchParams.set('view',state.view);
 if(state.compare)next.searchParams.set('compare',state.compare);
 if(state.water)next.searchParams.set('water',state.water);
 if(state.only)next.searchParams.set('only','1');
 if(state.frame)next.searchParams.set('frame',state.frame.map(n=>Math.round(n*100)/100).join(','));
 if(state.landform)next.searchParams.set('landform',state.landform);
 if(state.landform&&state.landformOnly)next.searchParams.set('landformOnly','1');
 if(state.landformBounds)next.searchParams.set('landformBounds',state.landformBounds.map(n=>Math.round(n*100000)/100000).join(','));
 return next;
}
