// Request promises are shared; failures are removed so the Retry button can retry.
// Generation checks belong to the caller: old responses can fill the cache but
// cannot change the selected view or its legend.
export function createNatureLoader(base:string, fetcher:typeof fetch=fetch){
  const cache=new Map<string,Promise<any>>();
  function json(name:string):Promise<any>{
    if(cache.has(name))return cache.get(name)!;
    const promise=(async()=>{
      const response=await fetcher(base+name);
      if(!response.ok)throw new Error(`${name}: ${response.status}`);
      if(!name.endsWith('.gz'))return response.json();
      if(!response.body)throw new Error('Empty contour response');
      return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
    })().catch(error=>{cache.delete(name);throw error;});
    cache.set(name,promise);return promise;
  }
  async function contours(){return json('contours.geojson.gz');}
  return {json,contours};
}

export function contourLabelCandidates(collection:any){
  return collection.features.filter((feature:any)=>feature.geometry.type==='LineString')
    .sort((a:any,b:any)=>b.geometry.coordinates.length-a.geometry.coordinates.length)
    .slice(0,400).map((feature:any,index:number)=>{
      const coordinates=feature.geometry.coordinates;
      const [lng,lat]=coordinates[Math.floor(coordinates.length/2)];
      const height=feature.properties.elevationM;
      return {id:`contour-${index}`,name:`${height.toLocaleString('ja-JP')} m`,lng,lat,kind:'contour',priority:height%1000===0?2:4,modes:['contour']};
    });
}
