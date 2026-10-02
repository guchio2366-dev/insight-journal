import {westFields,westTopics} from '../data/atlas/west-asia-topics.mjs';
const unavailableCategories={natural:['precipitation'],population:['ethnicity','religion']};
const categoryForField=(value,field)=>unavailableCategories[field]?.includes(value)?value:'';
export function readWestState(search, field, data) {
  const p=new URLSearchParams(search);const fallback=westFields.find(f=>f.id===field)??westFields[1];
  field=fallback.id;
  const legacy=categoryForField(p.get('category'),field);
  const topic=westTopics.find(t=>t.field===field&&t.id===(legacy||p.get('topic')))?.id??fallback.first;
  const category='';
  const group=/^[a-zA-Z0-9_.:-]{1,120}$/.test(p.get('group')??'')?p.get('group'):'';
  const country=data.countries.some(c=>c.code===p.get('country'))?p.get('country'):'';
  const city=data.cities.find(c=>c.id===p.get('city')&&(!country||c.countryCode===country))?.id??'';
  const urban=data.urban.cities.find(c=>c.id===p.get('urban')&&(!country||c.countryCode===country))?.id??'';
  const nums=(p.get('map')??'').split(',').map(Number);
  const view=nums.length===4&&nums.every(Number.isFinite)&&nums[2]>=15&&nums[2]<=4000&&nums[3]>=15&&nums[3]<=4000&&Math.abs(nums[0])<=4000&&Math.abs(nums[1])<=4000?nums:null;
  const year=[2020,2021,2022,2023,2024].includes(Number(p.get('year')))?Number(p.get('year')):2024;
  const at=(p.get('at')??'').split(',').map(Number);
  const point=at.length===2&&at.every(Number.isFinite)&&at[0]>=23&&at[0]<=64&&at[1]>=10&&at[1]<=45?at:null;
  return {field,topic,category,group,country,city,urban,year,view,basin:p.get('basin')??'',point};
}
export function westSearch(state,targetField=state.field) {
  const p=new URLSearchParams();
  const destination=westFields.find(f=>f.id===targetField)??westFields.find(f=>f.id===state.field)??westFields[1];
  const sameField=destination.id===state.field;
  p.set('topic',sameField?(categoryForField(state.category,destination.id)||state.topic):destination.first);
  for(const key of ['country','city','urban','basin','group'])if(state[key])p.set(key,state[key]);
  p.set('year',String(state.year));
  if(state.view)p.set('map',state.view.map(n=>Number(n.toFixed(3))).join(','));
  if(state.point)p.set('at',state.point.map(n=>Number(n.toFixed(5))).join(','));
  return '?'+p.toString();
}
export function gridIndex(lng,lat,layer) {
  const x=6378137*lng*Math.PI/180,y=6378137*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  const b=layer.bounds3857;
  if(x<b[0]||x>=b[2]||y<=b[1]||y>b[3])return -1;
  return Math.floor((b[3]-y)/(b[3]-b[1])*layer.height)*layer.width+Math.floor((x-b[0])/(b[2]-b[0])*layer.width);
}
export async function decodeWestGrid(buffer, layer) {
  const bytes=new Uint8Array(buffer);
  // Static servers may decode Content-Encoding:gzip before fetch exposes bytes.
  const raw=bytes[0]===0x1f&&bytes[1]===0x8b
    ?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():buffer;
  if(raw.byteLength!==layer.width*layer.height*4)throw new Error('Unexpected grid byte length');
  const values=new Float32Array(raw);
  if(values.some(v=>!Number.isFinite(v)))throw new Error('Non-finite grid value');
  return values;
}
export function zoomWestView(view, factor) {
  const [x,y,w,h]=view;
  const scale=Math.max(15/Math.min(w,h),Math.min(3000/Math.max(w,h),factor));
  const width=w*scale,height=h*scale;
  return panWestView([x+(w-width)/2,y+(h-height)/2,width,height],0,0);
}
export function panWestView(view,dx,dy) {
  return [Math.max(-4000,Math.min(4000,view[0]+dx)),Math.max(-4000,Math.min(4000,view[1]+dy)),view[2],view[3]];
}
