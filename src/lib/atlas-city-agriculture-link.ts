import {animalDetailIds, cropDetailIds, type ProductId} from './atlas-agriculture-detail-state.ts';

/** A real link works with reload, back, a new tab and without JavaScript. */
export function cityAgricultureUrl(source:URL,base:string,city:string,product:ProductId):URL {
  const url=new URL(source), animal=animalDetailIds.includes(product as typeof animalDetailIds[number]);
  url.pathname=base+'agriculture/';
  for(const key of ['field','region','relation','animal','animalRegion','crop','env','natureFeature'])url.searchParams.delete(key);
  url.searchParams.set('city',city);
  url.searchParams.set('agriReading','product:'+product);
  url.searchParams.set('agriProduct',product);
  if(animal)url.searchParams.set('livestockStats',product);
  else{
    url.searchParams.set('crop',product);
    if(cropDetailIds.includes(product as typeof cropDetailIds[number]))url.searchParams.set('stats',product);
  }
  const required=animal?'livestock':'crops';
  const old=(url.searchParams.get('agriLayers')??'crops,livestock').split(',');
  url.searchParams.set('agriLayers',['crops','livestock'].filter(layer=>layer===required||old.includes(layer)).join(','));
  url.hash=`${animal?'livestock':'crop'}-${product}`;
  return url;
}
