export const readyFields = ['overview', 'agriculture', 'land'] as const;
export type MapField = typeof readyFields[number];
export type Camera = { lng: number; lat: number; zoom: number };
export function readAtlasState(url: URL, defaultField: MapField = 'overview') {
  const pathField = url.pathname.split('/').filter(Boolean).at(-1);
  const field = readyFields.includes(pathField as MapField) ? pathField as MapField : defaultField;
  const read = (key:string,min:number,max:number) => {
    const value = url.searchParams.get(key);
    if (value===null || value.trim()==='') return null;
    const n=Number(value); return Number.isFinite(n)&&n>=min&&n<=max?n:null;
  };
  const lng=read('lng',-137,-56),lat=read('lat',16,58),zoom=read('z',1,7);
  return { field, camera:lng!==null&&lat!==null&&zoom!==null?{lng,lat,zoom}:null, crop:url.searchParams.get('crop') };
}
export function writeAtlasState(url: URL, base: string, field: MapField, camera?: Camera, crop?:string|null) {
  const next=new URL(url);
  next.pathname=base+(field==='overview'?'':field+'/');
  for (const key of ['zone','insight','place']) next.searchParams.delete(key);
  if(camera){ next.searchParams.set('lng',camera.lng.toFixed(5)); next.searchParams.set('lat',camera.lat.toFixed(5)); next.searchParams.set('z',camera.zoom.toFixed(4)); }
  if(crop) next.searchParams.set('crop',crop); else next.searchParams.delete('crop');
  return next;
}
