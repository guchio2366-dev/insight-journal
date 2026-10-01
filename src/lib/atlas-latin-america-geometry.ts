import geography from '../data/atlas/latin-america/countries.json';

export type LatinPosition = [number, number];
export type LatinGeometry = {type: string; coordinates: number[][][] | number[][][][]};
export type LatinScope = 'all' | 'central' | 'south' | 'country';
export const latinWidth = 900;
export const latinHeight = 580;
export const latinBounds = [-93, -56, -33, 28] as const;
const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)) * 180 / Math.PI;
const scale = latinHeight / (mercator(latinBounds[3]) - mercator(latinBounds[1]));

/** Uniform Web Mercator coordinates. This map preserves raster alignment, not area. */
export function projectLatin([longitude, latitude]: number[]): LatinPosition {
 return [(longitude - latinBounds[0]) * scale, (mercator(latinBounds[3]) - mercator(latitude)) * scale];
}
export function latinRings(geometry: LatinGeometry): number[][][] {
 return geometry.type === 'Polygon' ? geometry.coordinates as number[][][] : (geometry.coordinates as number[][][][]).flat();
}
export function latinPath(geometry: LatinGeometry): string {
 return latinRings(geometry).map(ring => ring.map((point, index) => {
  const [x, y] = projectLatin(point);
  return `${index ? 'L' : 'M'}${x.toFixed(4)},${y.toFixed(4)}`;
 }).join('') + 'Z').join('');
}
function geographicBounds(geometry: LatinGeometry): number[] {
 let west=Infinity, south=Infinity, east=-Infinity, north=-Infinity;
 for (const ring of latinRings(geometry)) for (const [lon, lat] of ring) {
  west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);
 }
 return [west,south,east,north];
}
export function latinProjectedBounds(bounds: readonly number[]): number[] {
 const [left, top]=projectLatin([bounds[0],bounds[3]]), [right,bottom]=projectLatin([bounds[2],bounds[1]]);
 return [left,top,right,bottom];
}
export const latinCountries = geography.features.map(feature => {
 const geometry=feature.geometry as LatinGeometry;
 const bounds=geographicBounds(geometry);
 const labelLongitudeLatitude=feature.properties.label as number[];
 return {code:feature.properties.code,name:feature.properties.name,geometry,path:latinPath(geometry),bounds,
  projectedBounds:latinProjectedBounds(bounds),label:projectLatin(labelLongitudeLatitude),labelLongitudeLatitude,
  subregion:feature.properties.subregion};
});
export const latinCountryCodes = latinCountries.map(country=>country.code);
export const latinCountries34 = latinCountries;
export const latinCountryName = (code: string) => latinCountries.find(country=>country.code===code)?.name ?? '中南米全体';

/** SVG viewBox [x,y,width,height], in projected coordinates. Context paths stay present. */
export function latinViewBox(scope: LatinScope | string = 'all', place = 'all'): number[] {
 let bounds: readonly number[]=latinBounds;
 if(scope==='central') bounds=[-93,6,-58,28];
 else if(scope==='south') bounds=[-83,-56,-33,13];
 else if(scope==='country' && place!=='all') bounds=latinCountries.find(country=>country.code===place)?.bounds ?? latinBounds;
 const [left,top,right,bottom]=latinProjectedBounds(bounds);
 const padding=scope==='country'?Math.max(5,(bottom-top)*.12,(right-left)*.12):18;
 const width=Math.max(right-left+padding*2,24),height=Math.max(bottom-top+padding*2,24);
 return [(left+right-width)/2,(top+bottom-height)/2,width,height];
}
/** Fit the same geographic frame into a fixed canvas for every thematic renderer.
 * Geographic paths/rasters use transform; symbols use k/tx/ty and retain their
 * fixed-canvas quantity scale, so both comparison panes share geography. */
export function latinMapLayout(scope: LatinScope | string = 'all', place = 'all') {
 const frame=latinViewBox(scope,place);
 const [x,y,width,height]=frame;
 const k=Math.min(latinWidth/width,latinHeight/height);
 const tx=(latinWidth-width*k)/2-x*k,ty=(latinHeight-height*k)/2-y*k;
 return {frame,k,tx,ty,transform:`matrix(${k} 0 0 ${k} ${tx} ${ty})`};
}
export function latinRasterFrame(bounds: readonly number[]=latinBounds): {x:number;y:number;width:number;height:number} {
 const [x,y,right,bottom]=latinProjectedBounds(bounds);
 return {x,y,width:right-x,height:bottom-y};
}
export function latinContextPaths(idPrefix='latin'): string {
 return `<g data-latin-context="${idPrefix}">${latinCountries.map(country=>`<path d="${country.path}" class="latin-context" data-context-country="${country.code}" fill-rule="evenodd"><title>${country.name}</title></path>`).join('')}</g>`;
}
