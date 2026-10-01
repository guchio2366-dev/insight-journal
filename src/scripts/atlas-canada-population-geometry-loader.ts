export type CanadaPopulationGeometryFeature={
 id:string;
 point?:number[];
 bounds?:number[];
 provinceCodes?:string[];
 rings?:number[][][];
 [key:string]:unknown;
};
export type CanadaPopulationGeometryConfig={
 population?:{
  geometryUrl?:string;
  geometry?:CanadaPopulationGeometryFeature[];
  [key:string]:unknown;
 };
 [key:string]:unknown;
};
export type CanadaPopulationGeometryHydrationOptions={
 config?:CanadaPopulationGeometryConfig;
 onReady?:()=>void;
 onError?:(error:Error)=>void;
};
export type CanadaPopulationGeometryHydrationResult={
 status:'not-needed'|'ready'|'error';
 config:CanadaPopulationGeometryConfig|null;
 error?:Error;
};

// A hashed static asset can be reused across roots without serializing its rings
// into each page's HTML. Failed requests are removed so an explicit retry works.
const requests=new Map<string,Promise<CanadaPopulationGeometryFeature[]>>();

function validateFeatures(value:unknown):CanadaPopulationGeometryFeature[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {features?:unknown}).features))throw new Error('Population boundary asset has no features');
 const features=(value as {features:CanadaPopulationGeometryFeature[]}).features;
 if(!features.length)throw new Error('Population boundary asset is empty');
 const ids=new Set<string>();
 for(const feature of features){
  if(!feature||typeof feature.id!=='string'||ids.has(feature.id))throw new Error('Population boundary asset has invalid CMA identifiers');
  ids.add(feature.id);
  if(!Array.isArray(feature.rings)||!feature.rings.length)throw new Error('Population boundary asset has no original CMA rings');
  for(const ring of feature.rings){
   if(!Array.isArray(ring)||ring.length<4)throw new Error('Population boundary asset has an incomplete ring');
   for(const point of ring)if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))throw new Error('Population boundary asset has invalid coordinates');
   if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])throw new Error('Population boundary asset has an open ring');
  }
  if(!Array.isArray(feature.point)||feature.point.length!==2||!feature.point.every(Number.isFinite)||!Array.isArray(feature.bounds)||feature.bounds.length!==4||!feature.bounds.every(Number.isFinite))throw new Error('Population boundary asset has invalid display metadata');
 }
 return features;
}

function requestFeatures(url:URL,view:Window):Promise<CanadaPopulationGeometryFeature[]>{
 const cached=requests.get(url.href);if(cached)return cached;
 const request=(async()=>{
  const response=await view.fetch(url.href,{credentials:'same-origin',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Population boundary request failed (${response.status})`);
  return validateFeatures(await response.json());
 })();
 requests.set(url.href,request);
 void request.catch(()=>{if(requests.get(url.href)===request)requests.delete(url.href);});
 return request;
}

function statusElement(root:HTMLElement){
 let status=root.querySelector<HTMLElement>('[data-population-geometry-status]');
 if(!status){status=root.ownerDocument.createElement('p');status.dataset.populationGeometryStatus='';status.className='canada-caption';status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.prepend(status);}
 return status;
}

/** Fetch the complete CMA geometry only for a saved population comparison. */
export async function hydrateCanadaPopulationGeometry(root:HTMLElement,selector='[data-canada-config]',options:CanadaPopulationGeometryHydrationOptions={}):Promise<CanadaPopulationGeometryHydrationResult>{
 const view=root.ownerDocument.defaultView;
 let config=options.config??null;
 if(!view)return {status:'error',config,error:new Error('Population comparison has no document window')};
 if(!new URL(view.location.href).searchParams.get('populationReturn')){
  root.dataset.populationGeometryState='not-needed';
  return {status:'not-needed',config};
 }
 let features:CanadaPopulationGeometryFeature[];
 let assetUrl:URL|undefined;
 try{
  if(!config){const element=root.querySelector(selector);if(!element?.textContent)throw new Error('Population comparison configuration is missing');config=JSON.parse(element.textContent) as CanadaPopulationGeometryConfig;}
  const population=config.population;
  if(!population)throw new Error('Population comparison metadata is missing');
  const existing=population.geometry;
  if(existing?.length&&existing.every(feature=>Array.isArray(feature.rings)&&feature.rings.length>0)){
   root.dataset.populationGeometryState='ready';
   const status=root.querySelector<HTMLElement>('[data-population-geometry-status]');if(status)status.hidden=true;
   options.onReady?.();
   return {status:'ready',config};
  }
  if(!population.geometryUrl)throw new Error('Population comparison boundary URL is missing');
  const url=new URL(population.geometryUrl,view.location.href);
  if(url.origin!==view.location.origin)throw new Error('Population comparison boundary URL must have the same origin');
  assetUrl=url;
  root.dataset.populationGeometryState='loading';
  const status=statusElement(root);status.hidden=false;status.textContent='元の都市圏分布を読み込んでいます。';
  features=await requestFeatures(url,view);
  if(existing?.length){const wanted=new Set(existing.map(feature=>feature.id));if(wanted.size!==existing.length||features.length!==existing.length||features.some(feature=>!wanted.has(feature.id)))throw new Error('Population boundary CMA identifiers do not match the page metadata');}
  population.geometry=features;
 }catch(reason){
  const error=reason instanceof Error?reason:new Error(String(reason));
  if(assetUrl)requests.delete(assetUrl.href);
  root.dataset.populationGeometryState='error';
  const status=statusElement(root);status.hidden=false;status.textContent='都市圏境界を読み込めませんでした。元の人口分布図は表示できていません。';
  const retry=root.ownerDocument.createElement('button');retry.type='button';retry.textContent='境界を再読み込み';retry.dataset.populationGeometryRetry='';retry.addEventListener('click',()=>{void hydrateCanadaPopulationGeometry(root,selector,{...options,config:config??undefined});});status.append(' ',retry);
  options.onError?.(error);
  return {status:'error',config,error};
 }
 root.dataset.populationGeometryState='ready';
 const status=root.querySelector<HTMLElement>('[data-population-geometry-status]');if(status)status.hidden=true;
 options.onReady?.();
 return {status:'ready',config};
}
