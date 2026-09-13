import { regionalInsightIds } from '../data/atlas/regional-insights.ts';

export const readyFields = ['overview', 'agriculture', 'land'] as const;
export const mapCropIds = ['corn', 'soybean', 'wheat', 'cotton', 'rice', 'specialty', 'corn-soybean'] as const;
export const statsCropIds = ['corn', 'soybean', 'wheat', 'cotton', 'rice'] as const;
export type MapField = typeof readyFields[number];
export type ViewMode = 'fit' | 'custom';
export type Camera = { lng: number; lat: number; zoom: number };

function allowed<T extends readonly string[]>(value:string|null, list:T):T[number]|null {
  return value !== null && list.includes(value as T[number]) ? value as T[number] : null;
}

export function readAtlasState(url: URL, defaultField: MapField = 'overview') {
  const pathPart = url.pathname.split('/').filter(Boolean).at(-1);
  const pathField = pathPart==='review' ? url.searchParams.get('field') : pathPart;
  const field = readyFields.includes(pathField as MapField) ? pathField as MapField : defaultField;
  const read = (key:string,min:number,max:number) => {
    const value = url.searchParams.get(key);
    if (value===null || value.trim()==='') return null;
    const n=Number(value); return Number.isFinite(n)&&n>=min&&n<=max?n:null;
  };
  const lng=read('lng',-137,-56),lat=read('lat',16,58),zoom=read('z',1,7);
  const camera=lng!==null&&lat!==null&&zoom!==null?{lng,lat,zoom}:null;
  const explicitView=allowed(url.searchParams.get('view'),['fit','custom'] as const);
  return {
    field,
    camera,
    crop:allowed(url.searchParams.get('crop'),mapCropIds),
    region:allowed(url.searchParams.get('region'),regionalInsightIds),
    stats:allowed(url.searchParams.get('stats'),statsCropIds) ?? 'corn',
    view:explicitView ?? (camera?'custom':'fit') as ViewMode
  };
}

export function writeAtlasState(
  url: URL,
  base: string,
  field: MapField,
  camera?: Camera,
  crop?:string|null,
  region?:string|null,
  stats?:string|null,
  view:ViewMode='custom'
) {
  const next=new URL(url);
  next.pathname=base+(field==='overview'?'':field+'/');
  for (const key of ['zone','insight','place']) next.searchParams.delete(key);
  if(camera){ next.searchParams.set('lng',camera.lng.toFixed(5)); next.searchParams.set('lat',camera.lat.toFixed(5)); next.searchParams.set('z',camera.zoom.toFixed(4)); }
  else for(const key of ['lng','lat','z'])next.searchParams.delete(key);
  if(allowed(crop??null,mapCropIds)) next.searchParams.set('crop',crop!); else next.searchParams.delete('crop');
  if(regionalInsightIds.includes(region??'')) next.searchParams.set('region',region!); else next.searchParams.delete('region');
  if(allowed(stats??null,statsCropIds)) next.searchParams.set('stats',stats!); else next.searchParams.delete('stats');
  next.searchParams.set('view',view);
  return next;
}
