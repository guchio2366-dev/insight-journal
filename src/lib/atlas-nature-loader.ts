import { contourInterval } from './atlas-nature-state.ts';

export type ContourTile = {file:string;intervalM:number;bounds:number[]};
export const intersectingTiles = (tiles:ContourTile[], bounds:number[], zoom:number) =>
  tiles.filter(tile=>tile.intervalM===contourInterval(zoom)&&tile.bounds[0]<=bounds[2]&&tile.bounds[2]>=bounds[0]&&tile.bounds[1]<=bounds[3]&&tile.bounds[3]>=bounds[1]);

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
  async function contours(bounds:number[],zoom:number){
    if(contourInterval(zoom)===500)return json('contours.geojson.gz');
    const tiles=intersectingTiles(await json('contour-tiles.json'),bounds,zoom);
    const collections=await Promise.all(tiles.map(tile=>json(tile.file)));
    return {type:'FeatureCollection',features:collections.flatMap(data=>data.features)};
  }
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
