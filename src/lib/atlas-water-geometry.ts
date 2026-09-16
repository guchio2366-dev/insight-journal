import {createNatureLoader} from './atlas-nature-loader';
// The water map and agriculture annotations share one decoded collection.
const loaders=new Map<string,ReturnType<typeof createNatureLoader>>();
export function waterGeometryLoader(base:string){
 if(!loaders.has(base))loaders.set(base,createNatureLoader(base));
 return loaders.get(base)!;
}
