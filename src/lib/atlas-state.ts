import { regionalInsightIds } from '../data/atlas/regional-insights.ts';
import { validNatureFeature } from './atlas-nature-state.ts';
import { livestockRegions } from '../data/atlas/livestock.ts';

export const readyFields = ['overview', 'agriculture', 'natural'] as const;
export const natureModes = ['climate', 'water', 'landform', 'contour'] as const;
export const climateCityIds = ['seattle','san-francisco','los-angeles','las-vegas','denver','dallas','chicago','detroit','new-orleans','miami','washington-dc','new-york'] as const;
export const mapCropIds = ['corn', 'soybean', 'wheat', 'cotton', 'rice', 'specialty', 'corn-soybean'] as const;
export const statsCropIds = ['corn', 'soybean', 'wheat', 'cotton', 'rice'] as const;
export const livestockKindIds = ['beef','dairy','hogs','broilers','layers'] as const;
export const livestockRegionIds = ['northern-plains-beef','southern-plains-beef','ozarks-beef','california-dairy','upper-midwest-dairy','northeast-dairy','idaho-dairy','iowa-hogs','east-cornbelt-hogs','north-carolina-hogs','southeast-broilers','arklatex-broilers','delmarva-broilers','iowa-layers','penn-ohio-layers'] as const;
export type MapField = typeof readyFields[number];
export type NatureMode = typeof natureModes[number];
export type ViewMode = 'fit' | 'custom';
export type Camera = { lng: number; lat: number; zoom: number };
export type AgricultureLayer = 'crops'|'livestock';

function allowed<T extends readonly string[]>(value:string|null, list:T):T[number]|null {
  return value !== null && list.includes(value as T[number]) ? value as T[number] : null;
}

export function readAtlasState(url: URL, defaultField: MapField = 'overview') {
  const pathPart = url.pathname.split('/').filter(Boolean).at(-1);
  const pathField = pathPart==='review' ? url.searchParams.get('field') : pathPart;
  const normalizedPathField = pathField==='nature'||pathField==='land'||pathField==='climate' ? 'natural' : pathField;
  const field = readyFields.includes(normalizedPathField as MapField) ? normalizedPathField as MapField : defaultField;
  const read = (key:string,min:number,max:number) => {
    const value = url.searchParams.get(key);
    if (value===null || value.trim()==='') return null;
    const n=Number(value); return Number.isFinite(n)&&n>=min&&n<=max?n:null;
  };
  const lng=read('lng',-137,-56),lat=read('lat',16,58),zoom=read('z',1,7);
  const camera=lng!==null&&lat!==null&&zoom!==null?{lng,lat,zoom}:null;
  const explicitView=allowed(url.searchParams.get('view'),['fit','custom'] as const);
  const rawLayers=url.searchParams.get('agriLayers');
  const tokens=rawLayers==='none'?[]:(rawLayers??'crops,livestock').split(',').filter((value,index,array)=>['crops','livestock'].includes(value)&&array.indexOf(value)===index) as AgricultureLayer[];
  const agriLayers:AgricultureLayer[]=rawLayers!==null&&rawLayers!=='none'&&tokens.length===0?['crops','livestock']:tokens;
  const animal=allowed(url.searchParams.get('animal'),livestockKindIds),animalRegion=allowed(url.searchParams.get('animalRegion'),livestockRegionIds);
  const validAnimalRegion=animal&&animalRegion&&livestockRegions.some(region=>region.id===animalRegion&&region.kindId===animal);
  return {
    field,
    camera,
    crop:allowed(url.searchParams.get('crop'),mapCropIds),
    region:allowed(url.searchParams.get('region'),regionalInsightIds),
    stats:allowed(url.searchParams.get('stats'),statsCropIds) ?? 'corn',
    view:explicitView ?? (camera?'custom':'fit') as ViewMode,
    env:allowed(url.searchParams.get('env'),natureModes) ?? (pathField==='land'?'landform':'climate'),
    city:allowed(url.searchParams.get('city'),climateCityIds),
    agriLayers,animal:validAnimalRegion?animal:null,animalRegion:validAnimalRegion?animalRegion:null,
    natureFeature:validNatureFeature(url.searchParams.get('natureFeature'))
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
  view:ViewMode='custom',
  agriLayers:readonly AgricultureLayer[]=['crops','livestock'],animal?:string|null,animalRegion?:string|null,
  nature?:{env?:NatureMode;city?:string|null;natureFeature?:string|null}
) {
  const next=new URL(url);
  next.pathname=base+(field==='overview'?'':field==='natural'?'nature/':field+'/');
  for (const key of ['zone','insight','place']) next.searchParams.delete(key);
  if(camera){ next.searchParams.set('lng',camera.lng.toFixed(5)); next.searchParams.set('lat',camera.lat.toFixed(5)); next.searchParams.set('z',camera.zoom.toFixed(4)); }
  else for(const key of ['lng','lat','z'])next.searchParams.delete(key);
  if(allowed(crop??null,mapCropIds)) next.searchParams.set('crop',crop!); else next.searchParams.delete('crop');
  if(regionalInsightIds.includes(region??'')) next.searchParams.set('region',region!); else next.searchParams.delete('region');
  if(allowed(stats??null,statsCropIds)) next.searchParams.set('stats',stats!); else next.searchParams.delete('stats');
  const normalized=['crops','livestock'].filter(item=>agriLayers.includes(item as AgricultureLayer));next.searchParams.set('agriLayers',normalized.length?normalized.join(','):'none');
  if(allowed(animal??null,livestockKindIds)&&allowed(animalRegion??null,livestockRegionIds)&&normalized.includes('livestock')){next.searchParams.set('animal',animal!);next.searchParams.set('animalRegion',animalRegion!);next.searchParams.delete('crop');next.searchParams.delete('region');}else{next.searchParams.delete('animal');next.searchParams.delete('animalRegion');}
  next.searchParams.set('view',view);
  if(allowed(nature?.env??null,natureModes) && nature!.env!=='climate')next.searchParams.set('env',nature!.env!);else next.searchParams.delete('env');
  if(allowed(nature?.city??null,climateCityIds))next.searchParams.set('city',nature!.city!);else next.searchParams.delete('city');
  if(validNatureFeature(nature?.natureFeature))next.searchParams.set('natureFeature',nature!.natureFeature!);else next.searchParams.delete('natureFeature');
  return next;
}
