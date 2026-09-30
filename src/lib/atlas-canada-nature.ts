export const canadaViews=['climate','landform','water'] as const;
export type CanadaView=typeof canadaViews[number];
export interface CanadaNatureState{city:string;compare:string|null;view:CanadaView;water:string|null;only:boolean;frame:number[]|null}
export function readCanadaNatureState(url:URL,cities:readonly string[],waters:readonly string[]):CanadaNatureState{
 const q=url.searchParams,city=cities.includes(q.get('city')??'')?q.get('city')!:'ottawa';
 const compare=q.get('compare'),view=q.get('view');
 const frame=q.get('frame')?.split(',').map(Number);
 const validFrame=frame?.length===4&&frame.every(Number.isFinite)&&frame[0]>=-100&&frame[0]<=1000&&frame[1]>=-100&&frame[1]<=700&&frame[2]>=30&&frame[2]<=1000&&frame[3]>=20&&frame[3]<=700;
 return {city,compare:compare&&compare!==city&&cities.includes(compare)?compare:null,view:canadaViews.includes(view as CanadaView)?view as CanadaView:'climate',water:waters.includes(q.get('water')??'')?q.get('water'):null,only:q.get('only')==='1',frame:validFrame?frame!:null};
}
export function writeCanadaNatureState(url:URL,state:CanadaNatureState):URL{
 const next=new URL(url);for(const key of ['city','compare','view','water','only','frame'])next.searchParams.delete(key);
 next.searchParams.set('city',state.city);next.searchParams.set('view',state.view);
 if(state.compare)next.searchParams.set('compare',state.compare);
 if(state.water)next.searchParams.set('water',state.water);
 if(state.only)next.searchParams.set('only','1');
 if(state.frame)next.searchParams.set('frame',state.frame.map(n=>Math.round(n*100)/100).join(','));
 return next;
}
