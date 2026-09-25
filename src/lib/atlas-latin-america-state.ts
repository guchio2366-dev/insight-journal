export const latinFields = ['nature','agriculture','industry','population'] as const;
export type LatinState = {field:string;topic:string;place:string;city:string;crop:string;view:string;camera?:[number,number,number]};
export const cropIds=['whea','rice','maiz','soyb','sugc','coff','rcof','bana','coco','cott','pota','temf','cattle','pig','chicken','none'];
export function readLatinState(search:string, topics:{id:string;field:string;countries?:string[]}[],places:string[],cities:(string|{id:string;countryCode:string})[]):LatinState {
 const p=new URLSearchParams(search),field=latinFields.includes(p.get('field') as any)?p.get('field')!:'nature';
 const selectedCity=field==='nature'?cities.find(c=>(typeof c==='string'?c:c.id)===p.get('city')):undefined;
 const city=selectedCity?(typeof selectedCity==='string'?selectedCity:selectedCity.id):'';
 const selectedTopic=city?undefined:topics.find(t=>t.id===p.get('topic')&&t.field===field);
 const topic=selectedTopic?.id??'';
 let place=places.includes(p.get('place')??'')?p.get('place')!:'';
 if(place&&((typeof selectedCity==='object'&&selectedCity.countryCode!==place)||(selectedTopic?.countries&&!selectedTopic.countries.includes(place))))place='';
 const crop=cropIds.includes(p.get('crop')??'')?p.get('crop')!:'soyb';
 const raw=(p.get('map')??'').split(',').map(v=>v.trim()===''?NaN:Number(v));
 const camera=raw.length===3&&raw.every(Number.isFinite)&&raw[0]>=-100&&raw[0]<=-25&&raw[1]>=-60&&raw[1]<=32&&raw[2]>=1&&raw[2]<=9?raw as [number,number,number]:undefined;
 return {field,topic,place,city,crop,view:p.get('view')==='rivers'?'rivers':'climate',camera};
}
export function writeLatinState(state:LatinState):string {
 const p=new URLSearchParams();
 p.set('field',state.field);
 for(const key of ['topic','place','city'] as const) if(state[key])p.set(key,state[key]);
 if(state.field==='agriculture')p.set('crop',state.crop);
 if(state.field==='nature'&&state.view!=='climate')p.set('view',state.view);
 if(state.camera)p.set('map',state.camera.map((n,i)=>n.toFixed(i===2?2:3)).join(','));
 return p.toString();
}
export function cropValueAt(grid:{bounds:number[];width:number;height:number;cellSize:number;positiveCells:number[][];validRuns:number[][]},lon:number,lat:number):number|null {
 const [west,south,east,north]=grid.bounds;
 if(lon<west||lon>=east||lat<=south||lat>north)return null;
 const index=Math.floor((north-lat)/grid.cellSize)*grid.width+Math.floor((lon-west)/grid.cellSize);
 if(!grid.validRuns.some(([start,count])=>index>=start&&index<start+count))return null;
 return grid.positiveCells.find(([i])=>i===index)?.[1]??0;
}
