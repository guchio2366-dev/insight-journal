import frames from '../data/atlas/regional-forestry-frames.json';
import readings from '../data/atlas/regional-forestry.json';
import latinProcessing from '../data/atlas/latin-america/forestry-processing.json';
import africa from '../data/atlas/africa-geography.json';
import latin from '../data/atlas/latin-america/countries.json';
import oceania from '../data/atlas/oceania-countries.json';
import russia from '../data/atlas/russia-countries.json';
import disputes from '../data/atlas/russia-disputed-areas.json';
import europeTreeCover from '../../public/assets/atlas/europe/tree-cover-v1/manifest.json';
import asiaForestry from '../../public/assets/atlas/asia-farming-v1/manifest.json';
import westAsiaForestry from '../../public/assets/atlas/west-asia-v1/raster-manifest.json';

export type ForestryRegion = keyof typeof frames;
type Geometry = {type:string;coordinates:number[][][]|number[][][][]};
export const forestryRegions = Object.keys(frames) as ForestryRegion[];
export type ForestryExample={id:string;title:string;label:string;point:number[];fact:string;explanation:string;use:string;sources:{title:string;url:string;period:string}[];kind?:string;markerOffset?:number[];labelOffset?:number[];coordinateMeaning?:string;facilityAddress?:string;facilityCoordinates?:number[]|null};
export const forestryReading = (region:ForestryRegion) => {
 const reading=readings[region];
 if(region!=='latin-america')return {...reading,examples:reading.examples as ForestryExample[]};
 return {...reading,
  overview:reading.overview+' トレス・ラゴアス、パソ・デ・ロス・トロス、フライ・ベントスのパルプ加工も、市の案内位置から読みます。',
  distribution:reading.distribution+' 青いひし形は加工拠点を読む市の案内位置で、工場敷地の点ではありません。細線は記号から案内位置への引出線です。',
  examples:[...reading.examples,...latinProcessing.examples] as ForestryExample[]};
};
export const forestryFrame = (region:ForestryRegion) => {
 const definition=frames[region],bounds=definition.bounds;
 const height=900*(mercator(bounds[3])-mercator(bounds[1]))/((bounds[2]-bounds[0])*Math.PI/180);
 return {...definition,width:900,height};
};
const mercator=(latitude:number)=>Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));
export function projectForestry(region:ForestryRegion,[longitude,latitude]:number[]) {
 const frame=forestryFrame(region),[west,,east,north]=frame.bounds;
 if(frame.wrap&&longitude<0)longitude+=360;
 const scale=frame.width/((east-west)*Math.PI/180);
 return [(longitude-west)*Math.PI/180*scale,(mercator(north)-mercator(latitude))*scale];
}
export function forestryPath(region:ForestryRegion,geometry:Geometry) {
 const polygons=geometry.type==='Polygon'?[geometry.coordinates as number[][][]]:geometry.coordinates as number[][][][];
 return polygons.map(polygon=>polygon.map(ring=>ring.map((point,index)=>{
  const [x,y]=projectForestry(region,point);
  return `${index?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;
 }).join('')+'Z').join('')).join('');
}
export function forestryGeography(region:ForestryRegion) {
 const source={africa, 'latin-america':latin,oceania,russia}[region];
 const features=source.features as {properties:{code:string;kind?:string;name?:string};geometry:Geometry}[];
 return features.filter(feature=>region==='russia'?feature.properties.kind==='russia':region==='oceania'?feature.properties.kind==='oceania':true);
}
export const forestryDisputes=()=>disputes.features.map(feature=>({path:forestryPath('russia',feature.geometry as Geometry),name:feature.properties.name}));
export function forestryReferences(region:ForestryRegion) {
 const names=region==='africa'?['south-central-asia']:region==='russia'?['south-central-asia','east-asia']:region==='oceania'?['southeast-asia']:[];
 const references=names.map(name=>{
  const source=asiaForestry.regions[name as keyof typeof asiaForestry.regions].layers.find(layer=>layer.id==='forest')!;
  const coordinates=source.imageCoordinates,[west,north]=coordinates[0],[east,south]=coordinates[2];
  const [x,y]=projectForestry(region,[west,north]),[right,bottom]=projectForestry(region,[east,south]);
  return {id:name,href:`/assets/atlas/asia-farming-v1/${name}.forest.png`,x,y,width:right-x,height:bottom-y,bounds:[west,south,east,north],year:2020};
 });
 if(region==='africa'){
  const source=westAsiaForestry.layers.find(layer=>layer.id==='forest')!,[west,south,east,north]=source.bounds!;
  const [x,y]=projectForestry(region,[west,north]),[right,bottom]=projectForestry(region,[east,south]);
  references.unshift({id:'west-asia',href:`/assets/atlas/west-asia-v1/${source.image}`,x,y,width:right-x,height:bottom-y,bounds:[west,south,east,north],year:2020});
 }
 return references;
}
export function forestryRaster(region:ForestryRegion) {
 if(region!=='russia')return null;
 const [west,south,east,north]=europeTreeCover.bounds;
 const [,y]=projectForestry(region,[west,north]);
 // Raster extent must stay in its native continuous longitude range: -25 is
 // west of the Russia frame, rather than the date-line-normalized 335 degrees.
 const frame=forestryFrame(region);
 const left=(west-frame.bounds[0])/(frame.bounds[2]-frame.bounds[0])*frame.width;
 const [right,bottom]=projectForestry(region,[east,south]);
 return {href:'/assets/atlas/europe/tree-cover-v1/tree-cover.png',x:left,y,width:right-left,height:bottom-y,
  bounds:europeTreeCover.bounds,source:europeTreeCover};
}
