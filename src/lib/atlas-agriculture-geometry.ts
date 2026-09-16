/** Share the crop request between the interactive map and its early SVG overlay.
 * Keep the promise for same-document navigation; failures remain retryable.
 */
const requests=new Map<string,Promise<any>>();
export function loadAgricultureGeometry(base:string){
 const url=base+'agriculture.geojson';
 if(!requests.has(url))requests.set(url,fetch(url).then(response=>{
  if(!response.ok)throw new Error('Agriculture geometry: '+response.status);
  return response.json();
 }).catch(error=>{requests.delete(url);throw error;}));
 return requests.get(url)!;
}
