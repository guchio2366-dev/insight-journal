// A failed request is evicted, so retry really makes a new request. Metro geometry uses a two-entry LRU.
export function createPopulationLoader(base:string){
 const cache=new Map<string,Promise<any>>();
 async function read(name:string){
  let response=await fetch(base+name+'.json.gz',{signal:AbortSignal.timeout(20000)});
  if(!response.ok){response=await fetch(base+name+'.json',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Population HTTP ${response.status}`);}
  const bytes=new Uint8Array(await response.arrayBuffer());
  const text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);
  const data=JSON.parse(text);
  if(name.endsWith('.geo')){if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Invalid population geometry');}
  else if(data.version!==1||!Array.isArray(data.rows))throw new Error('Invalid population data');
  return data;
 }
 return {get(name:string){let value=cache.get(name);if(value){cache.delete(name);cache.set(name,value);return value;}value=read(name).catch(error=>{cache.delete(name);throw error;});cache.set(name,value);const metroKeys=[...cache.keys()].filter(k=>k.startsWith('metro-'));const metros=[...new Set(metroKeys.map(k=>k.split('.')[0]))];while(metros.length>2){const oldest=metros.shift()!;for(const key of metroKeys)if(key.split('.')[0]===oldest)cache.delete(key);}return value;},clear(){cache.clear();}};
}
